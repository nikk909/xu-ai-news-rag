import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { UserPlus, Mail, Lock, Key, Loader, CheckCircle } from 'lucide-react'

export default function Register({ onRegister }) {
  const [step, setStep] = useState(1) // 1: 输入邮箱, 2: 输入验证码和密码
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [devCode, setDevCode] = useState('') // 开发模式验证码
  const navigate = useNavigate()

  const handleSendCode = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/auth/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setCodeSent(true)
        setStep(2)
        // 如果是开发模式，显示验证码
        if (data.code) {
          setDevCode(data.code)
        }
      } else {
        const errorMsg = data.error || '发送验证码失败'
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

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (password.length < 6) {
      setError('密码长度至少为6位')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, code }),
      })

      const data = await response.json()

      if (response.ok) {
        // 保存 token 到 localStorage
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        onRegister()
        navigate('/')
      } else {
        const errorMsg = data.error || '注册失败'
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
          <h1 className="text-title text-3xl mb-2">用户注册</h1>
          <p className="text-caption text-gray-600">创建您的账号</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border-2 border-red-400 rounded-ant text-red-700 text-sm font-medium animate-pulse">
            <div className="flex items-center space-x-2">
              <span className="text-red-600 font-bold">⚠</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {devCode && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-ant">
            <p className="text-sm text-yellow-800 mb-1">
              <strong>开发模式</strong> - 邮件服务未配置
            </p>
            <p className="text-sm text-yellow-700">
              验证码: <span className="font-bold text-lg">{devCode}</span>
            </p>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendCode} className="space-y-6">
            <div>
              <label className="block text-body text-sm font-medium mb-2 text-gray-700">
                邮箱地址
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-ant pl-10"
                  placeholder="请输入邮箱地址"
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
                  <span>发送中...</span>
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  <span>发送验证码</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label className="block text-body text-sm font-medium mb-2 text-gray-700">
                邮箱地址
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  className="input-ant pl-10 bg-gray-50"
                  disabled
                />
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
              </div>
            </div>

            <div>
              <label className="block text-body text-sm font-medium mb-2 text-gray-700">
                邮箱验证码
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="input-ant pl-10"
                  placeholder="请输入6位验证码"
                  maxLength={6}
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="mt-2 text-sm text-primary-500 hover:text-primary-600"
              >
                重新发送验证码
              </button>
            </div>

            <div>
              <label className="block text-body text-sm font-medium mb-2 text-gray-700">
                设置密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-ant pl-10"
                  placeholder="请设置密码（至少6位）"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-body text-sm font-medium mb-2 text-gray-700">
                确认密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-ant pl-10"
                  placeholder="请再次输入密码"
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
                  <span>注册中...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>完成注册</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-caption text-gray-500">
            已有账号？{' '}
            <Link to="/login" className="text-primary-500 hover:text-primary-600 font-medium">
              立即登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

