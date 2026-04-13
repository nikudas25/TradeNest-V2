import random
from django.core.mail import send_mail

def generate_otp():
    return str(random.randint(100000, 999999))

def send_otp_email(email, otp):
    send_mail(
        subject="TradeNest OTP Login",
        message=f"Your OTP is {otp}. It expires in 5 minutes. Dont share this with anyone!",
        from_email="store@example.com",
        recipient_list=[email],
    )