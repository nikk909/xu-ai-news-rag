import os
from dotenv import load_dotenv
from pathlib import Path

# 确保从back目录加载.env文件
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # MySQL数据库配置
    MYSQL_HOST = os.environ.get('MYSQL_HOST') or '127.0.0.1'
    MYSQL_PORT = int(os.environ.get('MYSQL_PORT') or 3307)
    MYSQL_USER = os.environ.get('MYSQL_USER') or 'root'
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD') or ''
    MYSQL_DATABASE = os.environ.get('MYSQL_DATABASE') or 'xu_news_ai_rag'
    MYSQL_CHARSET = os.environ.get('MYSQL_CHARSET') or 'utf8mb4'
    
    # 构建MySQL连接URI
    # 如果设置了DATABASE_URL，优先使用（支持完整连接字符串）
    _database_url = os.environ.get('DATABASE_URL')
    if _database_url:
        SQLALCHEMY_DATABASE_URI = _database_url
    else:
        # 使用环境变量或默认值构建连接字符串
        SQLALCHEMY_DATABASE_URI = (
            f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@"
            f"{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}?charset={MYSQL_CHARSET}"
        )
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'pool_recycle': 3600,
        'pool_pre_ping': True,  # 连接前检查连接是否有效
        'echo': False,  # 设置为True可以看到SQL语句
    }
    
    # 邮件配置
    MAIL_SERVER = os.environ.get('MAIL_SERVER') or 'smtp.qq.com'
    MAIL_PORT = int(os.environ.get('MAIL_PORT') or 587)
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True') == 'True'
    MAIL_USE_SSL = os.environ.get('MAIL_USE_SSL', 'False') == 'True'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER') or os.environ.get('MAIL_USERNAME')
    
    # 验证码有效期（分钟）
    VERIFICATION_CODE_EXPIRY = 10

