import { supabase } from './supabaseClient'

export const getParts = async (search) => {
  let query = supabase.from('parts').select('*').order('created_at', { ascending: false })
  if (search) {
    const s = typeof search === 'string' ? search : search.search
    if (s) {
      query = query.or(`name.ilike.%${s}%,part_number.ilike.%${s}%,compatible_models.ilike.%${s}%`)
    }
  }
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export const getPart = async (id) => {
  const { data, error } = await supabase.from('parts').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data
}

export const createPart = async (data) => {
  const { data: res, error } = await supabase.from('parts').insert([data]).select().single()
  if (error) throw new Error(error.message)
  return res
}

export const updatePart = async (id, data) => {
  const { data: res, error } = await supabase.from('parts').update(data).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return res
}

export const deletePart = async (id) => {
  const { error } = await supabase.from('parts').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
