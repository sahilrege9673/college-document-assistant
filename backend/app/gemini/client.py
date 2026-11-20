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

    def is_configured(self) -> bool:
        return self._configured

    def generate_answer(self, prompt: str, max_retries: int = 3) -> str:
        """
        Sends the grounded RAG prompt to Gemini with exponential backoff on rate limits.
        """
        if not self._configured:
            return (
                "⚠️ Gemini API Key not configured. Please set a valid `GEMINI_API_KEY` in your `.env` file "
                "from Google AI Studio (https://aistudio.google.com/app/apikey). "
                "The document retrieval engine successfully matched the relevant citations shown below."
            )

        for attempt in range(max_retries):
            try:
                model = self.genai.GenerativeModel(
                    model_name=self.model_name,
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
                logger.warning(f"Gemini generation attempt {attempt + 1} failed: {error_str}")

                # Check for rate limiting / quota exceeded
                if "429" in error_str or "quota" in error_str.lower() or "resource exhausted" in error_str.lower():
                    if attempt < max_retries - 1:
                        sleep_time = (2 ** attempt) + 1.0
                        logger.info(f"Rate limited by Google AI Studio. Backing off for {sleep_time}s...")
                        time.sleep(sleep_time)
                        continue
                    else:
                        return (
                            "⚠️ The free Gemini API rate limit has been temporarily reached. "
                            "Please wait 30 seconds and try asking again."
                        )

                # Return readable message on other errors
                return f"An error occurred while generating the answer: {error_str}"

        return "I could not find this information in the uploaded college documents."


gemini_client = GeminiClient()
