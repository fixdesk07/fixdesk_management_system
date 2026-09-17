import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, Wrench, ChevronDown, UserPlus, Users, Phone, User, Mail, MapPin } from 'lucide-react'
import { getJobs, createJob, updateJob, patchStatus, deleteJob } from '../api/jobs'
import { getCustomers, createCustomer } from '../api/customers'
import { getStaff } from '../api/staff'
import { getDeviceTypes } from '../api/devices'
import { useToast } from '../context/ToastContext'
import StatusBadge, { STATUS_MAP } from '../components/StatusBadge'
import SearchableBrandSelect, { DEVICE_TYPES } from '../components/SearchableBrandSelect'
import SearchableModelSelect from '../components/SearchableModelSelect'

const ALL_STATUSES = Object.keys(STATUS_MAP).filter(s => !['Unpaid','Paid'].includes(s))

const JOB_STATUSES = [
  'Received','Diagnosis','Waiting for Approval','Approved',
  'Repairing','Quality Check','Ready for Pickup','Completed',
  'Waiting for Parts','Unrepairable','Cancelled',
]

const DEFAULT_TECHNICIANS = [
  'Alex Carter',
  'David Miller',
  'Sam Wilson',
  'Marcus Vance',
]

const EMPTY_JOB = {
  customer_id: '', device_type: '', device_brand: '', device_model: '',
  serial_number: '', problem_description: '', technician: '', estimated_cost: '',
}

const EMPTY_NEW_CUSTOMER = {
  name: '',
  phone: '',
  email: '',
  address: '',
}

