import feedparser
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import time
import random
from urllib.robotparser import RobotFileParser
from urllib.parse import urljoin, urlparse
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NewsCrawler:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        self.robots_cache = {}
    
    def check_robots_txt(self, url):
        """检查robots.txt"""
        try:
            parsed = urlparse(url)
            base_url = f"{parsed.scheme}://{parsed.netloc}"
            
            if base_url not in self.robots_cache:
                rp = RobotFileParser()
                rp.set_url(urljoin(base_url, '/robots.txt'))
                rp.read()
                self.robots_cache[base_url] = rp
            
            return self.robots_cache[base_url].can_fetch(self.session.headers['User-Agent'], url)
        except Exception as e:
            logger.warning(f"检查robots.txt失败: {e}")
            return True
    
    def crawl_rss(self, rss_url):
        """抓取RSS源"""
        try:
            feed = feedparser.parse(rss_url)
            articles = []
            
            for entry in feed.entries[:10]:  # 限制每次最多10条
                article = {
                    'title': entry.get('title', ''),
                    'content': entry.get('summary', entry.get('description', '')),
                    'link': entry.get('link', ''),
                    'source': 'RSS',
                    'published': entry.get('published', ''),
                    'author': entry.get('author', ''),
                }
                articles.append(article)
            
            logger.info(f"RSS抓取成功: {rss_url}, 获取 {len(articles)} 条")
            return articles
        except Exception as e:
            logger.error(f"RSS抓取失败: {rss_url}, 错误: {e}")
            return []
    
    def crawl_webpage(self, url, max_links=5):
        """抓取网页内容"""
        articles = []
        try:
            # 检查robots.txt
            if not self.check_robots_txt(url):
                logger.warning(f"robots.txt禁止访问: {url}")
                return articles
            
            # 随机延迟30-60秒
            time.sleep(random.randint(30, 60))
            
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 移除script和style标签
            for script in soup(["script", "style"]):
                script.decompose()
            
            title = soup.find('title')
            title_text = title.get_text().strip() if title else ''
            
            # 尝试获取主要内容
            content_selectors = ['article', '.content', '.post-content', 'main', 'body']
            content = ''
            for selector in content_selectors:
                element = soup.select_one(selector)
                if element:
                    content = element.get_text().strip()
                    break
            
            if not content:
                content = soup.get_text().strip()
            
            # 限制内容长度
            content = content[:5000] if len(content) > 5000 else content
            
            article = {
                'title': title_text,
                'content': content,
                'link': url,
                'source': '网页抓取',
                'published': datetime.now().isoformat(),
                'author': '',
            }
            articles.append(article)
            
            logger.info(f"网页抓取成功: {url}")
            return articles
        except Exception as e:
            logger.error(f"网页抓取失败: {url}, 错误: {e}")
            return []
    
    def crawl_multiple_sources(self, rss_urls=None, web_urls=None):
        """批量抓取多个源"""
        all_articles = []
        
        if rss_urls:
            for rss_url in rss_urls:
                articles = self.crawl_rss(rss_url)
                all_articles.extend(articles)
                # 控制频率：每分钟最多2次
                time.sleep(30)
        
        if web_urls:
            for web_url in web_urls[:5]:  # 限制单次最多5个网页
                articles = self.crawl_webpage(web_url)
                all_articles.extend(articles)
                # 控制频率：每次请求间隔30-60秒
                time.sleep(random.randint(30, 60))
        
        return all_articles

