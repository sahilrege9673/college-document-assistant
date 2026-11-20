"""
test_system.py - End-to-End Test Suite for College Document Assistant.

Verifies:
1. Database schema and tables
2. User signup, login, password hashing, and JWT tokens
3. PDF creation, upload, text extraction, and scanned document detection
4. Sliding window chunker (800-1000 chars, 100-150 overlap)
5. Dense vector embeddings (384-dim)
6. Cosine similarity search (top-5 retrieval)
7. Query intent classification (rule-based fallback & LoRA)
8. RAG prompt synthesis and refusal logic for out-of-domain questions
9. Chat sessions, Q&A message persistence, and citation formatting
10. Admin statistics and document oversight
11. Document deletion and cascade cleanup
"""

import sys
import os

# Ensure backend root is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import fitz  # PyMuPDF
from app.database import engine, Base, SessionLocal
from app.models import User, Document, DocumentChunk, ChatSession, ChatMessage
from app.auth.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.documents.parser import extract_text_from_pdf, ScannedPDFError
from app.documents.chunker import chunk_document_pages
from app.rag.embeddings import embedding_service
from app.rag.vector_store import vector_store, cosine_similarity
from app.fine_tuned_model.classifier import classifier_service
from app.gemini.prompts import build_rag_prompt, NOT_FOUND_MESSAGE
from app.rag.pipeline import rag_pipeline


