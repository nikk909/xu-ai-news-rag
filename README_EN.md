# XU-News-AI-RAG: Personalized News Intelligent Knowledge Base

## Project Overview

XU-News-AI-RAG is a personalized news intelligent knowledge base system based on RAG (Retrieval-Augmented Generation) technology, supporting news collection, intelligent storage, semantic search, and knowledge analysis.

## Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- React Router
- Lucide React
- Chart.js (Charts)

### Backend
- Flask 3.0
- SQLAlchemy (ORM)
- SQLite / MySQL (Relational Database)
- FAISS (Vector Database)
- sentence-transformers (Text Embedding)
- CrossEncoder (Result Reranking)
- Ollama (Large Language Model)
- Flask-Mail (Email Service)
- JWT Authentication (PyJWT)
- bcrypt (Password Encryption)
- APScheduler (Scheduled Tasks)

### AI Models
- **Embedding Model**: all-MiniLM-L6-v2 (768-dimensional vectors)
- **Reranking Model**: ms-marco-MiniLM-L-6-v2
- **Large Language Model**: qwen2.5:4b (Deployed via Ollama)

**Technical Notes**:
- This project uses **sentence-transformers direct implementation** to build the knowledge base, without using the LangChain framework. However, it implements the same functionality (text embedding, vector storage, vector retrieval, result reranking) with better performance. See "Technical Architecture Document" for details.
- Database supports **SQLite (development environment)** and **MySQL (production environment)**, can be switched via environment variables.

## Quick Start

### Requirements
- Python 3.8+
- Node.js 16+
- npm or yarn
- Ollama (Local LLM deployment, optional, for intelligent reply functionality)

### Installation Steps

#### 1. Backend Service

```bash
cd back
pip install -r requirements.txt
```

**Configure Environment Variables** (Optional):
- Copy `back/.env.example` to `back/.env` (if exists)
- Configure email service (optional): See `back/ENV配置说明.md`
- Configure MySQL database (optional, defaults to SQLite):
  ```env
  MYSQL_HOST=127.0.0.1
  MYSQL_PORT=3307
  MYSQL_USER=root
  MYSQL_PASSWORD=your_password
  MYSQL_DATABASE=xu_news_ai_rag
  ```

**Install Ollama** (Optional, for intelligent reply functionality):
- Download and install Ollama: https://ollama.ai/
- Download model: `ollama pull qwen2.5:4b`
- If Ollama is not installed, the system can still run normally, but intelligent reply functionality will be unavailable

Start backend:
```bash
python app.py
# Or use startup script
start.bat  # Windows
```

Backend service runs on: http://localhost:5000

#### 2. Frontend Service

```bash
cd front
npm install
npm run dev
# Or use startup script
start.bat  # Windows
```

Frontend service runs on: http://localhost:3000 (or port configured in Vite)

#### 3. Access the System

Open browser and visit: http://localhost:3000

Register a new account (requires email service configuration).

## Features

### User Authentication
- ✅ User registration (Email verification code)
- ✅ User login (JWT Token)
- ✅ Auto login persistence
- ✅ Password encryption storage (bcrypt)

### Knowledge Base Management
- Data list viewing
- Filter by type/time
- Single/batch deletion
- Metadata editing
- Data upload

