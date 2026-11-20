"""
prepare_dataset.py - Dataset Preparation and Stratified Splitting for LoRA Fine-Tuning.

This script parses fine_tuning/dataset.jsonl, validates all 8 intent classes,
generates id2label/label2id mapping dictionaries, and creates stratified
train (70%), validation (15%), and test (15%) splits.
"""

import json
import os
import random
from collections import Counter
from typing import Dict, List, Tuple

# All 8 mandatory academic intent classes
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

LABEL2ID: Dict[str, int] = {label: idx for idx, label in enumerate(INTENT_CLASSES)}
ID2LABEL: Dict[int, str] = {idx: label for idx, label in enumerate(INTENT_CLASSES)}


def load_dataset(file_path: str) -> List[Dict[str, str]]:
    """Loads JSONL dataset from disk."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Dataset file not found: {file_path}")

    records = []
    with open(file_path, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
                if "text" not in item or "label" not in item:
                    raise ValueError(f"Missing 'text' or 'label' key on line {line_num}")
                if item["label"] not in LABEL2ID:
                    raise ValueError(f"Unknown label '{item['label']}' on line {line_num}")
                records.append(item)
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON on line {line_num}: {e}")

    return records


def stratified_split(
    records: List[Dict[str, str]],
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    seed: int = 42,
) -> Tuple[List[Dict[str, str]], List[Dict[str, str]], List[Dict[str, str]]]:
    """Splits records into stratified train, val, and test subsets."""
    random.seed(seed)
    by_class: Dict[str, List[Dict[str, str]]] = {label: [] for label in INTENT_CLASSES}

    for item in records:
        by_class[item["label"]].append(item)

    train_set, val_set, test_set = [], [], []

    for label, items in by_class.items():
        random.shuffle(items)
        n = len(items)
        n_train = int(n * train_ratio)
        n_val = int(n * val_ratio)

        train_set.extend(items[:n_train])
        val_set.extend(items[n_train : n_train + n_val])
        test_set.extend(items[n_train + n_val :])

    random.shuffle(train_set)
    random.shuffle(val_set)
    random.shuffle(test_set)

    return train_set, val_set, test_set


def save_jsonl(records: List[Dict[str, str]], output_path: str) -> None:
    """Writes list of records to a JSONL file."""
    with open(output_path, "w", encoding="utf-8") as f:
        for item in records:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")


def main() -> None:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(base_dir, "dataset.jsonl"),
        os.path.join(os.getcwd(), "dataset.jsonl"),
        "/content/dataset.jsonl",
        "/content/fine_tuning/dataset.jsonl",
    ]
    input_file = next((p for p in candidates if os.path.exists(p)), os.path.join(base_dir, "dataset.jsonl"))
    data_dir = os.path.join(base_dir, "processed") if os.path.exists(base_dir) else os.path.join(os.getcwd(), "processed")
    os.makedirs(data_dir, exist_ok=True)

    print(f"Loading raw dataset from: {input_file}")
    records = load_dataset(input_file)
    print(f"Total labeled examples loaded: {len(records)}")

    # Print class counts
    counts = Counter(item["label"] for item in records)
    print("\nClass distribution:")
    for label in INTENT_CLASSES:
        print(f"  {label:<25}: {counts.get(label, 0)} examples")

    train_set, val_set, test_set = stratified_split(records)

    print(f"\nStratified Split Summary:")
    print(f"  Training set   : {len(train_set)} examples")
    print(f"  Validation set : {len(val_set)} examples")
    print(f"  Test set       : {len(test_set)} examples")

    # Save splits
    save_jsonl(train_set, os.path.join(data_dir, "train.jsonl"))
    save_jsonl(val_set, os.path.join(data_dir, "val.jsonl"))
    save_jsonl(test_set, os.path.join(data_dir, "test.jsonl"))

    # Save mappings
    with open(os.path.join(data_dir, "label2id.json"), "w", encoding="utf-8") as f:
        json.dump(LABEL2ID, f, indent=2)
    with open(os.path.join(data_dir, "id2label.json"), "w", encoding="utf-8") as f:
        json.dump(ID2LABEL, f, indent=2)

    print(f"\nProcessed dataset saved to: {data_dir}")


if __name__ == "__main__":
    main()
