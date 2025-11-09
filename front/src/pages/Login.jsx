import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LogIn, Mail, Lock, Loader } from 'lucide-react'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        // 保存 token 到 localStorage
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        onLogin()
        navigate('/')
      } else {
        const errorMsg = data.error || '登录失败'
        setError(errorMsg)
        // 添加alert弹窗提示
        alert(errorMsg)
      }
    } catch (err) {
      setError('网络错误，请检查后端服务是否启动')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <div className="card-material w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-ant-lg mx-auto mb-4 flex items-center justify-center shadow-material">
            <span className="text-white font-bold text-2xl">X</span>
          </div>
          <h1 className="text-title text-3xl mb-2">XU-News-AI-RAG</h1>
          <p className="text-caption text-gray-600">个性化新闻智能知识库</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border-2 border-red-400 rounded-ant text-red-700 text-sm font-medium animate-pulse">
            <div className="flex items-center space-x-2">
              <span className="text-red-600 font-bold">⚠</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-body text-sm font-medium mb-2 text-gray-700">
              邮箱
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-ant pl-10"
                placeholder="请输入邮箱"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-body text-sm font-medium mb-2 text-gray-700">
              密码
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-ant pl-10"
                placeholder="请输入密码"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-ant w-full ripple flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>登录中...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>登录</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-caption text-gray-500">
            还没有账号？{' '}
            <Link to="/register" className="text-primary-500 hover:text-primary-600 font-medium">
              立即注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

