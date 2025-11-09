"""
API接口集成测试
"""
import unittest
import sys
import os
from pathlib import Path
import json

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app import app, db
from models import User


class APITestCase(unittest.TestCase):
    """API测试类"""
    
    def setUp(self):
        """测试前准备"""
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['SECRET_KEY'] = 'test-secret-key'
        self.app = app.test_client()
        
        with app.app_context():
            db.create_all()
            # 创建测试用户
            user = User(email='test@example.com')
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
    
    def tearDown(self):
        """测试后清理"""
        with app.app_context():
            db.drop_all()
    
    def get_auth_token(self):
        """获取认证Token"""
        response = self.app.post('/api/auth/login',
                                json={
                                    'email': 'test@example.com',
                                    'password': 'password123'
                                })
        data = response.get_json()
        return data.get('token')
    
    def test_health_check(self):
        """测试健康检查接口"""
        response = self.app.get('/api/health')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['status'], 'ok')
    
    def test_knowledge_base_list(self):
        """测试获取知识库列表"""
        token = self.get_auth_token()
        response = self.app.get('/api/knowledge/kb-list',
                               headers={'Authorization': f'Bearer {token}'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('kb_list', data)
        self.assertIsInstance(data['kb_list'], list)
    
    def test_knowledge_base_stats(self):
        """测试获取知识库统计"""
        token = self.get_auth_token()
        response = self.app.get('/api/knowledge/stats',
                               headers={'Authorization': f'Bearer {token}'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('total_kbs', data)
        self.assertIn('total_documents', data)
    
    def test_search_knowledge(self):
        """测试语义检索"""
        token = self.get_auth_token()
        response = self.app.post('/api/knowledge/search',
                                headers={'Authorization': f'Bearer {token}'},
                                json={
                                    'query': '测试查询',
                                    'kb_names': ['default'],
                                    'top_k': 5
                                })
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('results', data)
        self.assertIn('reply', data)
    
    def test_unauthorized_access(self):
        """测试未授权访问"""
        response = self.app.get('/api/knowledge/kb-list')
        self.assertEqual(response.status_code, 401)
    
    def test_invalid_token(self):
        """测试无效Token"""
        response = self.app.get('/api/knowledge/kb-list',
                               headers={'Authorization': 'Bearer invalid-token'})
        self.assertEqual(response.status_code, 401)


if __name__ == '__main__':
    unittest.main()

