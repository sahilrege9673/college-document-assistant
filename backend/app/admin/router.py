import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Document, DocumentChunk, ChatSession, ChatMessage
from app.schemas import AdminStatsResponse, AdminDocumentItem
from app.auth.dependencies import get_current_admin
from app.utils.storage import storage_service

logger = logging.getLogger("app.admin")

router = APIRouter(prefix="/api/admin", tags=["Administration"])


@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Returns platform-wide operational statistics."""
    total_users = db.query(User).count()
    total_documents = db.query(Document).count()
    total_chunks = db.query(DocumentChunk).count()
    total_chats = db.query(ChatSession).count()
    total_questions = db.query(ChatMessage).filter(ChatMessage.role == "user").count()

    return AdminStatsResponse(
        total_users=total_users,
        total_documents=total_documents,
        total_chunks=total_chunks,
        total_chats=total_chats,
        total_questions=total_questions,
    )


@router.get("/documents", response_model=List[AdminDocumentItem])
def list_all_documents(
    skip: int = 0,
    limit: int = 100,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Retrieves documents across all users for administrative review."""
    docs = (
        db.query(Document, User.email, User.full_name)
        .join(User, User.id == Document.user_id)
        .order_by(Document.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    items = []
    for doc, email, full_name in docs:
        items.append(
            AdminDocumentItem(
                id=doc.id,
                file_name=doc.file_name,
                file_size=doc.file_size,
                page_count=doc.page_count,
                chunk_count=doc.chunk_count,
                status=doc.status,
                created_at=doc.created_at,
                user_email=email,
                user_name=full_name,
            )
        )
    return items


@router.delete("/documents/{document_id}")
def admin_delete_document(
    document_id: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Allows an administrator to purge any document from the platform."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    storage_service.delete_file(doc.storage_path)
    db.delete(doc)
    db.commit()

    logger.info(f"Admin {admin.email} purged document {doc.id} ({doc.file_name})")
    return {"message": f"Document '{doc.file_name}' permanently purged by administrator."}
