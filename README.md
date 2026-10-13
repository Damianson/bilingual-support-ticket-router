# Bilingual (EN/FR) Support Ticket Router

An AI-powered customer support triage system that automatically detects whether a ticket is written in English or French, classifies it into business queues, estimates urgency, and provides an actionable cross-lingual executive summary for support agents.

---

## 🌟 Tech Stack

- **Backend**: Python 3.14, Django 5.2, Django REST Framework (DRF)
- **Database**: SQLite (Local development) / PostgreSQL (Production ready)
- **AI Triage Layer**: Google Gemini 3.8 Flash via the official `google-genai` SDK with Pydantic structured outputs
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons

---

## ⚡ Core Features

1. **Bilingual Detection & Cross-Lingual Summaries**:
   - Analyzes incoming messages in **English** or **French**.
   - If French $\rightarrow$ generates a 1-2 sentence **English summary** for English-speaking agents.
   - If English $\rightarrow$ generates a 1-2 sentence **French summary** for French-speaking agents.
2. **Business Categorization**:
   - `billing`: Invoices, overcharges, refunds, subscriptions.
   - `technical_issue`: 500 errors, bugs, API timeouts, authentication failures.
   - `general_inquiry`: Feature questions, pricing tiers, integrations.
   - `complaint`: Dissatisfied customers, service delays, escalations.
3. **Urgency Assessment**:
   - Automatically triaged into `low`, `medium`, or `high` urgency based on customer sentiment and operational severity.
4. **Interactive Dashboard**:
   - Real-time analytics ribbon (total tickets, language breakdown, urgency counts, average AI confidence).
   - Multi-dimensional filters (Language, Category, Urgency, Status, and search text).
   - One-click workflow status updates (`New` $\rightarrow$ `In Progress` $\rightarrow$ `Resolved`).
   - One-click demo presets and mock ticket seeding.

---

## 🚀 Quick Start (Local Development with WSL Ubuntu)

### 1. Clone the repository
```bash
git clone https://github.com/Damianson/bilingual-support-ticket-router.git
cd bilingual-support-ticket-router
```

### 2. Configure Environment Variables
Copy the template and add your Gemini API key:
```bash
cp backend/.env.example backend/.env
```
*(An offline fallback classifier is pre-wired, so the app runs smoothly even before adding an API key!)*

### 3. Start the Django Backend
```bash
cd backend
source venv/bin/activate
python manage.py migrate
python manage.py runserver
```
The API will be live at `http://127.0.0.1:8000/api/tickets/`

### 4. Start the React Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
The UI will be live at `http://localhost:5173`

---

## 🧪 Running the Verification Script

To test the AI triage pipeline and database operations from the command line:
```bash
cd backend
python test_pipeline.py
```

---

## 📄 License
MIT

