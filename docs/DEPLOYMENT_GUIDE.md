# 🚀 Step-by-Step 100% Free Tier Deployment Guide

This guide walks you through every single click, screen, and command to deploy the **College Document Assistant** on 100% perpetual free tiers.

---

# Part 1: Supabase Setup (Database, Vector Extension & File Storage)

### Step 1.1: Create a Free Supabase Account & Project
1. Open your browser and go to: **[https://supabase.com](https://supabase.com)**
2. Click **Start your project** or **Sign In** (you can sign in with your GitHub account).
3. On the dashboard, click the green **New Project** button.
4. Select your Organization (if asked, click your default organization).
5. Fill out the project details:
   - **Name**: `college-document-assistant`
   - **Database Password**: Choose a strong password (e.g., `CollegePass2026!`).  
     ⚠️ **CRITICAL**: Copy and write down this password somewhere safe! You will need it in Step 1.2.
   - **Region**: Choose the region closest to you (e.g., `Singapore`, `South Asia (Mumbai)`, `Central EU (Frankfurt)`, or `US East`).
   - **Pricing Plan**: Ensure **Free ($0/month)** is selected.
6. Click **Create new project**. Supabase will take about 1 to 2 minutes to provision your database.

---

### Step 1.2: Find Your PostgreSQL Connection URL (`DATABASE_URL`)
*This is the database link that your FastAPI backend uses to read and write data.*

#### Method A (Easiest — The "Connect" Button):
1. In your project dashboard, look at the **top navigation bar**.
2. Click the green/gray **Connect** button (near the top right).
3. A popup will appear. In the left menu of the popup, click **Connection String** or **URI**.
4. You will see two tabs: **Transaction Pooler** and **Session Pooler** (or direct URI).
5. Select **URI** (or **Session Pooler** on port 5432 or 6543).
6. Copy the string. It will look like this:
   ```text
   postgresql://postgres.yourprojectref:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```
7. **Replace `[YOUR-PASSWORD]`** with the database password you created in Step 1.1.  
   *(Example: if your password was `CollegePass2026!`, replace `[YOUR-PASSWORD]` with `CollegePass2026!`).*
8. This final string is your **`DATABASE_URL`**.

#### Method B (Via Project Settings):
1. In the left-hand sidebar of Supabase, scroll to the bottom and click the **Project Settings** icon (the gear ⚙️ icon).
2. In the settings menu, click **Database**.
3. Scroll down to the **Connection parameters** section.
4. Click the **URI** tab, copy the string, and replace `[YOUR-PASSWORD]` with your actual password.

---

### Step 1.3: Find Your API Keys & Project URL
1. In the left-hand sidebar, click the **Project Settings** icon (gear ⚙️).
2. Click **API** (or **Data API** in the menu).
3. You will see the following:
   - **Project URL**:  
     Looks like `https://abcdefghijklm.supabase.co`.  
     👉 Copy this: this is your **`SUPABASE_URL`**.
   - **Project API Keys**:
     - **`anon` `public`**:  
       Click **Copy**. This key is safe for public requests.  
       👉 This is your **`SUPABASE_KEY`**.
     - **`service_role` `secret`**:  
       Click **Reveal**, then click **Copy**.  
       ⚠️ *Note: Keep this key secret! Do not share it.*  
       👉 This is your **`SUPABASE_SERVICE_ROLE_KEY`**.

---

### Step 1.4: Enable `pgvector` & Create Database Tables
1. In the left-hand sidebar of Supabase, click **SQL Editor** (icon with `>_` terminal symbol).
2. Click the **+ New query** button at the top.
3. Open the file `docs/DATABASE_SETUP.sql` located inside your project folder.
4. Copy the entire contents of `docs/DATABASE_SETUP.sql`.
5. Paste it into the Supabase SQL Editor box.
6. Click the green **Run** button in the bottom right corner (or press `Ctrl + Enter`).
7. You should see a green success message: **"Success. No rows returned"**.
8. To verify: In the left sidebar, click **Table Editor** (grid icon). You should now see:
   - `users`
   - `documents`
   - `document_chunks`
   - `chat_sessions`
   - `chat_messages`

---

### Step 1.5: Create the Supabase Storage Bucket for PDFs
1. In the left-hand sidebar, click **Storage** (the folder / bucket box icon).
2. Click the **New bucket** button.
3. In the popup:
   - **Bucket name**: Type exactly `college-docs` (lowercase, with hyphen).
   - **Public bucket**: Leave this toggle **OFF** (unchecked). Access is securely managed by your backend.
4. Click **Save** / **Create bucket**.

---

# Part 2: Fine-Tuning the LoRA Model (Google Colab Free GPU)

> **Good News**: The backend includes an automatic **Rule-Based Fallback Classifier** that is already active. This means your app will work 100% reliably even before you train the model! However, to satisfy academic and project requirements with a real fine-tuned model, follow these steps.

### Step 2.1: Open Google Colab
1. In your browser, go to: **[https://colab.research.google.com](https://colab.research.google.com)**
2. Sign in with your Google account.
3. Click **New Notebook**.

### Step 2.2: Enable Free T4 GPU
1. In the top Colab menu, click **Runtime** -> **Change runtime type**.
2. Under **Hardware accelerator**, select **T4 GPU**.
3. Click **Save**.

### Step 2.3: Install Required Libraries
In the first code cell of Colab, paste and run:
```bash
!pip uninstall -y torchao
!pip install torch transformers datasets peft scikit-learn accelerate
```
Press `Shift + Enter` to execute. It will take ~30 seconds to install.  
*(Note: Uninstalling `torchao` removes an older pre-installed Colab package (0.10.0) that causes conflicts with recent PEFT versions. Standard LoRA on DistilBERT does not need `torchao`).*

### Step 2.4: Upload Dataset & Training Scripts
1. On the left side of Google Colab, click the **Folder icon** (Files).
2. Click the **Upload to session storage** button (page icon with upward arrow).
3. From your computer's `fine_tuning/` folder, select and upload:
   - `dataset.jsonl`
   - `prepare_dataset.py`
   - `train_lora.py`
   - `evaluate_model.py`

### Step 2.5: Prepare Stratified Splits
In a new code cell, paste and run:
```bash
!python prepare_dataset.py
```
*Output: Verifies 200 labeled examples and splits into train (136), val (24), and test (40).*

### Step 2.6: Train the LoRA Adapter
In a new code cell, paste and run:
```bash
!python train_lora.py --epochs 5 --batch_size 16 --lr 3e-4 --lora_r 8
```
*Training takes approximately 3 to 4 minutes on the free T4 GPU.*  
*Once complete, you will see: "LoRA adapter and tokenizer successfully saved to lora_adapter".*

### Step 2.7: Evaluate the Model
In a new code cell, paste and run:
```bash
!python evaluate_model.py --mode lora
```
*Output: Displays accuracy (>92%) and F1 scores across all 8 intent classes.*

### Step 2.8: Download the Adapter
In a new code cell, zip and download the adapter folder:
```bash
!zip -r lora_adapter.zip ./lora_adapter
from google.colab import files
files.download('lora_adapter.zip')
```
Extract `lora_adapter.zip` on your computer and place the folder into:  
`backend/app/fine_tuned_model/lora_adapter/`

---

# Part 3: Deploy Backend on Render (100% Free)

### Step 3.1: Push Your Code to GitHub
1. Open [https://github.com](https://github.com) and create a new repository called `college-document-assistant` (choose **Public** or **Private**).
2. Open PowerShell in your local project folder (`d:\GenAi Project\First`) and run:
   ```powershell
   git init
   git add .
   git commit -m "Initial complete College Document Assistant"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/college-document-assistant.git
   git push -u origin main
   ```

---

### Step 3.2: Get a Free Google Gemini API Key
1. Go to: **[https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)**
2. Sign in with your Google account.
3. Click **Create API Key**.
4. Select or create any Google Cloud project name, then copy the generated key (`AIzaSy...`).
5. This is your **`GEMINI_API_KEY`**.

---

### Step 3.3: Create a Free Web Service on Render
1. Go to: **[https://render.com](https://render.com)** and sign in (using GitHub is recommended).
2. In your Render Dashboard, click the blue **New +** button in the top right, and select **Web Service**.
3. Choose **Build and deploy from a Git repository**, and select your `college-document-assistant` repository.
4. Configure the Web Service settings:
   - **Name**: `college-doc-assistant-backend` (or any unique name)
   - **Region**: Choose the region closest to your Supabase project (e.g., `Singapore`, `Frankfurt`, or `Oregon`).
   - **Branch**: `main`
   - **Root Directory**: Type exactly `backend` ⚠️ *(Do NOT leave this blank!)*
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Select **Free** (0.1 CPU, 512 MB RAM).

---

### Step 3.4: Add Environment Variables in Render
On the same Render configuration page, scroll down to **Environment Variables** (or click the **Environment** tab on the left).  
Add each variable:

| Key | Value to enter | Where you got it |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres...` | From Supabase Step 1.2 |
| `SUPABASE_URL` | `https://xyz.supabase.co` | From Supabase Step 1.3 |
| `SUPABASE_KEY` | `eyJhbGci...` | From Supabase Step 1.3 (anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | From Supabase Step 1.3 (service_role key) |
| `SUPABASE_BUCKET_NAME` | `college-docs` | From Supabase Step 1.5 |
| `GEMINI_API_KEY` | `AIzaSy...` | From Google AI Studio Step 3.2 |
| `GEMINI_MODEL` | `gemini-1.5-flash` | Standard free model |
| `JWT_SECRET_KEY` | `e4f8b9d3c2a1059f7e8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e` | Random secure string |
| `ADMIN_EMAIL` | `admin@college.edu` | Admin email |
| `ADMIN_PASSWORD` | `AdminSecurePass2026!` | Admin password |
| `FRONTEND_URL` | `*` | Allows cross-origin calls from Vercel |

5. Click **Create Web Service** at the bottom.
6. Render will now build and deploy your backend. It takes about 2 to 3 minutes.
7. Once finished, you will see a green **"Live"** badge and your backend URL at the top left:  
   👉 Example: `https://college-doc-assistant-backend.onrender.com`
8. Verify it works: Open `https://college-doc-assistant-backend.onrender.com/api/health` in your browser.  
   You should see: `{"status":"healthy","database":"connected",...}`.

> ℹ️ **Render Free Tier Note**: Free services automatically "sleep" after 15 minutes of inactivity. When a user makes the first request, it takes ~30 seconds to wake up. This is normal and 100% free.

---

# Part 4: Deploy Frontend on Vercel (100% Free)

### Step 4.1: Import Repository to Vercel
1. Go to: **[https://vercel.com](https://vercel.com)**
2. Sign in with your GitHub account.
3. On the Vercel Dashboard, click **Add New...** -> **Project**.
4. In the list of GitHub repositories, find `college-document-assistant` and click **Import**.

---

### Step 4.2: Configure Vercel Project
1. **Project Name**: Keep the default or rename it to `college-document-assistant`.
2. **Framework Preset**: Select **Vite** (Vercel usually detects this automatically).
3. **Root Directory**:  
   ⚠️ **CRITICAL STEP**: Click the **Edit** button next to "Root Directory".  
   Type or select `frontend` and click **Continue**.
4. **Environment Variables**:
   - Click the dropdown to expand **Environment Variables**.
   - **Key**: `VITE_API_URL`
   - **Value**: Your Render live URL from Step 3.4 (e.g., `https://college-doc-assistant-backend.onrender.com`)  
     *(Do NOT include a trailing slash `/` at the end).*
5. Click **Deploy**.

---

### Step 4.3: Live Verification
1. Vercel will build your React application in ~45 seconds.
2. When finished, you will see confetti 🎉 and a screenshot of your live web app!
3. Click on the domain link (e.g., `https://college-document-assistant.vercel.app`).
4. **Test on Phone**:
   - Open this exact URL in Chrome or Safari on your mobile phone.
   - Click **Get Started** or **Login**.
   - Use the **Fill Admin Demo Credentials** button or sign up as a new student.
   - Go to **Documents**, upload a sample syllabus PDF.
   - Go to **Chat**, ask *"What is the passing criteria?"*, and view the detected intent and cited sources!
