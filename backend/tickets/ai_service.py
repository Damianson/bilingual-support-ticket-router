"""
Gemini AI Service Module for Ticket Routing
-------------------------------------------
Production-grade AI triage engine powered by Google Gemini.
Extracts structured metadata (language, category, urgency, cross-lingual summary)
using the official Google GenAI SDK and Pydantic schema constraints.

Resilience Strategy:
- Primary Model: gemini-3.8-flash
- Failover Model: gemini-3.5-flash-lite (activated if primary hits temporary 503 spikes)
"""

import json
import logging
import os
import time
from typing import Literal, Dict, Any
from pydantic import BaseModel, Field
from django.conf import settings
from google import genai
from google.genai import types
from google.genai.errors import ServerError, APIError

logger = logging.getLogger(__name__)


class TicketAnalysisSchema(BaseModel):
    """
    Pydantic schema enforcing deterministic, structured JSON output from Gemini.
    Constrained decoding ensures the model returns valid JSON matching these types.
    """
    detected_language: Literal["en", "fr"] = Field(
        description="The primary language of the ticket: 'en' for English, 'fr' for French."
    )
    category: Literal["billing", "technical_issue", "general_inquiry", "complaint"] = Field(
        description="Classified ticket category: 'billing', 'technical_issue', 'general_inquiry', or 'complaint'."
    )
    urgency: Literal["low", "medium", "high"] = Field(
        description="Assessed urgency: 'high' for critical outages/lockouts/escalations; 'medium' for standard billing/bugs; 'low' for inquiries."
    )
    translated_summary: str = Field(
        description="Cross-lingual summary: if original is French, provide 1-2 sentence English summary; if English, provide 1-2 sentence French summary."
    )
    confidence_score: float = Field(
        ge=0.0, le=1.0, 
        description="Classification confidence score between 0.0 and 1.0."
    )
    reasoning: str = Field(
        description="Brief explanation of why this language, category, and urgency were determined."
    )


SYSTEM_PROMPT = """You are an expert bilingual customer support ticket router and triage assistant.
Analyze the provided customer support ticket text carefully:

1. Detect the primary language:
   - 'en' for English
   - 'fr' for French

2. Classify into exactly one category:
   - 'billing': invoices, payment issues, double charges, subscriptions, refunds, receipts.
   - 'technical_issue': bugs, server downtime, login errors, password resets, error messages, timeouts.
   - 'general_inquiry': business hours, product information, partnership inquiries, pre-sales questions.
   - 'complaint': dissatisfied customers, negative feedback, poor experience, delays, escalation requests.

3. Determine urgency level:
   - 'high': critical outages, security lockouts, severe customer frustration, direct business loss.
   - 'medium': standard billing disputes, non-blocking bug reports, follow-ups.
   - 'low': general questions, pricing inquiries, feature requests.

4. Generate a cross-lingual translated summary for team collaboration:
   - If ticket is in FRENCH ('fr'): Provide a concise 1-2 sentence summary in ENGLISH for an English-speaking agent.
   - If ticket is in ENGLISH ('en'): Provide a concise 1-2 sentence summary in FRENCH for a French-speaking agent.

5. Provide a confidence score (0.0 to 1.0) and brief reasoning.
Output strict JSON matching the requested schema.
"""


def analyze_ticket_with_gemini(ticket_text: str) -> Dict[str, Any]:
    """
    Sends ticket text to Gemini for structured classification.
    Tries primary model (gemini-3.8-flash) first; if Google returns a 503 
    capacity spike, automatically fails over to gemini-3.5-flash-lite.
    """
    api_key = getattr(settings, 'GEMINI_API_KEY', '') or os.environ.get('GEMINI_API_KEY', '')

    if not api_key or api_key.strip() in ('', 'your_gemini_api_key_here'):
        raise ValueError(
            "GEMINI_API_KEY is not configured. Please supply a valid key in backend/.env"
        )

    client = genai.Client(api_key=api_key)
    prompt = f"{SYSTEM_PROMPT}\n\nCustomer Support Ticket:\n\"\"\"{ticket_text}\"\"\""
    
    # Candidate models in order of priority
    models_to_try = [
        getattr(settings, 'GEMINI_MODEL', 'gemini-3.8-flash'),
        'gemini-3.5-flash-lite'
    ]

    last_error = None
    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_json_schema=TicketAnalysisSchema.model_json_schema(),
                    temperature=0.1,  # Low temperature for deterministic classification
                )
            )

            raw_output = response.text.strip()
            return json.loads(raw_output)

        except (ServerError, APIError) as exc:
            last_error = exc
            logger.warning("Model %s unavailable (%s). Attempting failover...", model_name, exc)
            time.sleep(1)
        except Exception as exc:
            logger.exception("Unexpected error during Gemini analysis with %s: %s", model_name, exc)
            raise

    raise RuntimeError(f"All Gemini models failed. Last error: {last_error}")
