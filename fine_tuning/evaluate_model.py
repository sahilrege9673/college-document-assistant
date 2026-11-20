"""
evaluate_model.py - Holdout Test Evaluation for Student Intent Classification.

Evaluates either:
1. The trained LoRA adapter on DistilBERT, OR
2. The zero-dependency rule-based fallback classifier.
"""

import argparse
import json
import os
import sys
from typing import Dict, List

# Safe guard: Colab often has an older incompatible torchao (0.10.0) pre-installed.
try:
    import torchao
    from packaging import version
    if hasattr(torchao, "__version__") and version.parse(torchao.__version__) < version.parse("0.16.0"):
        sys.modules["torchao"] = None
except Exception:
    pass


def load_test_data(test_file: str) -> List[Dict[str, str]]:
    with open(test_file, "r", encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def evaluate_with_lora(adapter_path: str, test_data: List[Dict[str, str]]):
    """Evaluates the trained LoRA model on the test dataset."""
    import numpy as np
    import torch
    from peft import PeftConfig, PeftModel
    from sklearn.metrics import classification_report, confusion_matrix
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    print(f"Loading LoRA adapter from: {adapter_path}")
    
    # Load label mappings first
    label2id_file = os.path.join(adapter_path, "label2id.json")
    id2label_file = os.path.join(adapter_path, "id2label.json")
    with open(label2id_file, "r") as f:
        label2id = json.load(f)
    with open(id2label_file, "r") as f:
        id2label = {int(k): v for k, v in json.load(f).items()}

    config = PeftConfig.from_pretrained(adapter_path)
    base_model = AutoModelForSequenceClassification.from_pretrained(
        config.base_model_name_or_path,
        num_labels=len(label2id),
        id2label=id2label,
        label2id=label2id,
    )
    model = PeftModel.from_pretrained(base_model, adapter_path)
    tokenizer = AutoTokenizer.from_pretrained(adapter_path)
    model.eval()

    y_true = []
    y_pred = []

    for item in test_data:
        inputs = tokenizer(item["text"], return_tensors="pt", truncation=True, max_length=64)
        with torch.no_grad():
            outputs = model(**inputs)
            pred_idx = torch.argmax(outputs.logits, dim=-1).item()

        y_true.append(item["label"])
        y_pred.append(id2label[pred_idx])

    labels = sorted(list(label2id.keys()))
    print("\n" + "=" * 65)
    print("           LORA MODEL EVALUATION REPORT (TEST SET)           ")
    print("=" * 65)
    print(classification_report(y_true, y_pred, target_names=labels, zero_division=0))
    print("Confusion Matrix:")
    print(confusion_matrix(y_true, y_pred, labels=labels))


def evaluate_with_fallback(test_data: List[Dict[str, str]]):
    """Evaluates the rule-based fallback classifier on the test dataset."""
    backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)

    from app.fine_tuned_model.fallback import RuleBasedIntentClassifier

    classifier = RuleBasedIntentClassifier()
    y_true = []
    y_pred = []

    for item in test_data:
        predicted = classifier.classify(item["text"])
        y_true.append(item["label"])
        y_pred.append(predicted)

    try:
        from sklearn.metrics import classification_report
        print("\n" + "=" * 65)
        print("      RULE-BASED FALLBACK CLASSIFIER EVALUATION REPORT       ")
        print("=" * 65)
        print(classification_report(y_true, y_pred, zero_division=0))
    except ImportError:
        correct = sum(1 for yt, yp in zip(y_true, y_pred) if yt == yp)
        total = len(y_true)
        print(f"Fallback Classifier Accuracy: {correct}/{total} ({correct/total*100:.1f}%)")


def main():
    parser = argparse.ArgumentParser(description="Evaluate Intent Classifier on Test Split")
    parser.add_argument("--adapter_dir", type=str, default=os.path.join(os.path.dirname(__file__), "lora_adapter"))
    parser.add_argument("--test_file", type=str, default=os.path.join(os.path.dirname(__file__), "processed", "test.jsonl"))
    parser.add_argument("--mode", type=str, choices=["lora", "fallback"], default="fallback")
    args = parser.parse_args()

    if not os.path.exists(args.test_file):
        print(f"Error: Test file not found at {args.test_file}. Run prepare_dataset.py first.")
        sys.exit(1)

    test_data = load_test_data(args.test_file)
    print(f"Loaded {len(test_data)} holdout test examples.")

    if args.mode == "lora" and os.path.exists(args.adapter_dir):
        evaluate_with_lora(args.adapter_dir, test_data)
    else:
        print("Running evaluation on the fail-safe Rule-Based Intent Classifier...")
        evaluate_with_fallback(test_data)


if __name__ == "__main__":
    main()
