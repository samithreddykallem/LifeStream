from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Organ, OrganRequest, Match

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ['username', 'email', 'name', 'role', 'blood_group', 'is_staff']
    fieldsets = UserAdmin.fieldsets + (
        ('Profile Information', {'fields': ('name', 'age', 'gender', 'blood_group', 'contact', 'role')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Profile Information', {'fields': ('name', 'age', 'gender', 'blood_group', 'contact', 'role')}),
    )

admin.site.register(User, CustomUserAdmin)

@admin.register(Organ)
class OrganAdmin(admin.ModelAdmin):
    list_display = ['organ_type', 'blood_group', 'donor', 'availability_status', 'date_added']
    list_filter = ['organ_type', 'blood_group', 'availability_status']

@admin.register(OrganRequest)
class OrganRequestAdmin(admin.ModelAdmin):
    list_display = ['organ_type', 'recipient', 'blood_group', 'urgency_level', 'status', 'date_requested']
    list_filter = ['organ_type', 'urgency_level', 'status']

@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ['organ_type', 'donor', 'recipient', 'status', 'matched_on']
    list_filter = ['organ_type', 'status']