### Semantic Search
- Natural language retrieval
- Similarity sorting
- Web search (when knowledge base doesn't match)

### Data Analysis
- Top 10 keyword distribution
- Data clustering analysis

## Database

### Relational Database
- **Development Environment**: SQLite (default)
  - Database location: `back/instance/users.db`
  - No additional configuration required, auto-created
- **Production Environment**: MySQL (optional)
  - Configure via environment variables (see installation steps above)
  - Uses SQLAlchemy ORM, no code changes needed

### Data Tables
- `users`: User information table
- `verification_codes`: Verification code records table
- `file_metadata`: File metadata table

### Vector Database
- **Type**: FAISS
- **Storage Location**: `back/instance/faiss_index_<knowledge_base_name>/`
- **Files**:
  - `index.faiss`: Vector index file
  - `documents.pkl`: Document text and metadata

For detailed SQL statements, please refer to `SQL语句文档.md`

## API Interfaces

### Authentication Related

#### Send Verification Code
```
POST /api/auth/send-code
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### User Registration
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "code": "123456"
}
```

#### User Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

## Project Structure

```
work7/
├── front/                    # Frontend project
│   ├── src/
│   │   ├── pages/           # Page components
│   │   │   ├── Login.jsx    # Login page
│   │   │   ├── Register.jsx # Registration page
│   │   │   ├── Dashboard.jsx # Dashboard
│   │   │   ├── KnowledgeBase.jsx # Knowledge base management
│   │   │   ├── Search.jsx   # Semantic search
│   │   │   └── Analysis.jsx # Data analysis
│   │   ├── components/      # Common components
│   │   │   └── Layout.jsx    # Layout component
│   │   └── App.jsx          # Application entry
│   └── package.json
│
├── back/                     # Backend project
│   ├── app.py                # Flask application main file
│   ├── models.py             # Data models
│   ├── config.py             # Configuration file
│   ├── utils.py              # Utility functions
│   ├── knowledge_base.py     # Knowledge base core logic
│   ├── ollama_client.py      # Ollama client
│   ├── news_crawler.py      # News crawler
│   ├── web_search.py         # Web search
│   ├── file_processor.py     # File processing
│   ├── scheduler.py          # Scheduled tasks
│   ├── tests/                # Test code
│   │   ├── test_auth.py      # Authentication tests
│   │   ├── test_knowledge_base.py # Knowledge base tests
│   │   └── test_api.py       # API tests
│   ├── .env                  # Environment variables (needs configuration)
│   ├── instance/
│   │   ├── users.db          # SQLite database
│   │   └── faiss_index_*/    # FAISS vector indexes
│   └── uploads/              # Uploaded files directory
│
├── PRD.md                    # Product Requirements Document
├── 概要设计文档.md           # Overview Design Document
├── 技术架构文档.md           # Technical Architecture Document
├── 产品原型设计.md           # Product Prototype Design
├── SQL语句文档.md            # SQL Statements Document
└── README.md                 # Project documentation (this file)
```

## Feature Description

### Core Features
1. **User Authentication**: Registration, login, JWT Token authentication
2. **News Collection**: Scheduled tasks automatically collect RSS and web news
3. **Knowledge Base Management**: File upload, view, edit, delete, move
4. **Semantic Search**: Intelligent search based on vector retrieval, supports web search
5. **Data Analysis**: Keyword extraction, clustering analysis, visualization

### Usage Flow
1. **Register/Login**: Register account with email and login
2. **Upload Files**: Upload documents in knowledge base management page (supports txt, xlsx, csv, etc.)
3. **Semantic Search**: Enter questions in search page, system retrieves relevant content from knowledge base
4. **Data Analysis**: Select knowledge base or files in analysis page, execute clustering analysis

## Development Notes

### Backend Development
- Database auto-created (first run)
- Supports hot reload (debug mode)
- Logs output to console
- Uses SQLAlchemy ORM, supports SQLite and MySQL

### Frontend Development
- Supports hot update
- Auto opens browser
- Development server port: 3000 (or port configured in Vite)

### Testing
Run tests:
```bash
cd back
python -m pytest tests/  # If pytest is installed
# Or
python -m unittest discover tests
```

## Important Notes

- **Email Service**: Configuration is optional, verification code will be returned directly if not configured (development mode)
- **Database File**: `users.db` contains sensitive user information, do not upload to Git
- **Ollama Service**: If Ollama is not installed, the system can still run normally, but intelligent reply functionality will be unavailable, search results will still be returned
- **Vector Index**: Vector index will be automatically created when files are uploaded for the first time, may take some time
- **File Size**: Recommended single file size not exceeding 50MB, total knowledge base size not exceeding 500MB

## Deployment Instructions

### Development Environment
- Use SQLite database, no additional configuration required
- Use Flask development server
- Use Vite development server

### Production Environment (Recommended)
- Use MySQL database (configure via environment variables)
- Deploy Flask application with Gunicorn:
  ```bash
  pip install gunicorn
  gunicorn -w 4 -b 0.0.0.0:5000 app:app
  ```
- Use Nginx reverse proxy
- Build frontend static files:
  ```bash
  cd front
  npm run build
  # Deploy dist/ directory to Nginx
  ```

## Related Documents

- **Product Requirements Document**: `PRD.md`
- **Overview Design Document**: `概要设计文档.md`
- **Technical Architecture Document**: `技术架构文档.md`
- **Product Prototype Design**: `产品原型设计.md`
- **SQL Statements Document**: `SQL语句文档.md`
- **Environment Configuration**: `back/ENV配置说明.md`
- **Ollama Connection Instructions**: `back/Ollama连接说明.md`

## License

This project is a training assessment project, for learning purposes only.

---

**Repository**: https://github.com/nikk909/xu-ai-news-rag

