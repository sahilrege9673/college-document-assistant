import time
import logging
from typing import Optional
from app.config import settings
from app.gemini.prompts import SYSTEM_INSTRUCTION

logger = logging.getLogger("app.gemini")


class GeminiClient:
    """
    Client for Google Gemini API on the Free Tier.
    Includes rate-limit handling (HTTP 429), exponential backoff retries,
    and helpful error feedback.
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL
        self._configured = False

        if self.api_key and not self.api_key.startswith("AIzaSyYour"):
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self.genai = genai
                self._configured = True
                logger.info(f"Google Generative AI configured with model: {self.model_name}")
            except Exception as e:
                logger.warning(f"Failed to configure google.generativeai: {e}")

    def _get_candidate_models(self) -> list:
        """Returns priority-ordered candidate models for resilient fallback."""
        ordered = [self.model_name, "gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest", "gemini-2.5-flash-lite"]
        seen = set()
        return [m for m in ordered if m and not (m in seen or seen.add(m))]

    def is_configured(self) -> bool:
        return self._configured

    def generate_answer(self, prompt: str, max_retries: int = 3) -> str:
        """
        Sends the grounded RAG prompt to Gemini with exponential backoff on rate limits
        and automatic failover to modern candidate models (e.g. gemini-3.1-flash-lite).
        """
        if not self._configured:
            return (
                "⚠️ Gemini API Key not configured. Please set a valid `GEMINI_API_KEY` in your `.env` file "
                "from Google AI Studio (https://aistudio.google.com/app/apikey). "
                "The document retrieval engine successfully matched the relevant citations shown below."
            )

        candidate_models = self._get_candidate_models()
        last_error = ""

        for candidate_model in candidate_models:
            for attempt in range(max_retries):
                try:
                    model = self.genai.GenerativeModel(
                        model_name=candidate_model,
                        system_instruction=SYSTEM_INSTRUCTION,
                        generation_config={
                            "temperature": 0.2,  # Low temperature for strict factual grounding
                            "top_p": 0.95,
                            "max_output_tokens": 1024,
                        }
                    )
                    response = model.generate_content(prompt)
                    if response and response.text:
                        return response.text.strip()
                    return "I could not find this information in the uploaded college documents."

                except Exception as e:
                    error_str = str(e)
                    last_error = error_str
                    logger.warning(f"Gemini [{candidate_model}] attempt {attempt + 1} failed: {error_str}")

                    # If model not found or deprecated or unavailable, immediately break to next candidate model
                    if any(code in error_str for code in ["404", "503", "no longer available", "not found"]):
                        break

                    # Check for rate limiting / quota exceeded
                    if "429" in error_str or "quota" in error_str.lower() or "resource exhausted" in error_str.lower():
                        if attempt < max_retries - 1:
                            sleep_time = (2 ** attempt) + 1.0
                            logger.info(f"Rate limited by Google AI Studio. Backing off for {sleep_time}s...")
                            time.sleep(sleep_time)
                            continue
                        else:
                            break

        if "429" in last_error or "quota" in last_error.lower():
            return (
                "⚠️ The free Gemini API rate limit has been temporarily reached. "
                "Please wait 30 seconds and try asking again."
            )

        return f"An error occurred while generating the answer: {last_error}"

    def extract_text_and_diagrams_from_image(self, image_bytes: bytes, mime_type: str = "image/png") -> str:
        """
        Uses Gemini Multimodal Vision to extract text, tables, formulas, and diagram
        descriptions from scanned or photo pages of notes, syllabi, or exams.
        """
        if not self._configured:
            return ""

        prompt = (
            "Transcribe all printed text, handwritten notes, mathematical formulas, and tables "
            "from this academic document page accurately. If there are diagrams, flowcharts, or architecture "
            "drawings, summarize their labels, structure, and academic meaning concisely so this page "
            "can be fully retrieved and cited by students."
        )

        for candidate_model in self._get_candidate_models():
            try:
                model = self.genai.GenerativeModel(candidate_model)
                response = model.generate_content([
                    {"mime_type": mime_type, "data": image_bytes},
                    prompt
                ])
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                logger.warning(f"Gemini multimodal OCR with [{candidate_model}] failed: {e}")
                continue

        return ""

    def analyze_document_overview(self, sample_text: str, file_name: str = "") -> dict:
        """
        Autonomously analyzes document content to extract:
        1. A concise executive summary
        2. Key academic topics/modules covered
        3. 4-6 high-impact featured questions grounded in the content
        """
        default_result = {
            "summary": f"Comprehensive academic material for '{file_name or 'Uploaded Document'}', covering syllabus units, course outcomes, and evaluation guidelines.",
            "detected_topics": ["Curriculum Overview", "Core Syllabus Units", "Course Outcomes", "Examination Scheme", "Reference Materials"],
            "suggested_questions": [
                "What is the examination scheme and passing criteria for this course?",
                "What are the major topics covered in Unit 1 and Unit 2?",
                "What are the expected Course Outcomes (COs) and objectives?",
                "What are the prescribed reference textbooks and lab practicals?",
                "Explain the internal assessment and term-work marking guidelines."
            ],
        }

        if not self._configured or not sample_text.strip():
            return default_result

        import json
        import re

        prompt = (
            f"You are an academic document intelligence analyzer. Analyze the following excerpt from '{file_name}':\n\n"
            f"--- BEGIN DOCUMENT EXCERPT ---\n{sample_text[:6000]}\n--- END EXCERPT ---\n\n"
            "Respond with a valid JSON object matching this schema exactly:\n"
            "{\n"
            '  "summary": "Concise 2-sentence summary of the subject, course pattern, and academic scope.",\n'
            '  "detected_topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"],\n'
            '  "suggested_questions": [\n'
            '     "Specific question 1 answerable directly from this syllabus/notes",\n'
            '     "Specific question 2 about units or concepts",\n'
            '     "Specific question 3 about passing criteria or exams",\n'
            '     "Specific question 4 about practicals or assignments",\n'
            '     "Specific question 5 about course outcomes or textbooks"\n'
            "  ]\n"
            "}"
        )

        for candidate_model in self._get_candidate_models():
            try:
                model = self.genai.GenerativeModel(
                    candidate_model,
                    generation_config={
                        "temperature": 0.3,
                        "max_output_tokens": 800,
                        "response_mime_type": "application/json",
                    }
                )
                response = model.generate_content(prompt)
                if response and response.text:
                    cleaned_text = response.text.strip()
                    if cleaned_text.startswith("```"):
                        cleaned_text = re.sub(r"^```(?:json)?\s*", "", cleaned_text)
                        cleaned_text = re.sub(r"\s*```$", "", cleaned_text)
                    data = json.loads(cleaned_text)
                    return {
                        "summary": data.get("summary", default_result["summary"]),
                        "detected_topics": data.get("detected_topics", default_result["detected_topics"])[:6],
                        "suggested_questions": data.get("suggested_questions", default_result["suggested_questions"])[:6],
                    }
            except Exception as e:
                logger.warning(f"Gemini document overview with [{candidate_model}] failed: {e}")
                continue

        return default_result


gemini_client = GeminiClient()
