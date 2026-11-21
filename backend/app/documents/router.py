import re
import uuid
import logging
from typing import List, Optional
import pymupdf as fitz
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db, SessionLocal
from app.models import User, Document, DocumentChunk
from app.schemas import (
    DocumentResponse,
    DocumentStatusResponse,
    DocumentChunkResponse,
    BatchUploadResponse,
)
from app.auth.dependencies import get_current_user
from app.documents.parser import extract_text_from_pdf, PDFExtractionError
from app.documents.chunker import chunk_document_pages
from app.rag.embeddings import embedding_service
from app.rag.vector_store import vector_store
from app.gemini.client import gemini_client
from app.utils.storage import storage_service

logger = logging.getLogger("app.documents")

router = APIRouter(prefix="/api/documents", tags=["Documents"])


def sanitize_filename(name: str) -> str:
    """Removes unsafe characters and path traversal segments from filenames."""
    clean = re.sub(r"[^\w\s\.-]", "_", name)
    clean = clean.replace("..", "_").strip()
    return clean or "uploaded_document.pdf"


def process_document_background(doc_id: str, content: bytes, user_id: str, clean_name: str):
    """
    Asynchronous background worker: parses, chunks, generates embeddings,
    and indexes document into pgvector without blocking client HTTP request.
    """
    db = SessionLocal()
    try:
        pages, total_pages, total_chars = extract_text_from_pdf(content)
        chunks_data = chunk_document_pages(
            pages=pages,
            chunk_size=settings.CHUNK_SIZE,
            overlap=settings.CHUNK_OVERLAP,
        )

        if not chunks_data:
            doc = db.query(Document).filter(Document.id == doc_id).first()
            if doc:
                doc.status = "failed"
                doc.error_message = "No readable text or diagram content could be extracted from this document."
                db.commit()
            return

        texts_to_embed = [c["content"] for c in chunks_data]
        embeddings = embedding_service.embed_batch(texts_to_embed)

        vector_store.save_chunks_batch(
            db=db,
            chunks_data=chunks_data,
            embeddings=embeddings,
            document_id=doc_id,
            user_id=user_id,
        )

        # Run Autonomous Document Intelligence (Summary, Topics & Grounded Starter Questions)
        sample_text = "\n\n".join([c["content"] for c in chunks_data[:6]])
        intelligence = gemini_client.analyze_document_overview(sample_text, clean_name)

        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            doc.chunk_count = len(chunks_data)
            doc.page_count = total_pages
            doc.summary = intelligence.get("summary")
            doc.suggested_questions = intelligence.get("suggested_questions", [])
            doc.detected_topics = intelligence.get("detected_topics", [])
            doc.status = "ready"
            db.commit()
            logger.info(
                f"Autonomous indexing completed for '{clean_name}': {len(chunks_data)} chunks, "
                f"{len(doc.suggested_questions)} featured questions generated."
            )

    except Exception as e:
        logger.error(f"Background indexing failed for '{clean_name}': {e}", exc_info=True)
        try:
            doc = db.query(Document).filter(Document.id == doc_id).first()
            if doc:
                doc.status = "failed"
                doc.error_message = f"Indexing failed: {str(e)}"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accepts syllabus/notes PDF (up to 100MB), validates structure, stores file,
    and dispatches non-blocking async background indexing into pgvector.
    """
    # 1. Validate file extension
    clean_name = sanitize_filename(file.filename or "document.pdf")
    if not clean_name.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF documents are supported (.pdf)."
        )

    # 2. Read file contents and check size limit (100MB configurable)
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to read file: {e}")

    file_size = len(content)
    max_mb = settings.MAX_FILE_SIZE_BYTES // (1024 * 1024)
    if file_size > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {max_mb} MB (File size: {file_size / (1024*1024):.1f} MB)."
        )

    if file_size < 100:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty or corrupted.")

    # 3. Quick structural validation and page counting with PyMuPDF
    try:
        quick_doc = fitz.open(stream=content, filetype="pdf")
        total_pages = len(quick_doc)
        quick_doc.close()
        if total_pages == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PDF contains 0 pages.")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid or corrupted PDF: {e}")

    # 4. Upload raw PDF to Supabase Storage or local fallback
    doc_id = str(uuid.uuid4())
    storage_path = storage_service.upload_file(
        file_bytes=content,
        destination_path=f"{current_user.id}/{doc_id}_{clean_name}",
        content_type="application/pdf",
    )

    # 5. Create initial Document record in 'processing' state
    document = Document(
        id=doc_id,
        user_id=str(current_user.id),
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

    # 6. Dispatch async non-blocking parsing, chunking & vector embedding
    background_tasks.add_task(
        process_document_background,
        doc_id=doc_id,
        content=content,
        user_id=str(current_user.id),
        clean_name=clean_name,
    )

    return document


@router.post("/upload-batch", response_model=BatchUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_documents_batch(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accepts multiple syllabus/notes PDFs (up to 100MB per file), validates each file,
    registers them in parallel, and schedules background parsing & indexing.
    """
    uploaded_docs: List[Document] = []
    failed_items: List[dict] = []
    max_mb = settings.MAX_FILE_SIZE_BYTES // (1024 * 1024)

    for file in files:
        clean_name = sanitize_filename(file.filename or "document.pdf")
        if not clean_name.lower().endswith(".pdf"):
            failed_items.append({"file_name": clean_name, "error": "Only PDF documents (.pdf) are supported."})
            continue

        try:
            content = await file.read()
            file_size = len(content)

            if file_size > settings.MAX_FILE_SIZE_BYTES:
                failed_items.append({
                    "file_name": clean_name,
                    "error": f"File exceeds maximum size of {max_mb} MB ({file_size / (1024*1024):.1f} MB)."
                })
                continue

            if file_size < 100:
                failed_items.append({"file_name": clean_name, "error": "File is empty or corrupted."})
                continue

            # Quick structural check
            try:
                quick_doc = fitz.open(stream=content, filetype="pdf")
                total_pages = len(quick_doc)
                quick_doc.close()
                if total_pages == 0:
                    failed_items.append({"file_name": clean_name, "error": "PDF has 0 pages."})
                    continue
            except Exception as e:
                failed_items.append({"file_name": clean_name, "error": f"Corrupted PDF structure: {e}"})
                continue

            doc_id = str(uuid.uuid4())
            storage_path = storage_service.upload_file(
                file_bytes=content,
                destination_path=f"{current_user.id}/{doc_id}_{clean_name}",
                content_type="application/pdf",
            )

            document = Document(
                id=doc_id,
                user_id=str(current_user.id),
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

            background_tasks.add_task(
                process_document_background,
                doc_id=doc_id,
                content=content,
                user_id=str(current_user.id),
                clean_name=clean_name,
            )
            uploaded_docs.append(document)

        except Exception as e:
            failed_items.append({"file_name": clean_name, "error": str(e)})

    return BatchUploadResponse(
        total_queued=len(uploaded_docs),
        uploaded=uploaded_docs,
        failed=failed_items,
    )


@router.get("/featured-questions", response_model=List[str])
def get_featured_questions(
    document_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns AI-generated starter questions from uploaded documents.
    If document_id is provided, returns questions specific to that document.
    Otherwise aggregates high-value questions from all user documents.
    """
    query = db.query(Document).filter(Document.user_id == current_user.id, Document.status == "ready")
    if document_id:
        query = query.filter(Document.id == document_id)

    docs = query.order_by(Document.created_at.desc()).limit(10).all()
    questions: List[str] = []
    seen = set()

    for doc in docs:
        if isinstance(doc.suggested_questions, list):
            for q in doc.suggested_questions:
                if q and q not in seen:
                    questions.append(q)
                    seen.add(q)

    # Defaults if no document has completed intelligence analysis yet
    if not questions:
        questions = [
            "What is the passing criteria and examination scheme for this semester?",
            "What topics and sub-topics are included in Unit 1 and Unit 2?",
            "What are the prescribed reference textbooks and course outcomes (COs)?",
            "List all required practical experiments and assignment submission guidelines."
        ]

    return questions[:8]


@router.get("/{document_id}/chunks", response_model=List[DocumentChunkResponse])
def get_document_chunks(
    document_id: str,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves indexed semantic chunks for the Chunk Inspector & Knowledge Explorer.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if doc.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    items = []
    for c in chunks:
        # Give preview of first 5 embedding dimensions
        preview = c.embedding[:5] if isinstance(c.embedding, list) else []
        items.append(
            DocumentChunkResponse(
                id=c.id,
                document_id=c.document_id,
                chunk_index=c.chunk_index,
                page_number=c.page_number or 1,
                token_count=c.token_count or len(c.content.split()),
                content=c.content,
                embedding_preview=preview,
            )
        )
    return items


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
