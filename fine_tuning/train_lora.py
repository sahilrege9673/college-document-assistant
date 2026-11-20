"""
train_lora.py - PEFT LoRA Fine-Tuning of DistilBERT for Query Intent Classification.

This script fine-tunes distilbert-base-uncased on the student intent dataset using
Hugging Face Transformers and PEFT (LoRA). It is fully compatible with the free
Google Colab T4 GPU or local CPU/GPU environments.
"""

import argparse
import json
import os
import random
import sys
from typing import Dict, List, Tuple

# Safe guard: Colab often has an older incompatible torchao (0.10.0) pre-installed.
try:
    import torchao
    from packaging import version
    if hasattr(torchao, "__version__") and version.parse(torchao.__version__) < version.parse("0.16.0"):
        sys.modules["torchao"] = None
except Exception:
    pass

try:
    import numpy as np
    import torch
    from datasets import Dataset
    from peft import LoraConfig, TaskType, get_peft_model
    from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
    from transformers import (
        AutoModelForSequenceClassification,
        AutoTokenizer,
        DataCollatorWithPadding,
        Trainer,
        TrainingArguments,
    )
except ImportError as e:
    print(
        f"Required libraries missing or incompatible ({e}). Install them via:\n"
        "pip uninstall -y torchao && pip install torch transformers datasets peft scikit-learn accelerate"
    )
    sys.exit(1)


INTENT_CLASSES = [
    "syllabus_question",
    "exam_question",
    "assignment_question",
    "attendance_question",
    "fee_question",
    "hostel_question",
    "general_college_question",
    "irrelevant_question",
]

DEFAULT_LABEL2ID = {label: idx for idx, label in enumerate(INTENT_CLASSES)}
DEFAULT_ID2LABEL = {idx: label for idx, label in enumerate(INTENT_CLASSES)}


def auto_prepare_dataset_if_missing(data_dir: str):
    """
    Automatically creates train, validation, and test splits with label mappings
    if the processed directory does not exist yet. Prevents FileNotFoundError.
    """
    os.makedirs(data_dir, exist_ok=True)
    label2id_file = os.path.join(data_dir, "label2id.json")
    train_file = os.path.join(data_dir, "train.jsonl")

    if os.path.exists(label2id_file) and os.path.exists(train_file):
        return

    print(f"\n[Info] Processed dataset not found in '{data_dir}'. Auto-preparing from dataset.jsonl...")

    # Search for dataset.jsonl
    candidates = [
        os.path.join(os.path.dirname(__file__), "dataset.jsonl"),
        os.path.join(os.getcwd(), "dataset.jsonl"),
        "/content/dataset.jsonl",
    ]
    raw_path = None
    for p in candidates:
        if os.path.exists(p):
            raw_path = p
            break

    if not raw_path:
        raise FileNotFoundError(
            f"Could not find 'dataset.jsonl'. Please ensure 'dataset.jsonl' is uploaded to {os.getcwd()}"
        )

    print(f"Reading raw dataset from: {raw_path}")
    records = []
    with open(raw_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))

    # Stratified 70% / 15% / 15% split
    random.seed(42)
    by_class: Dict[str, List[Dict[str, str]]] = {l: [] for l in INTENT_CLASSES}
    for item in records:
        if item.get("label") in by_class:
            by_class[item["label"]].append(item)

    train_set, val_set, test_set = [], [], []
    for label, items in by_class.items():
        random.shuffle(items)
        n = len(items)
        n_train = int(n * 0.70)
        n_val = int(n * 0.15)
        train_set.extend(items[:n_train])
        val_set.extend(items[n_train : n_train + n_val])
        test_set.extend(items[n_train + n_val :])

    random.shuffle(train_set)
    random.shuffle(val_set)
    random.shuffle(test_set)

    # Save splits
    for data, filename in [(train_set, "train.jsonl"), (val_set, "val.jsonl"), (test_set, "test.jsonl")]:
        with open(os.path.join(data_dir, filename), "w", encoding="utf-8") as f:
            for item in data:
                f.write(json.dumps(item, ensure_ascii=False) + "\n")

    with open(os.path.join(data_dir, "label2id.json"), "w", encoding="utf-8") as f:
        json.dump(DEFAULT_LABEL2ID, f, indent=2)
    with open(os.path.join(data_dir, "id2label.json"), "w", encoding="utf-8") as f:
        json.dump(DEFAULT_ID2LABEL, f, indent=2)

    print(f"✅ Successfully auto-generated: {len(train_set)} train, {len(val_set)} val, {len(test_set)} test samples.\n")


def load_split(file_path: str, label2id: Dict[str, int]) -> Dataset:
    """Loads a JSONL split file into a Hugging Face Dataset."""
    texts, labels = [], []
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            item = json.loads(line)
            texts.append(item["text"])
            labels.append(label2id[item["label"]])
    return Dataset.from_dict({"text": texts, "label": labels})


