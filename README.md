# XU-News-AI-RAG：个性化新闻智能知识库

## 项目简介

XU-News-AI-RAG 是一个基于 RAG（检索增强生成）技术的个性化新闻智能知识库系统，支持新闻采集、智能存储、语义检索和知识分析。

## 技术栈

### 前端
- React 18
- Vite
- Tailwind CSS
- React Router
- Lucide React
- Chart.js (图表)

### 后端
- Flask 3.0
- SQLAlchemy (ORM)
- SQLite / MySQL (关系型数据库)
- FAISS (向量数据库)
- sentence-transformers (文本嵌入)
- CrossEncoder (结果重排)
- Ollama (大语言模型)
- Flask-Mail (邮件服务)
- JWT 认证 (PyJWT)
- bcrypt (密码加密)
- APScheduler (定时任务)

### AI模型
- **嵌入模型**：all-MiniLM-L6-v2 (768维向量)
- **重排模型**：ms-marco-MiniLM-L-6-v2
- **大语言模型**：qwen2.5:4b (通过Ollama部署)

**技术说明**：
- 本项目采用 **sentence-transformers直接实现** 的方式构建知识库，未使用LangChain框架，但实现了相同的功能（文本嵌入、向量存储、向量检索、结果重排），且性能更优。详见《技术架构文档》。
- 数据库支持 **SQLite（开发环境）** 和 **MySQL（生产环境）**，通过环境变量配置即可切换。

## 快速开始

### 环境要求
- Python 3.8+
- Node.js 16+
- npm 或 yarn
- Ollama (本地部署大模型，可选，用于智能回复功能)

### 安装步骤

#### 1. 后端服务

```bash
cd back
pip install -r requirements.txt
```

**配置环境变量**（可选）：
- 复制 `back/.env.example` 为 `back/.env`（如果存在）
- 配置邮件服务（可选）：详见 `back/ENV配置说明.md`
- 配置MySQL数据库（可选，默认使用SQLite）：
  ```env
  MYSQL_HOST=127.0.0.1
  MYSQL_PORT=3307
  MYSQL_USER=root
  MYSQL_PASSWORD=your_password
  MYSQL_DATABASE=xu_news_ai_rag
  ```

**安装Ollama（可选，用于智能回复功能）**：
- 下载并安装 Ollama：https://ollama.ai/
- 下载模型：`ollama pull qwen2.5:4b`
- 如果未安装Ollama，系统仍可正常运行，但智能回复功能将不可用

启动后端：
```bash
python app.py
# 或使用启动脚本
start.bat  # Windows
```

后端服务运行在：http://localhost:5000

#### 2. 前端服务

```bash
cd front
npm install
npm run dev
# 或使用启动脚本
start.bat  # Windows
```

前端服务运行在：http://localhost:3000（或Vite配置的端口）

#### 3. 访问系统

打开浏览器访问：http://localhost:3000

使用默认账号登录：
- **邮箱**：`admin@xu-news.com`
- **密码**：`admin123456`

或注册新账号（需要配置邮件服务）。

## 默认登录账号

系统已预置默认管理员账号：

- **邮箱**: `admin@xu-news.com`
- **密码**: `admin123456`

可直接使用此账号登录系统。（但是建议使用自己的邮箱，以便于后续收到邮件提醒）

## 功能特性

### 用户认证
- ✅ 用户注册（邮箱验证码）
- ✅ 用户登录（JWT Token）
- ✅ 自动登录保持
- ✅ 密码加密存储（bcrypt）

### 知识库管理
- 数据列表查看
- 按类型/时间筛选
- 单条/批量删除
- 元数据编辑
- 数据上传

### 语义查询
- 自然语言检索
- 相似度排序
- 联网查询（知识库未匹配时）

### 数据分析
- 关键词 Top10 分布
- 数据聚类分析

## 数据库

### 关系型数据库
- **开发环境**：SQLite（默认）
  - 数据库位置：`back/instance/users.db`
  - 无需额外配置，自动创建
- **生产环境**：MySQL（可选）
  - 通过环境变量配置（见上方安装步骤）
  - 使用SQLAlchemy ORM，代码无需修改

### 数据表
- `users`: 用户信息表
- `verification_codes`: 验证码记录表
- `file_metadata`: 文件元数据表

### 向量数据库
- **类型**：FAISS
- **存储位置**：`back/instance/faiss_index_<知识库名称>/`
- **文件**：
  - `index.faiss`: 向量索引文件
  - `documents.pkl`: 文档文本和元数据

详细SQL语句请参考 `SQL语句文档.md`

## API 接口

### 认证相关

#### 发送验证码
```
POST /api/auth/send-code
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### 用户注册
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "code": "123456"
}
```

#### 用户登录
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

## 项目结构

