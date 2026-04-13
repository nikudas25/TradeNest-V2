from rest_framework.routers import DefaultRouter
from django.urls import path

from .views import (
    AddressViewSet,
    ChangePasswordView,
    LoginView,
    LogoutView,
    MeView,
    RegisterView,
    SellerProfileView,
    RequestOTPView,
    VerifyOTPView,
)

router = DefaultRouter()
router.register("addresses", AddressViewSet, basename="address")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("seller-profile/", SellerProfileView.as_view(), name="seller-profile"),
    path("request-otp/", RequestOTPView.as_view()),
    path("verify-otp/", VerifyOTPView.as_view()),
]

urlpatterns += router.urls
