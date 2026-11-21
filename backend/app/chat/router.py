import uuid
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, ChatSession, ChatMessage
from app.schemas import (
    ChatSessionCreate,
    ChatSessionResponse,
    ChatDetailResponse,
    AskQuestionRequest,
    AskQuestionResponse,
    SourceItem,
)
from app.auth.dependencies import get_current_user
from app.rag.pipeline import rag_pipeline

logger = logging.getLogger("app.chat")

router = APIRouter(prefix="/api/chats", tags=["Chat"])


@router.post("", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
def create_chat(
    data: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Creates a new chat session."""
    title = (data.title or "New Conversation").strip()
    session = ChatSession(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        title=title,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return ChatSessionResponse(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=0,
    )


@router.get("", response_model=List[ChatSessionResponse])
def list_chats(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves all chat sessions for the authenticated user."""
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    result = []
    for s in sessions:
        count = db.query(ChatMessage).filter(ChatMessage.chat_session_id == s.id).count()
        result.append(
            ChatSessionResponse(
                id=s.id,
                title=s.title,
                created_at=s.created_at,
                updated_at=s.updated_at,
                message_count=count,
            )
        )
    return result


@router.get("/{chat_id}", response_model=ChatDetailResponse)
def get_chat(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves full conversation messages for a chat session."""
    session = db.query(ChatSession).filter(ChatSession.id == chat_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")
    if session.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.chat_session_id == chat_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    # Format message sources
    formatted_messages = []
    for m in messages:
        sources_list = []
        if isinstance(m.sources, list):
            for s in m.sources:
                sources_list.append(
                    SourceItem(
                        document_name=s.get("document_name", "Unknown"),
                        page_number=s.get("page_number", 1),
                        chunk_preview=s.get("chunk_preview", ""),
                        chunk_id=s.get("chunk_id"),
                        similarity=s.get("similarity"),
                    )
                )

        formatted_messages.append({
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "detected_intent": m.detected_intent,
            "sources": sources_list,
            "created_at": m.created_at,
        })

    return {
        "id": session.id,
        "title": session.title,
        "created_at": session.created_at,
        "messages": formatted_messages,
    }


@router.delete("/{chat_id}")
def delete_chat(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deletes a chat session and all its messages."""
    session = db.query(ChatSession).filter(ChatSession.id == chat_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")
    if session.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    db.delete(session)
    db.commit()
    return {"message": "Chat conversation deleted successfully"}


@router.post("/{chat_id}/ask", response_model=AskQuestionResponse)
def ask_question(
    chat_id: str,
    data: AskQuestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submits a question to the RAG pipeline:
    - Verifies chat session
    - Runs query through intent classifier
    - Retrieves top 5 matching document chunks
    - Generates grounded answer via Gemini
    - Saves user message and assistant response
    - Returns answer with detected intent badge and source references
    """
    session = db.query(ChatSession).filter(ChatSession.id == chat_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")
    if session.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    question = data.question.strip()
    if not question:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question cannot be empty")

    # 1. Save user message to database
    user_msg = ChatMessage(
        id=str(uuid.uuid4()),
        chat_session_id=session.id,
        user_id=current_user.id,
        role="user",
        content=question,
    )
    db.add(user_msg)

    # Auto-update session title if it's the initial default
    if session.title in ("New Conversation", "New Chat"):
        new_title = question[:45] + ("..." if len(question) > 45 else "")
        session.title = new_title

    # 2. Run through RAG Pipeline (supports optional document filtering)
    rag_result = rag_pipeline.process_query(
        db=db,
        user_id=current_user.id,
        question=question,
        document_id=data.document_id,
    )

    answer_text = rag_result["answer"]
    detected_intent = rag_result["detected_intent"]
    sources_data = rag_result["sources"]

    # 3. Save assistant message to database
    assistant_msg = ChatMessage(
        id=str(uuid.uuid4()),
        chat_session_id=session.id,
        user_id=current_user.id,
        role="assistant",
        content=answer_text,
        detected_intent=detected_intent,
        sources=sources_data,
    )
    db.add(assistant_msg)
    db.commit()

    # 4. Construct response
    sources_response = [
        SourceItem(
            document_name=s.get("document_name", "Document"),
            page_number=s.get("page_number", 1),
            chunk_preview=s.get("chunk_preview", ""),
            chunk_id=s.get("chunk_id"),
            similarity=s.get("similarity"),
        )
        for s in sources_data
    ]

    return AskQuestionResponse(
        answer=answer_text,
        detected_intent=detected_intent,
        sources=sources_response,
    )
