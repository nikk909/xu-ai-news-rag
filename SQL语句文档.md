# XU-News-AI-RAG：个性化新闻智能知识库
## SQL语句文档

---

## 1. 文档信息

- **文档名称**：SQL语句文档
- **项目名称**：XU-News-AI-RAG：个性化新闻智能知识库
- **数据库类型**：SQLite / MySQL
- **文档版本**：v1.0
- **创建日期**：2025年11月9日
- **最后更新**：2025年11月9日

---

## 2. 数据库说明

本项目使用SQLAlchemy ORM框架，支持SQLite（开发环境）和MySQL（生产环境）两种数据库。

### 2.1 数据库选择
- **开发环境**：默认使用SQLite，数据库文件位于 `back/instance/users.db`
- **生产环境**：支持MySQL，通过环境变量配置

### 2.2 数据库初始化
数据库表通过SQLAlchemy自动创建，无需手动执行SQL语句。如需手动创建，可参考以下SQL语句。

---

## 3. 数据表结构

### 3.1 用户表 (users)

#### 3.1.1 表结构
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- MySQL: AUTO_INCREMENT
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_users_email ON users(email);
```

#### 3.1.2 MySQL版本
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_email ON users(email);
```

### 3.2 验证码表 (verification_codes)

#### 3.2.1 表结构
```sql
CREATE TABLE verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- MySQL: AUTO_INCREMENT
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT 0
);

-- 创建索引
CREATE INDEX idx_verification_codes_email ON verification_codes(email);
CREATE INDEX idx_verification_codes_expires_at ON verification_codes(expires_at);
```

#### 3.2.2 MySQL版本
```sql
CREATE TABLE verification_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_verification_codes_email ON verification_codes(email);
CREATE INDEX idx_verification_codes_expires_at ON verification_codes(expires_at);
```

### 3.3 文件元数据表 (file_metadata)

#### 3.3.1 表结构
```sql
CREATE TABLE file_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- MySQL: AUTO_INCREMENT
    kb_name VARCHAR(255) NOT NULL,
    filename VARCHAR(500) NOT NULL,
    tags TEXT DEFAULT '',
    source VARCHAR(500) DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_file_metadata_kb_name ON file_metadata(kb_name);
CREATE INDEX idx_file_metadata_filename ON file_metadata(filename);
CREATE UNIQUE INDEX idx_kb_filename ON file_metadata(kb_name, filename);
```

#### 3.3.2 MySQL版本
```sql
CREATE TABLE file_metadata (
    id INT PRIMARY KEY AUTO_INCREMENT,
    kb_name VARCHAR(255) NOT NULL,
    filename VARCHAR(500) NOT NULL,
    tags TEXT DEFAULT '',
    source VARCHAR(500) DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_file_metadata_kb_name ON file_metadata(kb_name);
CREATE INDEX idx_file_metadata_filename ON file_metadata(filename);
CREATE UNIQUE INDEX idx_kb_filename ON file_metadata(kb_name, filename);
```

---

## 4. 常用SQL查询语句

### 4.1 用户相关查询

#### 4.1.1 查询所有用户
```sql
SELECT * FROM users;
```

#### 4.1.2 根据邮箱查询用户
```sql
SELECT * FROM users WHERE email = 'user@example.com';
```

#### 4.1.3 查询已验证用户
```sql
SELECT * FROM users WHERE is_verified = 1;
```

#### 4.1.4 统计用户数量
```sql
SELECT COUNT(*) as total_users FROM users;
```

#### 4.1.5 查询最近注册的用户
```sql
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;
```

### 4.2 验证码相关查询

#### 4.2.1 查询有效验证码
```sql
SELECT * FROM verification_codes 
WHERE email = 'user@example.com' 
  AND is_used = 0 
  AND expires_at > CURRENT_TIMESTAMP
ORDER BY created_at DESC 
LIMIT 1;
```

#### 4.2.2 查询过期验证码
```sql
SELECT * FROM verification_codes 
WHERE expires_at < CURRENT_TIMESTAMP;
```

