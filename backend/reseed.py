import os
import time
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ticket_router.settings')
django.setup()

from tickets.models import Ticket
from tickets.ai_service import analyze_ticket_with_gemini
from tickets.seed_data import SAMPLE_TICKETS

print(f"Starting Gemini 3.8 Flash reseed for {len(SAMPLE_TICKETS)} tickets...")
Ticket.objects.all().delete()

for idx, sample in enumerate(SAMPLE_TICKETS, start=1):
    start_t = time.time()
    ai_data = analyze_ticket_with_gemini(sample['original_text'])
    elapsed = time.time() - start_t

    ticket = Ticket.objects.create(
        customer_name=sample['customer_name'],
        customer_email=sample['customer_email'],
        original_text=sample['original_text'],
        detected_language=ai_data.get('detected_language', 'unknown'),
        category=ai_data.get('category', 'general_inquiry'),
        urgency=ai_data.get('urgency', 'medium'),
        translated_summary=ai_data.get('translated_summary', ''),
        confidence_score=ai_data.get('confidence_score', 0.0),
        reasoning=ai_data.get('reasoning', ''),
        status='new',
    )
    print(f"[{idx:02d}/{len(SAMPLE_TICKETS)}] #{ticket.id} [{ticket.detected_language.upper()}] "
          f"{ticket.category:<16} | Urgency: {ticket.urgency:<6} | "
          f"Conf: {ticket.confidence_score*100:.0f}% ({elapsed:.2f}s) - {ticket.customer_name}")

print(f"\nSuccessfully seeded all {Ticket.objects.count()} tickets with live Gemini 3.8 Flash triage!")
