import { createContext, useContext, useState, useEffect } from 'react'
import { getMe, login as apiLogin } from '../api/auth'

const AuthContext = createContext(null)

export function AuthRoleProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('fixdesk_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem('fixdesk_token') || '')
  const [loading, setLoading] = useState(true)

  // Verify token on mount
  useEffect(() => {
    async function verify() {
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const profile = await getMe()
        setUser(profile)
        localStorage.setItem('fixdesk_user', JSON.stringify(profile))
      } catch (err) {
        console.warn('Session verification failed:', err.message)
        setToken('')
        setUser(null)
        localStorage.removeItem('fixdesk_token')
        localStorage.removeItem('fixdesk_user')
      } finally {
        setLoading(false)
      }
    }
    verify()
  }, [token])

  async function loginUser(email, password) {
    const res = await apiLogin(email, password)
    setToken(res.token)
    setUser(res.user)
    localStorage.setItem('fixdesk_token', res.token)
    localStorage.setItem('fixdesk_user', JSON.stringify(res.user))
    return res.user
  }

  function logoutUser() {
    setToken('')
    setUser(null)
    localStorage.removeItem('fixdesk_token')
    localStorage.removeItem('fixdesk_user')
  }

  const role = user?.role || ''

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        currentRole: role,
        loginUser,
        logoutUser,
        isAuthenticated: !!user && !!token,
        isAdmin: role === 'Admin',
        isTechnician: role === 'Technician',
        isReceptionist: role === 'Receptionist',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthRole = () => useContext(AuthContext)
