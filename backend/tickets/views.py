from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Avg
from .models import Ticket
from .serializers import TicketSerializer
from .ai_service import analyze_ticket_with_gemini
from .seed_data import SAMPLE_TICKETS

class TicketViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing bilingual support tickets.
    Automatically enriches tickets with Gemini AI language detection,
    category classification, urgency estimation, and cross-lingual summaries.
    """
    queryset = Ticket.objects.all().order_by('-created_at')
    serializer_class = TicketSerializer

    def get_queryset(self):
        """
        Supports optional query parameter filters:
        ?language=fr
        ?category=billing
        ?status=new
        ?urgency=high
        """
        queryset = super().get_queryset()
        language = self.request.query_params.get('language')
        category = self.request.query_params.get('category')
        status_param = self.request.query_params.get('status')
        urgency = self.request.query_params.get('urgency')

        if language and language != 'all':
            queryset = queryset.filter(detected_language=language)
        if category and category != 'all':
            queryset = queryset.filter(category=category)
        if status_param and status_param != 'all':
            queryset = queryset.filter(status=status_param)
        if urgency and urgency != 'all':
            queryset = queryset.filter(urgency=urgency)

        return queryset

    def perform_create(self, serializer):
        """
        Intercepts creation to enrich ticket with Gemini AI triage data.
        """
        original_text = serializer.validated_data.get('original_text', '')
        ai_data = analyze_ticket_with_gemini(original_text)

        serializer.save(
            detected_language=ai_data.get('detected_language', 'unknown'),
            category=ai_data.get('category', 'general_inquiry'),
            urgency=ai_data.get('urgency', 'medium'),
            translated_summary=ai_data.get('translated_summary', ''),
            confidence_score=ai_data.get('confidence_score', 0.0),
            reasoning=ai_data.get('reasoning', ''),
            status='new',
        )

    @action(detail=False, methods=['post'])
    def seed(self, request):
        """
        Seeds 16 realistic bilingual tickets across categories,
        analyzing each via the Gemini AI router.
        """
        created = []
        for sample in SAMPLE_TICKETS:
            # Skip duplicates if already present
            if Ticket.objects.filter(original_text=sample['original_text']).exists():
                continue

            ai_data = analyze_ticket_with_gemini(sample['original_text'])
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
            created.append(ticket)

        serializer = self.get_serializer(created, many=True)
        return Response({
            "message": f"Successfully seeded and analyzed {len(created)} tickets.",
            "count": len(created),
            "tickets": serializer.data
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['delete'])
    def clear(self, request):
        """
        Wipes all tickets from the database for easy testing reset.
        """
        count, _ = Ticket.objects.all().delete()
        return Response({
            "message": f"Cleared {count} tickets.",
            "deleted_count": count
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Returns aggregated routing statistics across all tickets.
        Useful for executive dashboard summaries and metrics.
        """
        total = Ticket.objects.count()
        if total == 0:
            return Response({
                "total": 0,
                "languages": {"fr": 0, "en": 0},
                "categories": {},
                "urgencies": {"high": 0, "medium": 0, "low": 0},
                "avg_confidence": 0.0
            })

        lang_counts = dict(Ticket.objects.values_list('detected_language').annotate(c=Count('id')))
        cat_counts = dict(Ticket.objects.values_list('category').annotate(c=Count('id')))
        urgency_counts = dict(Ticket.objects.values_list('urgency').annotate(c=Count('id')))
        avg_conf = Ticket.objects.aggregate(Avg('confidence_score'))['confidence_score__avg'] or 0.0

        return Response({
            "total": total,
            "languages": {
                "fr": lang_counts.get('fr', 0),
                "en": lang_counts.get('en', 0),
            },
            "categories": cat_counts,
            "urgencies": {
                "high": urgency_counts.get('high', 0),
                "medium": urgency_counts.get('medium', 0),
                "low": urgency_counts.get('low', 0),
            },
            "avg_confidence": round(avg_conf, 2),
        })

    @action(detail=True, methods=['patch'])
    def set_status(self, request, pk=None):
        """
        Quickly update the workflow status of a single ticket (new, in_progress, resolved).
        """
        ticket = self.get_object()
        new_status = request.data.get('status')
        if new_status in ['new', 'in_progress', 'resolved']:
            ticket.status = new_status
            ticket.save()
            return Response(self.get_serializer(ticket).data)
        return Response(
            {"error": "Invalid status. Must be 'new', 'in_progress', or 'resolved'."},
            status=status.HTTP_400_BAD_REQUEST
        )
