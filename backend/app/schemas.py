import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# ==============================================================================
# BASE SCHEMA (AUTO-CONVERTS UUID TO STR & SUPPORTS ORM)
# ==============================================================================
class AppBaseModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    @field_validator("*", mode="before")
    @classmethod
    def convert_uuids(cls, v):
        if isinstance(v, uuid.UUID):
            return str(v)
        return v


# ==============================================================================
# AUTH SCHEMAS
# ==============================================================================
class UserSignup(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class UserLogin(BaseModel):
    username: EmailStr  # Accepts email as username (OAuth2 compatible)
    password: str


class UserResponse(AppBaseModel):
    id: str
    full_name: str
    email: str
    role: str
    created_at: datetime


class TokenResponse(AppBaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"


# ==============================================================================
# DOCUMENT SCHEMAS
# ==============================================================================
class DocumentResponse(AppBaseModel):
    id: str
    file_name: str
    file_size: int
    page_count: int
    chunk_count: int
    status: str
    error_message: Optional[str] = None
    summary: Optional[str] = None
    suggested_questions: Optional[List[str]] = []
    detected_topics: Optional[List[str]] = []
    created_at: datetime


class DocumentStatusResponse(AppBaseModel):
    id: str
    file_name: str
    status: str
    chunk_count: int
    error_message: Optional[str] = None
    summary: Optional[str] = None
    suggested_questions: Optional[List[str]] = []
    detected_topics: Optional[List[str]] = []


class DocumentChunkResponse(AppBaseModel):
    id: str
    document_id: str
    chunk_index: int
    page_number: int
    token_count: int
    content: str
    embedding_preview: Optional[List[float]] = []


class BatchUploadResponse(AppBaseModel):
    total_queued: int
    uploaded: List[DocumentResponse]
    failed: List[dict] = []


# ==============================================================================
# CHAT & RAG SCHEMAS
# ==============================================================================
class SourceItem(AppBaseModel):
    document_name: str
    page_number: Optional[int] = 1
    chunk_preview: str
    chunk_id: Optional[str] = None
    similarity: Optional[float] = None


class AskQuestionRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=2000)
    document_id: Optional[str] = None


class AskQuestionResponse(AppBaseModel):
    answer: str
    detected_intent: str
    sources: List[SourceItem]


class ChatMessageResponse(AppBaseModel):
    id: str
    role: str
    content: str
    detected_intent: Optional[str] = None
    sources: List[SourceItem] = []
    created_at: datetime


class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Conversation"


class ChatSessionResponse(AppBaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0


class ChatDetailResponse(AppBaseModel):
    id: str
    title: str
    created_at: datetime
    messages: List[ChatMessageResponse]


# ==============================================================================
# ADMIN SCHEMAS
# ==============================================================================
class AdminStatsResponse(AppBaseModel):
    total_users: int
    total_documents: int
    total_chunks: int
    total_chats: int
    total_questions: int


class AdminDocumentItem(AppBaseModel):
    id: str
    file_name: str
    file_size: int
    page_count: int
    chunk_count: int
    status: str
    created_at: datetime
    user_email: str
    user_name: str


# ==============================================================================
# SYSTEM SCHEMAS
# ==============================================================================
class HealthResponse(AppBaseModel):
    status: str
    database: str
    classifier_mode: str
    gemini_configured: bool
    app_version: str
