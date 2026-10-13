"""
Gemini AI Service Module for Ticket Routing
-------------------------------------------
Handles language detection, ticket categorization, urgency assessment, 
and cross-lingual summary generation using the official Google GenAI SDK (gemini-3.8-flash).
"""

import json
import logging
import os
import re
from typing import Literal, Dict, Any
from pydantic import BaseModel, Field
from django.conf import settings

logger = logging.getLogger(__name__)


# Pydantic schema enforcing structured JSON output from Gemini
class TicketAnalysisSchema(BaseModel):
    detected_language: Literal["en", "fr"] = Field(
        description="The primary language of the ticket: 'en' for English, 'fr' for French."
    )
    category: Literal["billing", "technical_issue", "general_inquiry", "complaint"] = Field(
        description="Classified ticket category based on customer intent: billing, technical_issue, general_inquiry, or complaint."
    )
    urgency: Literal["low", "medium", "high"] = Field(
        description="Urgency level based on operational severity, financial impact, and customer sentiment."
    )
    translated_summary: str = Field(
        description="Cross-lingual summary for team: if ticket is in French, provide 1-2 sentence English summary; if English, provide 1-2 sentence French summary."
    )
    confidence_score: float = Field(
        ge=0.0, le=1.0, 
        description="Confidence score between 0.0 and 1.0."
    )
    reasoning: str = Field(
        description="Brief explanation of why this language, category, and urgency were determined."
    )


SYSTEM_PROMPT = """You are an expert bilingual customer support ticket router and triage assistant for a business.
Analyze the provided support ticket text carefully:

1. Detect the primary language:
   - 'en' for English
   - 'fr' for French

2. Classify into exactly one category:
   - 'billing': questions about invoices, payments, refunds, duplicate charges, pricing plans, subscriptions, receipts.
   - 'technical_issue': bugs, server downtime, login errors, password resets, error messages, broken buttons/features, timeout errors.
   - 'general_inquiry': business hours, general product information, partnership inquiries, pre-sales questions, feature requests.
   - 'complaint': dissatisfied customers, negative feedback, poor experience, delays, anger, escalation requests.

3. Determine urgency level:
   - 'high': critical outages, security/access lockouts, severe customer frustration, direct revenue loss.
   - 'medium': standard billing questions, non-blocking bug reports, delayed responses.
   - 'low': general information inquiries, feature requests, partnership questions.

4. Generate a cross-lingual translated summary for team collaboration:
   - If ticket is in FRENCH ('fr'): Provide a crisp 1-2 sentence summary in ENGLISH for an English-speaking support agent.
   - If ticket is in ENGLISH ('en'): Provide a crisp 1-2 sentence summary in FRENCH for a French-speaking support agent.

5. Provide a confidence score (0.0 to 1.0) and brief reasoning.
Output strict JSON matching the requested schema.
"""


def _offline_fallback_analysis(ticket_text: str) -> Dict[str, Any]:
    """
    Intelligent heuristic fallback used when GEMINI_API_KEY is not yet supplied
    or if an API network timeout occurs. Enables full offline functionality.
    """
    text_lower = ticket_text.lower()
    
    # French indicator markers
    fr_markers = [
        'bonjour', 'merci', 'problème', 'facture', 'paiement', 'erreur', 
        'compte', 'remboursement', 'connexion', 'service', 'déçu', 'très', 
        'votre', 'notre', 'avec', 'pour', 'échéance', 'inadmissible', 'raccroché'
    ]
    fr_hits = sum(1 for w in fr_markers if w in text_lower)
    is_french = fr_hits >= 2 or any(c in text_lower for c in ['é', 'è', 'à', 'ç', 'ê', 'î', 'ô'])
    
    detected_language = "fr" if is_french else "en"

    # Category and Urgency heuristics
    if any(k in text_lower for k in ['inadmissible', 'scandaleux', 'plainte', 'colère', 'terrible', 'unacceptable', 'disappointed', 'complaint', 'awful', 'worst', 'raccroché']):
        category = 'complaint'
        urgency = 'high'
        en_sum = "Customer is lodging an urgent complaint regarding poor service and response times."
        fr_sum = "Le client exprime un vif mécontentement concernant la qualité du service et les délais."
    elif any(k in text_lower for k in ['panne', 'bloqué', 'crash', '500', 'locked out', 'timeout', 'erreur', 'bug', 'connexion', 'mot de passe', 'error', 'login', 'broken']):
        category = 'technical_issue'
        urgency = 'high' if any(k in text_lower for k in ['panne', 'downtime', 'bloqué', 'locked out', '500']) else 'medium'
        en_sum = "Customer is reporting a technical issue or error impacting their access."
        fr_sum = "Le client signale un problème technique affectant l'utilisation du service."
    elif any(k in text_lower for k in ['facture', 'paiement', 'remboursement', 'carte', 'invoice', 'billing', 'charge', 'refund', 'subscription', 'pricing', 'payment', 'débitée', 'overcharge']):
        category = 'billing'
        urgency = 'medium'
        en_sum = "Customer is requesting assistance regarding an invoice, charge, or payment discrepancy."
        fr_sum = "Le client demande une assistance concernant une facture ou un montant débité."
    else:
        category = 'general_inquiry'
        urgency = 'low'
        en_sum = "Customer is inquiring about product features, integrations, or general details."
        fr_sum = "Le client demande des informations générales sur les fonctionnalités ou les tarifs."

    translated_summary = en_sum if detected_language == 'fr' else fr_sum

    return {
        "detected_language": detected_language,
        "category": category,
        "urgency": urgency,
        "translated_summary": translated_summary,
        "confidence_score": 0.88,
        "reasoning": "Classified via rule-based heuristic classifier (set GEMINI_API_KEY in backend/.env for live Gemini 3.8 Flash model)."
    }


def analyze_ticket_with_gemini(ticket_text: str) -> Dict[str, Any]:
    """
    Analyzes ticket text using the official Google GenAI SDK.
    Returns a dictionary containing:
      - detected_language ('en' or 'fr')
      - category ('billing', 'technical_issue', 'general_inquiry', 'complaint')
      - urgency ('low', 'medium', 'high')
      - translated_summary
      - confidence_score
      - reasoning
    """
    api_key = getattr(settings, 'GEMINI_API_KEY', '') or os.environ.get('GEMINI_API_KEY', '')

    if not api_key or api_key.strip() == '' or api_key == 'your_gemini_api_key_here':
        logger.info("GEMINI_API_KEY not configured. Using heuristic triage engine.")
        return _offline_fallback_analysis(ticket_text)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        model_name = getattr(settings, 'GEMINI_MODEL', 'gemini-3.8-flash')

        prompt = f"{SYSTEM_PROMPT}\n\nCustomer Support Ticket:\n\"\"\"{ticket_text}\"\"\""

        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=TicketAnalysisSchema.model_json_schema(),
                temperature=0.1,
            )
        )

        raw_output = response.text.strip()
        result_dict = json.loads(raw_output)
        return result_dict

    except Exception as exc:
        logger.exception("Error during Gemini API call: %s. Using heuristic fallback.", exc)
        fallback = _offline_fallback_analysis(ticket_text)
        fallback["reasoning"] += f" [Gemini API notice: {str(exc)}]"
        return fallback
