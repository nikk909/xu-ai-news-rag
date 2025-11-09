import { useState, useEffect, useRef } from 'react'
import { Search, Download, Mail, CheckCircle, XCircle, Loader, ChevronLeft, ChevronRight, ChevronDown, X, Database, ArrowRight, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Dashboard() {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [emailSent, setEmailSent] = useState(null)
  const [sendEmail, setSendEmail] = useState(false)  // 默认不发送邮件，搜索后让用户选择
  const [downloading, setDownloading] = useState(false)
  const [stats, setStats] = useState(null)
  const [kbList, setKbList] = useState([])  // 知识库列表
  const [selectedKbs, setSelectedKbs] = useState([])  // 选中的知识库（最多5个）
  const [showKbSelector, setShowKbSelector] = useState(false)  // 是否显示知识库选择器
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)  // 是否显示搜索后的邮件发送提示
  const [promptSendEmail, setPromptSendEmail] = useState(false)  // 搜索后提示中的邮件发送选择
  const kbSelectorRef = useRef(null)  // 知识库选择器按钮的引用
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })

  const pageSize = 10
  const MAX_SELECTED_KBS = 5  // 最多选择5个知识库

  useEffect(() => {
    fetchStats()
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

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/knowledge/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (err) {
      console.error('获取统计失败:', err)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setSearching(true)
    setEmailSent(null)
    setCurrentPage(1) // 重置到第一页

    try {
      // 获取当前登录用户的token
      const token = localStorage.getItem('token')
      const headers = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('http://localhost:5000/api/knowledge/search', {
        method: 'POST',
        headers: headers,
          body: JSON.stringify({
            query: query.trim(),
            page: 1,
            page_size: pageSize,
            send_email: sendEmail,  // 传递是否发送邮件的选项
            selected_kbs: selectedKbs.length > 0 ? selectedKbs : ['default']  // 如果没有选择，默认使用default知识库
          }),
      })

      const data = await response.json()

      if (response.ok) {
        setResults(data.results || [])
        setTotal(data.total)
        setTotalPages(data.total_pages || 0)
        
        // 显示搜索来源信息
        if (data.used_web_search) {
          console.log(`知识库无结果，已使用联网搜索，找到 ${data.web_results_count} 条结果`)
        } else if (data.kb_results_count > 0) {
          console.log(`从知识库找到 ${data.kb_results_count} 条结果`)
        }
        
        // 如果用户提前勾选了发送邮件，直接发送
        if (sendEmail && data.total > 0) {
          // 使用后端返回的邮件发送状态
          if (data.email_sent !== undefined) {
            setEmailSent(data.email_sent)
          } else {
            checkEmailStatus()
          }
          setShowEmailPrompt(false)
        } else if (data.total > 0) {
          // 如果用户没有提前勾选，但搜索到结果，显示提示让用户选择
          setShowEmailPrompt(true)
          setPromptSendEmail(false)
          setEmailSent(null)
        } else {
          // 没有搜索结果，不显示邮件提示
          setShowEmailPrompt(false)
          setEmailSent(null)
        }
      } else {
        alert(data.error || '搜索失败')
      }
    } catch (err) {
      alert('网络错误，请检查后端服务')
    } finally {
      setSearching(false)
    }
  }

  const checkEmailStatus = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      if (user.email) {
        const response = await fetch('http://localhost:5000/api/knowledge/check-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: user.email }),
        })
        const data = await response.json()
        if (response.ok) {
          setEmailSent(data.mail_configured)
        }
      }
    } catch (err) {
      console.error('检查邮件状态失败:', err)
    }
  }

  const handleSendEmailAfterSearch = async () => {
    if (!promptSendEmail) return

    try {
      // 获取当前登录用户的token
      const token = localStorage.getItem('token')
      const headers = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // 调用发送邮件API
      const response = await fetch('http://localhost:5000/api/knowledge/send-search-email', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          query: query,
          total: total,
          results: results.slice(0, 10),  // 只发送前10条结果
          selected_kbs: selectedKbs
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setEmailSent(data.email_sent || false)
        setShowEmailPrompt(false)
        setPromptSendEmail(false)
      } else {
        alert(data.error || '发送邮件失败')
      }
    } catch (err) {
      alert('发送邮件失败：' + err.message)
    }
  }

  const handleExport = async () => {
    if (results.length === 0) {
      alert('没有可导出的数据')
      return
    }

    setDownloading(true)

    try {
      const response = await fetch('http://localhost:5000/api/knowledge/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          results: results
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `搜索结果_${query}_${new Date().toISOString().slice(0, 10)}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const data = await response.json()
        alert(data.error || '导出失败')
      }
    } catch (err) {
      alert('导出失败')
    } finally {
      setDownloading(false)
    }
  }

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
  }

  useEffect(() => {
    if (query && currentPage > 1) {
      setSearching(true)
      // 获取当前登录用户的token
      const token = localStorage.getItem('token')
      const headers = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      fetch('http://localhost:5000/api/knowledge/search', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          query: query.trim(),
          page: currentPage,
          page_size: pageSize,
          send_email: sendEmail,  // 传递是否发送邮件的选项
          selected_kbs: selectedKbs.length > 0 ? selectedKbs : ['default']  // 如果没有选择，默认使用default知识库
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.results) {
            setResults(data.results)
            setTotal(data.total)
            setTotalPages(data.total_pages || 0)
          }
        })
        .catch(err => console.error('搜索失败:', err))
        .finally(() => setSearching(false))
    }
  }, [currentPage])

  return (
    <div className="space-y-6 page-enter">
      {/* 标题和模型信息 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-title text-3xl mb-3">智能知识库搜索</h1>
        <p className="text-caption text-gray-600 leading-relaxed">
          基于 Ollama 部署 qwen2.5:4b 大语言模型，构建本地知识库系统。
          配置嵌入模型 all-MiniLM-L6-v2 用于文本向量化，重排模型 ms-marco-MiniLM-L-6-v2 用于结果重排序。
          支持 RSS、网页抓取及智能代理工具获取新闻信息，可选择是否发送邮件通知。
        </p>
        {stats && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-caption text-gray-500 mt-2"
          >
            知识库总量: <span className="font-semibold text-primary-500">{stats.total_documents || 0}</span> 条
          </motion.p>
        )}
      </motion.div>

      {/* 搜索栏 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="card-material"
      >
        <form onSubmit={handleSearch} className="space-y-4">
          {/* 搜索栏和按钮在同一行 */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input-ant pl-10 pr-4 py-3 text-base w-full"
                placeholder="输入关键词搜索知识库内容..."
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="btn-ant px-6 py-2.5 text-sm ripple flex items-center justify-center space-x-2 flex-shrink-0"
            >
              {searching ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>搜索中...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>搜索</span>
                </>
              )}
            </button>
            {/* 知识库选择器 - 小图标按钮，移到右边 */}
            <div className="relative kb-selector-container flex-shrink-0">
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
                className="p-1.5 rounded-ant border border-gray-300 hover:border-primary-500 hover:bg-primary-50 transition-colors"
                title={selectedKbs.length === 0 ? '选择知识库（可选，最多5个）' : `已选择 ${selectedKbs.length} 个知识库`}
              >
                <Database className={`w-4 h-4 ${selectedKbs.length > 0 ? 'text-primary-500' : 'text-gray-400'}`} />
                {selectedKbs.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary-500 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                    {selectedKbs.length}
                  </span>
                )}
              </button>
              
              {showKbSelector && (
                <>
                  <div 
                    className="fixed z-[9999] w-96 bg-white border-2 border-primary-200 rounded-lg shadow-2xl max-h-[70vh] overflow-y-auto kb-dropdown-menu"
                    style={{
                      top: `${dropdownPosition.top}px`,
                      right: `${dropdownPosition.right}px`
                    }}
                  >
                  <div className="p-3 bg-primary-50 border-b border-primary-200 sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold text-gray-900">选择知识库</span>
                      <span className="text-sm font-medium text-primary-600 bg-white px-2 py-0.5 rounded">
                        最多{MAX_SELECTED_KBS}个
                      </span>
                    </div>
                  </div>
                  {kbList.length === 0 ? (
                    <div className="p-6 text-sm text-gray-500 text-center">
                      暂无用户创建的知识库
                    </div>
                  ) : (
                    <div className="p-2">
                      {kbList.map((kb) => {
                        const isSelected = selectedKbs.includes(kb.name)
                        const isDisabled = !isSelected && selectedKbs.length >= MAX_SELECTED_KBS
                        
                        return (
                          <label
                            key={kb.name}
                            className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-primary-50 border-2 border-primary-400' 
                                : 'hover:bg-gray-50 border-2 border-transparent'
                            } ${
                              isDisabled ? 'opacity-40 cursor-not-allowed' : ''
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
                              className="w-5 h-5 text-primary-600 rounded border-2 border-gray-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-base font-semibold text-gray-900 truncate">
                                {kb.name === 'default' ? 'default (默认数据库)' : kb.name}
                              </div>
                              <div className="text-sm text-gray-600 mt-0.5">
                                {kb.file_count}个文件 · {kb.total_size_mb}MB
                              </div>
                            </div>
                            {isSelected && (
                              <div className="flex-shrink-0">
                                <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">✓</span>
                                </div>
                              </div>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  )}
                  {selectedKbs.length > 0 && (
                    <div className="p-3 border-t-2 border-gray-200 bg-gray-50">
                      <button
                        type="button"
                        onClick={() => setSelectedKbs([])}
                        className="w-full text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-white py-2 px-4 rounded-lg transition-colors"
                      >
                        清空选择 ({selectedKbs.length})
                      </button>
                    </div>
                  )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 已选知识库标签和邮件通知 */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* 已选知识库标签 */}
            {selectedKbs.length > 0 && (
              <div className="flex flex-wrap gap-2 flex-1">
                {selectedKbs.map((kbName) => {
                  const kb = kbList.find(k => k.name === kbName)
                  const displayName = kbName === 'default' ? 'default (默认数据库)' : kbName
                  return (
                    <span
                      key={kbName}
                      className="inline-flex items-center space-x-1 px-2 py-1 bg-primary-50 text-primary-700 rounded-ant text-caption"
                    >
                      <span>{displayName}</span>
                      {kb && <span className="text-gray-500">({kb.file_count}个文件)</span>}
                      <button
                        type="button"
                        onClick={() => setSelectedKbs(selectedKbs.filter(name => name !== kbName))}
                        className="ml-1 hover:text-primary-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
            
            {/* 邮件通知复选框 */}
            <label className="flex items-center space-x-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="w-4 h-4 text-primary-500 rounded-ant border-gray-300 focus:ring-primary-500 cursor-pointer"
              />
              <span className="text-body text-gray-700 group-hover:text-gray-900">
                搜索成功后自动发送邮件通知
              </span>
            </label>
          </div>
        </form>
      </motion.div>

      {/* 邮件提示 - 提前勾选的情况 */}
      {emailSent !== null && sendEmail && (
        <div className={`card-material ${emailSent ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex items-center space-x-3">
            {emailSent ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-body font-medium text-green-800">邮件通知已发送</p>
                  <p className="text-caption text-green-700">系统已向您的账户邮箱发送了搜索结果通知邮件</p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-body font-medium text-yellow-800">邮件通知未发送</p>
                  <p className="text-caption text-yellow-700">邮件服务可能未配置或发送失败</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 搜索后的邮件发送提示 */}
      {showEmailPrompt && total > 0 && (
        <div className="card-material bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-body font-medium text-blue-800 mb-2">
                搜索出 {total} 条结果，是否发送邮件到邮箱？
              </p>
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={promptSendEmail}
                    onChange={(e) => setPromptSendEmail(e.target.checked)}
                    className="w-4 h-4 text-primary-500 rounded-ant border-gray-300 focus:ring-primary-500 cursor-pointer"
                  />
                  <span className="text-caption text-blue-700">发送搜索结果邮件通知</span>
                </label>
                <button
                  onClick={handleSendEmailAfterSearch}
                  disabled={!promptSendEmail}
                  className="btn-ant-small ripple disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  确认发送
                </button>
                <button
                  onClick={() => {
                    setShowEmailPrompt(false)
                    setPromptSendEmail(false)
                  }}
                  className="btn-ant-secondary-small ripple"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 搜索结果 */}
      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          {/* 结果统计和导出 */}
          <div className="flex items-center justify-between">
            <p className="text-body text-gray-600">
              找到 <span className="font-semibold text-primary-500">{total}</span> 条相关结果
            </p>
            <button
              onClick={handleExport}
              disabled={downloading}
              className="btn-ant-secondary flex items-center space-x-2 ripple"
            >
              {downloading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>导出中...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>导出Excel</span>
                </>
              )}
            </button>
          </div>

          {/* 结果列表 */}
          <div className="space-y-4">
            {results.map((result, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`card-tailwind ${result.from_web ? 'border-blue-300 bg-blue-50' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-title text-lg mb-2 flex items-center space-x-2 flex-wrap">
                      <span>{result.metadata?.title || '无标题'}</span>
                      {result.from_web && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                          🌐 联网搜索
                        </span>
                      )}
                      {result.kb_name && result.kb_name !== 'default' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                          📚 {result.kb_name}
                        </span>
                      )}
                    </h3>
                    <p className="text-body text-gray-800 mb-3">{result.text}</p>
                    <div className="flex items-center flex-wrap gap-3 text-sm">
                      {/* 来源标注 - 更明显 */}
                      <div className="flex items-center space-x-1.5 bg-gray-100 px-3 py-1.5 rounded-lg">
                        <span className="font-semibold text-gray-700">来源:</span>
                        <span className="text-gray-900 font-medium">
                          {result.metadata?.source || (result.kb_name ? `知识库: ${result.kb_name}` : '未知')}
                        </span>
                      </div>
                      {result.metadata?.published && (
                        <div className="flex items-center space-x-1.5 bg-gray-100 px-3 py-1.5 rounded-lg">
                          <span className="font-semibold text-gray-700">时间:</span>
                          <span className="text-gray-900">
                            {new Date(result.metadata.published).toLocaleString('zh-CN')}
                          </span>
                        </div>
                      )}
                      {result.similarity && (
                        <div className="flex items-center space-x-1.5 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200">
                          <span className="font-semibold text-primary-700">相似度:</span>
                          <span className="text-primary-600 font-semibold">{(result.similarity * 100).toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {result.metadata?.link && (
                    <a
                      href={result.metadata.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ant-small flex items-center space-x-1 ripple ml-4 flex-shrink-0"
                    >
                      <span>查看原文</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

          {/* 分页 */}
          {totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-between card-material"
            >
              <p className="text-caption text-gray-600">
                第 {currentPage} 页，共 {totalPages} 页
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-ant border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>上一页</span>
                </button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 rounded-ant transition-colors ${
                          currentPage === pageNum
                            ? 'bg-primary-500 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-ant border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  <span>下一页</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

      {/* 空状态 */}
      {!searching && results.length === 0 && query && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="card-material text-center py-12"
        >
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-body text-gray-600">未找到相关结果</p>
          <p className="text-caption text-gray-500 mt-2">请尝试使用其他关键词搜索</p>
        </motion.div>
      )}
    </div>
  )
}
