from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


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


class UserResponse(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"


# ==============================================================================
# DOCUMENT SCHEMAS
# ==============================================================================
class DocumentResponse(BaseModel):
    id: str
    file_name: str
    file_size: int
    page_count: int
    chunk_count: int
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentStatusResponse(BaseModel):
    id: str
    file_name: str
    status: str
    chunk_count: int
    error_message: Optional[str] = None


# ==============================================================================
# CHAT & RAG SCHEMAS
# ==============================================================================
class SourceItem(BaseModel):
    document_name: str
    page_number: Optional[int] = 1
    chunk_preview: str


class AskQuestionRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=1000)


class AskQuestionResponse(BaseModel):
    answer: str
    detected_intent: str
    sources: List[SourceItem]


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    detected_intent: Optional[str] = None
    sources: List[SourceItem] = []
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Conversation"


class ChatSessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0

    class Config:
        from_attributes = True


class ChatDetailResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    messages: List[ChatMessageResponse]

    class Config:
        from_attributes = True


# ==============================================================================
# ADMIN SCHEMAS
# ==============================================================================
class AdminStatsResponse(BaseModel):
    total_users: int
    total_documents: int
    total_chunks: int
    total_chats: int
    total_questions: int


class AdminDocumentItem(BaseModel):
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
class HealthResponse(BaseModel):
    status: str
    database: str
    classifier_mode: str
    gemini_configured: bool
    app_version: str
