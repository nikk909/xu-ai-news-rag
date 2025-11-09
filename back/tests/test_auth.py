"""
用户认证模块单元测试
"""
import unittest
import sys
import os
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app import app, db
from models import User, VerificationCode
from utils import create_verification_code, verify_code, generate_token, verify_token
import bcrypt


class AuthTestCase(unittest.TestCase):
    """用户认证测试类"""
    
    def setUp(self):
        """测试前准备"""
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['SECRET_KEY'] = 'test-secret-key'
        self.app = app.test_client()
        
        with app.app_context():
            db.create_all()
    
    def tearDown(self):
        """测试后清理"""
        with app.app_context():
            db.drop_all()
    
    def test_user_registration(self):
        """测试用户注册"""
        # 1. 发送验证码
        response = self.app.post('/api/auth/send-code', 
                                json={'email': 'test@example.com'})
        self.assertEqual(response.status_code, 200)
        
        # 2. 获取验证码（从数据库）
        with app.app_context():
            code_record = VerificationCode.query.filter_by(
                email='test@example.com'
            ).first()
            self.assertIsNotNone(code_record)
            code = code_record.code
        
        # 3. 注册用户
        response = self.app.post('/api/auth/register',
                                json={
                                    'email': 'test@example.com',
                                    'password': 'password123',
                                    'code': code
                                })
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('token', data)
        
        # 4. 验证用户已创建
        with app.app_context():
            user = User.query.filter_by(email='test@example.com').first()
            self.assertIsNotNone(user)
            self.assertTrue(user.check_password('password123'))
    
    def test_user_login(self):
        """测试用户登录"""
        # 1. 创建测试用户
        with app.app_context():
            user = User(email='test@example.com')
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
        
        # 2. 登录
        response = self.app.post('/api/auth/login',
                                json={
                                    'email': 'test@example.com',
                                    'password': 'password123'
                                })
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('token', data)
        self.assertIn('user', data)
    
    def test_user_login_wrong_password(self):
        """测试错误密码登录"""
        # 1. 创建测试用户
        with app.app_context():
            user = User(email='test@example.com')
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
        
        # 2. 使用错误密码登录
        response = self.app.post('/api/auth/login',
                                json={
                                    'email': 'test@example.com',
                                    'password': 'wrongpassword'
                                })
        self.assertEqual(response.status_code, 401)
    
    def test_token_verification(self):
        """测试Token验证"""
        # 1. 创建测试用户
        with app.app_context():
            user = User(email='test@example.com')
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
        
        # 2. 登录获取Token
        response = self.app.post('/api/auth/login',
                                json={
                                    'email': 'test@example.com',
                                    'password': 'password123'
                                })
        token = response.get_json()['token']
        
        # 3. 验证Token
        response = self.app.get('/api/auth/verify',
                               headers={'Authorization': f'Bearer {token}'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['email'], 'test@example.com')
    
    def test_verification_code_expiry(self):
        """测试验证码过期"""
        with app.app_context():
            code = create_verification_code('test@example.com')
            code_record = VerificationCode.query.filter_by(
                email='test@example.com'
            ).first()
            
            # 验证码应该有效
            self.assertTrue(code_record.is_valid())
            
            # 模拟过期（修改过期时间）
            from datetime import datetime, timedelta
            code_record.expires_at = datetime.utcnow() - timedelta(minutes=1)
            db.session.commit()
            
            # 验证码应该无效
            self.assertFalse(code_record.is_valid())


if __name__ == '__main__':
    unittest.main()

