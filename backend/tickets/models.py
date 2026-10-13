from django.db import models

class Ticket(models.Model):
    """
    Support Ticket Model
    Stores customer messages and AI-enriched metadata for routing and triage.
    """

    CATEGORY_CHOICES = [
        ('billing', 'Billing & Invoicing'),
        ('technical_issue', 'Technical Issue'),
        ('general_inquiry', 'General Inquiry'),
        ('complaint', 'Customer Complaint'),
    ]

    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('fr', 'French'),
        ('unknown', 'Unknown'),
    ]

    STATUS_CHOICES = [
        ('new', 'New'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
    ]

    URGENCY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    # Customer & ticket submission details
    customer_name = models.CharField(max_length=150, default="Anonymous Customer")
    customer_email = models.EmailField(blank=True, default="customer@example.com")
    original_text = models.TextField(help_text="Original text submitted by customer")

    # Workflow & lifecycle
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='new',
        db_index=True
    )

    # Fields populated automatically by Gemini AI
    detected_language = models.CharField(
        max_length=10, 
        choices=LANGUAGE_CHOICES, 
        default='unknown',
        db_index=True,
        help_text="Language detected by Gemini AI (en or fr)"
    )
    category = models.CharField(
        max_length=50, 
        choices=CATEGORY_CHOICES, 
        blank=True, 
        null=True,
        db_index=True,
        help_text="Business category classified by Gemini AI"
    )
    urgency = models.CharField(
        max_length=20,
        choices=URGENCY_CHOICES,
        default='medium',
        db_index=True,
        help_text="Urgency level assessed by Gemini AI based on customer sentiment"
    )
    translated_summary = models.TextField(
        blank=True, 
        help_text="Cross-lingual summary for support team (FR -> EN, or EN -> FR)"
    )
    confidence_score = models.FloatField(
        default=0.0,
        help_text="AI classification confidence score between 0.0 and 1.0"
    )
    reasoning = models.TextField(
        blank=True,
        help_text="AI explanation for classification and language decision"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Ticket #{self.id} [{self.detected_language.upper()}] {self.category or 'Unassigned'} ({self.status})"