#### 4.2.3 清理过期验证码
```sql
DELETE FROM verification_codes 
WHERE expires_at < CURRENT_TIMESTAMP;
```

### 4.3 文件元数据相关查询

#### 4.3.1 查询指定知识库的所有文件
```sql
SELECT * FROM file_metadata 
WHERE kb_name = 'default' 
ORDER BY created_at DESC;
```

#### 4.3.2 根据文件名查询
```sql
SELECT * FROM file_metadata 
WHERE filename LIKE '%keyword%';
```

#### 4.3.3 查询最近上传的文件
```sql
SELECT * FROM file_metadata 
ORDER BY created_at DESC 
LIMIT 20;
```

#### 4.3.4 统计各知识库的文件数量
```sql
SELECT kb_name, COUNT(*) as file_count 
FROM file_metadata 
GROUP BY kb_name;
```

#### 4.3.5 查询带标签的文件
```sql
SELECT * FROM file_metadata 
WHERE tags != '' AND tags IS NOT NULL;
```

#### 4.3.6 按类型筛选文件（根据文件扩展名）
```sql
-- 查询.txt文件
SELECT * FROM file_metadata 
WHERE filename LIKE '%.txt';

-- 查询.xlsx文件
SELECT * FROM file_metadata 
WHERE filename LIKE '%.xlsx';

-- 查询.csv文件
SELECT * FROM file_metadata 
WHERE filename LIKE '%.csv';
```

#### 4.3.7 按时间范围筛选文件
```sql
-- 查询今天的文件
SELECT * FROM file_metadata 
WHERE DATE(created_at) = DATE('now');  -- MySQL: CURDATE()

-- 查询最近7天的文件
SELECT * FROM file_metadata 
WHERE created_at >= datetime('now', '-7 days');  -- MySQL: DATE_SUB(NOW(), INTERVAL 7 DAY)

-- 查询最近30天的文件
SELECT * FROM file_metadata 
WHERE created_at >= datetime('now', '-30 days');  -- MySQL: DATE_SUB(NOW(), INTERVAL 30 DAY)
```

---

## 5. 数据维护SQL语句

### 5.1 数据备份

#### 5.1.1 SQLite备份
```bash
# 使用命令行工具备份
sqlite3 users.db ".backup backup_users.db"
```

#### 5.1.2 MySQL备份
```bash
# 使用mysqldump备份
mysqldump -u root -p xu_news_ai_rag > backup.sql
```

### 5.2 数据清理

#### 5.2.1 清理过期验证码
```sql
DELETE FROM verification_codes 
WHERE expires_at < CURRENT_TIMESTAMP 
   OR is_used = 1;
```

#### 5.2.2 清理未验证用户（可选）
```sql
-- 删除30天前注册但未验证的用户
DELETE FROM users 
WHERE is_verified = 0 
  AND created_at < datetime('now', '-30 days');  -- MySQL: DATE_SUB(NOW(), INTERVAL 30 DAY)
```

### 5.3 数据统计

#### 5.3.1 统计各表记录数
```sql
SELECT 
    (SELECT COUNT(*) FROM users) as users_count,
    (SELECT COUNT(*) FROM verification_codes) as codes_count,
    (SELECT COUNT(*) FROM file_metadata) as files_count;
```

#### 5.3.2 统计知识库文件分布
```sql
SELECT 
    kb_name,
    COUNT(*) as file_count,
    MIN(created_at) as first_file,
    MAX(created_at) as last_file
FROM file_metadata 
GROUP BY kb_name 
ORDER BY file_count DESC;
```

---

## 6. 数据迁移SQL语句

### 6.1 从SQLite迁移到MySQL

#### 6.1.1 导出SQLite数据
```bash
sqlite3 users.db .dump > dump.sql
```

