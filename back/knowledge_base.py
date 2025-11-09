import faiss
import numpy as np
from sentence_transformers import SentenceTransformer, CrossEncoder
import pickle
import os
from pathlib import Path
# 使用sentence-transformers直接实现，不依赖langchain
import logging

# 尝试导入win32api（Windows系统）
try:
    import win32api
    HAS_WIN32API = True
except ImportError:
    HAS_WIN32API = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SimpleTextSplitter:
    """简单的文本分割器"""
    def __init__(self, chunk_size=500, chunk_overlap=50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
    
    def split_text(self, text):
        """分割文本"""
        if not text:
            return []
        
        chunks = []
        start = 0
        text_length = len(text)
        
        while start < text_length:
            end = start + self.chunk_size
            chunk = text[start:end]
            
            # 尝试在句号、换行符等位置分割
            if end < text_length:
                # 向后查找分割点
                for sep in ['\n\n', '\n', '。', '.', '！', '!', '？', '?']:
                    last_sep = chunk.rfind(sep)
                    if last_sep > self.chunk_size * 0.5:  # 至少保留50%的内容
                        chunk = chunk[:last_sep + len(sep)]
                        end = start + len(chunk)
                        break
            
            chunks.append(chunk.strip())
            start = end - self.chunk_overlap  # 重叠
            
            if start >= text_length:
                break
        
        return chunks if chunks else [text]


class KnowledgeBase:
    def __init__(self, db_path='instance/faiss_index'):
        self.db_path = Path(db_path)
        self.db_path.mkdir(parents=True, exist_ok=True)
        
        # 嵌入模型
        logger.info("加载嵌入模型: all-MiniLM-L6-v2")
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # 重排模型
        logger.info("加载重排模型: cross-encoder/ms-marco-MiniLM-L-6-v2")
        try:
            from sentence_transformers import CrossEncoder
            self.rerank_model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
            logger.info("重排模型加载成功")
        except Exception as e:
            logger.warning(f"重排模型加载失败: {e}，尝试使用sentence-transformer版本")
            try:
                # 如果cross-encoder失败，尝试sentence-transformer版本
                self.rerank_model = SentenceTransformer('sentence-transformers/ms-marco-MiniLM-L-6-v2')
                logger.info("使用sentence-transformer版本的重排模型")
            except Exception as e2:
                logger.warning(f"sentence-transformer版本也加载失败: {e2}，使用嵌入模型代替")
                self.rerank_model = None
        
        # 文本分割器
        self.text_splitter = SimpleTextSplitter(
            chunk_size=500,
            chunk_overlap=50
        )
        
        # 初始化FAISS
        self.index = None
        self.documents = []
        self.load_index()
    
    def load_index(self):
        """加载FAISS索引"""
        index_file = self.db_path / 'index.faiss'
        docs_file = self.db_path / 'documents.pkl'
        
        logger.info(f"尝试加载索引: index_file={index_file.absolute()}, exists={index_file.exists()}")
        logger.info(f"尝试加载文档: docs_file={docs_file.absolute()}, exists={docs_file.exists()}")
        
        # 如果标准路径不存在，尝试查找其他可能的文件名（处理编码问题）
        if not index_file.exists():
            # 查找目录下所有.faiss文件
            faiss_files = list(self.db_path.glob('*.faiss'))
            logger.info(f"查找.faiss文件: 找到 {len(faiss_files)} 个")
            if faiss_files:
                index_file = faiss_files[0]
                logger.info(f"使用找到的索引文件: {index_file.name}")
        
        if not docs_file.exists():
            # 查找目录下所有.pkl文件
            pkl_files = list(self.db_path.glob('*.pkl'))
            logger.info(f"查找.pkl文件: 找到 {len(pkl_files)} 个")
            if pkl_files:
                docs_file = pkl_files[0]
                logger.info(f"使用找到的文档文件: {docs_file.name}")
        
        if index_file.exists() and docs_file.exists():
            try:
                self.index = faiss.read_index(str(index_file.resolve()))
                with open(docs_file.resolve(), 'rb') as f:
                    self.documents = pickle.load(f)
                logger.info(f"加载索引成功，包含 {len(self.documents)} 条文档")
            except Exception as e:
                logger.error(f"加载索引失败: {e}", exc_info=True)
                # 如果索引文件损坏，尝试从documents.pkl重新生成
                if docs_file.exists():
                    logger.info("索引文件损坏，尝试从documents.pkl重新生成索引")
                    try:
                        with open(docs_file.resolve(), 'rb') as f:
                            self.documents = pickle.load(f)
                        if len(self.documents) > 0:
                            self._rebuild_index_from_documents()
                            return
                    except Exception as e2:
                        logger.error(f"从documents.pkl重新生成索引失败: {e2}")
                self._create_new_index()
        elif docs_file.exists() and not index_file.exists():
            # 只有documents.pkl，没有index.faiss，尝试重新生成索引
            logger.warning(f"索引文件不存在，但文档文件存在，尝试重新生成索引")
            logger.warning(f"目录内容: {list(self.db_path.glob('*'))}")
            try:
                with open(docs_file.resolve(), 'rb') as f:
                    self.documents = pickle.load(f)
                if len(self.documents) > 0:
                    logger.info(f"从 {len(self.documents)} 条文档重新生成索引")
                    self._rebuild_index_from_documents()
                else:
                    logger.warning("文档文件为空，创建新索引")
                    self._create_new_index()
            except Exception as e:
                logger.error(f"加载documents.pkl失败: {e}")
                self._create_new_index()
        else:
            logger.warning(f"索引文件不存在: index.faiss={index_file.exists()}, documents.pkl={docs_file.exists()}")
            logger.warning(f"目录内容: {list(self.db_path.glob('*'))}")
            self._create_new_index()
    
    def _create_new_index(self):
        """创建新索引"""
        # all-MiniLM-L6-v2的维度是384
        dimension = 384
        self.index = faiss.IndexFlatL2(dimension)
        self.documents = []
        logger.info(f"创建新索引，维度: {dimension}")
    
    def _rebuild_index_from_documents(self):
        """从现有文档重新生成索引"""
        if len(self.documents) == 0:
            logger.warning("文档为空，无法重新生成索引")
            self._create_new_index()
            return
        
        logger.info(f"开始从 {len(self.documents)} 条文档重新生成索引...")
        
        # 创建新索引
        dimension = 384
        self.index = faiss.IndexFlatL2(dimension)
        
        # 提取所有文档文本
        all_texts = [doc.get('text', '') for doc in self.documents]
        
        # 生成向量
        logger.info("正在生成向量...")
        embeddings = self.embedding_model.encode(all_texts, show_progress_bar=False, batch_size=32)
        embeddings = np.array(embeddings).astype('float32')
        
        # 添加到索引
        logger.info("添加到FAISS索引...")
        self.index.add(embeddings)
        
        # 保存索引
        logger.info("保存重新生成的索引...")
        try:
            self.save_index()
            logger.info(f"索引重新生成成功，包含 {len(self.documents)} 条文档")
        except Exception as e:
            logger.error(f"保存重新生成的索引失败: {e}")
            logger.warning("索引已在内存中可用，可以正常搜索，但重启后需要重新生成")
            # 即使保存失败，索引也在内存中可用，不影响搜索功能
    
    def save_index(self):
        """保存索引"""
        try:
            # 确保目录存在
            self.db_path.mkdir(parents=True, exist_ok=True)
            
            # 使用相对路径（Path对象会自动处理）
            index_file = self.db_path / 'index.faiss'
            docs_file = self.db_path / 'documents.pkl'
            
            logger.info(f"准备保存索引到: {index_file.absolute()}")
            logger.info(f"准备保存文档到: {docs_file.absolute()}")
            logger.info(f"索引大小: {self.index.ntotal if hasattr(self.index, 'ntotal') else 'N/A'}")
            logger.info(f"文档数量: {len(self.documents)}")
            
            # 保存索引文件 - 使用字符串路径
            try:
                index_path_str = str(index_file.resolve())
                # 确保父目录存在
                index_file.parent.mkdir(parents=True, exist_ok=True)
                
                # 尝试写入索引文件 - 使用bytes模式确保编码正确
                logger.info(f"准备写入索引文件，路径: {index_path_str}")
                logger.info(f"索引类型: {type(self.index)}, 大小: {self.index.ntotal if hasattr(self.index, 'ntotal') else 'N/A'}")
                
                # 使用绝对路径字符串，确保路径正确
                abs_path_str = str(Path(index_path_str).absolute())
                
                # 确保目录存在
                Path(abs_path_str).parent.mkdir(parents=True, exist_ok=True)
                
                # 写入索引文件 - 使用多种方法确保成功
                import time
                saved = False
                
                # 方法1: 使用绝对路径
                try:
                    faiss.write_index(self.index, abs_path_str)
                    time.sleep(0.2)  # 等待文件系统同步
                    if Path(abs_path_str).exists():
                        saved = True
                        logger.info(f"FAISS索引已保存到: {abs_path_str}")
                except Exception as write_error:
                    logger.warning(f"绝对路径保存失败: {write_error}")
                
                # 方法2: 如果方法1失败，尝试使用相对路径
                if not saved:
                    try:
                        relative_path = str(index_file)
                        faiss.write_index(self.index, relative_path)
                        time.sleep(0.2)
                        if Path(relative_path).exists():
                            saved = True
                            abs_path_str = str(Path(relative_path).absolute())
                            logger.info(f"使用相对路径保存成功: {relative_path}")
                    except Exception as rel_error:
                        logger.warning(f"相对路径保存也失败: {rel_error}")
                
                # 方法3: 如果都失败，尝试使用短路径名（Windows）
                if not saved and os.name == 'nt' and HAS_WIN32API:
                    try:
                        short_path = win32api.GetShortPathName(str(self.db_path))
                        short_index_path = Path(short_path) / 'index.faiss'
                        faiss.write_index(self.index, str(short_index_path))
                        time.sleep(0.2)
                        if short_index_path.exists():
                            saved = True
                            abs_path_str = str(short_index_path.absolute())
                            logger.info(f"使用短路径名保存成功: {short_index_path}")
                    except Exception as short_error:
                        logger.warning(f"短路径名保存失败: {short_error}")
                
                if not saved:
                    # 不抛出异常，记录警告，索引在内存中仍然可用
                    logger.error("所有保存方法都失败，索引仅在内存中可用")
                    logger.warning("这可能是由于路径编码问题，但搜索功能仍然可用")
                    # 不抛出异常，让调用者知道保存失败但可以继续使用
                    return  # 提前返回，不继续验证
                
                # 验证文件
                check_path = Path(abs_path_str)
                if check_path.exists():
                    file_size = check_path.stat().st_size
                    logger.info(f"验证成功: 索引文件存在，大小: {file_size} 字节")
                else:
                    # 等待更长时间后再次检查
                    time.sleep(0.5)
                    if check_path.exists():
                        file_size = check_path.stat().st_size
                        logger.info(f"延迟验证成功: 索引文件存在，大小: {file_size} 字节")
                    else:
                        logger.error(f"警告: 索引文件保存后验证不存在: {abs_path_str}")
                        logger.error(f"目录内容: {list(check_path.parent.glob('*'))}")
            except Exception as e:
                logger.error(f"保存FAISS索引失败: {e}")
                logger.warning("索引在内存中仍然可用，可以正常搜索")
                # 不抛出异常，允许索引在内存中使用
                # 这样即使保存失败，搜索功能仍然可用
            
            # 保存文档文件
            try:
                docs_path_str = str(docs_file.resolve())
                with open(docs_path_str, 'wb') as f:
                    pickle.dump(self.documents, f)
                logger.info(f"文档数据已保存到: {docs_path_str}")
            except Exception as e:
                logger.error(f"保存文档数据失败: {e}", exc_info=True)
                raise
            
            logger.info(f"保存索引成功，包含 {len(self.documents)} 条文档")
            
            # 验证文件是否真的保存了（使用resolve后的路径）
            index_resolved = index_file.resolve()
            docs_resolved = docs_file.resolve()
            
            if not index_resolved.exists():
                logger.error(f"错误: 索引文件保存后不存在: {index_resolved}")
                logger.error(f"目录内容: {list(self.db_path.resolve().glob('*'))}")
            else:
                logger.info(f"验证成功: 索引文件存在，大小: {index_resolved.stat().st_size} 字节")
                
            if not docs_resolved.exists():
                logger.error(f"错误: 文档文件保存后不存在: {docs_resolved}")
            else:
                logger.info(f"验证成功: 文档文件存在，大小: {docs_resolved.stat().st_size} 字节")
        except Exception as e:
            logger.error(f"保存索引失败: {e}", exc_info=True)
            import traceback
            traceback.print_exc()
            raise
    
    def add_documents(self, texts, metadata_list=None):
        """添加文档到知识库"""
        if not texts:
            return
        
        if metadata_list is None:
            metadata_list = [{}] * len(texts)
        
        # 分割文本
        all_chunks = []
        all_metadata = []
        
        for text, metadata in zip(texts, metadata_list):
            chunks = self.text_splitter.split_text(text)
            for chunk in chunks:
                all_chunks.append(chunk)
                all_metadata.append(metadata)
        
        # 生成向量
        embeddings = self.embedding_model.encode(all_chunks, show_progress_bar=False)
        embeddings = np.array(embeddings).astype('float32')
        
        # 添加到索引
        self.index.add(embeddings)
        
        # 保存文档
        for chunk, metadata in zip(all_chunks, all_metadata):
            self.documents.append({
                'text': chunk,
                'metadata': metadata
            })
        
        self.save_index()
        logger.info(f"添加 {len(all_chunks)} 个文档块到知识库")
    
    def search(self, query, top_k=10, similarity_threshold=0.3):
        """搜索知识库"""
        logger.info(f"🔍 开始搜索知识库: query='{query}', top_k={top_k}, threshold={similarity_threshold}")
        logger.info(f"📚 知识库文档总数: {len(self.documents)}")
        
        if len(self.documents) == 0:
            logger.warning("⚠️ 知识库为空，无法搜索")
            return []
        
        # 生成查询向量
        logger.info("🔄 正在生成查询向量...")
        query_embedding = self.embedding_model.encode([query])
        query_embedding = np.array(query_embedding).astype('float32')
        logger.info(f"✅ 查询向量生成完成，维度: {query_embedding.shape}")
        
        # 搜索
        k = min(top_k, len(self.documents))
        if k == 0:
            logger.warning("⚠️ k=0，无法搜索")
            return []
        
        logger.info(f"🔎 在FAISS索引中搜索，k={k}")
        distances, indices = self.index.search(query_embedding, k)
        logger.info(f"📊 搜索完成，找到 {len(indices[0])} 个候选结果")
        
        results = []
        filtered_count = 0
        for i, (distance, idx) in enumerate(zip(distances[0], indices[0])):
            if idx < len(self.documents) and idx >= 0:
                # L2距离转换为相似度（归一化到0-1）
                # 使用更合理的距离转换：all-MiniLM-L6-v2的典型距离范围是0-2
                max_distance = 2.0
                similarity = max(0, 1 - (distance / max_distance))
                
                logger.debug(f"结果 {i+1}: idx={idx}, distance={distance:.4f}, similarity={similarity:.4f}, threshold={similarity_threshold}")
                
                # 降低相似度阈值，让更多结果能够返回
                if similarity >= similarity_threshold:
                    doc = self.documents[idx].copy()
                    doc['similarity'] = float(similarity)
                    doc['rank'] = i + 1
                    results.append(doc)
                    logger.debug(f"✅ 结果 {i+1} 通过阈值过滤: similarity={similarity:.4f}")
                else:
                    filtered_count += 1
                    logger.debug(f"❌ 结果 {i+1} 未通过阈值过滤: similarity={similarity:.4f} < {similarity_threshold}")
        
        logger.info(f"📈 搜索统计: 总候选={len(indices[0])}, 通过阈值={len(results)}, 被过滤={filtered_count}")
        
        # 重排序（使用重排模型提升相关性）
        if len(results) > 0 and self.rerank_model and len(results) <= 50:  # 只对前50条进行重排，避免太慢
            logger.info(f"🔄 开始重排序，结果数: {len(results)}")
            try:
                doc_texts = [r['text'] for r in results]
                
                # 检查是否是CrossEncoder
                if isinstance(self.rerank_model, CrossEncoder):
                    # CrossEncoder直接接受(query, document)对，返回相关性分数
                    pairs = [[query, doc_text] for doc_text in doc_texts]
                    rerank_scores = self.rerank_model.predict(pairs)
                    # 将numpy数组转换为列表
                    if hasattr(rerank_scores, 'tolist'):
                        rerank_scores = rerank_scores.tolist()
                    elif isinstance(rerank_scores, np.ndarray):
                        rerank_scores = rerank_scores.tolist()
                    else:
                        rerank_scores = list(rerank_scores)
                else:
                    # 如果是SentenceTransformer，使用原来的方法
                    query_emb = self.rerank_model.encode([query])[0]
                    doc_embs = self.rerank_model.encode(doc_texts)
                    
                    # 计算余弦相似度作为重排分数
                    rerank_scores = []
                    query_norm = np.linalg.norm(query_emb)
                    for doc_emb in doc_embs:
                        doc_norm = np.linalg.norm(doc_emb)
                        if query_norm > 0 and doc_norm > 0:
                            score = float(np.dot(query_emb, doc_emb) / (query_norm * doc_norm))
                        else:
                            score = 0.0
                        rerank_scores.append(score)
                
                # 更新结果的重排分数
                for i, result in enumerate(results):
                    result['rerank_score'] = float(rerank_scores[i])
                    # 使用重排分数和原始相似度的加权平均（重排分数权重更高）
                    original_sim = result.get('similarity', 0)
                    result['final_score'] = 0.6 * float(rerank_scores[i]) + 0.4 * original_sim
                
                # 按最终分数排序
                results.sort(key=lambda x: x.get('final_score', x.get('similarity', 0)), reverse=True)
                logger.info(f"✅ 重排序完成，共处理 {len(results)} 条结果")
                # 显示前3条结果的分数
                for i, r in enumerate(results[:3]):
                    logger.info(f"  排名 {i+1}: similarity={r.get('similarity', 0):.4f}, final_score={r.get('final_score', 0):.4f}")
            except Exception as e:
                logger.warning(f"重排序失败: {e}，使用原始相似度排序")
                import traceback
                traceback.print_exc()
                # 如果重排失败，至少按相似度排序
                results.sort(key=lambda x: x.get('similarity', 0), reverse=True)
        else:
            # 如果没有重排，至少按相似度排序
            results.sort(key=lambda x: x.get('similarity', 0), reverse=True)
            logger.info(f"📊 未使用重排模型，按相似度排序，返回 {len(results)} 条结果")
        
        logger.info(f"✅ 搜索完成，最终返回 {len(results)} 条结果")
        if len(results) > 0:
            logger.info(f"   最高相似度: {results[0].get('similarity', 0):.4f}")
            logger.info(f"   最低相似度: {results[-1].get('similarity', 0):.4f}")
        
        return results
    
    def delete_documents_by_filename(self, filename):
        """根据文件名删除文档"""
        if not filename:
            return 0
        
        original_count = len(self.documents)
        # 过滤掉匹配的文件名
        self.documents = [
            doc for doc in self.documents 
            if doc.get('metadata', {}).get('file_name') != filename
        ]
        deleted_count = original_count - len(self.documents)
        
        if deleted_count > 0:
            # 重新构建索引
            logger.info(f"删除 {deleted_count} 个文档块，重新构建索引...")
            self._rebuild_index_from_documents()
            logger.info(f"索引重建完成，剩余 {len(self.documents)} 个文档")
        
        return deleted_count
    
    def cleanup_missing_files(self, existing_files):
        """清理不存在的文件对应的文档
        existing_files: 存在的文件名集合
        """
        if not existing_files:
            return 0
        
        original_count = len(self.documents)
        # 只保留文件存在的文档
        self.documents = [
            doc for doc in self.documents 
            if doc.get('metadata', {}).get('file_name') in existing_files
        ]
        deleted_count = original_count - len(self.documents)
        
        if deleted_count > 0:
            # 重新构建索引
            logger.info(f"清理 {deleted_count} 个不存在的文件对应的文档块，重新构建索引...")
            self._rebuild_index_from_documents()
            logger.info(f"索引重建完成，剩余 {len(self.documents)} 个文档")
        
        return deleted_count
    
    def get_stats(self):
        """获取知识库统计信息"""
        return {
            'total_documents': len(self.documents),
            'index_size': self.index.ntotal if self.index else 0
        }

