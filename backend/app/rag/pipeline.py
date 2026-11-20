import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.fine_tuned_model.classifier import classifier_service
from app.rag.embeddings import embedding_service
from app.rag.vector_store import vector_store
from app.gemini.client import gemini_client
from app.gemini.prompts import build_rag_prompt, NOT_FOUND_MESSAGE

logger = logging.getLogger("app.rag.pipeline")

INTENT_KEYWORD_ENRICHMENT = {
    "syllabus_question": "syllabus unit module topics textbook curriculum chapters",
    "exam_question": "exam examination passing marks pattern internal assessment grading",
    "assignment_question": "assignment submission deadline due date report homework rubric",
    "attendance_question": "attendance percentage condonation absent medical leave 75%",
    "fee_question": "fee tuition dues installment receipt penalty fine payment",
    "hostel_question": "hostel mess warden curfew gate pass dorm room rules",
    "general_college_question": "college campus library principal administration contact",
    "irrelevant_question": "",
}


class RAGPipeline:
    """
    Core RAG Pipeline:
    1. Query Intent Classification (LoRA model or Rule-Based Fallback)
    2. Intent-Guided Retrieval Query Augmentation
    3. Dense Vector Embedding Generation (384-dim)
    4. pgvector Cosine Similarity Retrieval (Top 5 chunks)
    5. Context-Bound Answer Synthesis with Gemini
    6. Structured Source Citation Formatting
    """

    def process_query(self, db: Session, user_id: str, question: str) -> Dict[str, Any]:
        # Step 1: Detect intent
        detected_intent = classifier_service.classify(question)
        logger.info(f"User Query: '{question}' -> Detected Intent: {detected_intent}")

        # Step 2: Augment query with intent keywords for higher recall
        enrichment = INTENT_KEYWORD_ENRICHMENT.get(detected_intent, "")
        augmented_query = f"{question} {enrichment}".strip() if enrichment else question

        # Step 3: Generate embedding vector (384 dimensions)
        query_vector = embedding_service.embed_text(augmented_query)

        # Step 4: Retrieve top 5 most similar chunks from pgvector
        matched_chunks = vector_store.search_similar_chunks(
            db=db,
            user_id=user_id,
            query_vector=query_vector,
            top_k=5,
            threshold=0.20
        )

        # Handle queries with no relevant college documents found
        if not matched_chunks:
            return {
                "answer": NOT_FOUND_MESSAGE,
                "detected_intent": detected_intent,
                "sources": [],
            }

        # Step 5: Format retrieved chunks into citation sources
        sources: List[Dict[str, Any]] = []
        for chunk in matched_chunks:
            content_preview = chunk["content"].strip()
            if len(content_preview) > 220:
                content_preview = content_preview[:220] + "..."
            sources.append({
                "document_name": chunk["file_name"],
                "page_number": chunk.get("page_number", 1),
                "chunk_preview": content_preview,
            })

        # If question is classified as completely irrelevant, skip external LLM call
        if detected_intent == "irrelevant_question" and (not matched_chunks or matched_chunks[0]["similarity"] < 0.25):
            return {
                "answer": NOT_FOUND_MESSAGE,
                "detected_intent": detected_intent,
                "sources": [],
            }

        # Step 6: Construct prompt and query Gemini API
        prompt = build_rag_prompt(question, matched_chunks)
        answer = gemini_client.generate_answer(prompt)

        # Double check if Gemini reported no information found
        if NOT_FOUND_MESSAGE.lower() in answer.lower():
            return {
                "answer": NOT_FOUND_MESSAGE,
                "detected_intent": detected_intent,
                "sources": sources,
            }

        return {
            "answer": answer,
            "detected_intent": detected_intent,
            "sources": sources,
        }


rag_pipeline = RAGPipeline()
