from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = [
        ('ADMIN', 'Admin'),
        ('DONOR', 'Donor'),
        ('RECIPIENT', 'Recipient'),
    ]
    name = models.CharField(max_length=255)
    age = models.IntegerField(null=True, blank=True)
    gender = models.CharField(max_length=50, null=True, blank=True)
    blood_group = models.CharField(max_length=10, null=True, blank=True)
    contact = models.CharField(max_length=20, null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='DONOR')

    def __str__(self):
        return f"{self.username} ({self.role})"

class Organ(models.Model):
    STATUS_CHOICES = [
        ('AVAILABLE', 'Available'),
        ('MATCHED', 'Matched'),
    ]
    organ_type = models.CharField(max_length=100)
    blood_group = models.CharField(max_length=10)
    donor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='donated_organs')
    availability_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    date_added = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.organ_type} ({self.blood_group}) - {self.availability_status}"

class OrganRequest(models.Model):
    URGENCY_CHOICES = [
        ('CRITICAL', 'Critical'),
        ('HIGH', 'High'),
        ('MEDIUM', 'Medium'),
        ('LOW', 'Low'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organ_requests')
    organ_type = models.CharField(max_length=100)
    blood_group = models.CharField(max_length=10)
    urgency_level = models.CharField(max_length=20, choices=URGENCY_CHOICES, default='MEDIUM')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    date_requested = models.DateTimeField(auto_now_add=True)
    admin_note = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.organ_type} for {self.recipient.username} ({self.urgency_level})"

class Match(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
    ]
    donor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='matches_as_donor')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='matches_as_recipient')
    organ = models.ForeignKey(Organ, on_delete=models.CASCADE)
    request = models.ForeignKey(OrganRequest, on_delete=models.CASCADE)
    organ_type = models.CharField(max_length=100)
    matched_on = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')

    def __str__(self):
        return f"Match: {self.donor.username} -> {self.recipient.username} ({self.organ_type})"
