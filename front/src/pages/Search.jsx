import { useState, useEffect, useRef } from 'react'
import { Search as SearchIcon, Sparkles, ExternalLink, Loader, Database, ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Search() {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [reply, setReply] = useState('')  // 综合回复
  const [sources, setSources] = useState([])  // 来源信息
  const [isWebSearch, setIsWebSearch] = useState(false)
  const [kbList, setKbList] = useState([])
  const [selectedKbs, setSelectedKbs] = useState([])
  const [showKbSelector, setShowKbSelector] = useState(false)
  const [total, setTotal] = useState(0)
  const kbSelectorRef = useRef(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })

  const pageSize = 10
  const MAX_SELECTED_KBS = 5

  useEffect(() => {
    fetchKBList()
  }, [])

  // 点击外部关闭知识库选择器，并更新下拉菜单位置
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showKbSelector && !event.target.closest('.kb-selector-container') && !event.target.closest('.kb-dropdown-menu')) {
        setShowKbSelector(false)
      }
    }
    const updatePosition = () => {
      if (kbSelectorRef.current && showKbSelector) {
        const rect = kbSelectorRef.current.getBoundingClientRect()
        setDropdownPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right
        })
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    if (showKbSelector) {
      updatePosition()
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [showKbSelector])

  const fetchKBList = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/knowledge/kb-list')
      if (response.ok) {
        const data = await response.json()
        let kbList = data.kb_list || []
        
        // 确保default知识库存在（如果后端没有返回，前端添加一个）
        const hasDefault = kbList.some(kb => kb.name === 'default')
        if (!hasDefault) {
          kbList = [
            {
              name: 'default',
              file_count: 0,
              total_size: 0,
              total_size_mb: 0
            },
            ...kbList
          ]
        }
        
        // 确保default排在第一位
        kbList.sort((a, b) => {
          if (a.name === 'default') return -1
          if (b.name === 'default') return 1
          return a.name.localeCompare(b.name)
        })
        
        setKbList(kbList)
      }
    } catch (err) {
      console.error('获取知识库列表失败:', err)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsSearching(true)
    setIsWebSearch(false)
    setReply('')
    setSources([])
    setTotal(0)

    try {
      const token = localStorage.getItem('token')
      const headers = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const requestBody = {
        query: query.trim(),
        page: 1,
        page_size: pageSize,
        send_email: false,  // 语义查询页面不发送邮件
        selected_kbs: selectedKbs.length > 0 ? selectedKbs : ['default']  // 默认搜索default知识库
      }

      // 详细的请求调试信息
      console.group('🚀 发送搜索请求')
      console.log('🔎 搜索关键词:', query.trim())
      console.log('📚 选择的知识库:', requestBody.selected_kbs)
      console.log('📄 请求参数:', requestBody)
      console.log('🔑 认证Token:', token ? '已提供' : '未提供')
      console.groupEnd()

      const response = await fetch('http://localhost:5000/api/knowledge/search', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
      })

      // 记录响应状态
      console.log('📡 HTTP响应状态:', response.status, response.statusText)

      const data = await response.json()

      if (response.ok) {
        // 详细的调试信息
        console.group('🔍 搜索响应详情')
        console.log('📥 完整响应数据:', data)
        console.log('📝 回复内容:', data.reply)
        console.log('📚 来源信息:', data.sources)
        console.log('📊 统计信息:', {
          total: data.total,
          kb_results_count: data.kb_results_count,
          web_results_count: data.web_results_count,
          used_web_search: data.used_web_search,
          searched_kbs: data.searched_kbs,
          kb_results_by_source: data.kb_results_by_source
        })
        console.log('📋 搜索的知识库:', data.searched_kbs)
        console.log('📦 各知识库结果数:', data.kb_results_by_source)
        console.groupEnd()
        
        setReply(data.reply || '')
        setSources(data.sources || [])
        setTotal(data.total || 0)
        setIsWebSearch(data.used_web_search || false)
        
        // 如果没有回复，显示详细的调试信息
        if (!data.reply) {
          console.group('⚠️ 警告: 后端返回的reply为空')
          console.warn('知识库结果数:', data.kb_results_count)
          console.warn('联网搜索结果数:', data.web_results_count)
          console.warn('是否使用联网搜索:', data.used_web_search)
          console.warn('搜索的知识库:', data.searched_kbs)
          console.warn('各知识库结果数:', data.kb_results_by_source)
          console.warn('来源信息数量:', data.sources?.length || 0)
          console.warn('来源信息详情:', data.sources)
          console.groupEnd()
        }
      } else {
        console.group('❌ 搜索失败')
        console.error('错误信息:', data.error)
        console.error('响应状态:', response.status)
        console.error('完整响应:', data)
        console.groupEnd()
        alert(data.error || '搜索失败')
        setReply('')
        setSources([])
        setTotal(0)
      }
    } catch (err) {
      console.group('❌ 网络错误')
      console.error('错误详情:', err)
      console.error('错误消息:', err.message)
      console.error('错误堆栈:', err.stack)
      console.groupEnd()
      alert('网络错误，请检查后端服务: ' + err.message)
    } finally {
      setIsSearching(false)
    }
  }


  return (
    <div className="space-y-6 page-enter">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-title text-3xl mb-2">语义查询</h1>
        <p className="text-caption text-gray-600">基于自然语言的智能检索</p>
      </motion.div>

      {/* 搜索框 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="card-material"
      >
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-ant pl-10 pr-20 py-3 text-base w-full"
              placeholder="请输入您的问题，例如：人工智能的最新进展"
            />
            {/* 知识库选择器 - 移到搜索栏右下角 */}
            <div className="absolute right-2 bottom-2 kb-selector-container">
              <button
                ref={kbSelectorRef}
                type="button"
                onClick={() => {
                  const newState = !showKbSelector
                  setShowKbSelector(newState)
                  if (newState && kbSelectorRef.current) {
                    const rect = kbSelectorRef.current.getBoundingClientRect()
                    setDropdownPosition({
                      top: rect.bottom + 8,
                      right: window.innerWidth - rect.right
                    })
                  }
                }}
                className="p-2 rounded-ant border border-gray-300 hover:border-primary-500 hover:bg-primary-50 transition-colors"
                title={selectedKbs.length === 0 ? '选择知识库（可选，最多5个）' : `已选择 ${selectedKbs.length} 个知识库`}
              >
                <Database className={`w-5 h-5 ${selectedKbs.length > 0 ? 'text-primary-500' : 'text-gray-400'}`} />
                {selectedKbs.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                    {selectedKbs.length}
                  </span>
                )}
              </button>
              
              {showKbSelector && (
                <div 
                  className="fixed z-[9999] w-80 bg-white border border-gray-300 rounded-ant shadow-lg max-h-[70vh] overflow-y-auto kb-dropdown-menu"
                  style={{
                    top: `${dropdownPosition.top}px`,
                    right: `${dropdownPosition.right}px`
                  }}
                >
                  <div className="p-2 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-body font-medium text-gray-800">选择知识库</span>
                      <span className="text-caption text-gray-500">最多选择{MAX_SELECTED_KBS}个</span>
                    </div>
                  </div>
                  {kbList.length === 0 ? (
                    <div className="p-4 text-caption text-gray-500 text-center">
                      暂无知识库
                    </div>
                  ) : (
                    <div className="p-2">
                      {kbList.map((kb) => {
                        const isSelected = selectedKbs.includes(kb.name)
                        const isDisabled = !isSelected && selectedKbs.length >= MAX_SELECTED_KBS
                        
                        return (
                          <label
                            key={kb.name}
                            className={`flex items-center space-x-2 p-2 rounded-ant cursor-pointer hover:bg-gray-50 ${
                              isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (selectedKbs.length < MAX_SELECTED_KBS) {
                                    setSelectedKbs([...selectedKbs, kb.name])
                                  }
                                } else {
                                  setSelectedKbs(selectedKbs.filter(name => name !== kb.name))
                                }
                              }}
                              disabled={isDisabled}
                              className="w-4 h-4 text-primary-500 rounded-ant border-gray-300 focus:ring-primary-500"
                            />
                            <div className="flex-1">
                              <span className="text-body text-gray-800">
                                {kb.name === 'default' ? 'default (默认数据库)' : kb.name}
                              </span>
                              <span className="text-caption text-gray-500 ml-2">
                                ({kb.file_count}个文件, {kb.total_size_mb}MB)
                              </span>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                  {selectedKbs.length > 0 && (
                    <div className="p-2 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setSelectedKbs([])}
                        className="w-full text-caption text-primary-500 hover:text-primary-600 text-center"
                      >
                        清空选择
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* 已选知识库标签 */}
          {selectedKbs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedKbs.map((kbName) => {
                const kb = kbList.find(k => k.name === kbName)
                const displayName = kbName === 'default' ? 'default (默认数据库)' : kbName
                return (
                  <span
                    key={kbName}
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-ant text-caption"
                  >
                    <span>{displayName}</span>
                    {kb && <span className="text-gray-500">({kb.file_count}个文件)</span>}
                    <button
                      type="button"
                      onClick={() => setSelectedKbs(selectedKbs.filter(name => name !== kbName))}
                      className="ml-1 hover:text-primary-900"
                    >
                      <span className="text-xs">×</span>
                    </button>
                  </span>
                )
              })}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isSearching}
            className="btn-ant px-6 py-2.5 text-sm ripple flex items-center justify-center space-x-2 self-start"
          >
            {isSearching ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>搜索中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>语义搜索</span>
              </>
            )}
          </button>
        </form>
      </motion.div>

      {/* 搜索结果 - 综合回复 */}
      {(reply || sources.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          {isWebSearch && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card-material bg-blue-50 border border-blue-200"
            >
              <div className="flex items-center space-x-2 text-blue-700">
                <ExternalLink className="w-5 h-5" />
                <span className="text-body font-medium">知识库未匹配到相关数据，已触发联网查询</span>
              </div>
            </motion.div>
          )}

          <div className="card-material">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-title text-xl">搜索结果</h2>
              {total > 0 && (
                <p className="text-body text-gray-600">
                  基于 <span className="font-semibold text-primary-500">{total}</span> 条相关信息生成
                </p>
              )}
            </div>
            
            {/* 综合回复 */}
            {reply && (
              <div className="prose max-w-none mb-6">
                <div className="text-body text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {reply}
                </div>
              </div>
            )}

            {/* 来源信息 */}
            {sources.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-body font-medium text-gray-700 mb-3">参考来源</h3>
                <div className="space-y-2">
                  {sources.map((source, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between p-3 bg-gray-50 rounded-ant hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {source.from_web && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              联网搜索
                            </span>
                          )}
                          <span className="text-body font-medium text-gray-800">{source.title}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-caption text-gray-600">
                          <span>来源: {source.source}</span>
                          {source.similarity > 0 && (
                            <span>相似度: <span className="text-primary-500">{(source.similarity * 100).toFixed(1)}%</span></span>
                          )}
                        </div>
                      </div>
                      {source.link && (
                        <a
                          href={source.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ant-small flex items-center space-x-1 ripple ml-4 flex-shrink-0"
                        >
                          <span>查看原文</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* 空状态 */}
      {!isSearching && !reply && query && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="card-material text-center py-12"
        >
          <SearchIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-body text-gray-600">未找到相关结果</p>
          <p className="text-caption text-gray-500 mt-2">请尝试使用其他关键词搜索</p>
        </motion.div>
      )}
    </div>
  )
}

