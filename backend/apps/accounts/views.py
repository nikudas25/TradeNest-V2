from rest_framework import generics, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import EmailOTP
from utils.otp import generate_otp, send_otp_email
from django.contrib.auth import get_user_model

User = get_user_model()

class RequestOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")

        user = User.objects.filter(email=email).first()
        if not user:
            return Response({"email": "User not found"}, status=404)
        otp = generate_otp()

        EmailOTP.objects.update_or_create(
            email=email,
            defaults={"otp": otp},
        )

        send_otp_email(email, otp)

        return Response({"message": "OTP sent successfully."})

class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")
        entered_otp = request.data.get("otp")

        try:
            otp_obj = EmailOTP.objects.get(email=email)
        except EmailOTP.DoesNotExist:
            return Response({"email": "No OTP found"}, status=400)

        if otp_obj.is_expired():
            return Response({"email": "OTP expired"}, status=400)

        if otp_obj.otp != entered_otp:
            return Response({"email": "Invalid OTP"}, status=400)

        user = User.objects.get(email=email)

        token, _ = Token.objects.get_or_create(user=user)

        otp_obj.delete()

        return Response({
            "token": token.key,
            "user": UserSerializer(user).data,
        })

from .models import Address, SellerProfile
from .serializers import (
    AddressSerializer,
    ChangePasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
    SellerProfileUpsertSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {"token": token.key, "user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        Token.objects.filter(user=request.user).delete()
        token = Token.objects.create(user=request.user)
        return Response({"token": token.key, "message": "Password updated successfully."})


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def make_default_shipping(self, request, pk=None):
        address = self.get_object()
        address.is_default_shipping = True
        address.save()
        return Response(self.get_serializer(address).data)

    @action(detail=True, methods=["post"])
    def make_default_billing(self, request, pk=None):
        address = self.get_object()
        address.is_default_billing = True
        address.save()
        return Response(self.get_serializer(address).data)


class SellerProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = SellerProfileUpsertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _ = SellerProfile.objects.get_or_create(
            user=self.request.user,
            defaults={
                "store_name": self.request.user.get_full_name() or self.request.user.username,
                "payout_email": self.request.user.email,
            },
        )
        return profile
