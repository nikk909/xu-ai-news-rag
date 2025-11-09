# XU-News-AI-RAG 后端服务

## 环境要求

- Python 3.8+
- MySQL 5.7+ (端口: 3307)
- Ollama (可选，用于AI生成)

## 安装依赖

```bash
pip install -r requirements.txt
```

## 配置

复制 `.env.example` 为 `.env` 并填写配置信息，参考 `ENV配置说明.md`

## 启动服务

```bash
python app.py
```

服务将在 `http://localhost:5000` 启动

## API文档

### 健康检查
```
GET /api/health
```

### 用户认证
- `POST /api/auth/send-code` - 发送验证码
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录

### 知识库管理
- `GET /api/knowledge/kb-list` - 获取知识库列表
- `POST /api/knowledge/kb-create` - 创建知识库
- `GET /api/knowledge/files` - 获取文件列表
- `POST /api/knowledge/upload` - 上传文件
- `GET /api/knowledge/search` - 搜索文档

## 数据库

使用MySQL数据库，配置在 `.env` 文件中：
- 数据库名: `xu_news_ai_rag`
- 主机: `127.0.0.1`
- 端口: `3307`

## 文件存储

- `uploads/` - 用户上传的文件
- `instance/faiss_index_*/` - FAISS向量索引

