"""
知识库模块单元测试
"""
import unittest
import sys
import os
from pathlib import Path
import tempfile
import shutil

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from knowledge_base import KnowledgeBase, SimpleTextSplitter


class KnowledgeBaseTestCase(unittest.TestCase):
    """知识库测试类"""
    
    def setUp(self):
        """测试前准备"""
        # 创建临时目录
        self.test_dir = tempfile.mkdtemp()
        self.kb_path = Path(self.test_dir) / 'test_kb'
        self.kb = KnowledgeBase(db_path=str(self.kb_path))
    
    def tearDown(self):
        """测试后清理"""
        # 删除临时目录
        if self.kb_path.exists():
            shutil.rmtree(self.test_dir)
    
    def test_add_documents(self):
        """测试添加文档"""
        texts = [
            '这是第一个测试文档',
            '这是第二个测试文档',
            '这是第三个测试文档'
        ]
        metadata_list = [
            {'title': '文档1', 'source': 'test'},
            {'title': '文档2', 'source': 'test'},
            {'title': '文档3', 'source': 'test'}
        ]
        
        self.kb.add_documents(texts, metadata_list)
        
        # 验证文档已添加
        stats = self.kb.get_stats()
        self.assertEqual(stats['total_documents'], 3)
    
    def test_search(self):
        """测试检索"""
        # 添加测试文档
        texts = [
            'Python是一种编程语言',
            'Java也是一种编程语言',
            '机器学习是人工智能的一个分支'
        ]
        metadata_list = [
            {'title': 'Python', 'source': 'test'},
            {'title': 'Java', 'source': 'test'},
            {'title': 'ML', 'source': 'test'}
        ]
        self.kb.add_documents(texts, metadata_list)
        
        # 执行检索
        results = self.kb.search('Python编程', top_k=2)
        
        # 验证结果
        self.assertGreater(len(results), 0)
        self.assertIn('text', results[0])
        self.assertIn('metadata', results[0])
        self.assertIn('score', results[0])
    
    def test_search_with_rerank(self):
        """测试检索+重排"""
        # 添加测试文档
        texts = [
            'Python是一种编程语言',
            'Java也是一种编程语言',
            '机器学习是人工智能的一个分支'
        ]
        metadata_list = [
            {'title': 'Python', 'source': 'test'},
            {'title': 'Java', 'source': 'test'},
            {'title': 'ML', 'source': 'test'}
        ]
        self.kb.add_documents(texts, metadata_list)
        
        # 执行检索+重排
        results = self.kb.search_with_rerank('Python编程', top_k=2)
        
        # 验证结果
        self.assertGreater(len(results), 0)
        self.assertIn('text', results[0])
        self.assertIn('metadata', results[0])
        self.assertIn('score', results[0])
    
    def test_text_splitter(self):
        """测试文本分割器"""
        splitter = SimpleTextSplitter(chunk_size=100, chunk_overlap=20)
        text = '这是一个测试文本。' * 50  # 长文本
        
        chunks = splitter.split_text(text)
        
        # 验证分割结果
        self.assertGreater(len(chunks), 0)
        for chunk in chunks:
            self.assertLessEqual(len(chunk), 100 + 50)  # 允许一定误差
    
    def test_get_stats(self):
        """测试获取统计信息"""
        # 添加测试文档
        texts = ['测试文档1', '测试文档2']
        metadata_list = [
            {'title': '文档1', 'source': 'test'},
            {'title': '文档2', 'source': 'test'}
        ]
        self.kb.add_documents(texts, metadata_list)
        
        # 获取统计信息
        stats = self.kb.get_stats()
        
        # 验证统计信息
        self.assertIn('total_documents', stats)
        self.assertIn('index_size', stats)
        self.assertEqual(stats['total_documents'], 2)


if __name__ == '__main__':
    unittest.main()