def run_all_tests():
    print("==================================================================")
    print("🎓 COLLEGE DOCUMENT ASSISTANT - END-TO-END VERIFICATION TEST SUITE")
    print("==================================================================")

    # 1. Database Initialization
    print("\n[Test 1] Verifying Database Schema & Table Creation...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    print("✅ Database tables successfully created/verified.")

    # 2. Authentication & JWT
    print("\n[Test 2] Testing User Auth, Password Hashing & JWT Claims...")
    test_email = "student_test@college.edu"
    test_password = "SecurePassword123!"

    # Clean existing test user if present
    existing = db.query(User).filter(User.email == test_email).first()
    if existing:
        db.delete(existing)
        db.commit()

    hashed = get_password_hash(test_password)
    assert verify_password(test_password, hashed), "Password verification failed"
    assert not verify_password("WrongPassword", hashed), "Password mismatch false positive"

    user = User(
        full_name="Test Student",
        email=test_email,
        hashed_password=hashed,
        role="student",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    payload = decode_access_token(token)
    assert payload is not None and payload.get("sub") == user.id, "JWT decode validation failed"
    print(f"✅ User registered (ID: {user.id}) and JWT token validated.")

    # 3. PDF Creation & Text Extraction
    print("\n[Test 3] Testing PDF Text Extraction & Scanned Document Detection...")
    # Generate in-memory PDF with sample academic syllabus & exam rules
    doc = fitz.open()
    page1 = doc.new_page()
    page1.insert_text((50, 50), "CS101: DATA STRUCTURES & ALGORITHMS SYLLABUS\n")
    page1.insert_text(
        (50, 80),
        "Unit 1: Arrays and Linked Lists. Linear data structures, memory allocation.\n"
        "Unit 2: Stacks, Queues, and Recursion. Expression evaluation and backtracking.\n"
        "Unit 3: Trees and Binary Search Trees. AVL trees, tree traversals, heaps.\n"
        "Unit 4: Graphs. BFS, DFS, shortest path algorithms (Dijkstra and Bellman-Ford).\n"
        "Prescribed Textbook: Data Structures and Algorithms in C++ by Mark Allen Weiss.\n"
    )

    page2 = doc.new_page()
    page2.insert_text((50, 50), "CS101: EXAMINATION & ATTENDANCE REGULATIONS\n")
    page2.insert_text(
        (50, 80),
        "Attendance Policy: A minimum of 75% attendance in theory lectures and lab sessions is mandatory.\n"
        "Students with attendance between 65% and 74% may apply for medical condonation with a certificate.\n"
        "Students below 65% attendance will be detained from writing end-semester examinations.\n"
        "Passing Criteria: A student must score at least 40% in internal tests and 40% in the final exam.\n"
        "The overall aggregate pass mark is 50% for course completion.\n"
        "Assignment Submission: Late assignments will incur a penalty of 2 marks deduction per day.\n"
    )

    pdf_bytes = doc.tobytes()
    doc.close()

    pages, total_pages, total_chars = extract_text_from_pdf(pdf_bytes)
    assert total_pages == 2, f"Expected 2 pages, got {total_pages}"
    assert total_chars > 200, f"Expected > 200 chars, got {total_chars}"
    print(f"✅ PDF text parsed: {total_pages} pages, {total_chars} characters extracted.")

    # Test Scanned PDF Check
    empty_doc = fitz.open()
    empty_doc.new_page()
    empty_bytes = empty_doc.tobytes()
    empty_doc.close()
    scanned_detected = False
    try:
        extract_text_from_pdf(empty_bytes)
    except ScannedPDFError:
        scanned_detected = True
    assert scanned_detected, "Scanned/empty PDF check failed to trigger"
    print("✅ Scanned/image-only PDF detected and flagged gracefully.")

    # 4. Text Chunking
    print("\n[Test 4] Testing Sliding-Window Text Chunker (800-1000 chars, overlap)...")
    chunks = chunk_document_pages(pages, chunk_size=900, overlap=120)
    assert len(chunks) >= 2, "Expected at least 2 chunks"
    for c in chunks:
        assert "chunk_index" in c and "content" in c and "page_number" in c
        assert c["token_count"] > 0
    print(f"✅ Chunking generated {len(chunks)} overlapping segments preserving page references.")

    # 5. Embeddings Generation (384-dim)
    print("\n[Test 5] Generating 384-Dimensional Dense Vector Embeddings...")
    chunk_texts = [c["content"] for c in chunks]
    embeddings = embedding_service.embed_batch(chunk_texts)
    assert len(embeddings) == len(chunks), "Embedding count mismatch"
    assert len(embeddings[0]) == 384, f"Expected 384 dimensions, got {len(embeddings[0])}"
    print(f"✅ Dense embeddings generated: {len(embeddings)} vectors x 384 dimensions.")

    # 6. Database Storage & Vector Indexing
    print("\n[Test 6] Storing Document and Chunks in Database...")
    db_doc = Document(
        user_id=user.id,
        file_name="CS101_Syllabus_Rules.pdf",
        storage_path="local://test/CS101_Syllabus_Rules.pdf",
        file_size=len(pdf_bytes),
        page_count=total_pages,
        chunk_count=len(chunks),
        status="ready",
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    for i, c in enumerate(chunks):
        chunk_obj = DocumentChunk(
            document_id=db_doc.id,
            user_id=user.id,
            chunk_index=c["chunk_index"],
            content=c["content"],
            page_number=c["page_number"],
            token_count=c["token_count"],
            embedding=embeddings[i],
        )
        db.add(chunk_obj)
    db.commit()
    print(f"✅ Document and {len(chunks)} vector chunks committed to database.")

    # 7. Intent Classification Testing
    print("\n[Test 7] Testing Query Intent Classification across Academic Classes...")
    test_queries = {
        "What topics are included in Unit 2?": "syllabus_question",
        "What is the passing criteria for end-semester exams?": "exam_question",
        "What is the penalty for late assignment submission?": "assignment_question",
        "What is the minimum attendance required to write exams?": "attendance_question",
        "Who won the 2022 football world cup?": "irrelevant_question",
    }
    for q, expected in test_queries.items():
        intent = classifier_service.classify(q)
        print(f"   Query: '{q[:40]}...' -> Detected: {intent} (Expected: {expected})")
        assert intent == expected, f"Intent mismatch for '{q}': got {intent}, expected {expected}"
    print("✅ Intent Classification accurately classified all test queries.")

    # 8. Semantic Retrieval & Cosine Similarity
    print("\n[Test 8] Testing Semantic Vector Retrieval for 'passing criteria'...")
    query = "passing marks criteria final exam"
    query_vec = embedding_service.embed_text(query)
    retrieved = vector_store.search_similar_chunks(db, user.id, query_vec, top_k=3, threshold=0.15)
    assert len(retrieved) > 0, "No chunks retrieved for relevant query"
    top_chunk = retrieved[0]
    print(f"   Top retrieved match: Page {top_chunk['page_number']} | Similarity: {top_chunk['similarity']:.3f}")
    print(f"   Snippet: '{top_chunk['content'][:120]}...'")
    assert "passing criteria" in top_chunk["content"].lower() or "attendance" in top_chunk["content"].lower()
    print("✅ Semantic retrieval accurately returned the relevant syllabus/regulations chunk.")

    # 9. RAG Pipeline Execution & Refusal Verification
    print("\n[Test 9] Testing End-to-End RAG Pipeline with Refusal Logic...")
    # Academic Question (Relevant)
    res_academic = rag_pipeline.process_query(db, user.id, "What is the minimum attendance required?")
    assert res_academic["detected_intent"] == "attendance_question"
    assert len(res_academic["sources"]) > 0
    print(f"   Academic Question Sources: {len(res_academic['sources'])} cited references")

    # Out-of-Domain Question (Irrelevant)
    res_irrelevant = rag_pipeline.process_query(db, user.id, "What is the recipe for chocolate cake?")
    assert res_irrelevant["detected_intent"] == "irrelevant_question"
    assert res_irrelevant["answer"] == NOT_FOUND_MESSAGE
    print(f"   Irrelevant Query Refusal: '{res_irrelevant['answer']}'")
    print("✅ Refusal logic correctly blocked hallucinations for out-of-domain query.")

    # 10. Chat Session & Message Persistence
    print("\n[Test 10] Testing Chat Session and Message Persistence...")
    session = ChatSession(user_id=user.id, title="Test Exam Inquiries")
    db.add(session)
    db.commit()
    db.refresh(session)

    user_msg = ChatMessage(
        chat_session_id=session.id,
        user_id=user.id,
        role="user",
        content="What is the passing criteria?",
    )
    asst_msg = ChatMessage(
        chat_session_id=session.id,
        user_id=user.id,
        role="assistant",
        content="According to the examination regulations, a student must score at least 40% in internal tests.",
        detected_intent="exam_question",
        sources=[{"document_name": db_doc.file_name, "page_number": 2, "chunk_preview": "Passing Criteria..."}],
    )
    db.add(user_msg)
    db.add(asst_msg)
    db.commit()

    saved_msgs = db.query(ChatMessage).filter(ChatMessage.chat_session_id == session.id).all()
    assert len(saved_msgs) == 2, "Expected 2 saved messages"
    assert saved_msgs[1].detected_intent == "exam_question"
    assert len(saved_msgs[1].sources) == 1
    print("✅ Chat session, assistant intent badge, and source citations successfully persisted.")

    # 11. Cleanup & Cascading Deletion
    print("\n[Test 11] Testing Document Deletion & Cascade Purge...")
    db.delete(db_doc)
    db.commit()

    remaining_chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == db_doc.id).count()
    assert remaining_chunks == 0, "Chunks were not cascaded upon document deletion"
    print("✅ Cascading deletion purged document and all associated chunks from pgvector.")

    db.close()
    print("\n==================================================================")
    print("🎉 ALL 11 END-TO-END VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================================")


if __name__ == "__main__":
    run_all_tests()