function JobModal({ job, customers, technicians = [], onClose, onSaved, onCustomerCreated }) {
  const toast = useToast()
  const techOptions = technicians.length > 0 ? technicians.map(t => t.name) : DEFAULT_TECHNICIANS
  const [dbTypes, setDbTypes] = useState([])

  useEffect(() => {
    getDeviceTypes().then(types => setDbTypes(types.map(t => t.name))).catch(() => {})
  }, [])

  const availableDeviceTypes = Array.from(new Set([...DEVICE_TYPES, ...dbTypes]))

  const [form, setForm] = useState(job ? {
    customer_id: job.customer_id || '',
    device_type: job.device_type || '',
    device_brand: job.device_brand || '',
    device_model: job.device_model || '',
    serial_number: job.serial_number || '',
    problem_description: job.problem_description || '',
    technician: job.technician || '',
    estimated_cost: job.estimated_cost || '',
    status: job.status || 'Received',
  } : { ...EMPTY_JOB, status: 'Received' })

  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [newCustomer, setNewCustomer] = useState(EMPTY_NEW_CUSTOMER)
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setNewCust = (k, v) => setNewCustomer(c => ({ ...c, [k]: v }))

  async function submit(e) {
    e.preventDefault()

    if (!job && isNewCustomer) {
      if (!newCustomer.name?.trim()) { toast('Customer full name is required', 'error'); return }
      if (!newCustomer.phone?.trim()) { toast('Customer phone number is required', 'error'); return }
    } else {
      if (!form.customer_id) { toast('Select a customer or add a new customer', 'error'); return }
    }

    if (!form.device_type?.trim()) { toast('Device type is required', 'error'); return }
    if (!form.device_brand?.trim()) { toast('Brand is required', 'error'); return }
    if (!form.device_model?.trim()) { toast('Model is required', 'error'); return }
    if (!form.serial_number?.trim()) { toast('Serial number is required', 'error'); return }
    if (!form.status) { toast('Status is required', 'error'); return }

    setSaving(true)
    try {
      let targetCustomerId = form.customer_id

      // If creating a new customer inline
      if (!job && isNewCustomer) {
        const createdCust = await createCustomer({
          name: newCustomer.name.trim(),
          phone: newCustomer.phone.trim(),
          email: newCustomer.email?.trim() || null,
          address: newCustomer.address?.trim() || null,
        })
        targetCustomerId = createdCust.id
        if (onCustomerCreated) {
          onCustomerCreated(createdCust)
        }
      }

      const payload = {
        ...form,
        customer_id: targetCustomerId,
        estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
      }

      const saved = job ? await updateJob(job.id, payload) : await createJob(payload)
      toast(job ? 'Job updated' : (isNewCustomer ? 'Customer & Job created successfully' : 'Job created'), 'success')
      onSaved(saved)
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <span className="modal-title">{job ? 'Edit Service Job' : 'New Service Job'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            {/* Customer Section */}
            <div className="form-group form-grid-full">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Customer <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                {!job && (
                  <button
                    type="button"
                    className="btn btn-xs"
                    style={{
                      gap: 5,
                      padding: '3px 10px',
                      fontSize: '0.75rem',
                      background: isNewCustomer ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-input)',
                      color: isNewCustomer ? 'var(--accent-light)' : 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-sm)',
                    }}
                    onClick={() => setIsNewCustomer(v => !v)}
                  >
                    {isNewCustomer ? (
                      <>
                        <Users size={13} /> Select Existing Customer
                      </>
                    ) : (
                      <>
                        <UserPlus size={13} color="var(--accent-light)" /> + Add New Customer
                      </>
                    )}
                  </button>
                )}
              </div>

              {!isNewCustomer ? (
                <select
                  className="form-select"
                  value={form.customer_id}
                  onChange={e => set('customer_id', e.target.value)}
                  required={!isNewCustomer}
                >
                  <option value="">— Select customer —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
                </select>
              ) : (
                <div
                  style={{
                    background: 'var(--bg-input, rgba(255,255,255,0.02))',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-light)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <UserPlus size={14} /> New Customer Information
                  </div>

                  <div className="form-grid" style={{ marginTop: 2 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>
                        Full Name <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <input
                        className="form-input"
                        placeholder="e.g. Rahul Sharma"
                        value={newCustomer.name}
                        onChange={e => setNewCust('name', e.target.value)}
                        required={isNewCustomer}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>
                        Phone Number <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <input
                        className="form-input"
                        placeholder="e.g. +91 98765 43210"
                        value={newCustomer.phone}
                        onChange={e => setNewCust('phone', e.target.value)}
                        required={isNewCustomer}
                      />
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="e.g. rahul@example.com"
                        value={newCustomer.email}
                        onChange={e => setNewCust('email', e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>
                        Address / Location (Optional)
                      </label>
                      <input
                        className="form-input"
                        placeholder="e.g. Sector 4, Bangalore"
                        value={newCustomer.address}
                        onChange={e => setNewCust('address', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Device Type <span style={{color:'var(--danger)'}}>*</span></label>
              <select
                className="form-select"
                value={form.device_type}
                onChange={e => set('device_type', e.target.value)}
                required
              >
                <option value="">— Select device type —</option>
                {availableDeviceTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
                {/* Support legacy/other device type if present */}
                {form.device_type && !availableDeviceTypes.includes(form.device_type) && (
                  <option value={form.device_type}>{form.device_type}</option>
                )}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Brand <span style={{color:'var(--danger)'}}>*</span></label>
              <SearchableBrandSelect
                value={form.device_brand}
                deviceType={form.device_type}
                onChange={brand => {
                  set('device_brand', brand)
                  // If brand changes and previous model doesn't belong, keep or clear
                }}
                placeholder="Select or search brand…"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Model <span style={{color:'var(--danger)'}}>*</span></label>
              <SearchableModelSelect
                value={form.device_model}
                brand={form.device_brand}
                deviceType={form.device_type}
                onChange={model => set('device_model', model)}
                placeholder="Select or search model…"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Serial Number <span style={{color:'var(--danger)'}}>*</span></label>
              <input
                className="form-input"
                value={form.serial_number}
                onChange={e => set('serial_number', e.target.value)}
                placeholder="e.g. SN12345678 or IMEI"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status <span style={{color:'var(--danger)'}}>*</span></label>
              <select
                className="form-select"
                value={form.status}
                onChange={e => set('status', e.target.value)}
                required
              >
                {JOB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Technician</label>
              <select
                className="form-select"
                value={form.technician}
                onChange={e => set('technician', e.target.value)}
              >
                <option value="">— Unassigned —</option>
                {techOptions.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
                {form.technician && !techOptions.includes(form.technician) && (
                  <option value={form.technician}>{form.technician}</option>
                )}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Estimated Cost (₹)</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.estimated_cost} onChange={e => set('estimated_cost', e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group form-grid-full">
              <label className="form-label">Problem Description</label>
              <textarea className="form-textarea" value={form.problem_description} onChange={e => set('problem_description', e.target.value)} placeholder="Describe the issue…" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : job ? 'Save Changes' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function StatusSelect({ job, onChanged }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function change(status) {
    setOpen(false)
    if (status === job.status) return
    setLoading(true)
    try {
      const updated = await patchStatus(job.id, status)
      toast(`Status → ${status}`, 'success')
      onChanged(updated)
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position:'relative', display:'inline-block' }}>
      <button
        className="btn btn-ghost btn-sm"
        style={{ gap:6, paddingRight:8 }}
        onClick={() => setOpen(o => !o)}
        disabled={loading}
      >
        <StatusBadge status={job.status} />
        <ChevronDown size={12} />
      </button>
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:200,
          background:'var(--bg-elevated)', border:'1px solid var(--border-light)',
          borderRadius:'var(--r-md)', overflow:'hidden', minWidth:200,
          boxShadow:'var(--shadow-lg)',
        }}>
          {JOB_STATUSES.map(s => (
            <button key={s}
              onClick={() => change(s)}
              style={{
                display:'block', width:'100%', textAlign:'left', padding:'9px 14px',
                background: s === job.status ? 'var(--accent-dim)' : 'transparent',
                color: s === job.status ? 'var(--accent-light)' : 'var(--text-secondary)',
                border:'none', fontSize:'0.82rem', cursor:'pointer',
                transition:'background var(--t-fast)',
              }}
              onMouseEnter={e => e.currentTarget.style.background='var(--bg-card)'}
              onMouseLeave={e => e.currentTarget.style.background = s === job.status ? 'var(--accent-dim)' : 'transparent'}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Jobs() {
  const toast = useToast()
  const [jobs, setJobs] = useState([])
  const [customers, setCustomers] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [j, c, staffMembers] = await Promise.all([
        getJobs(filter || undefined),
        getCustomers(),
        getStaff({ role: 'Technician', status: 'Active' }).catch(() => [])
      ])
      setJobs(j)
      setCustomers(c)
      // Filter strictly for staff members with Technician role
      const techs = staffMembers.filter(s => s.role === 'Technician')
      setTechnicians(techs)
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }, [filter, toast])

  useEffect(() => { load() }, [load])

  const cleanSearch = search.trim().toLowerCase()
  const strippedSearch = cleanSearch.replace(/^#?job-?/i, '')

  const displayed = cleanSearch
    ? jobs.filter(j => {
        const jCode = (j.job_code || '').toLowerCase()
        const jNum = String(j.job_number || '').padStart(4, '0')
        const fullId = (j.id || '').toLowerCase()
        const shortId = (j.id || '').substring(0, 8).toLowerCase()

        return (
          jCode.includes(cleanSearch) ||
          jCode.includes(strippedSearch) ||
          jNum.includes(strippedSearch) ||
          shortId.includes(strippedSearch) ||
          fullId.includes(cleanSearch) ||
          (j.serial_number && j.serial_number.toLowerCase().includes(strippedSearch))
        )
      })
    : jobs

  function handleSaved(saved) {
    setJobs(prev => {
      const idx = prev.findIndex(j => j.id === saved.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n }
      return [saved, ...prev]
    })
    setModal(null)
  }

  function handleStatusChange(updated) {
    setJobs(prev => prev.map(j => j.id === updated.id ? { ...j, ...updated } : j))
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this job? This cannot be undone.')) return
    try {
      await deleteJob(id)
      toast('Job deleted', 'success')
      setJobs(prev => prev.filter(j => j.id !== id))
    } catch (err) { toast(err.message, 'error') }
  }

  const filterList = ['', ...JOB_STATUSES]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Service Jobs</h1>
          <p className="page-subtitle">{displayed.length} job{displayed.length !== 1 ? 's' : ''}{filter ? ` — ${filter}` : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>
          <Plus size={16} /> New Job
        </button>
      </div>

      {/* Filters */}
      <div className="filter-chips">
        {filterList.map(s => (
          <button key={s} className={`chip${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}>
            {s || 'All Statuses'}
          </button>
        ))}
      </div>

      {/* Search Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input
            className="search-input"
            placeholder="Find by Job ID (e.g. JOB-0001, 0001, or #ID)…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {search && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setSearch('')}
            style={{ fontSize: '0.8rem' }}
          >
            Clear Search
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : displayed.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <Wrench size={40} strokeWidth={1.2} />
            <p>{search ? `No job found with ID matching "${search}".` : (filter ? `No jobs match status "${filter}".` : 'No jobs yet. Create the first one!')}</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Customer</th>
                <th>Device</th>
                <th>Status</th>
                <th>Technician</th>
                <th>Est. Cost</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(job => (
                <tr key={job.id}>
                  <td>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        color: 'var(--accent-light)',
                        background: 'rgba(59, 130, 246, 0.1)',
                        padding: '3px 8px',
                        borderRadius: 4,
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                      }}
                      title={`Full Job UUID: ${job.id}`}
                    >
                      {job.job_code || `JOB-${job.id.substring(0, 8).toUpperCase()}`}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{job.customer_name || '—'}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{job.device_type}</div>
                    {(job.device_brand || job.device_model) && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {[job.device_brand, job.device_model].filter(Boolean).join(' ')}
                      </div>
                    )}
                  </td>
                  <td>
                    <StatusSelect job={job} onChanged={handleStatusChange} />
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{job.technician || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {job.estimated_cost ? `₹${parseFloat(job.estimated_cost).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {new Date(job.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={() => setModal(job)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-danger btn-sm btn-icon" title="Delete" onClick={() => handleDelete(job.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <JobModal
          job={modal === 'create' ? null : modal}
          customers={customers}
          technicians={technicians}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
          onCustomerCreated={newCust => setCustomers(prev => [newCust, ...prev])}
        />
      )}
    </div>
  )
}
