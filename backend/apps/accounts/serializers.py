from django.contrib.auth import authenticate, get_user_model
from django.db.models import Q
from rest_framework import serializers

from .models import Address, SellerProfile, SellerRating

User = get_user_model()


class AddressSerializer(serializers.ModelSerializer):
    formatted = serializers.ReadOnlyField()

    class Meta:
        model = Address
        fields = [
            "id",
            "label",
            "recipient_name",
            "phone_number",
            "street_line_1",
            "street_line_2",
            "city",
            "state",
            "postal_code",
            "country",
            "landmark",
            "delivery_notes",
            "is_default_shipping",
            "is_default_billing",
            "formatted",
            "created_at",
            "updated_at",
        ]


class SellerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellerProfile
        fields = [
            "id",
            "store_name",
            "slug",
            "bio",
            "city",
            "payout_email",
            "payout_email",
            "account_holder_name",
            "bank_account_number",
            "is_verified",
            "seller_rating",
            "total_sales",
            "escrow_policy",
        ]
        read_only_fields = ["slug", "is_verified", "seller_rating", "total_sales"]


class UserSerializer(serializers.ModelSerializer):
    addresses = AddressSerializer(many=True, read_only=True)
    seller_profile = SellerProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "avatar_url",
            "loyalty_points",
            "marketing_opt_in",
            "is_seller",
            "seller_profile",
            "addresses",
        ]
        read_only_fields = ["loyalty_points"]


class RegisterSerializer(serializers.ModelSerializer):
    account_holder_name = serializers.CharField(required=False, allow_blank=True, write_only=True)
    bank_account_number = serializers.CharField(required=False, allow_blank=True, write_only=True)
    ifsc_code = serializers.CharField(required=False, allow_blank=True, write_only=True)
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    is_seller = serializers.BooleanField(required=False, default=False)
    store_name = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "confirm_password",
            "first_name",
            "last_name",
            "phone_number",
            "marketing_opt_in",
            "is_seller",
            "store_name",
            "account_holder_name",
            "bank_account_number",
            "ifsc_code",
        ]

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError("Passwords do not match.")
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        is_seller = validated_data.pop("is_seller", False)
        store_name = validated_data.pop("store_name", "")
        provided_username = validated_data.pop("username", "")
        validated_data["email"] = validated_data["email"].lower()
        username = provided_username or validated_data["email"].split("@")[0]
        original_username = username
        suffix = 1
        while User.objects.filter(username=username).exists():
            suffix += 1
            username = f"{original_username}{suffix}"
        account_holder_name = validated_data.pop("account_holder_name", None)
        bank_account_number = validated_data.pop("bank_account_number", None)
        ifsc_code = validated_data.pop("ifsc_code", None)
        user = User.objects.create_user(username=username, is_seller=is_seller, **validated_data)
        if is_seller:
            SellerProfile.objects.create(
                user=user,
                store_name=store_name or user.get_full_name() or user.username,
                payout_email=user.email,
                account_holder_name=account_holder_name,
                bank_account_number=bank_account_number,
                ifsc_code=ifsc_code,
            )
        return user


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifier = attrs.get("identifier", "").strip()
        password = attrs.get("password")
        user = User.objects.filter(
            Q(username__iexact=identifier) | Q(phone_number=identifier) | Q(email__iexact=identifier)
        ).first()
        if not user:
            raise serializers.ValidationError("Invalid credentials.")
        authenticated = authenticate(username=user.username, password=password)
        if not authenticated:
            raise serializers.ValidationError("Invalid credentials.")
        attrs["user"] = authenticated
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError("New passwords do not match.")
        request = self.context["request"]
        if not request.user.check_password(attrs["current_password"]):
            raise serializers.ValidationError("Current password is incorrect.")
        return attrs


class SellerProfileUpsertSerializer(SellerProfileSerializer):
    class Meta(SellerProfileSerializer.Meta):
        read_only_fields = ["slug", "is_verified", "seller_rating", "total_sales"]


class SellerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellerRating
        fields = ["id", "rating", "review", "created_at"]