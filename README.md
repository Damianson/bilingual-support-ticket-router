# Bilingual (EN/FR) Support Ticket Router

An automated customer support triage system that detects whether an incoming ticket is written in English or French, classifies it into business queues, assesses urgency, and produces an actionable cross-lingual executive summary for support agents.

---

## Tech Stack

- **Backend**: Python 3.14, Django 5.2, Django REST Framework (DRF)
- **Database**: SQLite (Local rapid development) / PostgreSQL (Production toggle via `USE_POSTGRES=True`)
- **AI Triage Layer**: Google Gemini 3.8 Flash via official `google-genai` SDK with Pydantic structured schemas and automated failover (`gemini-3.8-flash` -> `gemini-3.5-flash-lite`)
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons

---

## Core Features

1. **Bilingual Detection & Cross-Lingual Summaries**:
   - Detects ticket language as **English (EN)** or **French (FR)**.
   - For French tickets: Generates a concise **English summary** for English-speaking agents.
   - For English tickets: Generates a concise **French summary** for French-speaking agents.
2. **Business Categorization**:
   - `billing`: Invoices, overcharges, refunds, subscriptions.
   - `technical_issue`: 500 errors, bugs, API timeouts, authentication failures.
   - `general_inquiry`: Feature questions, pricing tiers, integrations.
   - `complaint`: Dissatisfied customers, service delays, escalations.
3. **Urgency Assessment**:
   - Automatically triaged into `low`, `medium`, or `high` urgency based on customer sentiment and operational severity.
4. **Operations Cockpit**:
   - Live KPI overview (total ingested, pending triage, language distribution, high priority count, mean confidence).
   - Multi-dimensional filter toolbar (Language, Category, Urgency, Status, and full-text search).
   - One-click workflow status transitions (`New` -> `In Progress` -> `Resolved`).
   - One-click demonstration presets and dataset seeding.
   - Deterministic model audit trail drawer for inspecting Gemini's classification rationale.

---

## Quick Start (Local Development)

### 1. Clone the repository
```bash
git clone https://github.com/Damianson/bilingual-support-ticket-router.git
cd bilingual-support-ticket-router
```

### 2. Configure Environment Variables
Copy the template and supply your Gemini API key:
```bash
cp backend/.env.example backend/.env
```
In `backend/.env`, set:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start the Django Backend
```bash
cd backend
source venv/bin/activate
python manage.py migrate
python manage.py runserver
```
The REST API is live at `http://127.0.0.1:8000/api/tickets/`

### 4. Start the React Frontend
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
The interface is live at `http://localhost:5173`

---

## REST API Endpoints

- `GET /api/tickets/`: List and filter tickets (`?language=`, `?category=`, `?urgency=`, `?status=`).
- `POST /api/tickets/`: Ingest a new ticket (automatically triaged via Gemini).
- `GET /api/tickets/stats/`: Aggregated operations metrics (counts, breakdown, confidence).
- `PATCH /api/tickets/{id}/set_status/`: Update ticket workflow state (`new`, `in_progress`, `resolved`).
- `POST /api/tickets/seed/`: Populate 16 realistic bilingual sample tickets.
- `DELETE /api/tickets/clear/`: Reset database for clean testing.

---

## Verification & Testing

To execute the automated pipeline verification script:
```bash
cd backend
python test_pipeline.py
```

---

## Architecture Decisions

- **Deterministic Structured Output**: Uses Pydantic schemas via Gemini's constrained decoding (`response_json_schema`) with low temperature (0.1) to eliminate hallucinated JSON structures.
- **Model Resilience**: Automatically falls over from `gemini-3.8-flash` to `gemini-3.5-flash-lite` on transient 503 capacity errors.
- **Production UI**: Custom-built support dashboard adhering to strict functional UX standards without placeholder templates or decorative fluff.

---

## License
MIT
