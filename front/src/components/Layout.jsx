import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, Database, Search, BarChart3, LogOut, Menu, X, Loader, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Layout({ children, onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [analysisTasks, setAnalysisTasks] = useState([])  // 分析任务列表

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 获取分析任务列表（用于侧边栏显示）
  useEffect(() => {
    let isMounted = true
    let retryCount = 0
    const maxRetries = 3
    
    const fetchTasks = async () => {
      // 如果后端服务未就绪，减少重试频率
      if (retryCount >= maxRetries) {
        return
      }
      
      try {
        const response = await fetch('http://localhost:5000/api/knowledge/analysis-tasks', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // 添加超时控制
          signal: AbortSignal.timeout(5000)
        })
        
        if (response.ok) {
          const data = await response.json()
          if (isMounted) {
            // 只显示运行中的任务
            setAnalysisTasks(data.tasks?.filter(t => t.status === 'running') || [])
            retryCount = 0  // 重置重试计数
          }
        } else {
          retryCount++
        }
      } catch (err) {
        // 只在开发环境或前几次失败时记录错误
        if (retryCount < 2) {
          console.warn('获取分析任务失败:', err.message)
        }
        retryCount++
        // 如果连续失败，增加轮询间隔
        if (retryCount >= maxRetries) {
          console.warn('后端服务可能未就绪，暂停任务轮询')
        }
      }
    }
    
    // 初始延迟，等待服务启动
    const initialTimeout = setTimeout(() => {
      fetchTasks()
      // 根据重试次数调整轮询间隔
      const interval = setInterval(() => {
        if (retryCount < maxRetries) {
          fetchTasks()
        }
      }, retryCount >= maxRetries ? 10000 : 2000)  // 失败后改为10秒轮询
      
      return () => {
        clearInterval(interval)
        clearTimeout(initialTimeout)
      }
    }, 2000)  // 延迟2秒开始第一次请求
    
    return () => {
      isMounted = false
      clearTimeout(initialTimeout)
    }
  }, [])

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    }
    navigate('/login')
  }

  // 获取用户信息
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const userEmail = user.email || '用户'

  // 根据路径确定主题色
  const getThemeClass = () => {
    if (location.pathname === '/') return 'theme-home'
    if (location.pathname === '/knowledge') return 'theme-knowledge'
    if (location.pathname === '/search') return 'theme-search'
    if (location.pathname === '/analysis') return 'theme-analysis'
    return 'theme-home'
  }

  const navItems = [
    { path: '/', icon: Home, label: '首页', theme: 'theme-home' },
    { path: '/knowledge', icon: Database, label: '知识库管理', theme: 'theme-knowledge' },
    { path: '/search', icon: Search, label: '语义查询', theme: 'theme-search' },
    { path: '/analysis', icon: BarChart3, label: '数据分析', theme: 'theme-analysis' },
  ]

  return (
    <div className={`min-h-screen bg-gray-50 ${getThemeClass()}`}>
      {/* 顶部导航栏 - 优化阴影和样式 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">X</span>
              </div>
              <h1 className="text-title text-xl hidden sm:block">XU-News-AI-RAG</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-body text-sm text-gray-600 hidden sm:inline">{userEmail}</span>
              <button 
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 hover:scale-110"
                title="退出登录"
              >
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto relative">
        {/* 侧边栏 - 添加展开/收起动画 */}
        <AnimatePresence>
          {(sidebarOpen || !isMobile) && (
            <motion.aside
              initial={isMobile ? { x: -280 } : false}
              animate={{ x: 0 }}
              exit={isMobile ? { x: -280 } : false}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`bg-white border-r border-gray-200 h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto sidebar-transition ${
                sidebarOpen ? 'w-64' : 'w-20'
              } ${isMobile ? 'absolute z-40 h-full' : ''}`}
            >
              <nav className="p-4 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`group flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 relative ${
                        isActive
                          ? 'bg-primary-50 text-primary-600 font-medium shadow-md'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-primary-500'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-r"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-600' : ''}`} />
                      <motion.span
                        initial={false}
                        animate={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? 'auto' : 0 }}
                        className="text-body overflow-hidden whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    </Link>
                  )
                })}
                
                {/* 分析任务进度显示 */}
                {analysisTasks.length > 0 && sidebarOpen && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="px-4 mb-2">
                      <p className="text-caption text-gray-500 font-medium">后台分析任务</p>
                    </div>
                    <div className="space-y-2">
                      {analysisTasks.map((task) => {
                        const taskName = task.type === 'document' 
                          ? (task.filename || '文档').substring(0, 15) + (task.filename?.length > 15 ? '...' : '')
                          : (task.kb_name || '知识库')
                        return (
                          <div
                            key={task.task_id}
                            className="px-4 py-2 bg-blue-50 rounded-lg border border-blue-200"
                          >
                            <div className="flex items-center space-x-2 mb-1">
                              <Loader className="w-3 h-3 animate-spin text-blue-600" />
                              <span className="text-xs font-medium text-blue-800 truncate">{taskName}</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-blue-700">
                                <span>{task.message || '处理中...'}</span>
                                <span>{Math.round((task.progress || 0) * 100)}%</span>
                              </div>
                              <div className="w-full bg-blue-200 rounded-full h-1 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(task.progress || 0) * 100}%` }}
                                  transition={{ duration: 0.3 }}
                                  className="bg-blue-600 h-full rounded-full"
                                />
                              </div>
                              {task.estimated_remaining_text && (
                                <div className="flex items-center space-x-1 text-xs text-blue-600">
                                  <Clock className="w-3 h-3" />
                                  <span>剩余: {task.estimated_remaining_text}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </nav>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* 移动端遮罩 */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* 主内容区 - 添加页面过渡动画 */}
        <main className="flex-1 p-4 sm:p-8 min-w-0">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}

