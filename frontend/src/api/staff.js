import { supabase } from './supabaseClient'

export const getStaff = async (params = {}) => {
  let query = supabase.from('staff').select('*').order('created_at', { ascending: false })
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%,phone.ilike.%${params.search}%`)
  }
  if (params.role) {
    query = query.eq('role', params.role)
  }
  if (params.status) {
    query = query.eq('status', params.status)
  }
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export const getStaffMember = async (id) => {
  const { data, error } = await supabase.from('staff').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data
}

export const createStaffMember = async (data) => {
  const { password, ...staffFields } = data
  const cleanUsername = (data.username || '').trim().toLowerCase()
  const cleanEmail = data.email?.trim() ? data.email.trim().toLowerCase() : `${cleanUsername}@fixdesk.com`

  // 1. Create User account for login authentication
  const userId = crypto.randomUUID()
  const { error: userError } = await supabase.from('users').insert([{
    id: userId,
    username: cleanUsername,
    name: data.name.trim(),
    email: cleanEmail,
    password_hash: password || 'tech123',
    role: data.role || 'Technician',
    phone: data.phone?.trim() || null
  }])

  if (userError) {
    if (userError.message.includes('unique') || userError.message.includes('duplicate')) {
      throw new Error(`Username or email '${cleanUsername}' is already taken.`)
    }
    throw new Error(userError.message)
  }

  // 2. Create Staff record linked to user_id (without sending invalid 'password' field)
  const { data: res, error: staffError } = await supabase.from('staff').insert([{
    ...staffFields,
    user_id: userId,
    username: cleanUsername,
    email: cleanEmail
  }]).select().single()

  if (staffError) {
    // Clean up user account if staff insertion failed
    await supabase.from('users').delete().eq('id', userId)
    throw new Error(staffError.message)
  }

  return res
}

export const updateStaffMember = async (id, data) => {
  const { password, active_jobs_count, user_id, ...staffFields } = data
  const cleanUsername = staffFields.username ? staffFields.username.trim().toLowerCase() : undefined
  const cleanEmail = staffFields.email ? staffFields.email.trim().toLowerCase() : undefined

  const payload = {
    ...staffFields,
    ...(cleanUsername && { username: cleanUsername }),
    ...(cleanEmail && { email: cleanEmail }),
    updated_at: new Date().toISOString()
  }

  // 1. Update Staff table
  const { data: res, error: staffError } = await supabase
    .from('staff')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (staffError) throw new Error(staffError.message)

  // 2. Synchronize details with linked User login account
  if (res.user_id) {
    const userPayload = {
      name: res.name,
      username: res.username,
      email: res.email,
      phone: res.phone,
      role: res.role,
      updated_at: new Date().toISOString()
    }
    if (password && password.trim()) {
      userPayload.password_hash = password.trim()
    }
    await supabase.from('users').update(userPayload).eq('id', res.user_id)
  }

  return res
}

export const deleteStaffMember = async (id) => {
  // Fetch user_id first so we can remove user account
  const { data: staff } = await supabase.from('staff').select('user_id').eq('id', id).single()

  const { error } = await supabase.from('staff').delete().eq('id', id)
  if (error) throw new Error(error.message)

  if (staff?.user_id) {
    await supabase.from('users').delete().eq('id', staff.user_id)
  }
}
