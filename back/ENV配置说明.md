# ENV配置文件说明

在 `back` 目录下创建 `.env` 文件，配置以下内容：

## 必需配置

```env
# MySQL数据库配置
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3307
MYSQL_USER=root
MYSQL_PASSWORD=你的MySQL密码
MYSQL_DATABASE=xu_news_ai_rag

# Flask密钥（用于JWT等）
SECRET_KEY=你的密钥字符串
```

## 可选配置（邮件服务）

```env
# 邮件服务器配置（用于发送验证码）
MAIL_SERVER=smtp.qq.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=你的邮箱
MAIL_PASSWORD=你的邮箱授权码
MAIL_DEFAULT_SENDER=你的邮箱
```

## 注意事项

- 如果不配置邮件服务，系统会在开发模式下直接返回验证码
- `SECRET_KEY` 应该使用随机字符串，生产环境必须修改
- MySQL密码不要包含特殊字符，如必须使用请进行URL编码





