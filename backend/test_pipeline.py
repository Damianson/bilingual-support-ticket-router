import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ticket_router.settings')
django.setup()

from tickets.models import Ticket
from tickets.ai_service import analyze_ticket_with_gemini
from tickets.seed_data import SAMPLE_TICKETS

print("--- Testing Ticket Analysis Engine ---")
sample_fr = "Bonjour, j'ai été débitée deux fois pour ma facture de 49€. Merci de me rembourser d'urgence !"
result_fr = analyze_ticket_with_gemini(sample_fr)
print(f"Sample French Ticket:\n  Input: {sample_fr}")
print(f"  Detected Lang: {result_fr['detected_language']}")
print(f"  Category: {result_fr['category']}")
print(f"  Urgency: {result_fr['urgency']}")
print(f"  Translated Summary: {result_fr['translated_summary']}")
print(f"  Confidence: {result_fr['confidence_score']}")
print()

sample_en = "Help! Our entire production server is throwing 500 errors and our checkout is broken. We are losing thousands of dollars!"
result_en = analyze_ticket_with_gemini(sample_en)
print(f"Sample English Ticket:\n  Input: {sample_en}")
print(f"  Detected Lang: {result_en['detected_language']}")
print(f"  Category: {result_en['category']}")
print(f"  Urgency: {result_en['urgency']}")
print(f"  Translated Summary: {result_en['translated_summary']}")
print(f"  Confidence: {result_en['confidence_score']}")
print()

print(f"Current tickets in SQLite DB: {Ticket.objects.count()}")
print("--- Test Completed Successfully! ---")

