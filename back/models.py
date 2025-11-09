from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
import bcrypt

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True, comment='用户邮箱')
    password_hash = db.Column(db.String(255), nullable=False, comment='密码哈希值')
    is_verified = db.Column(db.Boolean, default=False, nullable=False, comment='是否已验证邮箱')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, comment='创建时间')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False, comment='更新时间')
    
    __table_args__ = (
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'},
    )
    
    def set_password(self, password):
        """设置密码（加密存储）"""
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def check_password(self, password):
        """验证密码"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'email': self.email,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class VerificationCode(db.Model):
    __tablename__ = 'verification_codes'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(255), nullable=False, index=True, comment='邮箱地址')
    code = db.Column(db.String(6), nullable=False, comment='验证码')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, comment='创建时间')
    expires_at = db.Column(db.DateTime, nullable=False, comment='过期时间')
    is_used = db.Column(db.Boolean, default=False, nullable=False, comment='是否已使用')
    
    __table_args__ = (
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'},
    )
    
    def is_valid(self):
        """检查验证码是否有效"""
        return not self.is_used and datetime.utcnow() < self.expires_at


class FileMetadata(db.Model):
    __tablename__ = 'file_metadata'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    kb_name = db.Column(db.String(255), nullable=False, index=True, comment='知识库名称')
    filename = db.Column(db.String(500), nullable=False, index=True, comment='文件名')
    tags = db.Column(db.Text, default='', comment='标签（JSON格式或逗号分隔）')
    source = db.Column(db.String(500), default='', comment='来源')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, comment='创建时间')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False, comment='更新时间')
    
    # 添加联合唯一索引，确保同一知识库中文件名唯一
    __table_args__ = (
        db.Index('idx_kb_filename', 'kb_name', 'filename'),
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'},
    )
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'kb_name': self.kb_name,
            'filename': self.filename,
            'tags': self.tags,
            'source': self.source,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

