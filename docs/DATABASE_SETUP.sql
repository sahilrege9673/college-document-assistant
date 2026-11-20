-- ==============================================================================
-- COLLEGE DOCUMENT ASSISTANT - DATABASE SETUP DDL SCRIPT
-- Target Engine: PostgreSQL 15+ with pgvector extension (Supabase Free Tier)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
-- Enable pgvector for fast vector indexing and cosine distance search
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pgcrypto for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. USERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. DOCUMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,            -- File size in bytes (up to 100MB = 104,857,600 bytes)
    page_count INTEGER DEFAULT 0,
    chunk_count INTEGER DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. DOCUMENT CHUNKS TABLE (Dense Vector Storage)
-- ------------------------------------------------------------------------------
-- Dimension 384 matches sentence-transformers/all-MiniLM-L6-v2
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    page_number INTEGER DEFAULT 1,
    token_count INTEGER NOT NULL,
    embedding vector(384) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. CHAT SESSIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. CHAT MESSAGES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    detected_intent VARCHAR(50),
    sources JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. INDEXES FOR PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_doc ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user ON document_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(chat_session_id);

-- HNSW Vector Index for Cosine Distance Retrieval
-- Hierarchical Navigable Small World graphs provide millisecond search times
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- ------------------------------------------------------------------------------
-- 8. SIMILARITY SEARCH STORED FUNCTION (RPC)
-- ------------------------------------------------------------------------------
-- Allows the backend to perform cosine similarity searches in one call
CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding vector(384),
    match_threshold float,
    match_count int,
    p_user_id uuid
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    file_name varchar,
    content text,
    page_number int,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        d.file_name,
        dc.content,
        dc.page_number,
        (1 - (dc.embedding <=> query_embedding))::float AS similarity
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    WHERE dc.user_id = p_user_id
      AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$$;
