import ollama
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OllamaClient:
    def __init__(self, model_name='qwen3:4b'):
        """
        初始化Ollama客户端
        
        Args:
            model_name: 要使用的模型名称，默认为'qwen3:4b'
                       注意：确保该模型已通过 'ollama pull <model_name>' 安装
        """
        self.model_name = model_name
        self.client = None
        self.available = False
        
        try:
            # 步骤1: 创建Ollama客户端实例
            # 优先使用127.0.0.1而不是0.0.0.0，因为Python客户端可能无法连接到0.0.0.0
            import os
            # 临时覆盖OLLAMA_HOST环境变量，使用127.0.0.1
            original_host = os.environ.get('OLLAMA_HOST')
            try:
                # 使用127.0.0.1而不是0.0.0.0
                os.environ['OLLAMA_HOST'] = 'http://127.0.0.1:11434'
                logger.info(f"设置OLLAMA_HOST为: http://127.0.0.1:11434")
                
                # 尝试多种连接方式以确保能够连接
                self.client = None
                connection_attempts = [
                    {'host': 'http://127.0.0.1:11434'},  # 显式指定127.0.0.1
                    {'host': '127.0.0.1:11434'},        # 只指定host:port
                    {'host': 'http://localhost:11434'}, # localhost
                    {},                                  # 使用默认连接（会使用环境变量）
                ]
                
                for attempt in connection_attempts:
                    try:
                        logger.info(f"尝试连接Ollama: {attempt if attempt else '默认连接'}")
                        self.client = ollama.Client(**attempt) if attempt else ollama.Client()
                        # 测试连接
                        models_response = self.client.list()
                        logger.info(f"Ollama客户端创建成功，连接方式: {attempt if attempt else '默认'}")
                        break
                    except Exception as e:
                        logger.warning(f"连接尝试失败: {e}")
                        continue
                
                if not self.client:
                    raise Exception("所有连接方式都失败")
                
                # 步骤2: 测试连接 - 尝试列出已安装的模型
                models_response = self.client.list()
            finally:
                # 恢复原始环境变量
                if original_host:
                    os.environ['OLLAMA_HOST'] = original_host
                elif 'OLLAMA_HOST' in os.environ:
                    del os.environ['OLLAMA_HOST']
            # 处理不同版本的ollama库返回格式
            # 新版本返回Model对象列表，旧版本返回字典列表
            installed_models = []
            if hasattr(models_response, 'models'):
                # 新版本：models_response是ListResponse对象
                models_list = models_response.models
            elif isinstance(models_response, dict):
                # 旧版本：返回字典
                models_list = models_response.get('models', [])
            else:
                # 直接是列表
                models_list = models_response
            
            for model in models_list:
                if hasattr(model, 'model'):
                    # Model对象，使用.model属性
                    installed_models.append(model.model)
                elif isinstance(model, dict):
                    # 字典，使用['name']键
                    installed_models.append(model.get('name', ''))
                else:
                    # 字符串
                    installed_models.append(str(model))
            
            logger.info(f"Ollama服务连接成功，已安装的模型: {installed_models}")
            
            # 步骤3: 检查指定的模型是否已安装
            if model_name in installed_models:
                self.available = True
                logger.info(f"初始化Ollama客户端成功，模型 '{model_name}' 已安装并可用")
            else:
                logger.warning(f"模型 '{model_name}' 未安装。已安装的模型: {installed_models}")
                logger.warning(f"请运行 'ollama pull {model_name}' 安装该模型")
                logger.warning("Ollama客户端将使用简化模式（备用语义分析）")
                self.available = False
                
        except Exception as e:
            logger.warning(f"Ollama服务不可用: {e}")
            logger.warning("可能的原因：")
            logger.warning("1. Ollama服务未启动 - 请运行 'ollama serve' 或启动Ollama应用")
            logger.warning("2. Ollama未安装 - 请访问 https://ollama.com 下载安装")
            logger.warning("3. 服务运行在不同端口 - 请检查OLLAMA_HOST环境变量")
            logger.warning("将使用简化模式（备用语义分析）")
            self.available = False
    
    def generate(self, prompt, max_tokens=500):
        """
        生成文本（使用chat API，更稳定可靠）
        
        Args:
            prompt: 输入提示词
            max_tokens: 最大生成token数
        
        Returns:
            str: 生成的文本
        """
        if not self.available or not self.client:
            logger.warning("Ollama不可用，无法生成文本")
            return None
        
        try:
            # 使用chat API而不是generate API，因为chat API更稳定
            # 将prompt包装成消息格式
            messages = [
                {
                    'role': 'user',
                    'content': prompt
                }
            ]
            
            response = self.client.chat(
                model=self.model_name,
                messages=messages,
                options={
                    'num_predict': max_tokens,
                    'temperature': 0.7
                }
            )
            
            # chat API返回格式: {'message': {'role': 'assistant', 'content': '...'}, ...}
            generated_text = response.get('message', {}).get('content', '')
            
            if generated_text:
                logger.info(f"Ollama生成成功，生成了 {len(generated_text)} 个字符")
                return generated_text
            else:
                logger.warning("Ollama返回空内容")
                return ''
                
        except Exception as e:
            logger.error(f"Ollama生成失败: {e}", exc_info=True)
            return None
    
    def chat(self, messages):
        """对话"""
        try:
            response = self.client.chat(
                model=self.model_name,
                messages=messages
            )
            return response['message']['content']
        except Exception as e:
            logger.error(f"Ollama对话失败: {e}")
            return f"对话失败: {str(e)}"
    
    def summarize(self, text, max_length=200):
        """摘要生成"""
        if not self.available:
            return text[:max_length] + "..." if len(text) > max_length else text
        prompt = f"请为以下文本生成简洁的摘要（不超过{max_length}字）：\n\n{text}"
        return self.generate(prompt, max_tokens=max_length)
    
    def answer_question(self, question, context):
        """基于上下文回答问题"""
        prompt = f"""基于以下上下文回答问题。如果上下文中没有相关信息，请说明。

上下文：
{context}

问题：{question}

答案："""
        return self.generate(prompt, max_tokens=300)

