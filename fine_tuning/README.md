# 🧠 Fine-Tuning Subsystem: Student Query Intent Classifier

> **Important Conceptual Note**:
> In this project, **Google Gemini 1.5 Flash** is used via API for final context-grounded answer generation.
> The fine-tuned model described here is a lightweight transformer (**DistilBERT**) fine-tuned with **PEFT LoRA** strictly for **Student Query Intent Classification** across 8 academic intent classes.
> We do NOT falsely claim that Gemini was fine-tuned.

---

## 1. Intent Taxonomy

Every incoming student question is classified into one of these 8 categories before RAG retrieval:

| # | Intent Class | Description | Example Query |
| :-: | :--- | :--- | :--- |
| 1 | `syllabus_question` | Course topics, units, textbooks, prerequisites | *"What topics are included in Unit 2 of Data Structures?"* |
| 2 | `exam_question` | Exam dates, patterns, marks distribution, grading | *"What is the passing criteria for end-semester exams?"* |
| 3 | `assignment_question` | Submission deadlines, project guidelines, formats | *"When is the deadline to submit Assignment 2 for OS?"* |
| 4 | `attendance_question` | Minimum percentage, medical leaves, condonation | *"What is the minimum attendance required to sit for exams?"* |
| 5 | `fee_question` | Tuition dues, late fines, refunds, scholarships | *"When is the last date to pay the semester fee without fine?"* |
| 6 | `hostel_question` | Curfew timings, mess rules, room changes, leaves | *"What is the curfew timing for entering the college hostel?"* |
| 7 | `general_college_question` | Library hours, campus facilities, administration | *"What are the library operating hours on weekdays?"* |
| 8 | `irrelevant_question` | Out-of-domain queries unrelated to college | *"Who won the FIFA World Cup in 2022?"* |

---

## 2. Google Colab Free T4 GPU Walkthrough

Follow these simple steps to run fine-tuning on a free GPU:

### Step 1: Open Google Colab
1. Navigate to [https://colab.research.google.com](https://colab.research.google.com).
2. Click **New Notebook**.
3. Select **Runtime -> Change runtime type -> T4 GPU** (Free tier).

### Step 2: Install Dependencies
In the first Colab cell, execute:
```bash
!pip uninstall -y torchao
!pip install torch transformers datasets peft scikit-learn accelerate
```

### Step 3: Upload the Dataset Files
Upload `dataset.jsonl`, `prepare_dataset.py`, `train_lora.py`, and `evaluate_model.py` to the Colab session root.

### Step 4: Prepare the Stratified Dataset
```bash
!python prepare_dataset.py
```
This splits the 200+ samples into stratified `train.jsonl`, `val.jsonl`, and `test.jsonl`.

### Step 5: Execute LoRA Fine-Tuning
```bash
!python train_lora.py --epochs 5 --batch_size 16 --lr 3e-4 --lora_r 8
```
*Expected training time on T4 GPU: ~3 to 4 minutes.*

### Step 6: Evaluate Holdout Test Set
```bash
!python evaluate_model.py --mode lora
```
*Expected performance*:
- **Accuracy**: > 92%
- **Macro F1-Score**: > 0.90

### Step 7: Export Adapter
The adapter weights and tokenizer configuration are saved to `./lora_adapter` (~1.2 MB total).
You can zip and download it:
```bash
!zip -r lora_adapter.zip ./lora_adapter
```

---

## 3. Integrating with the Backend

You have two simple options to serve the model:

### Option A: Local Adapter Directory (Default)
Place the extracted `lora_adapter/` folder into:
`backend/app/fine_tuned_model/lora_adapter/`
FastAPI will detect the directory and load the adapter weights on startup.

### Option B: Push to Hugging Face Hub (Cloud)
In Colab:
```python
from huggingface_hub import login
login("YOUR_HF_TOKEN")
model.push_to_hub("your-username/college-query-intent-lora")
tokenizer.push_to_hub("your-username/college-query-intent-lora")
```
Then set in `backend/.env`:
```env
HUGGINGFACE_REPO_ID=your-username/college-query-intent-lora
```

---

## 4. Zero-Downtime Rule-Based Fallback

The backend includes `app/fine_tuned_model/fallback.py`.
If:
- The LoRA weights are not present,
- The backend is deployed on a free 512MB RAM tier, or
- `USE_FALLBACK_CLASSIFIER=true` is set in `.env`

The backend automatically falls back to regex-based intent classification. The application **will never crash or return errors**, ensuring complete reliability during tests and live demos.
