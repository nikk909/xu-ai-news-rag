# 测试文档

## 测试概述

本项目包含以下类型的测试：

1. **单元测试**：测试单个模块的功能
2. **集成测试**：测试多个模块的协作
3. **API测试**：测试HTTP接口的功能

## 测试文件说明

### 1. test_auth.py - 用户认证单元测试

**测试范围**：
- 用户注册流程
- 用户登录功能
- Token验证
- 验证码过期检查
- 错误密码处理

**测试用例**：
- `test_user_registration`：测试完整的用户注册流程
- `test_user_login`：测试用户登录功能
- `test_user_login_wrong_password`：测试错误密码登录
- `test_token_verification`：测试JWT Token验证
- `test_verification_code_expiry`：测试验证码过期机制

### 2. test_knowledge_base.py - 知识库单元测试

**测试范围**：
- 文档添加功能
- 向量检索功能
- 检索结果重排
- 文本分割器
- 统计信息获取

**测试用例**：
- `test_add_documents`：测试添加文档到知识库
- `test_search`：测试向量检索功能
- `test_search_with_rerank`：测试检索+重排功能
- `test_text_splitter`：测试文本分割器
- `test_get_stats`：测试获取知识库统计信息

### 3. test_api.py - API接口集成测试

**测试范围**：
- 健康检查接口
- 知识库列表接口
- 知识库统计接口
- 语义检索接口
- 权限验证

**测试用例**：
- `test_health_check`：测试健康检查接口
- `test_knowledge_base_list`：测试获取知识库列表
- `test_knowledge_base_stats`：测试获取知识库统计
- `test_search_knowledge`：测试语义检索接口
- `test_unauthorized_access`：测试未授权访问
- `test_invalid_token`：测试无效Token处理

## 运行测试

### 方法1：使用unittest运行所有测试

```bash
cd back
python -m unittest discover tests
```

### 方法2：运行单个测试文件

```bash
cd back
python -m unittest tests.test_auth
python -m unittest tests.test_knowledge_base
python -m unittest tests.test_api
```

### 方法3：运行单个测试用例

```bash
cd back
python -m unittest tests.test_auth.AuthTestCase.test_user_login
```

### 方法4：使用pytest（如果已安装）

```bash
cd back
pip install pytest
pytest tests/
```

### 方法5：直接运行测试文件

```bash
cd back
python tests/test_auth.py
python tests/test_knowledge_base.py
python tests/test_api.py
```

## 测试覆盖率

当前测试覆盖的主要功能：

- ✅ 用户认证（注册、登录、Token验证）
- ✅ 知识库操作（添加文档、检索、重排）
- ✅ API接口（列表、统计、检索）
- ✅ 权限验证（未授权访问、无效Token）

## 测试环境

- **数据库**：使用测试数据库，测试后自动清理
- **知识库**：使用临时目录，测试后自动删除
- **配置**：使用测试专用配置，不影响生产环境

## 注意事项

1. **依赖要求**：运行测试前需要安装所有依赖（`pip install -r requirements.txt`）
2. **模型文件**：知识库测试需要下载嵌入模型（首次运行会自动下载）
3. **测试隔离**：每个测试用例都是独立的，使用`setUp`和`tearDown`进行初始化和清理
4. **运行时间**：知识库测试可能需要较长时间（因为需要加载模型）

## 扩展测试

如需添加新的测试用例：

1. 在对应的测试文件中添加新的测试方法
2. 测试方法名必须以`test_`开头
3. 使用`unittest.TestCase`的断言方法进行验证
4. 确保测试的独立性和可重复性

## 示例：添加新的测试用例

```python
def test_new_feature(self):
    """测试新功能"""
    # 准备测试数据
    test_data = "test"
    
    # 执行测试
    result = some_function(test_data)
    
    # 验证结果
    self.assertEqual(result, expected_value)
    self.assertIsNotNone(result)
```

