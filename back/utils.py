import random
import string
from datetime import datetime, timedelta
from flask_mail import Message
from models import db, VerificationCode
import jwt
from config import Config


def generate_verification_code():
    """生成6位数字验证码"""
    return ''.join(random.choices(string.digits, k=6))


def create_verification_code(email):
    """创建验证码记录"""
    code = generate_verification_code()
    expires_at = datetime.utcnow() + timedelta(minutes=Config.VERIFICATION_CODE_EXPIRY)
    
    # 使现有未使用的验证码失效
    VerificationCode.query.filter_by(email=email, is_used=False).update({'is_used': True})
    
    # 创建新验证码
    verification = VerificationCode(
        email=email,
        code=code,
        expires_at=expires_at
    )
    db.session.add(verification)
    db.session.commit()
    
    return code


def send_verification_email(mail, email, code):
    """发送验证码邮件（过滤admin邮箱）"""
    # 过滤掉admin默认邮箱，避免发送到无效邮箱导致退信
    ADMIN_EMAILS = ['admin@xu-news.com', 'admin@example.com']
    
    if email in ADMIN_EMAILS:
        print(f"阻止发送验证码到admin邮箱: {email}")
        return False
    
    if '@' not in email:
        print(f"邮箱格式无效: {email}")
        return False
    
    try:
        msg = Message(
            subject='XU-News-AI-RAG 注册验证码',
            recipients=[email],
            html=f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1677ff;">XU-News-AI-RAG</h2>
                <p>您好！</p>
                <p>感谢您注册 XU-News-AI-RAG 个性化新闻智能知识库。</p>
                <p>您的验证码是：</p>
                <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1677ff;">
                    {code}
                </div>
                <p style="color: #666; font-size: 14px;">验证码有效期为 {Config.VERIFICATION_CODE_EXPIRY} 分钟，请尽快完成验证。</p>
                <p style="color: #999; font-size: 12px;">如果这不是您本人的操作，请忽略此邮件。</p>
            </div>
            """
        )
        mail.send(msg)
        return True
    except Exception as e:
        import traceback
        print(f"发送邮件失败: {str(e)}")
        print(f"详细错误: {traceback.format_exc()}")
        return False


def send_notification_email(mail, email, subject, html_content):
    """发送通知邮件（只发送给当前登录用户，过滤admin邮箱）"""
    # 过滤掉admin默认邮箱，避免发送到无效邮箱导致退信
    ADMIN_EMAILS = ['admin@xu-news.com', 'admin@example.com']
    
    if email in ADMIN_EMAILS:
        import logging
        logging.warning(f"阻止发送邮件到admin邮箱: {email}")
        return False
    
    if '@' not in email:
        import logging
        logging.warning(f"邮箱格式无效: {email}")
        return False
    
    try:
        from flask_mail import Message
        msg = Message(
            subject=subject,
            recipients=[email],
            html=html_content
        )
        mail.send(msg)
        return True
    except Exception as e:
        import logging
        logging.error(f"发送通知邮件失败: {e}")
        return False


def verify_code(email, code):
    """验证验证码"""
    verification = VerificationCode.query.filter_by(
        email=email,
        code=code,
        is_used=False
    ).order_by(VerificationCode.created_at.desc()).first()
    
    if verification and verification.is_valid():
        verification.is_used = True
        db.session.commit()
        return True
    return False


def generate_token(user_id, email):
    """生成 JWT token"""
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.utcnow() + timedelta(days=7)  # 7天有效期
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm='HS256')


def verify_token(token):
    """验证 JWT token"""
    try:
        payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