def compute_metrics(eval_pred):
    """Computes standard evaluation metrics."""
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=1)
    acc = accuracy_score(labels, preds)
    f1 = f1_score(labels, preds, average="macro", zero_division=0)
    precision = precision_score(labels, preds, average="macro", zero_division=0)
    recall = recall_score(labels, preds, average="macro", zero_division=0)
    return {
        "accuracy": acc,
        "f1_macro": f1,
        "precision_macro": precision,
        "recall_macro": recall,
    }


def main():
    parser = argparse.ArgumentParser(description="Train LoRA adapter on DistilBERT for intent classification")
    parser.add_argument("--model_name", type=str, default="distilbert-base-uncased")
    parser.add_argument("--data_dir", type=str, default=os.path.join(os.path.dirname(__file__), "processed"))
    parser.add_argument("--output_dir", type=str, default=os.path.join(os.path.dirname(__file__), "lora_adapter"))
    parser.add_argument("--batch_size", type=int, default=16)
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--lora_r", type=int, default=8)
    parser.add_argument("--lora_alpha", type=int, default=16)
    parser.add_argument("--lora_dropout", type=float, default=0.1)
    args = parser.parse_args()

    # Step 0: Ensure processed data directory exists, or auto-prepare it on the fly
    auto_prepare_dataset_if_missing(args.data_dir)

    # Load mappings
    label2id_file = os.path.join(args.data_dir, "label2id.json")
    id2label_file = os.path.join(args.data_dir, "id2label.json")
    with open(label2id_file, "r") as f:
        label2id = json.load(f)
    with open(id2label_file, "r") as f:
        id2label = {int(k): v for k, v in json.load(f).items()}

    num_labels = len(label2id)
    print(f"Loaded {num_labels} intent classes.")

    # Load tokenizer and raw splits
    tokenizer = AutoTokenizer.from_pretrained(args.model_name)
    train_ds = load_split(os.path.join(args.data_dir, "train.jsonl"), label2id)
    val_ds = load_split(os.path.join(args.data_dir, "val.jsonl"), label2id)

    # Tokenize dataset
    def tokenize_fn(batch):
        return tokenizer(batch["text"], truncation=True, max_length=64)

    train_tokenized = train_ds.map(tokenize_fn, batched=True)
    val_tokenized = val_ds.map(tokenize_fn, batched=True)

    # Load base sequence classification model
    print(f"Loading base model: {args.model_name}")
    base_model = AutoModelForSequenceClassification.from_pretrained(
        args.model_name,
        num_labels=num_labels,
        id2label=id2label,
        label2id=label2id,
    )

    # Configure LoRA PEFT
    peft_config = LoraConfig(
        task_type=TaskType.SEQ_CLS,
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        target_modules=["q_lin", "v_lin"],
        bias="none",
    )
    model = get_peft_model(base_model, peft_config)
    model.print_trainable_parameters()

    # Define training arguments with cross-version compatibility
    common_args = dict(
        output_dir=os.path.join(args.output_dir, "checkpoints"),
        save_strategy="epoch",
        learning_rate=args.lr,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        num_train_epochs=args.epochs,
        weight_decay=0.01,
        load_best_model_at_end=True,
        metric_for_best_model="f1_macro",
        greater_is_better=True,
        logging_steps=10,
        report_to="none",
    )

    try:
        training_args = TrainingArguments(eval_strategy="epoch", **common_args)
    except TypeError:
        training_args = TrainingArguments(evaluation_strategy="epoch", **common_args)

    data_collator = DataCollatorWithPadding(tokenizer=tokenizer)

    # Universal cross-version Trainer initialization (supports processing_class, tokenizer, and minimal args)
    trainer_kwargs = dict(
        model=model,
        args=training_args,
        train_dataset=train_tokenized,
        eval_dataset=val_tokenized,
        data_collator=data_collator,
        compute_metrics=compute_metrics,
    )

    try:
        trainer = Trainer(processing_class=tokenizer, **trainer_kwargs)
    except TypeError:
        try:
            trainer = Trainer(tokenizer=tokenizer, **trainer_kwargs)
        except TypeError:
            trainer = Trainer(**trainer_kwargs)

    print("\nStarting LoRA Fine-Tuning...")
    trainer.train()

    print(f"\nSaving fine-tuned LoRA adapter to: {args.output_dir}")
    os.makedirs(args.output_dir, exist_ok=True)
    model.save_pretrained(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)

    # Save id2label and label2id inside adapter folder for seamless inference
    with open(os.path.join(args.output_dir, "id2label.json"), "w") as f:
        json.dump(id2label, f, indent=2)
    with open(os.path.join(args.output_dir, "label2id.json"), "w") as f:
        json.dump(label2id, f, indent=2)

    print("LoRA adapter and tokenizer successfully saved.")


if __name__ == "__main__":
    main()
