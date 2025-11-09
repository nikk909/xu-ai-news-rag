# Ollama 连接说明

## 问题诊断

如果系统显示"Ollama不可用"，可能的原因包括：

1. **Ollama服务未启动**
2. **模型未安装**（代码使用 `qwen3:4b` 模型）
3. **Ollama未安装**
4. **端口配置问题**

## 解决方案

### 1. 检查Ollama服务状态

```powershell
# 检查Ollama进程是否运行
Get-Process | Where-Object {$_.ProcessName -like "*ollama*"}

# 测试Ollama API连接
curl http://localhost:11434/api/tags
```

### 2. 查看已安装的模型

```powershell
ollama list
```

应该看到类似输出：
```
NAME         ID              SIZE      MODIFIED   
qwen3:4b     359d7dd4bcda    2.5 GB    2 days ago
```

### 3. 安装所需模型（如果未安装）

代码默认使用 `qwen3:4b` 模型。如果该模型未安装，请运行：

```powershell
ollama pull qwen3:4b
```

### 4. 启动Ollama服务

如果Ollama未运行，请：

**Windows:**
- 双击桌面上的Ollama图标，或
- 在命令行运行：`ollama serve`

**Linux/Mac:**
```bash
ollama serve
```

### 5. 验证连接

重启后端服务后，查看日志应该看到：

```
INFO:__main__:Ollama客户端创建成功，尝试连接服务...
INFO:__main__:Ollama服务连接成功，已安装的模型: ['qwen3:4b', ...]
INFO:__main__:初始化Ollama客户端成功，模型 'qwen3:4b' 已安装并可用
```

## 功能说明

### 当Ollama可用时：
- 系统会使用大语言模型进行**深度语义分析**
- 分析包括：问题语义解析、关键概念提取、逻辑关系分析、深度语义解释

### 当Ollama不可用时：
- 系统会使用**备用语义分析**功能
- 仍然提供深度语义分析，包括：
  - 问题类型识别
  - 关键概念提取
  - 逻辑关系分析
  - 基于知识库的深度语义解释

## 配置说明

### 修改模型名称

如果需要使用其他模型，修改 `back/app.py` 中的模型名称：

```python
ollama_client = OllamaClient(model_name='your-model-name')
```

### 修改Ollama地址

如果Ollama运行在不同地址，设置环境变量：

```powershell
$env:OLLAMA_HOST="http://your-ollama-host:11434"
```

或在代码中修改：

```python
self.client = ollama.Client(host='http://your-ollama-host:11434')
```

## 常见问题

### Q: 为什么显示"Ollama不可用"但服务在运行？

A: 可能是模型名称不匹配。检查：
1. 代码中使用的模型名称（默认：`qwen3:4b`）
2. 已安装的模型列表（运行 `ollama list`）
3. 如果模型名称不同，要么安装正确的模型，要么修改代码中的模型名称

### Q: 如何确认Ollama正常工作？

A: 运行以下命令测试：

```powershell
# 测试API
curl http://localhost:11434/api/tags

# 测试模型生成
ollama run qwen3:4b "你好"
```

### Q: 安装模型需要多长时间？

A: 取决于模型大小和网络速度：
- `qwen3:4b`: 约2.5GB，通常需要几分钟到十几分钟
- 首次下载需要从网络下载，后续使用本地模型

## 注意事项

1. **模型大小**：确保有足够的磁盘空间（`qwen3:4b` 约需2.5GB）
2. **内存要求**：运行模型需要足够的内存（建议至少8GB RAM）
3. **性能**：首次加载模型可能需要一些时间，后续调用会更快
4. **网络**：首次安装模型需要网络连接下载


