"""联网搜索功能"""
import requests
from bs4 import BeautifulSoup
import logging
import json
import urllib.parse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WebSearcher:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
    
    def search_duckduckgo(self, query, max_results=3):
        """使用DuckDuckGo搜索（免费，无需API密钥）"""
        try:
            # DuckDuckGo Instant Answer API
            api_url = f"https://api.duckduckgo.com/?q={urllib.parse.quote(query)}&format=json&no_html=1&skip_disambig=1"
            response = self.session.get(api_url, timeout=5)  # 减少超时时间到5秒
            response.raise_for_status()
            data = response.json()
            
            results = []
            
            # 处理Instant Answer结果
            if data.get('AbstractText'):
                results.append({
                    'title': data.get('Heading', query),
                    'content': data.get('AbstractText', ''),
                    'link': data.get('AbstractURL', ''),
                    'source': 'DuckDuckGo',
                    'rank': 1
                })
            
            # 处理Related Topics
            for idx, topic in enumerate(data.get('RelatedTopics', [])[:max_results-1], 2):
                if isinstance(topic, dict) and 'Text' in topic:
                    results.append({
                        'title': topic.get('FirstURL', '').split('/')[-1] if topic.get('FirstURL') else f'相关结果 {idx}',
                        'content': topic.get('Text', ''),
                        'link': topic.get('FirstURL', ''),
                        'source': 'DuckDuckGo',
                        'rank': idx
                    })
            
            if results:
                logger.info(f"DuckDuckGo搜索成功，找到 {len(results)} 条结果")
                return results[:max_results]
        except Exception as e:
            logger.warning(f"DuckDuckGo搜索失败: {e}")
        
        return None
    
    def search_baidu_html(self, query, max_results=3):
        """使用百度搜索"""
        try:
            # 尝试使用百度搜索的公开接口
            search_url = f"https://www.baidu.com/s?wd={urllib.parse.quote(query)}"
            response = self.session.get(search_url, timeout=5)  # 减少超时时间到5秒
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            results = []
            
            # 尝试多种可能的百度搜索结果选择器
            # 百度搜索结果可能有不同的HTML结构
            selectors = [
                ('div', {'class': 'result'}),
                ('div', {'class': 'c-container'}),
                ('div', {'class': 'result-op'}),
                ('div', {'id': lambda x: x and 'result' in x.lower()}),
            ]
            
            result_divs = []
            for tag, attrs in selectors:
                result_divs = soup.find_all(tag, attrs)
                if result_divs:
                    logger.info(f"使用选择器 {tag} {attrs} 找到 {len(result_divs)} 个结果")
                    break
            
            if not result_divs:
                # 尝试更通用的方法：查找包含链接的div
                result_divs = soup.find_all('div', class_=lambda x: x and ('result' in x.lower() or 'container' in x.lower()))
            
            for idx, div in enumerate(result_divs[:max_results], 1):
                try:
                    # 尝试多种方式查找标题
                    title_elem = div.find('h3') or div.find('h2') or div.find('a', class_=lambda x: x and 'title' in x.lower())
                    if not title_elem:
                        title_elem = div.find('a')
                    
                    # 尝试多种方式查找链接
                    link_elem = div.find('a', href=True)
                    if not link_elem and title_elem:
                        link_elem = title_elem
                    
                    # 尝试多种方式查找内容摘要
                    content_elem = (
                        div.find('span', class_=lambda x: x and ('abstract' in x.lower() or 'content' in x.lower())) or
                        div.find('div', class_=lambda x: x and ('abstract' in x.lower() or 'content' in x.lower())) or
                        div.find('p', class_=lambda x: x and ('abstract' in x.lower() or 'content' in x.lower()))
                    )
                    
                    title = title_elem.get_text().strip() if title_elem else f"搜索结果 {idx}"
                    link = link_elem.get('href', '') if link_elem else ''
                    content = content_elem.get_text().strip() if content_elem else ''
                    
                    # 如果没有内容，尝试从div中提取文本
                    if not content:
                        all_text = div.get_text()
                        if title_elem:
                            title_text = title_elem.get_text()
                            content = all_text.replace(title_text, '').strip()[:200]
                    
                    if title:
                        results.append({
                            'title': title,
                            'content': content[:500] if content else f'关于"{query}"的搜索结果',
                            'link': link,
                            'source': '百度搜索',
                            'rank': idx
                        })
                except Exception as e:
                    logger.warning(f"解析搜索结果项失败: {e}")
                    continue
            
            if results:
                logger.info(f"百度搜索HTML解析成功，找到 {len(results)} 条结果")
                return results[:max_results]
        except Exception as e:
            logger.warning(f"百度搜索HTML解析失败: {e}")
        
        return None
    
    def search(self, query, max_results=3):
        """通用搜索接口 - 优先使用真实搜索，失败则返回空列表（不返回虚拟内容）"""
        logger.info(f"🌐 开始联网搜索: query='{query}', max_results={max_results}")
        
        # 方法1: 尝试DuckDuckGo（免费API）
        logger.info("🔍 尝试方法1: DuckDuckGo API")
        results = self.search_duckduckgo(query, max_results)
        if results:
            logger.info(f"✅ DuckDuckGo搜索成功，找到 {len(results)} 条结果")
            return results
        else:
            logger.warning("❌ DuckDuckGo搜索失败或无结果")
        
        # 方法2: 尝试百度HTML解析
        logger.info("🔍 尝试方法2: 百度HTML解析")
        results = self.search_baidu_html(query, max_results)
        if results:
            logger.info(f"✅ 百度搜索成功，找到 {len(results)} 条结果")
            return results
        else:
            logger.warning("❌ 百度搜索失败或无结果")
        
        # 如果所有方法都失败，返回空列表（不返回虚拟内容）
        logger.warning(f"❌ 所有联网搜索方法都失败，返回空结果（不返回虚拟内容）")
        return []

