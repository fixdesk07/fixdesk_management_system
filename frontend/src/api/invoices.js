import { supabase } from './supabaseClient'

export const getInvoices = async (params = {}) => {
  let query = supabase
    .from('invoices')
    .select(`
      *,
      customers ( name, phone, email ),
      service_jobs ( job_code, device_type, device_model, device_brand, serial_number )
    `)
    .order('issued_at', { ascending: false })

  if (params.status) {
    query = query.eq('status', params.status)
  }

  if (params.search) {
    const s = params.search.trim()
    query = query.or(`id.ilike.%${s}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return data.map(inv => ({
    ...inv,
    customer_name: inv.customers?.name || null,
    customer_phone: inv.customers?.phone || null,
    customer_email: inv.customers?.email || null,
    job_code: inv.service_jobs?.job_code || null,
    device_type: inv.service_jobs?.device_type || null,
    device_model: inv.service_jobs?.device_model || null,
    device_brand: inv.service_jobs?.device_brand || null,
    serial_number: inv.service_jobs?.serial_number || null,
  }))
}

export const getInvoice = async (id) => {
  const { data: inv, error: invErr } = await supabase
    .from('invoices')
    .select(`
      *,
      customers ( name, phone, email, address ),
      service_jobs ( job_code, device_type, device_model, device_brand, serial_number, problem_description, technician )
    `)
    .eq('id', id)
    .single()

  if (invErr) throw new Error(invErr.message)

  const { data: items, error: itemsErr } = await supabase
    .from('invoice_items')
    .select(`
      *,
      parts ( part_number, name )
    `)
    .eq('invoice_id', id)
    .order('created_at', { ascending: true })

  if (itemsErr) throw new Error(itemsErr.message)

  const mappedItems = (items || []).map(item => ({
    ...item,
    part_number: item.parts?.part_number || '',
    part_name: item.parts?.name || '',
  }))

  return {
    ...inv,
    customer_name: inv.customers?.name || null,
    customer_phone: inv.customers?.phone || null,
    customer_email: inv.customers?.email || null,
    customer_address: inv.customers?.address || null,
    job_code: inv.service_jobs?.job_code || null,
    device_type: inv.service_jobs?.device_type || null,
    device_model: inv.service_jobs?.device_model || null,
    device_brand: inv.service_jobs?.device_brand || null,
    serial_number: inv.service_jobs?.serial_number || null,
    problem_description: inv.service_jobs?.problem_description || null,
    technician: inv.service_jobs?.technician || null,
    items: mappedItems,
    parts: mappedItems.filter(it => it.is_part),
  }
}

export const createInvoice = async (data) => {
  const { data: res, error } = await supabase.rpc('create_invoice_transaction', {
    p_job_id: data.job_id || null,
    p_customer_id: data.customer_id || null,
    p_labor_cost: data.labor_cost !== undefined ? parseFloat(data.labor_cost) : 0,
    p_items: data.items && data.items.length > 0 ? data.items : [],
    p_tax_rate: parseFloat(data.tax_rate || 0),
    p_discount_type: data.discount_type || 'fixed',
    p_discount_value: parseFloat(data.discount_amount !== undefined ? data.discount_amount : (data.discount_rate || 0)),
    p_status: data.status || 'Unpaid',
  })

  if (error) throw new Error(error.message)
  return res
}

export const payInvoice = async (id) => {
  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'Paid', paid_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export const cancelInvoice = async (id) => {
  const { error } = await supabase.rpc('cancel_invoice_transaction', { p_invoice_id: id })
  if (error) throw new Error(error.message)
}

export const deleteInvoice = async (id) => {
  const { error } = await supabase.rpc('delete_invoice_with_stock_restoration', { p_invoice_id: id })
  if (error) throw new Error(error.message)
}

export const getStats = async () => {
  const [openJobsRes, lowStockRes, unpaidInvRes, totalRevRes] = await Promise.all([
    supabase.from('service_jobs').select('id', { count: 'exact' }).not('status', 'in', '("Completed","Cancelled")'),
    supabase.from('parts').select('id, quantity, min_quantity'),
    supabase.from('invoices').select('id', { count: 'exact' }).eq('status', 'Unpaid'),
    supabase.from('invoices').select('total').eq('status', 'Paid'),
  ])

  const openJobs = openJobsRes.count || 0
  const unpaidInvoices = unpaidInvRes.count || 0
  const lowStockParts = (lowStockRes.data || []).filter(p => p.quantity <= p.min_quantity).length
  const totalRevenue = (totalRevRes.data || []).reduce((acc, inv) => acc + (parseFloat(inv.total) || 0), 0)

  return { openJobs, lowStockParts, unpaidInvoices, totalRevenue }
}

export const getRecent = async () => {
  const { data, error } = await supabase
    .from('service_jobs')
    .select(`
      id, device_type, device_model, status, created_at,
      customers ( name )
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) throw new Error(error.message)

  return data.map(job => ({
    ...job,
    customer_name: job.customers?.name || null,
  }))
}
