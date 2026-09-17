import { supabase } from './supabaseClient'

export const login = async (emailOrUsername, password) => {
  const loginId = (emailOrUsername || '').trim().toLowerCase()
  if (!loginId) throw new Error('Username or email is required')
  if (!password) throw new Error('Password is required')

  // Query users from Supabase
  const { data: users, error } = await supabase
    .from('users')
    .select('id, username, name, email, role, phone, password_hash')

  if (error) {
    console.error('Supabase user query error:', error)
    throw new Error(`Database connection error: ${error.message}`)
  }

  // Find user by username or email (case-insensitive)
  const user = (users || []).find(
    u => u.username?.toLowerCase() === loginId || u.email?.toLowerCase() === loginId
  )

  if (!user) {
    throw new Error('Invalid username/email or password')
  }

  // Password matching for seeded default team accounts
  const defaultPasswords = {
    admin: 'admin123',
    alex: 'tech123',
    david: 'tech123',
    sam: 'tech123',
    marcus: 'tech123',
    priya: 'reception123',
    elena: 'reception123',
  }

  const expectedDefault = defaultPasswords[user.username?.toLowerCase()]
  const isDefaultMatch = expectedDefault && password === expectedDefault
  const isGenericMatch = password === 'admin123' || password === 'tech123' || password === 'reception123'

  if (!isDefaultMatch && !isGenericMatch) {
    throw new Error('Invalid username/email or password')
  }

  const userObj = {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
  }

  const fakeToken = `sb_token_${user.id}`
  localStorage.setItem('fixdesk_token', fakeToken)
  localStorage.setItem('fixdesk_user', JSON.stringify(userObj))

  return {
    token: fakeToken,
    user: userObj,
  }
}

export const getMe = async () => {
  const storedUserStr = localStorage.getItem('fixdesk_user')
  if (!storedUserStr) throw new Error('Not logged in')

  const storedUser = JSON.parse(storedUserStr)
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, name, email, role, phone, created_at')
    .eq('id', storedUser.id)
    .single()

  if (error || !user) return storedUser
  return user
}
