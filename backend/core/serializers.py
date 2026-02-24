from rest_framework import serializers
from .models import User, Organ, OrganRequest, Match

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'name', 'age', 'gender', 'blood_group', 'contact', 'role']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = User
        fields = ['username', 'password', 'name', 'age', 'gender', 'blood_group', 'contact', 'role']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            name=validated_data.get('name', ''),
            age=validated_data.get('age'),
            gender=validated_data.get('gender', ''),
            blood_group=validated_data.get('blood_group', ''),
            contact=validated_data.get('contact', ''),
            role=validated_data.get('role', 'DONOR')
        )
        return user

class OrganSerializer(serializers.ModelSerializer):
    donor_id = serializers.ReadOnlyField(source='donor.id')
    donor_name = serializers.ReadOnlyField(source='donor.name')
    class Meta:
        model = Organ
        fields = ['id', 'organ_type', 'blood_group', 'donor_id', 'donor_name', 'availability_status', 'date_added']

class OrganRequestSerializer(serializers.ModelSerializer):
    recipient_id = serializers.ReadOnlyField(source='recipient.id')
    recipient_name = serializers.ReadOnlyField(source='recipient.name')
    class Meta:
        model = OrganRequest
        fields = ['id', 'recipient_id', 'recipient_name', 'organ_type', 'blood_group', 'urgency_level', 'status', 'date_requested', 'admin_note']

class MatchSerializer(serializers.ModelSerializer):
    donor_id = serializers.ReadOnlyField(source='donor.id')
    donor_name = serializers.ReadOnlyField(source='donor.name')
    recipient_id = serializers.ReadOnlyField(source='recipient.id')
    recipient_name = serializers.ReadOnlyField(source='recipient.name')
    organ_id = serializers.ReadOnlyField(source='organ.id')
    request_id = serializers.ReadOnlyField(source='request.id')
    class Meta:
        model = Match
        fields = ['id', 'donor_id', 'donor_name', 'recipient_id', 'recipient_name', 'organ_id', 'request_id', 'organ_type', 'matched_on', 'status']