```
work7/
├── front/                    # 前端项目
│   ├── src/
│   │   ├── pages/           # 页面组件
│   │   │   ├── Login.jsx    # 登录页
│   │   │   ├── Register.jsx # 注册页
│   │   │   ├── Dashboard.jsx # 仪表盘
│   │   │   ├── KnowledgeBase.jsx # 知识库管理
│   │   │   ├── Search.jsx   # 语义检索
│   │   │   └── Analysis.jsx # 数据分析
│   │   ├── components/      # 公共组件
│   │   │   └── Layout.jsx   # 布局组件
│   │   └── App.jsx          # 应用入口
│   └── package.json
│
├── back/                     # 后端项目
│   ├── app.py                # Flask应用主文件
│   ├── models.py             # 数据模型
│   ├── config.py             # 配置文件
│   ├── utils.py              # 工具函数
│   ├── knowledge_base.py     # 知识库核心逻辑
│   ├── ollama_client.py      # Ollama客户端
│   ├── news_crawler.py      # 新闻爬虫
│   ├── web_search.py         # 联网搜索
│   ├── file_processor.py     # 文件处理
│   ├── scheduler.py          # 定时任务
│   ├── tests/                # 测试代码
│   │   ├── test_auth.py      # 认证测试
│   │   ├── test_knowledge_base.py # 知识库测试
│   │   └── test_api.py       # API测试
│   ├── .env                  # 环境变量（需配置）
│   ├── instance/
│   │   ├── users.db          # SQLite数据库
│   │   └── faiss_index_*/    # FAISS向量索引
│   └── uploads/              # 上传文件目录
│
├── PRD.md                    # 产品需求文档
├── 概要设计文档.md           # 概要设计文档
├── 技术架构文档.md           # 技术架构文档
├── 产品原型设计.md           # 产品原型设计
├── SQL语句文档.md            # SQL语句文档
└── README.md                 # 项目说明文档（本文件）
```

## 功能说明

### 核心功能
1. **用户认证**：注册、登录、JWT Token认证
2. **新闻采集**：定时任务自动采集RSS和网页新闻
3. **知识库管理**：文件上传、查看、编辑、删除、移动
4. **语义检索**：基于向量检索的智能搜索，支持联网查询
5. **数据分析**：关键词提取、聚类分析、可视化展示

### 使用流程
1. **注册/登录**：使用邮箱注册账号并登录
2. **上传文件**：在知识库管理页面上传文档（支持txt、xlsx、csv等）
3. **语义检索**：在搜索页面输入问题，系统从知识库检索相关内容
4. **数据分析**：在分析页面选择知识库或文件，执行聚类分析

## 开发说明

### 后端开发
- 数据库自动创建（首次运行）
- 支持热重载（debug模式）
- 日志输出到控制台
- 使用SQLAlchemy ORM，支持SQLite和MySQL

### 前端开发
- 支持热更新
- 自动打开浏览器
- 开发服务器端口：3000（或Vite配置的端口）

### 测试
运行测试：
```bash
cd back
python -m pytest tests/  # 如果安装了pytest
# 或
python -m unittest discover tests
```

## 注意事项

- **默认账号**：仅用于开发测试，生产环境请修改或删除
- **邮件服务**：配置为可选，未配置时验证码会直接返回（开发模式）
- **数据库文件**：`users.db` 包含用户敏感信息，请勿上传到 Git
- **Ollama服务**：如果未安装Ollama，系统仍可正常运行，但智能回复功能将不可用，检索结果仍会返回
- **向量索引**：首次上传文件时会自动创建向量索引，可能需要一些时间
- **文件大小**：建议单个文件不超过50MB，知识库总大小不超过500MB

## 部署说明

### 开发环境
- 使用SQLite数据库，无需额外配置
- 使用Flask开发服务器
- 使用Vite开发服务器

### 生产环境（推荐）
- 使用MySQL数据库（通过环境变量配置）
- 使用Gunicorn部署Flask应用：
  ```bash
  pip install gunicorn
  gunicorn -w 4 -b 0.0.0.0:5000 app:app
  ```
- 使用Nginx反向代理
- 前端构建静态文件：
  ```bash
  cd front
  npm run build
  # 将 dist/ 目录部署到Nginx
  ```

## 相关文档

- **产品需求文档**：`PRD.md`
- **概要设计文档**：`概要设计文档.md`
- **技术架构文档**：`技术架构文档.md`
- **产品原型设计**：`产品原型设计.md`
- **SQL语句文档**：`SQL语句文档.md`
- **环境配置说明**：`back/ENV配置说明.md`
- **Ollama连接说明**：`back/Ollama连接说明.md`

## 许可证

本项目为培训考核项目，仅供学习使用。

---

## English Documentation

For English documentation, please see [README_EN.md](README_EN.md)

**Repository**: https://github.com/nikk909/xu-ai-news-rag

