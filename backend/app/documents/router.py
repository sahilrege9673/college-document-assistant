import re
import uuid
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import User, Document, DocumentChunk
from app.schemas import DocumentResponse, DocumentStatusResponse
from app.auth.dependencies import get_current_user
from app.documents.parser import extract_text_from_pdf, PDFExtractionError, ScannedPDFError
from app.documents.chunker import chunk_document_pages
from app.rag.embeddings import embedding_service
from app.utils.storage import storage_service

logger = logging.getLogger("app.documents")

router = APIRouter(prefix="/api/documents", tags=["Documents"])


def sanitize_filename(name: str) -> str:
    """Removes unsafe characters and path traversal segments from filenames."""
    clean = re.sub(r"[^\w\s\.-]", "_", name)
    clean = clean.replace("..", "_").strip()
    return clean or "uploaded_document.pdf"


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Validates, extracts, chunks, generates embeddings, and indexes an uploaded PDF document.
    """
    # 1. Validate file extension and MIME type
    clean_name = sanitize_filename(file.filename or "document.pdf")
    if not clean_name.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF documents are supported (.pdf)."
        )

    # 2. Read file contents and check size limit (10MB)
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to read file: {e}")

    file_size = len(content)
    if file_size > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of 10 MB (File size: {file_size / (1024*1024):.1f} MB)."
        )

    if file_size < 100:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty or corrupted.")

    # 3. Text Extraction with PyMuPDF
    try:
        pages, total_pages, total_chars = extract_text_from_pdf(content)
    except ScannedPDFError as spe:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(spe))
    except PDFExtractionError as pee:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(pee))

    # 4. Upload raw PDF to Supabase Storage or local fallback
    doc_id = str(uuid.uuid4())
    storage_path = storage_service.upload_file(
        file_bytes=content,
        destination_path=f"{current_user.id}/{doc_id}_{clean_name}",
        content_type="application/pdf",
    )

    # 5. Create initial Document record
    document = Document(
        id=doc_id,
        user_id=current_user.id,
        file_name=clean_name,
        storage_path=storage_path,
        file_size=file_size,
        page_count=total_pages,
        chunk_count=0,
        status="processing",
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    # 6. Chunk text and generate dense vector embeddings
    try:
        chunks_data = chunk_document_pages(
            pages=pages,
            chunk_size=settings.CHUNK_SIZE,
            overlap=settings.CHUNK_OVERLAP,
        )

        if not chunks_data:
            document.status = "failed"
            document.error_message = "No readable text chunks could be produced from this document."
            db.commit()
            return document

        # Generate embeddings in batch
        texts_to_embed = [c["content"] for c in chunks_data]
        embeddings = embedding_service.embed_batch(texts_to_embed)

        # Batch insert chunks
        chunk_objects = []
        for i, c in enumerate(chunks_data):
            chunk_objects.append(
                DocumentChunk(
                    id=str(uuid.uuid4()),
                    document_id=document.id,
                    user_id=current_user.id,
                    chunk_index=c["chunk_index"],
                    content=c["content"],
                    page_number=c["page_number"],
                    token_count=c["token_count"],
                    embedding=embeddings[i],
                )
            )

        db.bulk_save_objects(chunk_objects)

        # Update document ready status
        document.chunk_count = len(chunks_data)
        document.status = "ready"
        db.commit()
        db.refresh(document)
        logger.info(f"Successfully processed '{clean_name}' into {len(chunks_data)} chunks.")

    except Exception as e:
        logger.error(f"Error during chunking/embedding of {clean_name}: {e}")
        document.status = "failed"
        document.error_message = f"Indexing failed: {str(e)}"
        db.commit()

    return document


@router.get("", response_model=List[DocumentResponse])
def list_documents(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves all documents uploaded by the authenticated user."""
    docs = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return docs


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves metadata for a specific document."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if doc.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return doc


@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
def get_document_status(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Polls processing status for a recently uploaded document."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if doc.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return DocumentStatusResponse(
        id=doc.id,
        file_name=doc.file_name,
        status=doc.status,
        chunk_count=doc.chunk_count,
        error_message=doc.error_message,
    )


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deletes a document, its stored file, and associated vector chunks."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if doc.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Delete storage file
    storage_service.delete_file(doc.storage_path)

    # Delete database record (cascades to chunks)
    db.delete(doc)
    db.commit()

    return {"message": f"Document '{doc.file_name}' and associated vector index purged successfully."}
