#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
运行所有测试的脚本
"""
import unittest
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def run_tests():
    """运行所有测试"""
    # 发现并运行tests目录下的所有测试
    loader = unittest.TestLoader()
    suite = loader.discover('tests', pattern='test_*.py')
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 返回测试结果
    return result.wasSuccessful()

if __name__ == '__main__':
    print("=" * 60)
    print("开始运行测试...")
    print("=" * 60)
    
    success = run_tests()
    
    print("=" * 60)
    if success:
        print("所有测试通过！")
        sys.exit(0)
    else:
        print("部分测试失败，请检查输出信息。")
        sys.exit(1)

