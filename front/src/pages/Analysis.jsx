import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TrendingUp, BarChart3, PieChart, FileText, Database, Loader, AlertCircle, X, Clock } from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { motion } from 'framer-motion'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
)

export default function Analysis() {
  const [searchParams] = useSearchParams()
  const [kbList, setKbList] = useState([])
  const [selectedKB, setSelectedKB] = useState('')
  const [analyzingFile, setAnalyzingFile] = useState(null)  // 单个文档分析
  const [analyzingFiles, setAnalyzingFiles] = useState([])  // 多个文档分析
  const [showNotification, setShowNotification] = useState(false)  // 显示分析成功提示
  const [notificationTask, setNotificationTask] = useState(null)  // 通知的任务信息
  
  // 多任务系统
  const [tasks, setTasks] = useState([])  // 所有任务列表
  const [activeTaskId, setActiveTaskId] = useState(null)  // 当前激活的任务ID
  const [taskPolling, setTaskPolling] = useState({})  // 任务轮询状态
  
  // 已关闭的通知任务ID - 使用localStorage持久化，关闭后永久不再显示
  const [dismissedNotifications, setDismissedNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('dismissed_analysis_notifications')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })
  
  // 当前会话中已显示过的任务ID - 防止同一会话中重复显示
  const [shownInSession, setShownInSession] = useState(new Set())
  
  // 保存已关闭的通知到localStorage
  const saveDismissedNotifications = (newSet) => {
    setDismissedNotifications(newSet)
    try {
      localStorage.setItem('dismissed_analysis_notifications', JSON.stringify([...newSet]))
    } catch (e) {
      console.error('保存已关闭通知失败:', e)
    }
  }
  
  // 从URL参数获取文档信息（如果是从知识库管理页面跳转过来的）
  const fileParam = searchParams.get('file')
  const kbParam = searchParams.get('kb')
  const filesParam = searchParams.get('files')  // 多文件参数

  useEffect(() => {
    fetchKBList()
    fetchAllTasks()
    // 如果URL中有文档参数，自动设置为分析该文档
    if (fileParam && kbParam) {
      setAnalyzingFile({ filename: decodeURIComponent(fileParam), kb_name: decodeURIComponent(kbParam) })
      setSelectedKB(decodeURIComponent(kbParam))
    }
    // 如果URL中有多文件参数，设置为分析多个文档
    if (filesParam) {
      try {
        const files = JSON.parse(decodeURIComponent(filesParam))
        if (Array.isArray(files) && files.length > 0) {
          setAnalyzingFiles(files)
          if (files.length === 1) {
            setAnalyzingFile(files[0])
            setSelectedKB(files[0].kb_name)
          } else {
            setSelectedKB(files[0].kb_name)  // 使用第一个文件的知识库
          }
        }
      } catch (e) {
        console.error('解析多文件参数失败:', e)
      }
    }
    
    // 定期获取所有任务状态
    const interval = setInterval(() => {
      fetchAllTasks()
    }, 2000)  // 每2秒轮询一次
    
    return () => clearInterval(interval)
  }, [fileParam, kbParam, filesParam])

  const fetchKBList = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/knowledge/kb-list')
      if (response.ok) {
        const data = await response.json()
        setKbList(data.kb_list || [])
        // 默认选择default知识库，如果没有则选择第一个
        if (data.kb_list && data.kb_list.length > 0 && !selectedKB) {
          const defaultKB = data.kb_list.find(kb => kb.name === 'default')
          setSelectedKB(defaultKB ? 'default' : data.kb_list[0].name)
        }
      }
    } catch (err) {
      console.error('获取知识库列表失败:', err)
    }
  }

  const fetchAllTasks = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/knowledge/analysis-tasks')
      if (response.ok) {
        const data = await response.json()
        const newTasks = data.tasks || []
        setTasks(newTasks)
        
        // 检查是否有新完成的任务需要显示通知
        // 如果已经有通知显示，不要重复显示
        if (!showNotification) {
          newTasks.forEach(task => {
            const taskId = task.task_id
            const isCompleted = task.status === 'completed'
            const isDismissed = dismissedNotifications.has(taskId)
            const isShownInThisSession = shownInSession.has(taskId)
            
            // 简单逻辑：任务完成 + 未关闭 + 本次会话未显示过 = 显示通知
            if (isCompleted && !isDismissed && !isShownInThisSession) {
              // 标记为本次会话已显示
              setShownInSession(prev => new Set([...prev, taskId]))
              
              // 显示通知
              setShowNotification(true)
              setNotificationTask(task)
            }
          })
        }
        
        // 为运行中的任务启动轮询
        newTasks.forEach(task => {
          if (task.status === 'running' && !taskPolling[task.task_id]) {
            startPollingTask(task.task_id)
          }
        })
      }
    } catch (err) {
      console.error('获取任务列表失败:', err)
    }
  }

  const startPollingTask = (taskId) => {
    if (taskPolling[taskId]) return
    
    setTaskPolling(prev => ({ ...prev, [taskId]: { polling: true, notified: false } }))
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/knowledge/analysis-task/${taskId}`)
        if (response.ok) {
          const task = await response.json()
          
          // 更新任务列表
          setTasks(prev => prev.map(t => t.task_id === taskId ? task : t))
          
          // 如果任务完成，停止轮询并发送通知
          if (task.status === 'completed' || task.status === 'error') {
            clearInterval(pollInterval)
            setTaskPolling(prev => {
              const newState = { ...prev }
              if (newState[taskId]) {
                newState[taskId].polling = false
              }
              return newState
            })
            
            const isDismissed = dismissedNotifications.has(taskId)
            const isShownInThisSession = shownInSession.has(taskId)
            
            // 简单逻辑：任务完成 + 未关闭 + 本次会话未显示过 + 当前没有通知显示 = 显示通知
            if (task.status === 'completed' && !isDismissed && !isShownInThisSession && !showNotification) {
              // 标记为本次会话已显示
              setShownInSession(prev => new Set([...prev, taskId]))
              
              // 显示通知
              setShowNotification(true)
              setNotificationTask(task)
            }
          }
        }
      } catch (err) {
        console.error('轮询任务状态失败:', err)
      }
    }, 1000)  // 每1秒轮询一次
    
    // 清理函数
    setTimeout(() => {
      clearInterval(pollInterval)
    }, 300000)  // 5分钟后停止轮询
  }


  const handleAnalyze = async () => {
    if (!selectedKB && !analyzingFile && analyzingFiles.length === 0) {
      alert('请选择知识库或文档')
      return
    }

    try {
      let response
      if (analyzingFiles.length > 1) {
        // 多文件分析
        const filenames = analyzingFiles.map(f => f.filename)
        response = await fetch('http://localhost:5000/api/knowledge/analyze-documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            kb_name: analyzingFiles[0].kb_name,
            filenames: filenames
          })
        })
      } else if (analyzingFile || analyzingFiles.length === 1) {
        // 异步分析单个文档
        const file = analyzingFile || analyzingFiles[0]
        const encodedFilename = encodeURIComponent(file.filename)
        response = await fetch(`http://localhost:5000/api/knowledge/analyze-document/${file.kb_name}/${encodedFilename}`, {
          method: 'POST'
        })
      } else {
        // 异步分析整个知识库
        response = await fetch(`http://localhost:5000/api/knowledge/analyze-kb/${selectedKB}`, {
          method: 'POST'
        })
      }

      const data = await response.json()
      if (response.ok) {
        // 创建新任务
        const newTask = {
          task_id: data.task_id,
          type: (analyzingFile || analyzingFiles.length > 0) ? 'document' : 'knowledge_base',
          kb_name: analyzingFile ? analyzingFile.kb_name : (analyzingFiles.length > 0 ? analyzingFiles[0].kb_name : selectedKB),
          filename: analyzingFile ? analyzingFile.filename : (analyzingFiles.length === 1 ? analyzingFiles[0].filename : null),
          filenames: analyzingFiles.length > 1 ? analyzingFiles.map(f => f.filename) : null,
          status: 'pending',
          progress: 0.0,
          message: '等待开始...',
          estimated_remaining: 0
        }
        setTasks(prev => [...prev, newTask])
        setActiveTaskId(data.task_id)
        startPollingTask(data.task_id)
      } else {
        alert(data.error || '创建分析任务失败')
      }
    } catch (err) {
      alert('创建分析任务失败：' + err.message)
    }
  }
  
  // 获取当前激活任务的数据
  const activeTask = tasks.find(t => t.task_id === activeTaskId)
  const analysisData = activeTask?.result || null

  const topKeywords = analysisData?.top_keywords || []
  const clusterData = analysisData?.clusters || []
  const totalDocs = analysisData?.total_documents || 0
  const clusterCount = clusterData.length
  
  // 计算关键词总出现次数（用于百分比计算）
  const totalKeywordCount = topKeywords.reduce((sum, item) => sum + item.count, 0)

  // Chart.js 配置
  const keywordsChartData = {
    labels: topKeywords.slice(0, 10).map(k => k.keyword),
    datasets: [{
      label: '出现次数',
      data: topKeywords.slice(0, 10).map(k => k.count),
      backgroundColor: [
        'rgba(22, 119, 255, 0.8)',
        'rgba(82, 196, 26, 0.8)',
        'rgba(114, 46, 209, 0.8)',
        'rgba(19, 194, 194, 0.8)',
        'rgba(250, 173, 20, 0.8)',
        'rgba(245, 34, 45, 0.8)',
        'rgba(114, 46, 209, 0.6)',
        'rgba(19, 194, 194, 0.6)',
        'rgba(250, 173, 20, 0.6)',
        'rgba(245, 34, 45, 0.6)',
      ],
      borderColor: [
        'rgba(22, 119, 255, 1)',
        'rgba(82, 196, 26, 1)',
        'rgba(114, 46, 209, 1)',
        'rgba(19, 194, 194, 1)',
        'rgba(250, 173, 20, 1)',
        'rgba(245, 34, 45, 1)',
        'rgba(114, 46, 209, 0.8)',
        'rgba(19, 194, 194, 0.8)',
        'rgba(250, 173, 20, 0.8)',
        'rgba(245, 34, 45, 0.8)',
      ],
      borderWidth: 2,
      borderRadius: 8,
      borderSkipped: false,
    }]
  }

  const clusterChartData = {
    labels: clusterData.map((c, i) => c.cluster || `聚类 ${i + 1}`),
    datasets: [{
      label: '文档数量',
      data: clusterData.map(c => c.count),
      backgroundColor: [
        'rgba(22, 119, 255, 0.8)',
        'rgba(82, 196, 26, 0.8)',
        'rgba(114, 46, 209, 0.8)',
        'rgba(19, 194, 194, 0.8)',
        'rgba(250, 173, 20, 0.8)',
      ],
      borderColor: [
        'rgba(22, 119, 255, 1)',
        'rgba(82, 196, 26, 1)',
        'rgba(114, 46, 209, 1)',
        'rgba(19, 194, 194, 1)',
        'rgba(250, 173, 20, 1)',
      ],
      borderWidth: 2,
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        cornerRadius: 8,
        displayColors: true,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: { size: 12 },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 12 },
          maxRotation: 45,
          minRotation: 0,
        },
      },
    },
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          padding: 15,
          font: { size: 12 },
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        cornerRadius: 8,
      },
    },
  }

  return (
    <div className="space-y-6 page-enter relative">
      {/* 分析成功提示（界面显示，带小红点） */}
      {showNotification && notificationTask && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-[9999] bg-white rounded-ant-lg shadow-lg border border-green-200 p-4 max-w-sm"
        >
          <div className="flex items-start space-x-3">
            <div className="relative">
              <BarChart3 className="w-6 h-6 text-green-600" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
            </div>
            <div className="flex-1">
              <p className="text-body font-medium text-gray-900">
                {notificationTask.type === 'document' 
                  ? `文档分析完成: ${notificationTask.filename || (notificationTask.filenames ? `${notificationTask.filenames.length}个文件` : '文档')}`
                  : `知识库分析完成: ${notificationTask.kb_name}`}
              </p>
              <p className="text-caption text-gray-600 mt-1">点击关闭</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                const taskId = notificationTask?.task_id
                if (taskId) {
                  // 标记为已关闭，保存到localStorage
                  const newDismissed = new Set([...dismissedNotifications, taskId])
                  saveDismissedNotifications(newDismissed)
                  // 同时标记为本次会话已显示，防止fetchAllTasks重新显示
                  setShownInSession(prev => new Set([...prev, taskId]))
                }
                // 关闭弹窗
                setShowNotification(false)
                setNotificationTask(null)
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 z-10 transition-colors"
              type="button"
              title="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-title text-3xl mb-2">数据分析</h1>
        <p className="text-caption text-gray-600">知识库数据聚类分析与关键词统计</p>
      </motion.div>

      {/* 多任务标签页 */}
      {tasks.length > 0 && (
        <div className="card-material">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            {tasks.map((task) => {
              const isActive = task.task_id === activeTaskId
              const taskName = task.type === 'document' 
                ? `${task.filename || '文档'}` 
                : `${task.kb_name || '知识库'}`
              
              return (
                <div
                  key={task.task_id}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-ant border transition-all flex-shrink-0 ${
                    isActive
                      ? 'bg-primary-50 border-primary-500 text-primary-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <button
                    onClick={() => {
                      setActiveTaskId(task.task_id)
                      // 点击任务标签时，关闭通知弹窗并标记为已关闭
                      if (task.task_id) {
                        const taskId = task.task_id
                        const newDismissed = new Set([...dismissedNotifications, taskId])
                        saveDismissedNotifications(newDismissed)
                        // 同时标记为本次会话已显示，防止fetchAllTasks重新显示
                        setShownInSession(prev => new Set([...prev, taskId]))
                      }
                      setShowNotification(false)
                      setNotificationTask(null)
                    }}
                    className="flex items-center space-x-2 flex-1 text-left"
                  >
                    {task.status === 'running' && (
                      <Loader className="w-4 h-4 animate-spin" />
                    )}
                    {task.status === 'completed' && (
                      <BarChart3 className="w-4 h-4 text-green-500" />
                    )}
                    {task.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    {task.status === 'pending' && (
                      <Clock className="w-4 h-4 text-gray-400" />
                    )}
                    {task.status === 'cancelled' && (
                      <X className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="text-sm font-medium">{taskName}</span>
                    {task.status === 'running' && task.progress > 0 && (
                      <span className="text-xs text-gray-500">
                        {Math.round(task.progress * 100)}%
                      </span>
                    )}
                  </button>
                  {/* X 按钮：统一删除任务功能 */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      
                      try {
                        // 调用删除API（对于运行中的任务，后端会自动先取消）
                        const response = await fetch(`http://localhost:5000/api/knowledge/analysis-task/${task.task_id}`, {
                          method: 'DELETE',
                          headers: {
                            'Content-Type': 'application/json',
                          }
                        })
                        
                        if (!response.ok) {
                          // 尝试解析错误信息
                          let errorMsg = '删除任务失败'
                          try {
                            const errorData = await response.json()
                            errorMsg = errorData.error || errorMsg
                          } catch {
                            errorMsg = `删除任务失败: HTTP ${response.status}`
                          }
                          alert(errorMsg)
                          return
                        }
                        
                        // 删除成功，从前端列表中移除
                        setTasks(prev => {
                          const remaining = prev.filter(t => t.task_id !== task.task_id)
                          // 如果删除的是当前激活的任务，切换到其他任务或清空
                          if (activeTaskId === task.task_id) {
                            setActiveTaskId(remaining.length > 0 ? remaining[0].task_id : null)
                          }
                          return remaining
                        })
                        
                        // 如果删除的任务有通知，也关闭通知
                        if (notificationTask?.task_id === task.task_id) {
                          const taskId = task.task_id
                          if (taskId) {
                            const newDismissed = new Set([...dismissedNotifications, taskId])
                            saveDismissedNotifications(newDismissed)
                            setShownInSession(prev => new Set([...prev, taskId]))
                          }
                          setShowNotification(false)
                          setNotificationTask(null)
                        }
                      } catch (err) {
                        // 网络错误或其他异常
                        console.error('删除任务失败:', err)
                        alert('删除任务失败：' + (err.message || '网络连接失败，请检查后端服务是否运行'))
                      }
                    }}
                    className={`ml-1 p-1 rounded transition-colors ${
                      task.status === 'running' || task.status === 'pending'
                        ? 'hover:bg-red-100 text-red-600 hover:text-red-700'
                        : 'hover:bg-gray-200 text-gray-600 hover:text-gray-700'
                    }`}
                    type="button"
                    title={task.status === 'running' || task.status === 'pending' ? '取消并删除任务' : '删除任务'}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 知识库/文档选择 */}
      <div className="card-material space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-body mb-2">选择知识库</label>
            <select
              value={selectedKB}
              onChange={(e) => {
                setSelectedKB(e.target.value)
                setAnalyzingFile(null)  // 清除文档选择
                setAnalyzingFiles([])  // 清除多文件选择
              }}
              className="input-ant w-full"
              disabled={!!analyzingFile || analyzingFiles.length > 0}
            >
              <option value="">请选择知识库</option>
              {kbList.map((kb) => (
                <option key={kb.name} value={kb.name}>
                  {kb.name} ({kb.file_count}个文件, {kb.total_size_mb}MB)
                </option>
              ))}
            </select>
          </div>
          {(analyzingFile || analyzingFiles.length > 0) && (
            <div className="flex-1">
              <label className="block text-body mb-2">
                {analyzingFiles.length > 1 ? `分析文档 (${analyzingFiles.length}个)` : '分析文档'}
              </label>
              <div className="p-3 bg-primary-50 rounded-ant border border-primary-200 space-y-2">
                {analyzingFiles.length > 1 ? (
                  analyzingFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div>
                        <p className="text-body font-medium">{file.filename}</p>
                        <p className="text-caption text-gray-600">知识库: {file.kb_name}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-body font-medium">{(analyzingFile || analyzingFiles[0]).filename}</p>
                      <p className="text-caption text-gray-600">知识库: {(analyzingFile || analyzingFiles[0]).kb_name}</p>
                    </div>
                    <button
                      onClick={() => {
                        setAnalyzingFile(null)
                        setAnalyzingFiles([])
                        setSelectedKB('')
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleAnalyze}
          disabled={(!selectedKB && !analyzingFile && analyzingFiles.length === 0)}
          className="btn-ant ripple flex items-center space-x-2"
        >
          <BarChart3 className="w-5 h-5" />
          <span>
            {analyzingFiles.length > 1 ? `分析 ${analyzingFiles.length} 个文档` : 
             analyzingFile || analyzingFiles.length === 1 ? '分析文档' : '分析知识库'}
          </span>
        </button>
      </div>

      {/* 当前任务进度显示 */}
      {activeTask && activeTask.status === 'running' && (
        <div className="card-material bg-blue-50 border border-blue-200">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Loader className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-body font-medium text-blue-800">分析进行中...</span>
              </div>
              <div className="flex items-center space-x-3">
                {activeTask.estimated_remaining_text && (
                  <span className="text-caption text-blue-600 flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>预计剩余: {activeTask.estimated_remaining_text}</span>
                  </span>
                )}
                <button
                  onClick={async () => {
                    if (window.confirm('确定要取消这个分析任务吗？')) {
                      try {
                        const response = await fetch(`http://localhost:5000/api/knowledge/analysis-task/${activeTask.task_id}/cancel`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          }
                        })
                        
                        if (!response.ok) {
                          // 尝试解析错误信息
                          let errorMsg = '取消任务失败'
                          try {
                            const errorData = await response.json()
                            errorMsg = errorData.error || errorMsg
                          } catch {
                            errorMsg = `取消任务失败: HTTP ${response.status}`
                          }
                          alert(errorMsg)
                          return
                        }
                        
                        // 解析成功响应
                        const data = await response.json()
                        // 更新任务状态
                        setTasks(prev => prev.map(t => 
                          t.task_id === activeTask.task_id 
                            ? { ...t, status: 'cancelled', message: '任务已取消' }
                            : t
                        ))
                        setActiveTaskId(null)
                      } catch (err) {
                        // 网络错误或其他异常
                        console.error('取消任务失败:', err)
                        alert('取消任务失败：' + (err.message || '网络连接失败，请检查后端服务是否运行'))
                      }
                    }
                  }}
                  className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-ant transition-colors flex items-center space-x-1"
                  type="button"
                >
                  <X className="w-4 h-4" />
                  <span>取消任务</span>
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-caption text-blue-700">
                <span>{activeTask.message || '处理中...'}</span>
                <span>{Math.round((activeTask.progress || 0) * 100)}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(activeTask.progress || 0) * 100}%` }}
                  transition={{ duration: 0.3 }}
                  className="bg-blue-600 h-full rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTask && activeTask.status === 'error' && (
        <div className="card-material bg-red-50 border border-red-200">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-body font-medium text-red-800">分析失败</p>
              <p className="text-caption text-red-700">{activeTask.error || '未知错误'}</p>
            </div>
          </div>
        </div>
      )}

      {!analysisData && (!activeTask || activeTask.status !== 'running') && (
        <div className="card-material text-center py-12">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-body text-gray-600 mb-2">请选择知识库或文档进行分析</p>
          <p className="text-caption text-gray-500">分析将展示关键词Top10分布和聚类结果</p>
        </div>
      )}

      {analysisData && (
        <>
          {/* 统计概览 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-tailwind">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-primary-50 p-3 rounded-ant-lg">
                  <FileText className="w-6 h-6 text-primary-500" />
                </div>
              </div>
              <p className="text-caption text-gray-600 mb-1">总数据量</p>
              <p className="text-title text-2xl font-bold">{totalDocs}</p>
            </div>
            <div className="card-tailwind">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-accent-50 p-3 rounded-ant-lg">
                  <BarChart3 className="w-6 h-6 text-accent-500" />
                </div>
              </div>
              <p className="text-caption text-gray-600 mb-1">聚类数量</p>
              <p className="text-title text-2xl font-bold">{clusterCount}</p>
            </div>
            <div className="card-tailwind">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-green-50 p-3 rounded-ant-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-caption text-gray-600 mb-1">关键词数量</p>
              <p className="text-title text-2xl font-bold">{topKeywords.length}</p>
            </div>
          </div>

          {/* 关键词Top10分布 - Chart.js 动态图表 */}
          {topKeywords.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="card-material"
            >
              <div className="flex items-center space-x-2 mb-6">
                <PieChart className="w-6 h-6 text-primary-500" />
                <h2 className="text-title text-xl">关键词 Top10 分布</h2>
              </div>
              <div className="h-80 mb-6">
                <Bar data={keywordsChartData} options={chartOptions} />
              </div>
              {/* 保留列表视图作为补充 */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                {topKeywords.slice(0, 10).map((item, index) => {
                  // 修复百分比计算：基于关键词总出现次数，而不是文档数
                  const percentage = totalKeywordCount > 0 ? ((item.count / totalKeywordCount) * 100).toFixed(1) : 0
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                      className="flex items-center space-x-4"
                    >
                      <span className="text-body font-medium text-gray-700 w-8">
                        #{index + 1}
                      </span>
                      <span className="text-body font-medium text-gray-900 flex-1">
                        {item.keyword}
                      </span>
                      <span className="text-caption text-gray-600 w-20 text-right">
                        {item.count} 次
                      </span>
                      <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, parseFloat(percentage))}%` }}
                          transition={{ duration: 0.8, delay: 0.5 + index * 0.05 }}
                          className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
                        />
                      </div>
                      <span className="text-caption text-primary-500 font-medium w-16 text-right">
                        {percentage}%
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          ) : (
            <div className="card-material text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-body text-gray-600">暂无关键词数据</p>
            </div>
          )}

          {/* 聚类分析 - Chart.js 动态图表 */}
          {clusterData.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="card-material"
            >
              <div className="flex items-center space-x-2 mb-6">
                <BarChart3 className="w-6 h-6 text-accent-500" />
                <h2 className="text-title text-xl">数据聚类分析</h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 柱状图 */}
                <div className="h-64">
                  <Bar data={clusterChartData} options={chartOptions} />
                </div>
                {/* 饼图 */}
                <div className="h-64">
                  <Doughnut data={clusterChartData} options={doughnutOptions} />
                </div>
              </div>
              {/* 详细列表 */}
              <div className="space-y-3 pt-6 border-t border-gray-200 mt-6">
                {clusterData.map((item, index) => {
                  const percentage = totalDocs > 0 ? ((item.count / totalDocs) * 100).toFixed(1) : 0
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
                      className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-24">
                        <span className="text-body font-medium text-gray-900">{item.cluster || `聚类 ${index + 1}`}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, parseFloat(percentage))}%` }}
                              transition={{ duration: 0.8, delay: 0.6 + index * 0.05 }}
                              className="bg-gradient-to-r from-accent-500 to-accent-600 h-full rounded-full"
                            />
                          </div>
                          <span className="text-caption text-gray-600 w-20 text-right">
                            {percentage}%
                          </span>
                        </div>
                        <p className="text-caption text-gray-500">{item.count} 条数据</p>
                        {item.keywords && item.keywords.length > 0 && (
                          <p className="text-caption text-gray-400 mt-1">
                            关键词: {item.keywords.join(', ')}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
              
              {/* 聚类分析结论 */}
              {analysisData?.cluster_summary && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                  className="mt-6 pt-6 border-t border-gray-200"
                >
                  <div className="bg-gradient-to-r from-accent-50 to-primary-50 rounded-ant-lg p-6 border border-accent-200">
                    <div className="flex items-center space-x-2 mb-4">
                      <TrendingUp className="w-6 h-6 text-accent-600" />
                      <h3 className="text-title text-lg text-accent-900">聚类分析结论</h3>
                    </div>
                    <div className="space-y-3">
                      <p className="text-body text-gray-800 leading-relaxed">
                        {analysisData.cluster_summary.summary}
                      </p>
                      {analysisData.cluster_summary.insights && analysisData.cluster_summary.insights.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-body font-medium text-gray-700 mb-2">关键洞察：</p>
                          <ul className="space-y-2">
                            {analysisData.cluster_summary.insights.map((insight, idx) => (
                              <li key={idx} className="flex items-start space-x-2 text-body text-gray-700">
                                <span className="text-accent-500 mt-1">•</span>
                                <span>{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <div className="card-material text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-body text-gray-600">暂无聚类数据</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

