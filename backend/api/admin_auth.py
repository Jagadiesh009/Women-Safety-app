from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging
import bcrypt
from jose import jwt, JWTError

from database.models import AdminUser, PasswordResetToken
from api.deps import get_db

router = APIRouter(prefix="/admin/auth", tags=["Admin Auth"])

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

# get_db imported from api.deps

# Schemas
class AdminLogin(BaseModel):
    admin_id: str
    password: str

class ForgotPasswordReq(BaseModel):
    email: EmailStr

class ResetPasswordReq(BaseModel):
    token: str
    new_password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def send_email(to_email: str, subject: str, html_body: str):
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASSWORD")
    
    if not all([smtp_host, smtp_user, smtp_pass]):
        logging.error("SMTP config missing. Cannot send email.")
        return False
        
    msg = MIMEMultipart()
    msg['From'] = smtp_user
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(html_body, 'html'))
    
    try:
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        logging.info(f"Successfully sent email to {to_email}")
        return True
    except Exception as e:
        logging.error(f"Failed to send email: {e}")
        return False

@router.post("/setup")
def setup_initial_admin(db: Session = Depends(get_db)):
    """Creates the initial admin if none exists (for dev/setup)"""
    try:
        if db.query(AdminUser).first():
            return {"msg": "Admin already exists"}
        
        # We will use the user's provided email and a default id
        admin = AdminUser(
            admin_id="admin",
            email="admin@safeher.app",
            password_hash=get_password_hash("admin123")
        )
        db.add(admin)
        db.commit()
        return {"msg": "Created initial admin. ID: admin, Pass: admin123"}
    except Exception as e:
        logging.error(f"Setup error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login", response_model=TokenResponse)
def login(creds: AdminLogin, db: Session = Depends(get_db)):
    user = db.query(AdminUser).filter(AdminUser.admin_id == creds.admin_id).first()
    if not user or not verify_password(creds.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid Admin ID or Password")
    
    access_token = create_access_token(data={"sub": user.admin_id})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordReq, db: Session = Depends(get_db)):
    # Fail fast if SMTP is not configured at all (server issue)
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASSWORD")
    if not all([smtp_host, smtp_user, smtp_pass]):
        logging.error("SMTP configuration is missing. Forgot password flow cannot proceed.")
        raise HTTPException(status_code=500, detail="Server Email Configuration is missing or incomplete.")

    user = db.query(AdminUser).filter(AdminUser.email == req.email).first()
    if not user:
        # Don't leak whether user exists
        logging.info(f"Forgot password requested for unknown email: {req.email}")
        return {"msg": "If your email is registered, you will receive a reset link shortly."}
        
    token = secrets.token_urlsafe(32)
    reset_entry = PasswordResetToken(
        admin_user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=1)
    )
    db.add(reset_entry)
    db.commit()
    
    # Build frontend reset URL
    frontend_url = os.environ.get("FRONTEND_URL", "https://safeher-admin-panel.vercel.app")
    reset_link = f"{frontend_url}/?reset_token={token}"
    
    body = f"""
    <h3>SafeHer Admin Password Reset</h3>
    <p>You requested a password reset for your SafeHer Admin account.</p>
    <p>Your Admin ID is: <strong>{user.admin_id}</strong></p>
    <p><a href="{reset_link}">Click here to reset your password</a></p>
    <p>This link will expire in 1 hour.</p>
    """
    
    success = send_email(user.email, "SafeHer Admin - Password Reset", body)
    if not success:
        logging.error(f"Failed to send password reset email to {req.email}")
        # Return generic message to prevent account enumeration, but log the error.
        return {"msg": "If your email is registered, you will receive a reset link shortly."}
    
    return {"msg": "If your email is registered, you will receive a reset link shortly."}

@router.post("/reset-password")
def reset_password(req: ResetPasswordReq, db: Session = Depends(get_db)):
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == req.token,
        PasswordResetToken.used == False,
        PasswordResetToken.expires_at > datetime.utcnow()
    ).first()
    
    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    user = reset_token.admin_user
    user.password_hash = get_password_hash(req.new_password)
    reset_token.used = True
    
    db.commit()
    return {"msg": "Password updated successfully"}
