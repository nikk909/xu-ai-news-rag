import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Upload, Eye, Trash2, Plus, FileText, Calendar, X, CheckCircle, Loader, FolderPlus, AlertCircle, ArrowRight, CheckSquare, Square, Edit2, BarChart3, Database } from 'lucide-react'
import { motion } from 'framer-motion'

export default function KnowledgeBase() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedItems, setSelectedItems] = useState([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showCreateKBModal, setShowCreateKBModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingFile, setViewingFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState(null)
  const [customFilename, setCustomFilename] = useState('')
  const [kbList, setKbList] = useState([])
  const [currentKB, setCurrentKB] = useState('default')
  const [newKBName, setNewKBName] = useState('')
  const [creatingKB, setCreatingKB] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [movingFile, setMovingFile] = useState(null)  // {filename, kb_name} 或 null（批量移动）
  const [targetKB, setTargetKB] = useState('')
  const [moving, setMoving] = useState(false)
  const [moveProgress, setMoveProgress] = useState({
    current: 0,
    total: 0,
    currentFile: '',
    startTime: null,
    movedFiles: [],
    failedFiles: []
  })
  const [elapsedTime, setElapsedTime] = useState(0)
  const fileInputRef = useRef(null)
  
  // 筛选相关状态
  const [filterType, setFilterType] = useState('all')  // all, txt, pdf, xlsx, csv, md
  const [filterDate, setFilterDate] = useState('all')  // all, today, week, month
  const [sortOrder, setSortOrder] = useState('desc')  // desc: 降序（最新的在前）, asc: 升序（最旧的在前）
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingFile, setEditingFile] = useState(null)  // {filename, kb_name, tags, source}
  const [editTags, setEditTags] = useState('')
  const [editSource, setEditSource] = useState('')
  const [selectedFilesForAnalysis, setSelectedFilesForAnalysis] = useState([])  // 用于多文件分析
  const [showKbSelector, setShowKbSelector] = useState(false)  // 知识库选择器显示状态
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })  // 下拉菜单位置
  const kbSelectorRef = useRef(null)  // 知识库选择器引用

  const MAX_KB_SIZE_MB = 500  // 最大知识库大小500MB

  useEffect(() => {
    fetchKBList()
  }, [])

  useEffect(() => {
    fetchFiles()
  }, [currentKB])

  // 点击外部关闭知识库选择器
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

  // 实时更新已用时间
  useEffect(() => {
    let interval = null
    if (moving && moveProgress.startTime) {
      interval = setInterval(() => {
        const elapsed = ((Date.now() - moveProgress.startTime) / 1000).toFixed(1)
        setElapsedTime(elapsed)
      }, 100)  // 每100ms更新一次
    } else {
      setElapsedTime(0)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [moving, moveProgress.startTime])

  const fetchKBList = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/knowledge/kb-list')
      const data = await response.json()
      if (response.ok) {
        setKbList(data.kb_list || [])
        // 如果当前选择的知识库不在列表中，选择第一个
        if (data.kb_list && data.kb_list.length > 0) {
          const currentExists = data.kb_list.some(kb => kb.name === currentKB)
          if (!currentExists) {
            setCurrentKB(data.kb_list[0].name)
          }
        } else {
          // 如果没有知识库，设置为空字符串
          setCurrentKB('')
        }
      } else {
        console.error('获取知识库列表失败:', data.error)
        setKbList([])
      }
    } catch (err) {
      console.error('获取知识库列表失败:', err)
      setKbList([])
    }
  }

  const fetchFiles = async () => {
    // 如果没有选择知识库，不获取文件
    if (!currentKB) {
      setFiles([])
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      // 对知识库名称进行URL编码，支持中文
      const encodedKBName = encodeURIComponent(currentKB)
      const response = await fetch(`http://localhost:5000/api/knowledge/files?kb_name=${encodedKBName}`)
      const data = await response.json()
      if (response.ok) {
        setFiles(data.files || [])
      } else {
        console.error('获取文件列表失败:', data.error)
        setFiles([])
      }
    } catch (err) {
      console.error('获取文件列表失败:', err)
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // 如果用户没有输入自定义文件名，自动填充原文件名（不含扩展名）作为提示
    if (!customFilename && file.name) {
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
      // 不自动填充，只是更新占位符提示
    }

    // 检查文件大小（100MB限制）
    const MAX_FILE_SIZE = 100 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      setUploadResult({
        success: false,
        message: `文件太大，最大支持100MB，当前文件大小：${(file.size / 1024 / 1024).toFixed(2)}MB`
      })
      return
    }

    // 检查知识库总大小
    const currentKBInfo = kbList.find(kb => kb.name === currentKB)
    if (currentKBInfo && (currentKBInfo.total_size_mb + file.size / 1024 / 1024) > MAX_KB_SIZE_MB) {
      setUploadResult({
        success: false,
        message: `知识库总大小超过限制，最大支持${MAX_KB_SIZE_MB}MB，当前：${currentKBInfo.total_size_mb.toFixed(2)}MB`
      })
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setUploadResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('kb_name', currentKB)
    // 如果用户输入了自定义文件名，则使用自定义文件名；否则传递空字符串，让后端使用原始文件名
    formData.append('custom_filename', customFilename.trim() || '')

    try {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100
          setUploadProgress(percentComplete)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)
          // 优先显示原始文件名，如果没有则显示处理后的文件名
          const displayFilename = response.original_filename || response.filename
          setUploadResult({
            success: true,
            message: response.message,
            filename: displayFilename,  // 显示原始文件名
            actual_filename: response.filename,  // 存储实际文件名
            count: response.count,
            email_sent: response.email_sent
          })
          setUploading(false)
          fetchFiles()
          fetchKBList()
          setTimeout(() => {
            setShowUploadModal(false)
            setUploadResult(null)
            setCustomFilename('')  // 清空自定义文件名输入
            if (fileInputRef.current) {
              fileInputRef.current.value = ''
            }
          }, 3000)
        } else {
          const response = JSON.parse(xhr.responseText)
          setUploadResult({
            success: false,
            message: response.error || '上传失败'
          })
          setUploading(false)
        }
      })

      xhr.addEventListener('error', () => {
        setUploadResult({
          success: false,
          message: '网络错误，请检查后端服务'
        })
        setUploading(false)
      })

      xhr.open('POST', 'http://localhost:5000/api/knowledge/upload')
      xhr.send(formData)
    } catch (err) {
      setUploadResult({
        success: false,
        message: '上传失败：' + err.message
      })
      setUploading(false)
    }
  }

  const handleDeleteFile = async (file, kbName) => {
    const filename = file.actual_filename || file.filename  // 使用实际文件名进行删除
    const displayName = file.filename  // 显示名称
    if (!confirm(`确定要删除文件 "${displayName}" 吗？`)) return

    try {
      const encodedFilename = encodeURIComponent(filename)
      const response = await fetch(`http://localhost:5000/api/knowledge/files/${kbName}/${encodedFilename}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (response.ok) {
        alert('文件删除成功')
        fetchFiles()
        fetchKBList()
      } else {
        alert(data.error || '删除失败')
      }
    } catch (err) {
      alert('删除失败：' + err.message)
    }
  }

  const handleViewFile = async (file, kbName) => {
    const filename = file.actual_filename || file.filename  // 使用实际文件名
    try {
      const encodedFilename = encodeURIComponent(filename)
      const response = await fetch(`http://localhost:5000/api/knowledge/files/${kbName}/${encodedFilename}`)
      const data = await response.json()
      if (response.ok) {
        setViewingFile(data)
        setShowViewModal(true)
      } else {
        alert(data.error || '查看文件失败')
      }
    } catch (err) {
      alert('查看文件失败：' + err.message)
    }
  }

  const handleMoveFile = (file, kbName) => {
    const filename = file.actual_filename || file.filename  // 使用实际文件名
    setMovingFile({ filename, kb_name: kbName })
    setTargetKB('')
    setShowMoveModal(true)
  }

  const handleMoveBatch = () => {
    if (selectedItems.length === 0) {
      alert('请先选择要移动的文件')
      return
    }
    setMovingFile(null)  // null表示批量移动
    setTargetKB('')
    setShowMoveModal(true)
  }

  const confirmMove = async () => {
    if (!targetKB) {
      alert('请选择目标知识库')
      return
    }

    setMoving(true)
    try {
      if (movingFile) {
        // 单个文件移动
        const encodedFilename = encodeURIComponent(movingFile.filename)
        const response = await fetch(`http://localhost:5000/api/knowledge/files/${movingFile.kb_name}/${encodedFilename}/move`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ target_kb: targetKB })
        })
        const data = await response.json()
        if (response.ok) {
          alert('文件移动成功')
          setShowMoveModal(false)
          setMovingFile(null)
          setSelectedItems([])  // 清空选中项
          // 如果文件从当前知识库移走，刷新文件列表
          if (movingFile.kb_name === currentKB) {
            fetchFiles()
          }
          // 总是刷新知识库列表以更新大小和文件数量
          fetchKBList()
        } else {
          alert(data.error || '移动失败')
        }
      } else {
        // 批量移动：逐个移动文件以显示进度
        const filesToMove = selectedItems.map(filename => {
          const file = files.find(f => f.filename === filename)
          return file ? { kb_name: file.kb_name, filename: file.filename } : null
        }).filter(f => f !== null && f.kb_name !== targetKB)  // 过滤掉相同知识库的文件

        if (filesToMove.length === 0) {
          alert('没有需要移动的文件（所有文件都在目标知识库中）')
          setMoving(false)
          return
        }

        // 初始化进度
        const startTime = Date.now()
        setMoveProgress({
          current: 0,
          total: filesToMove.length,
          currentFile: '',
          startTime: startTime,
          movedFiles: [],
          failedFiles: []
        })

        // 逐个移动文件
        let movedCount = 0
        let failedCount = 0
        const movedFiles = []
        const failedFiles = []

        for (let i = 0; i < filesToMove.length; i++) {
          const fileInfo = filesToMove[i]
          
          // 更新当前文件信息
          setMoveProgress(prev => ({
            ...prev,
            current: i + 1,
            currentFile: fileInfo.filename
          }))

          try {
            const encodedFilename = encodeURIComponent(fileInfo.filename)
            
            // 创建超时控制器
            // 根据文件大小动态设置超时时间：小文件(<10MB) 2分钟，大文件(>=10MB) 10分钟
            const file = files.find(f => f.filename === fileInfo.filename)
            const fileSizeMB = file ? (file.size_mb || 0) : 0
            const timeoutMs = fileSizeMB >= 10 ? 600000 : 120000  // 大文件10分钟，小文件2分钟
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
            
            try {
              const response = await fetch(`http://localhost:5000/api/knowledge/files/${fileInfo.kb_name}/${encodedFilename}/move`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ target_kb: targetKB }),
                signal: controller.signal
              })
              
              clearTimeout(timeoutId)
              
              if (!response.ok) {
                // 尝试解析错误信息
                let errorMsg = '移动失败'
                try {
                  const errorData = await response.json()
                  errorMsg = errorData.error || errorMsg
                } catch {
                  errorMsg = `HTTP ${response.status}: ${response.statusText}`
                }
                
                failedCount++
                failedFiles.push({ filename: fileInfo.filename, error: errorMsg })
                setMoveProgress(prev => ({
                  ...prev,
                  failedFiles: [...prev.failedFiles, { filename: fileInfo.filename, error: errorMsg }]
                }))
              } else {
                const data = await response.json()
                movedCount++
                movedFiles.push(fileInfo.filename)
                setMoveProgress(prev => ({
                  ...prev,
                  movedFiles: [...prev.movedFiles, fileInfo.filename]
                }))
              }
            } catch (fetchErr) {
              clearTimeout(timeoutId)
              throw fetchErr
            }
          } catch (err) {
            // 处理各种错误
            let errorMsg = '移动失败'
            if (err.name === 'AbortError' || err.name === 'TimeoutError') {
              const file = files.find(f => f.filename === fileInfo.filename)
              const fileSizeMB = file ? (file.size_mb || 0) : 0
              const timeoutSeconds = fileSizeMB >= 10 ? 600 : 120
              errorMsg = `请求超时（${timeoutSeconds}秒），文件可能过大或处理时间较长，请稍后重试`
            } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
              errorMsg = '网络错误，无法连接到服务器，请检查后端是否运行'
            } else {
              errorMsg = err.message || '未知错误'
            }
            
            failedCount++
            failedFiles.push({ filename: fileInfo.filename, error: errorMsg })
            setMoveProgress(prev => ({
              ...prev,
              failedFiles: [...prev.failedFiles, { filename: fileInfo.filename, error: errorMsg }]
            }))
          }
        }

        // 移动完成
        setMoveProgress(prev => ({
          ...prev,
          current: prev.total,
          currentFile: ''
        }))

        // 刷新数据（不关闭模态框，让用户看到完成统计）
        setSelectedItems([])
        
        // 检查是否有文件从当前知识库移走
        const movedFromCurrent = filesToMove.some(f => f.kb_name === currentKB)
        if (movedFromCurrent) {
          fetchFiles()  // 刷新文件列表
        }
        // 总是刷新知识库列表以更新大小和文件数量
        fetchKBList()
      }
    } catch (err) {
      alert('移动失败：' + err.message)
    } finally {
      setMoving(false)
    }
  }

  const handleCreateKB = async () => {
    if (!newKBName.trim()) {
      alert('知识库名称不能为空')
      return
    }

    setCreatingKB(true)
    try {
      const response = await fetch('http://localhost:5000/api/knowledge/kb-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ kb_name: newKBName.trim() })
      })
      const data = await response.json()
      if (response.ok) {
        alert('知识库创建成功')
        setShowCreateKBModal(false)
        const createdKBName = newKBName.trim()
        setNewKBName('')
        // 先刷新知识库列表
        await fetchKBList()
        // 然后切换到新创建的知识库
        setCurrentKB(createdKBName)
        // 再次刷新文件列表（确保显示新知识库的文件）
        fetchFiles()
      } else {
        alert(data.error || '创建失败')
      }
    } catch (err) {
      alert('创建失败：' + err.message)
    } finally {
      setCreatingKB(false)
    }
  }

  // 获取文件类型
  const getFileType = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (['txt', 'md'].includes(ext)) return 'txt'
    if (ext === 'pdf') return 'pdf'
    if (['xlsx', 'xls'].includes(ext)) return 'xlsx'
    if (ext === 'csv') return 'csv'
    return 'other'
  }

  // 判断文件是否在时间范围内
  const isInDateRange = (fileDate, range) => {
    if (range === 'all') return true
    const fileTime = new Date(fileDate).getTime()
    const now = Date.now()
    const ranges = {
      today: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    }
    return (now - fileTime) <= ranges[range]
  }

  const filteredFiles = files
    .filter((file) => {
      // 搜索关键词过滤
      const matchesSearch = file.filename.toLowerCase().includes(searchQuery.toLowerCase())
      
      // 类型过滤
      const matchesType = filterType === 'all' || getFileType(file.filename) === filterType
      
      // 时间过滤
      const matchesDate = isInDateRange(file.modified, filterDate)
      
      return matchesSearch && matchesType && matchesDate
    })
    .sort((a, b) => {
      // 按时间排序
      const timeA = new Date(a.modified).getTime()
      const timeB = new Date(b.modified).getTime()
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
    })
  
  // 处理编辑元数据
  const handleEditMetadata = (file) => {
    setEditingFile({
      filename: file.filename,
      kb_name: file.kb_name,
      tags: file.tags || '',
      source: file.source || file.metadata?.source || ''
    })
    setEditTags(file.tags || '')
    setEditSource(file.source || file.metadata?.source || '')
    setShowEditModal(true)
  }
  
  // 保存元数据编辑
  const handleSaveMetadata = async () => {
    if (!editingFile) return
    
    try {
      const encodedFilename = encodeURIComponent(editingFile.filename)
      const response = await fetch(`http://localhost:5000/api/knowledge/files/${editingFile.kb_name}/${encodedFilename}/metadata`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tags: editTags,
          source: editSource
        })
      })
      const data = await response.json()
      if (response.ok) {
        alert('编辑成功')
        setShowEditModal(false)
        setEditingFile(null)
        fetchFiles()
      } else {
        alert(data.error || '更新失败')
      }
    } catch (err) {
      alert('更新失败：' + err.message)
    }
  }
  
  // 处理分析文档（支持单个或多个文件）
  const handleAnalyzeDocument = (file) => {
    // 如果已选择文件，添加到选择列表；否则跳转到分析页面
    if (selectedItems.length > 0) {
      // 多文件分析：跳转到分析页面，传递选中的文件
      const filesToAnalyze = files.filter(f => selectedItems.includes(f.filename))
      navigate(`/analysis?files=${encodeURIComponent(JSON.stringify(filesToAnalyze.map(f => ({filename: f.filename, kb_name: f.kb_name}))))}`)
    } else {
      // 单文件分析：跳转到分析页面，传递单个文件信息
      navigate(`/analysis?file=${encodeURIComponent(file.filename)}&kb=${encodeURIComponent(file.kb_name)}`)
    }
  }
  
  // 批量分析选中的文件
  const handleBatchAnalyze = () => {
    if (selectedItems.length === 0) {
      alert('请先选择要分析的文件')
      return
    }
    const filesToAnalyze = files.filter(f => selectedItems.includes(f.filename))
    navigate(`/analysis?files=${encodeURIComponent(JSON.stringify(filesToAnalyze.map(f => ({filename: f.filename, kb_name: f.kb_name}))))}`)
  }
  
  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedItems.length === 0) {
      alert('请先选择要删除的文件')
      return
    }
    
    if (!confirm(`确定要删除选中的 ${selectedItems.length} 个文件吗？`)) return
    
    let successCount = 0
    let failCount = 0
    
    for (const filename of selectedItems) {
      const file = files.find(f => f.filename === filename)
      if (!file) continue
      
      try {
        const encodedFilename = encodeURIComponent(filename)
        const response = await fetch(`http://localhost:5000/api/knowledge/files/${file.kb_name}/${encodedFilename}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          successCount++
        } else {
          failCount++
        }
      } catch (err) {
        failCount++
      }
    }
    
    alert(`删除完成：成功 ${successCount} 个，失败 ${failCount} 个`)
    setSelectedItems([])
    fetchFiles()
    fetchKBList()
  }

  // 检查是否全选（基于过滤后的文件列表）
  const isAllSelected = filteredFiles.length > 0 && filteredFiles.every(file => selectedItems.includes(file.filename))
  
  // 全选/取消全选切换
  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // 取消全选：从selectedItems中移除所有过滤后的文件
      const filteredFilenames = filteredFiles.map(f => f.filename)
      setSelectedItems(selectedItems.filter(name => !filteredFilenames.includes(name)))
    } else {
      // 全选：将过滤后的所有文件添加到selectedItems
      const filteredFilenames = filteredFiles.map(f => f.filename)
      const newSelected = [...new Set([...selectedItems, ...filteredFilenames])]
      setSelectedItems(newSelected)
    }
  }

  const currentKBInfo = kbList.find(kb => kb.name === currentKB)

  return (
    <div className="space-y-6 page-enter">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-title text-3xl mb-2">知识库管理</h1>
          <p className="text-caption text-gray-600">管理和维护知识库内容，支持上传文件构建数据库</p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleMoveBatch}
            disabled={selectedItems.length === 0}
            className="btn-ant-secondary flex items-center space-x-2 ripple disabled:opacity-50 disabled:cursor-not-allowed"
            title={selectedItems.length === 0 ? '请先选择要移动的文件' : `移动 ${selectedItems.length} 个文件`}
          >
            <ArrowRight className="w-5 h-5" />
            <span>一键移动 {selectedItems.length > 0 && `(${selectedItems.length})`}</span>
          </button>
          <button 
            onClick={() => setShowCreateKBModal(true)}
            className="btn-ant-secondary flex items-center space-x-2 ripple"
          >
            <FolderPlus className="w-5 h-5" />
            <span>创建知识库</span>
          </button>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="btn-ant flex items-center space-x-2 ripple"
          >
            <Upload className="w-5 h-5" />
            <span>上传文件</span>
          </button>
        </div>
      </motion.div>

      {/* 知识库选择 */}
      {kbList.length > 0 && (
        <div className="card-material">
          <div className="flex items-center space-x-4">
            <label className="text-body font-medium">当前知识库：</label>
            <select
              value={currentKB}
              onChange={(e) => setCurrentKB(e.target.value)}
              className="input-ant"
            >
              {kbList.map((kb) => (
                <option key={kb.name} value={kb.name}>
                  {kb.name} ({kb.file_count}个文件, {kb.total_size_mb}MB)
                </option>
              ))}
            </select>
            {currentKBInfo && (
              <div className="flex items-center space-x-2 text-caption text-gray-600">
                <span>总大小: {currentKBInfo.total_size_mb}MB</span>
                {currentKBInfo.total_size_mb > MAX_KB_SIZE_MB * 0.8 && (
                  <span className="text-yellow-600 flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>接近限制 ({MAX_KB_SIZE_MB}MB)</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 创建知识库弹窗 */}
      {showCreateKBModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-ant-lg p-6 max-w-md w-full mx-4 card-material">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-title text-xl">创建知识库</h2>
              <button
                onClick={() => {
                  setShowCreateKBModal(false)
                  setNewKBName('')
                }}
                className="p-1 hover:bg-gray-100 rounded-ant transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-body mb-2">知识库名称</label>
                <input
                  type="text"
                  value={newKBName}
                  onChange={(e) => setNewKBName(e.target.value)}
                  className="input-ant w-full"
                  placeholder="输入知识库名称（字母、数字、下划线、中文）"
                />
                <p className="text-caption text-gray-500 mt-2">
                  最大支持 {MAX_KB_SIZE_MB}MB，超过后将无法上传新文件
                </p>
              </div>
              <button
                onClick={handleCreateKB}
                disabled={creatingKB || !newKBName.trim()}
                className="btn-ant w-full ripple"
              >
                {creatingKB ? '创建中...' : '创建知识库'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 上传文件弹窗 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-ant-lg p-6 max-w-md w-full mx-4 card-material">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-title text-xl">上传文件</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadResult(null)
                  setCustomFilename('')  // 清空自定义文件名
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                className="p-1 hover:bg-gray-100 rounded-ant transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-body mb-2">选择文件（最大100MB）</label>
                <div className="border-2 border-dashed border-gray-300 rounded-ant-lg p-6 text-center hover:border-primary-500 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    accept=".txt,.md,.xlsx,.xls,.csv,.pdf"
                    className="hidden"
                    id="file-upload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`cursor-pointer flex flex-col items-center space-y-2 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={(e) => {
                      // 当选择文件后，更新自定义文件名的占位符
                      if (fileInputRef.current?.files[0]) {
                        const fileName = fileInputRef.current.files[0].name
                        if (!customFilename) {
                          // 如果用户没有输入自定义文件名，可以自动填充原文件名（不含扩展名）
                          const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName
                          // 不自动填充，让用户自己决定
                        }
                      }
                    }}
                  >
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-body text-gray-600">
                      {uploading ? '上传中...' : '点击选择文件'}
                    </span>
                    <span className="text-caption text-gray-500">
                      支持 .txt, .md, .xlsx, .xls, .csv, .pdf 格式，最大100MB
                    </span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-body mb-2">自定义文件名（可选）</label>
                <input
                  type="text"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  className="input-ant w-full"
                  placeholder="留空则使用原文件名"
                  disabled={uploading}
                  onFocus={(e) => {
                    // 当聚焦时，如果有选中的文件，显示原文件名作为提示
                    if (fileInputRef.current?.files[0] && !customFilename) {
                      const fileName = fileInputRef.current.files[0].name
                      e.target.placeholder = `原文件名: ${fileName}`
                    }
                  }}
                  onBlur={(e) => {
                    e.target.placeholder = "留空则使用原文件名"
                  }}
                />
                <p className="text-caption text-gray-500 mt-1">
                  留空则使用原文件名。如果指定文件名，将自动保留原文件的扩展名。
                </p>
              </div>
              {uploading && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-ant-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-ant-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-caption text-gray-600 text-center">
                    上传进度: {uploadProgress.toFixed(0)}%
                  </p>
                </div>
              )}
              {uploadResult && (
                <div className={`p-4 rounded-ant-lg ${
                  uploadResult.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-start space-x-3">
                    {uploadResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <X className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`text-body font-medium ${
                        uploadResult.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {uploadResult.message}
                      </p>
                      {uploadResult.success && (
                        <div className="mt-2 space-y-1 text-caption text-green-700">
                          <p>文件名: {uploadResult.filename}</p>
                          <p>提取数据: {uploadResult.count} 条</p>
                          {uploadResult.email_sent && (
                            <p className="text-green-600">✓ 邮件通知已发送</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 查看文件弹窗 */}
      {showViewModal && viewingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => {
          setShowViewModal(false)
          setViewingFile(null)
        }}>
          <div className="bg-white rounded-ant-lg p-6 max-w-5xl w-full mx-4 card-material max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div className="flex-1">
                <h2 className="text-title text-xl mb-2">查看文件: {viewingFile.filename}</h2>
                <div className="flex items-center space-x-4 text-caption text-gray-600">
                  <span>文件大小: {viewingFile.size_mb || (viewingFile.size / 1024 / 1024).toFixed(2)}MB</span>
                  <span>文件类型: {viewingFile.type || '未知'}</span>
                  {viewingFile.encoding && <span>编码: {viewingFile.encoding}</span>}
                  {viewingFile.is_truncated && (
                    <span className="text-yellow-600 flex items-center space-x-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>内容已截断（仅显示前10MB）</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {viewingFile.download_url && (
                  <a
                    href={`http://localhost:5000${viewingFile.download_url}`}
                    download={viewingFile.filename}
                    className="btn-ant-small ripple"
                  >
                    下载
                  </a>
                )}
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    setViewingFile(null)
                  }}
                  className="p-1 hover:bg-gray-100 rounded-ant transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="space-y-4 flex-1 overflow-y-auto">
              {viewingFile.type === 'excel' && viewingFile.sheets ? (
                <div>
                  <p className="text-body mb-4">{viewingFile.content}</p>
                  <div className="space-y-2">
                    {viewingFile.sheets.map((sheet, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-ant border border-gray-200">
                        <p className="font-medium text-body">{sheet.name}</p>
                        <p className="text-caption text-gray-600">
                          {sheet.rows} 行 × {sheet.cols} 列
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : viewingFile.type === 'pdf' ? (
                <div className="bg-gray-50 rounded-ant-lg p-6 text-center">
                  <p className="text-body mb-4">{viewingFile.content}</p>
                  {viewingFile.download_url && (
                    <a
                      href={`http://localhost:5000${viewingFile.download_url}`}
                      download={viewingFile.filename}
                      className="btn-ant ripple inline-block"
                    >
                      下载PDF文件
                    </a>
                  )}
                </div>
              ) : viewingFile.type === 'csv' ? (
                <div className="bg-gray-50 rounded-ant-lg p-4 overflow-x-auto">
                  <div className="mb-2 text-caption text-gray-600">
                    {viewingFile.rows_displayed && `显示前 ${viewingFile.rows_displayed} 行`}
                  </div>
                  <pre className="whitespace-pre-wrap text-body text-gray-800 font-mono text-sm">
                    {viewingFile.content}
                  </pre>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-ant-lg p-4 overflow-x-auto">
                  <pre className="whitespace-pre-wrap text-body text-gray-800 font-mono text-sm break-words">
                    {viewingFile.content}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 移动文件弹窗 */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-ant-lg p-6 max-w-lg w-full mx-4 card-material">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-title text-xl">
                {movingFile ? '移动文件' : `批量移动 (${selectedItems.length}个文件)`}
              </h2>
              {!moving && (
                <button
                  onClick={() => {
                    setShowMoveModal(false)
                    setMovingFile(null)
                    setTargetKB('')
                    setMoveProgress({
                      current: 0,
                      total: 0,
                      currentFile: '',
                      startTime: null,
                      movedFiles: [],
                      failedFiles: []
                    })
                  }}
                  className="p-1 hover:bg-gray-100 rounded-ant transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="space-y-4">
              {movingFile && (
                <div className="p-3 bg-gray-50 rounded-ant">
                  <p className="text-body font-medium">文件：{movingFile.filename}</p>
                  <p className="text-caption text-gray-600">当前知识库：{movingFile.kb_name}</p>
                </div>
              )}
              {!movingFile && selectedItems.length > 0 && !moving && (
                <div className="p-3 bg-gray-50 rounded-ant">
                  <p className="text-body font-medium">已选择 {selectedItems.length} 个文件</p>
                  <p className="text-caption text-gray-600 mt-1">
                    {selectedItems.slice(0, 3).join(', ')}
                    {selectedItems.length > 3 && '...'}
                  </p>
                </div>
              )}

              {/* 移动进度显示 */}
              {moving && moveProgress.total > 0 && (
                <div className="space-y-3 p-4 bg-blue-50 rounded-ant border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-body font-medium text-blue-900">移动进度</span>
                    <span className="text-body font-medium text-blue-900">
                      {moveProgress.current} / {moveProgress.total}
                    </span>
                  </div>
                  
                  {/* 进度条 */}
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-primary-500 h-full transition-all duration-300 ease-out"
                      style={{ width: `${(moveProgress.current / moveProgress.total) * 100}%` }}
                    />
                  </div>
                  
                  {/* 当前文件信息 */}
                  {moveProgress.currentFile && (
                    <div className="space-y-1">
                      <p className="text-body text-gray-800">
                        <span className="font-medium">正在移动：</span>
                        {moveProgress.currentFile}
                      </p>
                      <p className="text-caption text-gray-600">
                        第 {moveProgress.current} 个文件，还剩 {moveProgress.total - moveProgress.current} 个
                      </p>
                    </div>
                  )}
                  
                  {/* 已用时间 */}
                  {moveProgress.startTime && (
                    <p className="text-caption text-gray-600">
                      已用时间：{elapsedTime} 秒
                    </p>
                  )}
                  
                  {/* 成功/失败统计 */}
                  {(moveProgress.movedFiles.length > 0 || moveProgress.failedFiles.length > 0) && (
                    <div className="flex items-center space-x-4 text-caption">
                      {moveProgress.movedFiles.length > 0 && (
                        <span className="text-green-600 flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4" />
                          <span>成功: {moveProgress.movedFiles.length}</span>
                        </span>
                      )}
                      {moveProgress.failedFiles.length > 0 && (
                        <span className="text-red-600 flex items-center space-x-1">
                          <AlertCircle className="w-4 h-4" />
                          <span>失败: {moveProgress.failedFiles.length}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 移动完成统计 */}
              {!moving && moveProgress.total > 0 && moveProgress.current === moveProgress.total && (
                <div className="p-4 bg-green-50 rounded-ant border border-green-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h3 className="text-body font-medium text-green-900">移动完成</h3>
                  </div>
                  <div className="space-y-2 text-caption text-gray-700">
                    <div className="flex items-center justify-between">
                      <span>成功移动：</span>
                      <span className="font-medium text-green-600">{moveProgress.movedFiles.length} 个文件</span>
                    </div>
                    {moveProgress.failedFiles.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span>失败：</span>
                        <span className="font-medium text-red-600">{moveProgress.failedFiles.length} 个文件</span>
                      </div>
                    )}
                    {moveProgress.startTime && (
                      <div className="flex items-center justify-between">
                        <span>总用时：</span>
                        <span className="font-medium">{((Date.now() - moveProgress.startTime) / 1000).toFixed(1)} 秒</span>
                      </div>
                    )}
                  </div>
                  {moveProgress.failedFiles.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <p className="text-caption text-gray-600 mb-1">失败的文件：</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {moveProgress.failedFiles.map((f, idx) => (
                          <p key={idx} className="text-caption text-red-600">
                            • {f.filename}: {f.error}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setShowMoveModal(false)
                      setMovingFile(null)
                      setTargetKB('')
                      setMoveProgress({
                        current: 0,
                        total: 0,
                        currentFile: '',
                        startTime: null,
                        movedFiles: [],
                        failedFiles: []
                      })
                    }}
                    className="btn-ant w-full mt-4 ripple"
                  >
                    关闭
                  </button>
                </div>
              )}

              {!moving && (
                <>
                  <div>
                    <label className="block text-body mb-2">选择目标知识库</label>
                    <select
                      value={targetKB}
                      onChange={(e) => setTargetKB(e.target.value)}
                      className="input-ant w-full"
                      disabled={moving}
                    >
                      <option value="">请选择目标知识库</option>
                      {kbList
                        .filter(kb => !movingFile || kb.name !== movingFile.kb_name)
                        .map((kb) => (
                          <option key={kb.name} value={kb.name}>
                            {kb.name} ({kb.file_count}个文件, {kb.total_size_mb}MB)
                          </option>
                        ))}
                    </select>
                    {targetKB && (
                      <p className="text-caption text-gray-500 mt-2">
                        目标知识库：{kbList.find(kb => kb.name === targetKB)?.total_size_mb || 0}MB / {MAX_KB_SIZE_MB}MB
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={confirmMove}
                      disabled={moving || !targetKB}
                      className="btn-ant flex-1 ripple"
                    >
                      {moving ? '移动中...' : '确认移动'}
                    </button>
                    <button
                      onClick={() => {
                        setShowMoveModal(false)
                        setMovingFile(null)
                        setTargetKB('')
                        setMoveProgress({
                          current: 0,
                          total: 0,
                          currentFile: '',
                          startTime: null,
                          movedFiles: [],
                          failedFiles: []
                        })
                      }}
                      className="btn-ant-secondary flex-1 ripple"
                    >
                      取消
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 搜索栏和筛选器 */}
      <div className="card-material space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-ant pl-10 pr-4"
              placeholder="搜索文件名..."
            />
            {/* 知识库选择图标 - 放在搜索栏下方右侧 */}
            <div className="absolute right-0 top-full mt-2 kb-selector-container">
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
                title="选择知识库"
              >
                <Database className="w-4 h-4 text-gray-400" />
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
                    </div>
                  </div>
                  {kbList.length === 0 ? (
                    <div className="p-4 text-caption text-gray-500 text-center">
                      暂无知识库
                    </div>
                  ) : (
                    <div className="p-2">
                      {kbList.map((kb) => (
                        <button
                          key={kb.name}
                          onClick={() => {
                            setCurrentKB(kb.name)
                            setShowKbSelector(false)
                            fetchFiles()
                          }}
                          className={`w-full text-left p-2 rounded-ant hover:bg-gray-50 ${
                            currentKB === kb.name ? 'bg-primary-50 text-primary-700' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-body text-gray-800">{kb.name}</span>
                            <span className="text-caption text-gray-500">
                              ({kb.file_count}个文件, {kb.total_size_mb}MB)
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {filteredFiles.length > 0 && (
            <>
              <button
                onClick={handleToggleSelectAll}
                className="btn-ant-secondary flex items-center space-x-2 ripple whitespace-nowrap"
                title={isAllSelected ? '取消全选' : '全选'}
              >
                {isAllSelected ? (
                  <>
                    <CheckSquare className="w-5 h-5" />
                    <span>取消全选</span>
                  </>
                ) : (
                  <>
                    <Square className="w-5 h-5" />
                    <span>全选</span>
                  </>
                )}
              </button>
              {selectedItems.length > 0 && (
                <>
                  <button
                    onClick={handleBatchAnalyze}
                    className="btn-ant-secondary flex items-center space-x-2 ripple whitespace-nowrap bg-purple-50 text-purple-600 hover:bg-purple-100"
                  >
                    <BarChart3 className="w-5 h-5" />
                    <span>批量分析 ({selectedItems.length})</span>
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    className="btn-ant-secondary flex items-center space-x-2 ripple whitespace-nowrap bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>批量删除 ({selectedItems.length})</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
        
        {/* 筛选器 */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-caption text-gray-600">类型：</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input-ant text-sm py-1"
            >
              <option value="all">全部</option>
              <option value="txt">文本 (txt/md)</option>
              <option value="pdf">PDF</option>
              <option value="xlsx">Excel (xlsx/xls)</option>
              <option value="csv">CSV</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-caption text-gray-600">时间：</span>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="input-ant text-sm py-1"
            >
              <option value="all">全部</option>
              <option value="today">今天</option>
              <option value="week">最近一周</option>
              <option value="month">最近一月</option>
            </select>
            <span className="text-caption text-gray-600 ml-4">排序：</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="input-ant text-sm py-1"
            >
              <option value="desc">最新在前</option>
              <option value="asc">最旧在前</option>
            </select>
          </div>
          <div className="text-caption text-gray-500 ml-auto">
            共 {filteredFiles.length} 个文件
          </div>
        </div>
      </div>

      {/* 文件列表 */}
      {loading ? (
        <div className="card-material text-center py-12">
          <Loader className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-body text-gray-600">加载中...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="card-material text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-body text-gray-600 mb-2">目前还没有上传的文件</p>
          <p className="text-caption text-gray-500">点击"上传文件"按钮开始上传文件到知识库</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFiles.map((file, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
              className="card-tailwind group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(file.filename)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems([...selectedItems, file.filename])
                        } else {
                          setSelectedItems(selectedItems.filter(name => name !== file.filename))
                        }
                      }}
                      className="w-4 h-4 text-primary-500 rounded-ant border-gray-300 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <h3 className="text-title text-lg">{file.filename}</h3>
                      {(file.tags || file.source || file.metadata?.source) && (
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          {file.tags && (
                            <span className="flex items-center space-x-1">
                              <span className="text-gray-400">标签:</span>
                              <span>{file.tags}</span>
                            </span>
                          )}
                          {(file.source || file.metadata?.source) && (
                            <span className="flex items-center space-x-1">
                              <span className="text-gray-400">来源:</span>
                              <span>{file.source || file.metadata?.source}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-caption text-gray-600">
                    <div className="flex items-center space-x-1">
                      <FileText className="w-4 h-4" />
                      <span>{file.size_mb}MB</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(file.modified).toLocaleString('zh-CN')}</span>
                    </div>
                    <span className="text-gray-500">知识库: {file.kb_name}</span>
                  </div>
                </div>
                       <div className="flex items-center space-x-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                         {selectedItems.length > 0 && (
                           <button
                             onClick={handleBatchAnalyze}
                             className="p-2 rounded-ant hover:bg-purple-50 text-purple-500 transition-colors"
                             title="批量分析选中的文件"
                           >
                             <BarChart3 className="w-4 h-4" />
                           </button>
                         )}
                         <button
                           onClick={() => handleAnalyzeDocument(file)}
                           className="p-2 rounded-ant hover:bg-purple-50 text-purple-500 transition-colors"
                           title="分析文档"
                         >
                           <BarChart3 className="w-4 h-4" />
                         </button>
                         <button
                           onClick={() => handleViewFile(file, file.kb_name)}
                           className="p-2 rounded-ant hover:bg-primary-50 text-primary-500 transition-colors"
                           title="查看"
                         >
                           <Eye className="w-4 h-4" />
                         </button>
                         <button
                           onClick={() => handleEditMetadata(file)}
                           className="p-2 rounded-ant hover:bg-green-50 text-green-500 transition-colors"
                           title="编辑文件"
                         >
                           <Edit2 className="w-4 h-4" />
                         </button>
                         <button
                           onClick={() => handleMoveFile(file, file.kb_name)}
                           className="p-2 rounded-ant hover:bg-blue-50 text-blue-500 transition-colors"
                           title="移动到其他知识库"
                         >
                           <ArrowRight className="w-4 h-4" />
                         </button>
                         <button
                           onClick={() => handleDeleteFile(file, file.kb_name)}
                           className="p-2 rounded-ant hover:bg-red-50 text-red-500 transition-colors"
                           title="删除"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 编辑元数据弹窗 */}
      {showEditModal && editingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-ant-lg p-6 max-w-md w-full mx-4 card-material">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-title text-xl">编辑文件</h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingFile(null)
                  setEditTags('')
                  setEditSource('')
                }}
                className="p-1 hover:bg-gray-100 rounded-ant transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-body mb-2">文件名</label>
                <input
                  type="text"
                  value={editingFile.filename}
                  disabled
                  className="input-ant w-full bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-body mb-2">标签（用逗号分隔）</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="input-ant w-full"
                  placeholder="例如：数据分析,Python,机器学习"
                />
              </div>
              <div>
                <label className="block text-body mb-2">来源</label>
                <input
                  type="text"
                  value={editSource}
                  onChange={(e) => setEditSource(e.target.value)}
                  className="input-ant w-full"
                  placeholder="例如：文件上传、RSS、网页抓取"
                />
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSaveMetadata}
                  className="btn-ant flex-1 ripple"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingFile(null)
                    setEditTags('')
                    setEditSource('')
                  }}
                  className="btn-ant-secondary flex-1 ripple"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
