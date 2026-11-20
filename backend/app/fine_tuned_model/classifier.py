import logging
import os
from typing import Optional
from app.config import settings
from app.fine_tuned_model.fallback import RuleBasedIntentClassifier

logger = logging.getLogger("app.classifier")


class IntentClassifierService:
    """
    Unified Query Intent Classifier Service.
    Seamlessly loads fine-tuned LoRA weights if available, otherwise delegates
    to the rule-based fallback so the API maintains 100% uptime.
    """

    def __init__(self):
        self.fallback = RuleBasedIntentClassifier()
        self.model = None
        self.tokenizer = None
        self.id2label = None
        self.mode = "fallback_rules"

        if not settings.USE_FALLBACK_CLASSIFIER:
            self._try_load_lora_model()

    def _try_load_lora_model(self):
        """Attempts to load the fine-tuned LoRA model weights from disk or HF."""
        try:
            import json
            import torch
            from peft import PeftConfig, PeftModel
            from transformers import AutoModelForSequenceClassification, AutoTokenizer

            adapter_path = os.path.join(os.path.dirname(__file__), "lora_adapter")
            hf_repo = settings.HUGGINGFACE_REPO_ID

            target_path = None
            if os.path.exists(adapter_path) and os.path.exists(os.path.join(adapter_path, "adapter_config.json")):
                target_path = adapter_path
            elif hf_repo:
                target_path = hf_repo

            if target_path:
                logger.info(f"Loading LoRA Intent Classification adapter from: {target_path}")
                config = PeftConfig.from_pretrained(target_path)
                base_model = AutoModelForSequenceClassification.from_pretrained(
                    config.base_model_name_or_path,
                    num_labels=8
                )
                self.model = PeftModel.from_pretrained(base_model, target_path)
                self.tokenizer = AutoTokenizer.from_pretrained(target_path)
                self.model.eval()

                mapping_file = os.path.join(adapter_path, "id2label.json")
                if os.path.exists(mapping_file):
                    with open(mapping_file, "r") as f:
                        self.id2label = {int(k): v for k, v in json.load(f).items()}

                self.mode = "lora_adapter"
                logger.info("LoRA Intent Classifier successfully loaded.")
            else:
                logger.info("No LoRA weights found; active in robust rule-based fallback mode.")
        except Exception as e:
            logger.warning(f"Could not load LoRA model ({e}). Gracefully using rule-based fallback.")
            self.mode = "fallback_rules"

    def classify(self, text: str) -> str:
        """Classifies student query intent into one of 8 classes."""
        if self.mode == "lora_adapter" and self.model and self.tokenizer:
            try:
                import torch
                inputs = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=64)
                with torch.no_grad():
                    outputs = self.model(**inputs)
                    idx = torch.argmax(outputs.logits, dim=-1).item()
                if self.id2label and idx in self.id2label:
                    return self.id2label[idx]
            except Exception as e:
                logger.error(f"LoRA inference error ({e}). Falling back to rules.")

        return self.fallback.classify(text)

    def get_mode(self) -> str:
        return self.mode


classifier_service = IntentClassifierService()
