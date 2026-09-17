import { supabase } from './supabaseClient'

export const getDeviceCatalog = async () => {
  const [typesRes, brandsRes, modelsRes] = await Promise.all([
    supabase.from('device_types').select('*').order('name'),
    supabase.from('device_brands').select('*').order('name'),
    supabase.from('device_models').select('*').order('name')
  ])

  if (typesRes.error) throw new Error(typesRes.error.message)
  if (brandsRes.error) throw new Error(brandsRes.error.message)
  if (modelsRes.error) throw new Error(modelsRes.error.message)

  return {
    types: typesRes.data,
    brands: brandsRes.data,
    models: modelsRes.data
  }
}

// Types
export const getDeviceTypes = async () => {
  const { data, error } = await supabase.from('device_types').select('*').order('name')
  if (error) throw new Error(error.message)
  return data
}

export const createDeviceType = async (data) => {
  const { data: res, error } = await supabase.from('device_types').insert([data]).select().single()
  if (error) throw new Error(error.message)
  return res
}

export const deleteDeviceType = async (id) => {
  const { error } = await supabase.from('device_types').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// Brands
export const getDeviceBrands = async (params = {}) => {
  let query = supabase.from('device_brands').select('*').order('name')
  if (params.device_type) query = query.eq('device_type', params.device_type)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export const createDeviceBrand = async (data) => {
  const { data: res, error } = await supabase.from('device_brands').insert([data]).select().single()
  if (error) throw new Error(error.message)
  return res
}

export const deleteDeviceBrand = async (id) => {
  const { error } = await supabase.from('device_brands').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// Models
export const getDeviceModels = async (params = {}) => {
  let query = supabase.from('device_models').select('*').order('name')
  if (params.brand) query = query.eq('brand', params.brand)
  if (params.device_type) query = query.eq('device_type', params.device_type)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export const createDeviceModel = async (data) => {
  const { data: res, error } = await supabase.from('device_models').insert([data]).select().single()
  if (error) throw new Error(error.message)
  return res
}

export const deleteDeviceModel = async (id) => {
  const { error } = await supabase.from('device_models').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
