import re
from typing import Dict, List, Tuple


class RuleBasedIntentClassifier:
    """
    Fail-safe rule-based keyword & regex intent classifier.
    Ensures that the backend NEVER fails or crashes even if PyTorch,
    transformers, or LoRA adapter weights are not present or cannot load.
    """

    # Priority weighting: more specialized academic intents receive higher weights
    INTENT_KEYWORDS: Dict[str, List[Tuple[str, int]]] = {
        "attendance_question": [
            (r"\battendance\b", 4),
            (r"\babsent\b", 3),
            (r"\bcondonation\b", 4),
            (r"\bmedical\s+leave\b", 4),
            (r"\bsick\s+leave\b", 4),
            (r"\bduty\s+leave\b", 4),
            (r"\b75\s*%\b", 4),
            (r"\b65\s*%\b", 4),
            (r"\bproxy\b", 3),
            (r"\bshortage\b", 3),
            (r"\bdetained\b", 3),
        ],
        "fee_question": [
            (r"\bfees?\b", 4),
            (r"\btuitions?\b", 4),
            (r"\bdues?\b", 3),
            (r"\binstallments?\b", 3),
            (r"\blate\s+fine\b", 4),
            (r"\bfines?\b", 3),
            (r"\bpayment\b", 3),
            (r"\breceipts?\b", 3),
            (r"\bscholarships?\b", 4),
            (r"\brefund\b", 3),
            (r"\bcaution\s+deposit\b", 4),
            (r"\bfinancial\s+aid\b", 4),
        ],
        "hostel_question": [
            (r"\bhostels?\b", 4),
            (r"\bmess\b", 4),
            (r"\bwardens?\b", 4),
            (r"\bcurfew\b", 4),
            (r"\bgate\s+pass\b", 4),
            (r"\bnight-?out\b", 4),
            (r"\broommates?\b", 3),
            (r"\bdorms?\b", 4),
            (r"\blaundry\b", 3),
            (r"\bovernight\s+leave\b", 4),
        ],
        "assignment_question": [
            (r"\bassignments?\b", 4),
            (r"\bsubmissions?\b", 3),
            (r"\bdeadlines?\b", 3),
            (r"\bdue\s+date\b", 3),
            (r"\bhomework\b", 3),
            (r"\bmini-?project\b", 3),
            (r"\bproject\s+report\b", 3),
            (r"\blab\s+manual\b", 3),
            (r"\blab\s+observation\b", 3),
            (r"\brubrics?\b", 4),
            (r"\bplagiarism\b", 3),
            (r"\blate\s+submission\b", 4),
        ],
        "syllabus_question": [
            (r"\bsyllabus\b", 4),
            (r"\bunit\s*\d+", 4),
            (r"\bmodule\s*\d+", 4),
            (r"\bcurriculum\b", 4),
            (r"\btextbook", 3),
            (r"\breference\s+book", 3),
            (r"\btopics?\s+covered\b", 3),
            (r"\bcourse\s+code\b", 3),
            (r"\bcredit\b", 2),
            (r"\bprerequisites?\b", 3),
            (r"\bprescribed\b", 2),
        ],
        "exam_question": [
            (r"\bexams?\b", 2),
            (r"\bexaminations?\b", 2),
            (r"\bmid-?term\b", 3),
            (r"\bpassing\s+marks?\b", 3),
            (r"\bpassing\s+criteria\b", 3),
            (r"\bpassing\s+percentage\b", 3),
            (r"\bgrades?\b", 2),
            (r"\bgrading\b", 2),
            (r"\bcgpa\b", 3),
            (r"\bsgpa\b", 3),
            (r"\bbacklogs?\b", 3),
            (r"\bsupplementary\b", 3),
            (r"\bre-?evaluation\b", 3),
            (r"\bquestion\s+paper\b", 3),
            (r"\badmit\s+card\b", 3),
            (r"\bhall\s+ticket\b", 3),
            (r"\binternal\s+test\b", 3),
            (r"\bmalpractice\b", 3),
        ],
        "general_college_question": [
            (r"\blibrary\b", 3),
            (r"\bprincipals?\b", 3),
            (r"\bcampus\b", 2),
            (r"\bcafeteria\b", 3),
            (r"\bcanteen\b", 3),
            (r"\bgym\b", 3),
            (r"\bhealth\s+center\b", 3),
            (r"\bdispensary\b", 3),
            (r"\bbonafide\b", 4),
            (r"\bid\s+card\b", 3),
            (r"\bplacement\b", 3),
            (r"\bclubs?\b", 2),
            (r"\bfests?\b", 2),
            (r"\bsecurity\b", 2),
            (r"\banti-?ragging\b", 4),
            (r"\bacademic\s+calendar\b", 3),
        ],
        "irrelevant_question": [
            (r"\bweather\b", 4),
            (r"\brecipe\b", 4),
            (r"\bcook(ing)?\b", 4),
            (r"\bmovie\b", 4),
            (r"\bworld\s+cup\b", 4),
            (r"\bcricket\b", 4),
            (r"\bfootball\b", 4),
            (r"\bjoke\b", 4),
            (r"\bpoem\b", 4),
            (r"\bpoetry\b", 4),
            (r"\bquantum\b", 4),
            (r"\bbitcoin\b", 4),
            (r"\bcrypto\b", 4),
            (r"\btesla\b", 4),
            (r"\bastronaut\b", 4),
            (r"\bchocolate\s+cake\b", 5),
            (r"\bpasta\b", 4),
        ],
    }

    def classify(self, text: str) -> str:
        """Classifies text into one of the 8 intent classes using weighted pattern matching."""
        text_lower = text.lower().strip()

        scores: Dict[str, int] = {intent: 0 for intent in self.INTENT_KEYWORDS}
        for intent, patterns in self.INTENT_KEYWORDS.items():
            for pat, weight in patterns:
                if re.search(pat, text_lower):
                    scores[intent] += weight

        best_intent, best_score = max(scores.items(), key=lambda x: x[1])
        if best_score > 0:
            return best_intent

        return "general_college_question"
