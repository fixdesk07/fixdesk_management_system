import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wrench, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useAuthRole } from '../context/AuthRoleContext'
import { useToast } from '../context/ToastContext'

export default function Login() {
  const toast = useToast()
  const navigate = useNavigate()
  const { loginUser, isAuthenticated, user } = useAuthRole()

  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // If already authenticated, redirect to appropriate role portal
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'Technician') {
        navigate('/technician', { replace: true })
      } else if (user.role === 'Receptionist') {
        navigate('/jobs', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    }
  }, [isAuthenticated, user, navigate])

  async function handleLogin(e) {
    e.preventDefault()

    if (!loginId.trim() || !password) {
      toast('Please enter username and password', 'error')
      return
    }

    setSubmitting(true)
    try {
      const loggedUser = await loginUser(loginId.trim(), password)
      toast(`Welcome back, ${loggedUser.name}!`, 'success')

      // Redirect based on role
      if (loggedUser.role === 'Technician') {
        navigate('/technician', { replace: true })
      } else if (loggedUser.role === 'Receptionist') {
        navigate('/jobs', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (err) {
      toast(err.message || 'Invalid username or password', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 20%, #1e293b 0%, #0f172a 60%, #090d16 100%)',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'rgba(30, 41, 59, 0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 'var(--r-lg, 14px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          padding: '40px 32px',
        }}
      >
        {/* Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 'var(--r-md, 12px)',
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 10px 20px -5px rgba(59, 130, 246, 0.5)',
              marginBottom: 16,
            }}
          >
            <Wrench size={28} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary, #f8fafc)', letterSpacing: '-0.03em' }}>
            FixDesk
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)', marginTop: 4 }}>
            Shop Management &amp; Workshop System
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.82rem' }}>Username or Email</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                type="text"
                placeholder="Enter your username or email"
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
                style={{ paddingLeft: 38 }}
                autoComplete="username"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.82rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingLeft: 38, paddingRight: 38 }}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '12px',
              fontSize: '0.92rem',
              fontWeight: 700,
              marginTop: 8,
            }}
          >
            {submitting ? 'Authenticating…' : 'Sign In'} <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          FixDesk Shop Management &middot; Secure Login
        </div>
      </div>
    </div>
  )
}
