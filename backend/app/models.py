import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Text,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.orm import relationship
from app.database import Base


class GUID(TypeDecorator):
    """
    Platform-independent GUID/UUID type.
    Maps to PostgreSQL's native UUID with as_uuid=False (guaranteeing python strings),
    and CHAR(36) for SQLite.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            from sqlalchemy.dialects.postgresql import UUID as PG_UUID
            return dialect.type_descriptor(PG_UUID(as_uuid=False))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        return str(value) if value is not None else value

    def process_result_value(self, value, dialect):
        return str(value) if value is not None else value


def generate_uuid() -> str:
    return str(uuid.uuid4())


def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="student", nullable=False)  # 'student' or 'admin'
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    # Relationships
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    storage_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    page_count = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)
    status = Column(String(30), default="processing", nullable=False)  # 'processing', 'ready', 'failed'
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    # Relationships
    user = relationship("User", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    document_id = Column(GUID, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    page_number = Column(Integer, default=1)
    token_count = Column(Integer, default=0)
    embedding = Column(JSON, nullable=False)  # Stored as JSON list of 384 floats, or pgvector
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    # Relationships
    document = relationship("Document", back_populates="chunks")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), default="New Conversation", nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    chat_session_id = Column(GUID, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    detected_intent = Column(String(50), nullable=True)
    sources = Column(JSON, default=list)  # list of {document_name, page_number, chunk_preview}
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    # Relationships
    session = relationship("ChatSession", back_populates="messages")
