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
  const { data: res, error } = await supabase.from('staff').insert([data]).select().single()
  if (error) throw new Error(error.message)
  return res
}

export const updateStaffMember = async (id, data) => {
  const { data: res, error } = await supabase.from('staff').update(data).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return res
}

export const deleteStaffMember = async (id) => {
  const { error } = await supabase.from('staff').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
