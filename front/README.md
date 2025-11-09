# XU-News-AI-RAG 前端原型

## 项目简介

这是 XU-News-AI-RAG 个性化新闻智能知识库的前端原型，采用 React + Vite + Tailwind CSS 构建，融合了 Ant Design、Tailwind UI 和 Material Design 的设计风格。

## 设计特点

### 风格融合
- **Ant Design**：中性灰基底，低饱和度高辨识度色彩（#1677FF），4px/8px 圆角，清晰的信息层级
- **Tailwind UI**：原子化设计，高饱和点缀色（#3B82F6），hover 微放大（1.02倍）+ 过渡动画（0.2s）
- **Material Design**：卡片式设计，轻微悬浮质感，点击波纹动画，标题粗体+正文轻量对比

### 设计原则
- 高对比度：确保文字和背景对比度符合 WCAG 标准
- 清晰的信息层级：标题/正文/辅助文字字号比 1.5:1:0.8
- 8px 网格系统：所有间距遵循 8px 的倍数
- 响应式设计：支持 PC 端，适配不同屏幕尺寸

## 技术栈

- **框架**：React 18
- **构建工具**：Vite
- **样式**：Tailwind CSS
- **路由**：React Router
- **图标**：Lucide React

## 安装与运行

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 项目结构

```
front/
├── src/
│   ├── components/      # 公共组件
│   │   └── Layout.jsx   # 布局组件
│   ├── pages/           # 页面组件
│   │   ├── Login.jsx    # 登录页
│   │   ├── Dashboard.jsx # 仪表盘
│   │   ├── KnowledgeBase.jsx # 知识库管理
│   │   ├── Search.jsx   # 语义查询
│   │   └── Analysis.jsx # 数据分析
│   ├── App.jsx          # 应用入口
│   ├── main.jsx         # 入口文件
│   └── index.css        # 全局样式
├── index.html           # HTML 模板
├── package.json         # 项目配置
├── tailwind.config.js   # Tailwind 配置
└── vite.config.js       # Vite 配置
```

## 功能页面

### 1. 登录页
- 邮箱和密码输入
- 登录验证
- 演示账号提示

### 2. 仪表盘
- 统计卡片展示（知识库总量、今日新增、查询次数、活跃度）
- 最近活动列表

### 3. 知识库管理
- 数据列表查看
- 搜索和筛选功能
- 批量选择和删除
- 元数据编辑
- 数据上传入口

### 4. 语义查询
- 自然语言搜索
- 知识库检索结果展示
- 联网查询触发
- 相似度评分显示

### 5. 数据分析
- 关键词 Top10 分布
- 数据聚类分析
- 统计概览

## 设计规范

### 颜色系统
- **主色**：#1677FF (primary-500)
- **点缀色**：#3B82F6 (accent-500)
- **Material 主色**：#6200EE
- **中性色**：灰色系（gray-50 到 gray-900）

### 圆角规范
- **小圆角**：4px (rounded-ant)
- **大圆角**：8px (rounded-ant-lg)

### 阴影层级
- **默认**：shadow-ant (0 2px 8px rgba(0, 0, 0, 0.15))
- **悬浮**：shadow-ant-hover (0 4px 12px rgba(0, 0, 0, 0.15))
- **Material**：shadow-material (多层阴影)

### 字体层级
- **标题**：text-title (1.5倍字号，粗体)
- **正文**：text-body (1倍字号，正常)
- **辅助文字**：text-caption (0.8倍字号，正常)

## 注意事项

- 当前为前端原型，需要连接后端 API 才能实现完整功能
- 登录功能为演示版本，实际需要对接后端认证服务
- 数据展示为模拟数据，需要对接真实的后端接口

## 浏览器支持

- Chrome (最新版)
- Firefox (最新版)
- Edge (最新版)
- Safari (最新版)

## 许可证

本项目为培训考核项目，仅供学习使用。

