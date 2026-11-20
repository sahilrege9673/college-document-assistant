# College Document Assistant — System Architecture

This document describes the end-to-end technical architecture, component design, data flow, and security model of the **College Document Assistant**.

---

## 1. High-Level Architectural Overview

The application is built around a decoupled client-server architecture powered by a Retrieval-Augmented Generation (RAG) pipeline and a parameter-efficient fine-tuned (PEFT) intent classification model:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT TIER (Vercel)                          │
│  React 18 + Vite + Tailwind CSS + Lucide Icons + React Router          │
│  - Academic productivity light-theme UI                                │
│  - JWT Bearer Token Session Management                                 │
│  - Real-time Document Upload Progress & Status                         │
│  - Interactive Chat with Detected Intent Badges & Source Citations     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (REST API)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         API TIER (Render Free)                         │
│  FastAPI (Python 3.12) + Uvicorn + Pydantic v2 + SQLAlchemy            │
│  - Route Controllers: Auth, Documents, Chat, Admin, System Health      │
│  - PyMuPDF (fitz) PDF parser & Recursive sliding-window chunker        │
│  - sentence-transformers/all-MiniLM-L6-v2 local CPU embeddings         │
│  - DistilBERT LoRA Query Intent Classifier + Rule-Based Fallback       │
│  - Gemini 1.5 Flash Client with Exponential Backoff Retries            │
└───────────────┬─────────────────────────────┬──────────────────────────┘
                │                             │
                ▼                             ▼
┌───────────────────────────────┐ ┌──────────────────────────────────────┐
│       DATABASE TIER           │ │            EXTERNAL LLM              │
│       (Supabase Free)         │ │        (Google AI Studio Free)       │
│  - PostgreSQL 15 Engine       │ │  - Gemini 1.5 Flash API              │
│  - pgvector HNSW Index        │ │  - Strict Context-Bound Grounding    │
│  - Relational Metadata Tables │ │  - Anti-Prompt-Injection Safeguards  │
│  - Supabase Storage Bucket    │ │  - 15 RPM / 1M TPM Free Tier Limit   │
└───────────────────────────────┘ └──────────────────────────────────────┘
```

---

## 2. Detailed Data Flows

### A. Document Ingestion Pipeline
1. **Upload Request**: The student drops a PDF (maximum 10 MB) onto the upload area.
2. **Pre-Processing & Validation**:
   - File signature is validated (must begin with `%PDF`).
   - File size is checked against the 10 MB limit.
   - File name is sanitized to prevent path traversal.
3. **Storage Upload**: The raw PDF is streamed to the Supabase Storage bucket `college-docs` under `{user_id}/{document_id}.pdf`.
4. **Text Extraction**: PyMuPDF extracts text page-by-page, retaining page number metadata.
   - *Scanned Document Detection*: If total extracted characters across all pages is fewer than 50 characters, the document is tagged with status `failed` and an explanation ("PDF appears to be a scanned image with no selectable text").
5. **Sliding-Window Chunking**:
   - Chunk size: 800–1000 characters.
   - Overlap: 100–150 characters (preserves sentence continuity across chunk boundaries).
   - Metadata recorded: `chunk_index`, `page_number`, `token_count`.
6. **Vector Embedding Generation**:
   - Model: `sentence-transformers/all-MiniLM-L6-v2` runs locally on the backend.
   - Generates a 384-dimensional dense vector for each chunk.
7. **Vector Indexing**:
   - Chunks and embeddings are batch-inserted into PostgreSQL `document_chunks`.
   - The HNSW index on `embedding vector_cosine_ops` updates incrementally.

### B. Query & RAG Retrieval Pipeline
1. **User Prompt**: The student submits a query, e.g., *"What is the passing criteria for CS101?"*.
2. **Intent Classification**:
   - The query passes through the fine-tuned DistilBERT LoRA model (or fallback classifier).
   - Predicted intent: `exam_question`.
3. **Intent-Guided Query Augmentation**:
   - Keywords corresponding to the intent (e.g., *"grades, marks, passing percentage, minimum"*) augment the internal search query to maximize recall without altering the user's explicit question.
4. **Vector Retrieval**:
   - `all-MiniLM-L6-v2` embeds the query into a 384-dim vector.
   - A cosine similarity search (`<=>`) executes against the student's own chunks in pgvector.
   - The top 5 chunks with similarity above the match threshold (default 0.25) are retrieved.
5. **Prompt Synthesis & LLM Generation**:
   - Retrieved chunks, document names, and page numbers are formatted into a system-prompt envelope:
     ```
     You are a helpful College Document Assistant. Answer the user's question using ONLY 
     the provided college document context. If the answer is not present in the context, say: 
     'I could not find this information in the uploaded college documents.' 
     Do not use outside knowledge. Be concise, clear, and student-friendly. 
     Include the source document name and page number when available.
     ```
   - Google Gemini 1.5 Flash processes the prompt.
6. **Structured Output**:
   - The backend structures the response into JSON containing:
     - `answer`: Grounded response text.
     - `detected_intent`: Classified academic intent.
     - `sources`: Array of `{ document_name, page_number, chunk_preview }`.

---

## 3. Fine-Tuning Subsystem Architecture

### Why Fine-Tune for Intent Rather Than Answer Generation?
1. **Cost & Computation**: Fine-tuning an entire 7B+ parameter LLM requires expensive multi-GPU clusters. Fine-tuning a lightweight encoder (DistilBERT, 66M parameters) with LoRA takes under 4 minutes on a single free Google Colab T4 GPU.
2. **Accuracy & Specialization**: Query intent classification provides clear routing, search query enrichment, and UI clarity without risking LLM catastrophic forgetting.
3. **Separation of Concerns**: Small specialized model handles classification; powerful free-tier Gemini handles natural language synthesis.

### Intent Classes
1. `syllabus_question` — Course topics, units, modules, textbooks.
2. `exam_question` — Exam schedules, passing marks, question formats, grading.
3. `assignment_question` — Homework deadlines, submission rules, lab manuals.
4. `attendance_question` — Minimum attendance, medical leave rules, condonation.
5. `fee_question` — Tuition dues, fine policies, scholarship queries.
6. `hostel_question` — Curfew timings, mess rules, room allocations.
7. `general_college_question` — Campus locations, contact details, administration.
8. `irrelevant_question` — Queries outside the college academic domain.

### Zero-Downtime Rule-Based Fallback
If the backend is deployed on a constrained free container (e.g., 512 MB RAM on Render) or if model weights are not loaded, the backend automatically engages `RuleBasedIntentClassifier`. It uses regex keyword patterns across the 8 classes, ensuring the server **never crashes or returns 500 errors**.

---

## 4. Security & Role-Based Access Control (RBAC)

1. **Password Hashing**: Passwords are salted and hashed with `bcrypt` (work factor 12) before database insertion.
2. **JWT Authentication**: Protected routes require an `Authorization: Bearer <token>` header, signed using HMAC-SHA256 with an expiry window of 24 hours.
3. **Data Isolation**: All document queries, chunk lookups, and chat messages strictly filter by `user_id = current_user.id`. A student cannot access or delete documents belonging to another student.
4. **Admin Protection**: Admin endpoints inspect the user's role claim. Regular students attempting to access `/api/admin/*` receive an HTTP 403 Forbidden response.
5. **Safe Storage**: Uploaded PDFs are stored in an authenticated Supabase Storage bucket. Download URLs are presigned or proxied through the authenticated backend.
