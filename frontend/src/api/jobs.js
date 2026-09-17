import { supabase } from './supabaseClient'

export const getJobs = async (params) => {
  const options = typeof params === 'string' ? { status: params } : (params || {})
  let query = supabase
    .from('service_jobs')
    .select(`
      *,
      customers ( name, phone, email ),
      staff ( name )
    `)
    .order('created_at', { ascending: false })

  if (options.status) {
    query = query.eq('status', options.status)
  }

  if (options.search) {
    const s = options.search.trim().replace(/^#?job-?/i, '')
    query = query.or(`job_code.ilike.%${s}%,serial_number.ilike.%${s}%,device_model.ilike.%${s}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  // Map joined tables to match UI expectation (customer_name, customer_phone, technician_name)
  return data.map(job => ({
    ...job,
    customer_name: job.customers?.name || null,
    customer_phone: job.customers?.phone || null,
    customer_email: job.customers?.email || null,
    technician_name: job.staff?.name || job.technician || null,
  }))
}

export const getJob = async (id) => {
  const { data: job, error: jobErr } = await supabase
    .from('service_jobs')
    .select(`
      *,
      customers ( name, phone, email ),
      staff ( name )
    `)
    .or(`id.eq.${id},job_code.eq.${id}`)
    .single()

  if (jobErr) throw new Error(jobErr.message)

  const { data: parts, error: partsErr } = await supabase
    .from('job_parts')
    .select(`
      id, quantity_used, unit_price, part_id,
      parts ( name, part_number, quantity )
    `)
    .eq('job_id', job.id)

  if (partsErr) throw new Error(partsErr.message)

  const mappedParts = (parts || []).map(jp => ({
    id: jp.id,
    quantity_used: jp.quantity_used,
    unit_price: jp.unit_price,
    part_id: jp.part_id,
    part_name: jp.parts?.name || 'Spare Part',
    part_number: jp.parts?.part_number || '',
    stock_available: jp.parts?.quantity || 0,
  }))

  return {
    ...job,
    customer_name: job.customers?.name || null,
    customer_phone: job.customers?.phone || null,
    customer_email: job.customers?.email || null,
    technician_name: job.staff?.name || job.technician || null,
    parts: mappedParts,
  }
}

export const createJob = async (jobData) => {
  const custPayload = jobData.customer || jobData.new_customer || {}
  const { data, error } = await supabase.rpc('create_job_with_code', {
    p_customer_id: jobData.customer_id || null,
    p_customer_name: custPayload.name || null,
    p_customer_phone: custPayload.phone || null,
    p_customer_email: custPayload.email || null,
    p_customer_address: custPayload.address || null,
    p_customer_notes: custPayload.notes || null,
    p_device_type: jobData.device_type,
    p_device_brand: jobData.device_brand,
    p_device_model: jobData.device_model,
    p_serial_number: jobData.serial_number,
    p_problem_description: jobData.problem_description || null,
    p_technician: jobData.technician || null,
    p_technician_id: jobData.technician_id || null,
    p_estimated_cost: jobData.estimated_cost !== undefined && jobData.estimated_cost !== '' ? parseFloat(jobData.estimated_cost) : null,
    p_status: jobData.status || 'Received',
  })

  if (error) throw new Error(error.message)
  return data
}

export const updateJob = async (id, jobData) => {
  const payload = {
    customer_id: jobData.customer_id,
    device_type: jobData.device_type,
    device_brand: jobData.device_brand,
    device_model: jobData.device_model,
    serial_number: jobData.serial_number,
    problem_description: jobData.problem_description || null,
    status: jobData.status,
    technician: jobData.technician || null,
    technician_id: jobData.technician_id || null,
    estimated_cost: jobData.estimated_cost !== undefined && jobData.estimated_cost !== '' ? parseFloat(jobData.estimated_cost) : null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('service_jobs')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export const patchStatus = async (id, status) => {
  const { data, error } = await supabase
    .from('service_jobs')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export const deleteJob = async (id) => {
  const { error } = await supabase.rpc('delete_job_with_stock_restoration', { p_job_id: id })
  if (error) throw new Error(error.message)
}

export const addJobPart = async (jobId, data) => {
  const { data: res, error } = await supabase.rpc('add_job_part_with_stock', {
    p_job_id: jobId,
    p_part_id: data.part_id,
    p_quantity: parseInt(data.quantity_used || 1, 10),
    p_unit_price: parseFloat(data.unit_price || 0),
  })

  if (error) throw new Error(error.message)
  return res
}

export const removeJobPart = async (jobId, jpId) => {
  const { error } = await supabase.rpc('remove_job_part_with_stock', { p_jp_id: jpId })
  if (error) throw new Error(error.message)
}

// Real-time subscription listener helper
export const subscribeJobs = (onUpdate) => {
  const channel = supabase
    .channel('public:service_jobs')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'service_jobs' }, (payload) => {
      onUpdate(payload)
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
