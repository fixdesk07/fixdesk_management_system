import { supabase } from './supabaseClient'

export const getCustomers = async (search) => {
  let query = supabase.from('customers').select('*').order('created_at', { ascending: false })
  if (search) {
    const s = typeof search === 'string' ? search : search.search
    if (s) {
      query = query.or(`name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`)
    }
  }
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export const getCustomer = async (id) => {
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data
}

export const createCustomer = async (data) => {
  const { data: res, error } = await supabase.from('customers').insert([data]).select().single()
  if (error) throw new Error(error.message)
  return res
}

export const updateCustomer = async (id, data) => {
  const { data: res, error } = await supabase.from('customers').update(data).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return res
}

export const deleteCustomer = async (id) => {
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