#### 6.1.2 转换SQL语句
需要将SQLite的SQL语句转换为MySQL兼容格式：
- `INTEGER PRIMARY KEY AUTOINCREMENT` → `INT PRIMARY KEY AUTO_INCREMENT`
- `BOOLEAN` → `BOOLEAN` (MySQL也支持)
- `CURRENT_TIMESTAMP` → `CURRENT_TIMESTAMP` (相同)
- `datetime('now', '-7 days')` → `DATE_SUB(NOW(), INTERVAL 7 DAY)`

### 6.2 数据导入

#### 6.2.1 MySQL导入
```bash
mysql -u root -p xu_news_ai_rag < dump.sql
```

---

## 7. 性能优化SQL语句

### 7.1 索引优化

#### 7.1.1 分析索引使用情况（MySQL）
```sql
EXPLAIN SELECT * FROM file_metadata WHERE kb_name = 'default';
```

#### 7.1.2 添加复合索引（如需要）
```sql
-- 为常用查询添加复合索引
CREATE INDEX idx_kb_created ON file_metadata(kb_name, created_at);
```

### 7.2 查询优化

#### 7.2.1 使用LIMIT限制结果集
```sql
-- 分页查询
SELECT * FROM file_metadata 
ORDER BY created_at DESC 
LIMIT 10 OFFSET 0;  -- 第一页
```

#### 7.2.2 使用索引字段查询
```sql
-- 使用索引字段查询（更快）
SELECT * FROM file_metadata WHERE kb_name = 'default';

-- 避免使用非索引字段（较慢）
SELECT * FROM file_metadata WHERE tags LIKE '%keyword%';
```

---

## 8. 注意事项

### 8.1 SQLite与MySQL的差异

1. **自增主键**：
   - SQLite: `AUTOINCREMENT`
   - MySQL: `AUTO_INCREMENT`

2. **布尔值**：
   - SQLite: `BOOLEAN` (实际存储为INTEGER)
   - MySQL: `BOOLEAN` (实际为TINYINT(1))

3. **日期函数**：
   - SQLite: `datetime('now', '-7 days')`
   - MySQL: `DATE_SUB(NOW(), INTERVAL 7 DAY)`

4. **字符串函数**：
   - SQLite: `LIKE` 大小写敏感（默认）
   - MySQL: `LIKE` 大小写不敏感（默认）

### 8.2 安全建议

1. **使用参数化查询**：防止SQL注入（SQLAlchemy已自动处理）
2. **限制查询结果**：使用LIMIT避免返回过多数据
3. **定期备份**：定期备份数据库文件
4. **权限控制**：生产环境限制数据库用户权限

---

## 9. 示例：完整数据库初始化脚本

### 9.1 SQLite版本
```sql
-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建验证码表
CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT 0
);

-- 创建文件元数据表
CREATE TABLE IF NOT EXISTS file_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kb_name VARCHAR(255) NOT NULL,
    filename VARCHAR(500) NOT NULL,
    tags TEXT DEFAULT '',
    source VARCHAR(500) DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(kb_name, filename)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_file_metadata_kb_name ON file_metadata(kb_name);
CREATE INDEX IF NOT EXISTS idx_file_metadata_filename ON file_metadata(filename);
```

### 9.2 MySQL版本
```sql
-- 创建数据库（如不存在）
CREATE DATABASE IF NOT EXISTS xu_news_ai_rag 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE xu_news_ai_rag;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建验证码表
CREATE TABLE IF NOT EXISTS verification_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建文件元数据表
CREATE TABLE IF NOT EXISTS file_metadata (
    id INT PRIMARY KEY AUTO_INCREMENT,
    kb_name VARCHAR(255) NOT NULL,
    filename VARCHAR(500) NOT NULL,
    tags TEXT DEFAULT '',
    source VARCHAR(500) DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY idx_kb_filename (kb_name, filename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_verification_codes_email ON verification_codes(email);
CREATE INDEX idx_verification_codes_expires_at ON verification_codes(expires_at);
CREATE INDEX idx_file_metadata_kb_name ON file_metadata(kb_name);
CREATE INDEX idx_file_metadata_filename ON file_metadata(filename);
```

---

**文档版本**：v1.0  
**创建日期**：2025年11月9日  
**最后更新**：2025年11月9日

