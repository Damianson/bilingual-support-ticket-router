from rest_framework import serializers
from .models import Ticket

class TicketSerializer(serializers.ModelSerializer):
    """
    Serializer for the Ticket model.
    AI fields (detected_language, category, urgency, translated_summary, 
    confidence_score, reasoning) are marked as read-only because they are 
    automatically computed by the Gemini AI triage layer on the backend.
    """
    class Meta:
        model = Ticket
        fields = [
            'id',
            'customer_name',
            'customer_email',
            'original_text',
            'status',
            'detected_language',
            'category',
            'urgency',
            'translated_summary',
            'confidence_score',
            'reasoning',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'detected_language',
            'category',
            'urgency',
            'translated_summary',
            'confidence_score',
            'reasoning',
            'created_at',
            'updated_at',
        ]
