from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User


class UserRegistrationSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'email', 'phone_number',
            'role', 'hospital', 'password', 'password_confirm',
        ]

    def validate_role(self, value):
        allowed = ('staff', 'viewer')
        if value not in allowed:
            raise serializers.ValidationError(
                f"Self-registration is not permitted for role '{value}'."
            )
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match.")
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')

        base = validated_data['email'].split('@')[0]
        username, counter = base, 1
        while User.objects.filter(username=username).exists():
            username = f'{base}{counter}'
            counter += 1
        validated_data['username'] = username

        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    hospital_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone_number',
            'role', 'hospital', 'hospital_name', 'is_verified',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'is_verified', 'created_at', 'updated_at']

    def get_hospital_name(self, obj):
        return obj.hospital.name if obj.hospital else None


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get('request'),
            username=attrs['email'],
            password=attrs['password'],
        )
        if not user:
            raise serializers.ValidationError('Invalid credentials.')
        if not user.is_active:
            raise serializers.ValidationError('Account is disabled.')
        attrs['user'] = user
        return attrs
