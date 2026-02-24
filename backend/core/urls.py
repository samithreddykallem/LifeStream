from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'organs', views.OrganViewSet)
router.register(r'requests', views.OrganRequestViewSet)

urlpatterns = [
    path('auth/register/', views.RegisterView.as_view()),
    path('auth/login/', views.login_view),
    path('auth/me/', views.get_me),
    path('admin/stats/', views.admin_stats),
    path('admin/requests/', views.admin_requests),
    path('admin/matches/', views.admin_matches),
    path('admin/matches/suggest/<int:requestId>/', views.suggest_matches),
    path('admin/users/', views.admin_users),
    path('admin/donors/', views.admin_donors),
    path('admin/users/<int:id>/', views.delete_user),
    path('requests/my/', views.user_requests),
    path('health/', views.health_check),
    path('', include(router.urls)),
]
