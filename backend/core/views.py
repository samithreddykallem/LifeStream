from rest_framework import viewsets, permissions, status, generics
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User, Organ, OrganRequest, Match
from .serializers import UserSerializer, RegisterSerializer, OrganSerializer, OrganRequestSerializer, MatchSerializer
from django.db.models import Count

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(req):
    username = req.data.get('username')
    password = req.data.get('password')
    user = authenticate(username=username, password=password)
    if user:
        refresh = RefreshToken.for_user(user)
        return Response({
            'token': str(refresh.access_token),
            'user': UserSerializer(user).data
        })
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_me(req):
    return Response(UserSerializer(req.user).data)

class OrganViewSet(viewsets.ModelViewSet):
    queryset = Organ.objects.all()
    serializer_class = OrganSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Organ.objects.filter(availability_status='AVAILABLE')
        organ_type = self.request.query_params.get('type')
        blood_group = self.request.query_params.get('bloodGroup')
        if organ_type:
            queryset = queryset.filter(organ_type=organ_type)
        if blood_group:
            queryset = queryset.filter(blood_group=blood_group)
        return queryset

    def perform_create(self, serializer):
        serializer.save(donor=self.request.user)

class OrganRequestViewSet(viewsets.ModelViewSet):
    queryset = OrganRequest.objects.all()
    serializer_class = OrganRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'ADMIN':
            return OrganRequest.objects.all().order_by('urgency_level', '-date_requested')
        return OrganRequest.objects.filter(recipient=self.request.user).order_by('-date_requested')

    def perform_create(self, serializer):
        serializer.save(recipient=self.request.user)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_stats(req):
    if req.user.role != 'ADMIN':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    donors = User.objects.filter(role='DONOR').count()
    recipients = User.objects.filter(role='RECIPIENT').count()
    pending = OrganRequest.objects.filter(status='PENDING').count()
    matches = Match.objects.count()
    
    return Response({
        'donors': donors,
        'recipients': recipients,
        'pending': pending,
        'matches': matches
    })

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def suggest_matches(req, requestId):
    if req.user.role != 'ADMIN':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        organ_request = OrganRequest.objects.get(id=requestId)
    except OrganRequest.DoesNotExist:
        return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)
    
    available_organs = Organ.objects.filter(
        organ_type=organ_request.organ_type,
        availability_status='AVAILABLE'
    )
    
    blood_compatibility = {
        "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
        "O+": ["O+", "A+", "B+", "AB+"],
        "A-": ["A-", "A+", "AB-", "AB+"],
        "A+": ["A+", "AB+"],
        "B-": ["B-", "B+", "AB-", "AB+"],
        "B+": ["B+", "AB+"],
        "AB-": ["AB-", "AB+"],
        "AB+": ["AB+"]
    }
    
    suggestions = []
    for organ in available_organs:
        compatible = blood_compatibility.get(organ.blood_group, [])
        if organ_request.blood_group in compatible:
            suggestions.append(OrganSerializer(organ).data)
            
    return Response(suggestions)

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def admin_matches(req):
    if req.user.role != 'ADMIN':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    
    if req.method == 'GET':
        matches = Match.objects.all().order_by('-matched_on')
        return Response(MatchSerializer(matches, many=True).data)

    donor_id = req.data.get('donor_id')
    recipient_id = req.data.get('recipient_id')
    organ_id = req.data.get('organ_id')
    request_id = req.data.get('request_id')
    organ_type = req.data.get('organ_type')
    
    try:
        donor = User.objects.get(id=donor_id)
        recipient = User.objects.get(id=recipient_id)
        organ = Organ.objects.get(id=organ_id)
        organ_request = OrganRequest.objects.get(id=request_id)
        
        match = Match.objects.create(
            donor=donor,
            recipient=recipient,
            organ=organ,
            request=organ_request,
            organ_type=organ_type,
            status='COMPLETED'
        )
        
        organ.availability_status = 'MATCHED'
        organ.save()
        
        organ_request.status = 'APPROVED'
        organ_request.admin_note = 'Matched with compatible donor'
        organ_request.save()
        
        return Response({'success': True})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_requests(req):
    if req.user.role != 'ADMIN':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    requests = OrganRequest.objects.all().order_by('urgency_level', '-date_requested')
    return Response(OrganRequestSerializer(requests, many=True).data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_requests(req):
    requests = OrganRequest.objects.filter(recipient=req.user).order_by('-date_requested')
    return Response(OrganRequestSerializer(requests, many=True).data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_users(req):
    if req.user.role != 'ADMIN':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    users = User.objects.exclude(role='ADMIN')
    return Response(UserSerializer(users, many=True).data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_donors(req):
    if req.user.role != 'ADMIN':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    donors = User.objects.filter(role='DONOR')
    return Response(UserSerializer(donors, many=True).data)

@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_user(req, id):
    if req.user.role != 'ADMIN':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    try:
        user = User.objects.get(id=id)
        user.delete()
        return Response({'success': True})
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def health_check(req):
    return Response({'status': 'healthy'})
