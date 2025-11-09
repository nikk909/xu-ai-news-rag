from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import logging
from news_crawler import NewsCrawler
from knowledge_base import KnowledgeBase
from ollama_client import OllamaClient
from models import db, User
import atexit

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NewsScheduler:
    def __init__(self, app, mail, kb, ollama_client):
        self.app = app
        self.mail = mail
        self.kb = kb
        self.ollama_client = ollama_client
        self.crawler = NewsCrawler()
        self.scheduler = BackgroundScheduler()
        self.setup_jobs()
    
    def setup_jobs(self):
        """设置定时任务"""
        # 每小时执行一次新闻采集
        self.scheduler.add_job(
            func=self.crawl_and_store_news,
            trigger=CronTrigger(minute=0),  # 每小时整点执行
            id='crawl_news',
            name='新闻采集任务',
            replace_existing=True
        )
        logger.info("定时任务已设置：每小时执行一次新闻采集")
    
    def crawl_and_store_news(self):
        """采集并存储新闻"""
        with self.app.app_context():
            try:
                logger.info("开始执行新闻采集任务")
                
                # RSS源示例（可根据需要修改）
                rss_urls = [
                    'https://rss.cnn.com/rss/edition.rss',
                    'https://feeds.bbci.co.uk/news/rss.xml',
                ]
                
                # 抓取新闻
                articles = self.crawler.crawl_multiple_sources(rss_urls=rss_urls)
                
                if not articles:
                    logger.warning("未抓取到新闻")
                    return
                
                # 限制单次最多100条
                articles = articles[:100]
                
                # 添加到知识库
                texts = []
                metadata_list = []
                
                for article in articles:
                    # 使用Ollama生成摘要
                    content = article.get('content', '')
                    if len(content) > 500:
                        summary = self.ollama_client.summarize(content[:1000], max_length=200)
                        article['summary'] = summary
                    
                    text = f"标题：{article.get('title', '')}\n内容：{article.get('content', '')}"
                    texts.append(text)
                    metadata_list.append({
                        'title': article.get('title', ''),
                        'source': article.get('source', ''),
                        'link': article.get('link', ''),
                        'published': article.get('published', ''),
                        'author': article.get('author', ''),
                        'created_at': datetime.now().isoformat()
                    })
                
                # 添加到default知识库（确保定时任务采集的新闻可以被搜索到）
                default_kb = KnowledgeBase(db_path='instance/faiss_index_default')
                default_kb.add_documents(texts, metadata_list)
                del default_kb
                
                # 同时添加到全局kb实例（保持兼容）
                self.kb.add_documents(texts, metadata_list)
                
                # 新闻采集不需要发送邮件通知（已删除此功能）
                
                logger.info(f"新闻采集完成，共 {len(articles)} 条")
                
            except Exception as e:
                logger.error(f"新闻采集任务失败: {e}")
    
    def start(self):
        """启动调度器"""
        self.scheduler.start()
        logger.info("定时任务调度器已启动")
        atexit.register(lambda: self.scheduler.shutdown())
    
    def stop(self):
        """停止调度器"""
        self.scheduler.shutdown()
        logger.info("定时任务调度器已停止")

