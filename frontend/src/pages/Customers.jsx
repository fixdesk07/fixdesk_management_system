import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  User,
  Phone,
  Mail,
  MapPin,
  Eye,
  Wrench,
  FileText,
  CheckCircle,
  Clock,
  ChevronRight,
  Calendar,
  AlertCircle,
  Smartphone,
  CreditCard
} from 'lucide-react'
import { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer } from '../api/customers'
import { useToast } from '../context/ToastContext'
import StatusBadge from '../components/StatusBadge'

const EMPTY = { name: '', phone: '', email: '', address: '', notes: '' }

function CustomerModal({ customer, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(customer ? { ...customer } : { ...EMPTY })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) { toast('Name is required', 'error'); return }
    if (!form.phone.trim()) { toast('Phone is required', 'error'); return }
    setSaving(true)
    try {
      const saved = customer
        ? await updateCustomer(customer.id, form)
        : await createCustomer(form)
      toast(customer ? 'Customer updated' : 'Customer created', 'success')
      onSaved(saved)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{customer ? 'Edit Customer' : 'New Customer'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="John Doe" required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" required />
            </div>
            <div className="form-group">
              <label className="form-label">Email <span className="optional">(optional)</span></label>
              <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Address <span className="optional">(optional)</span></label>
              <input className="form-input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St" />
            </div>
            <div className="form-group form-grid-full">
              <label className="form-label">Notes <span className="optional">(optional)</span></label>
              <textarea className="form-textarea" value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes…" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : customer ? 'Save Changes' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CustomerDetailDrawer({ customerId, onClose, onEdit }) {
  const toast = useToast()
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const data = await getCustomer(customerId)
      setCustomer(data)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [customerId, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="drawer-overlay" onClick={onClose}>
        <div className="drawer" onClick={e => e.stopPropagation()} style={{ width: 680 }}>
          <div className="spinner-wrap"><div className="spinner" /></div>
        </div>
      </div>
    )
  }

  if (!customer) return null

  const jobs = customer.jobs || []
  const invoices = customer.invoices || []
  const totalSpent = parseFloat(customer.total_spent || 0)

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()} style={{ width: 720, maxWidth: '95vw' }}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: '1.1rem',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              }}
            >
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="drawer-title" style={{ fontSize: '1.25rem' }}>{customer.name}</span>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Customer since {new Date(customer.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onEdit(customer)}
              style={{ gap: 6 }}
            >
              <Pencil size={14} /> Edit Profile
            </button>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Quick Metrics Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
            }}
          >
            <div
              style={{
                background: 'var(--bg-card)',
                padding: '12px 14px',
                borderRadius: 'var(--r-md)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                <Wrench size={18} />
              </div>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{jobs.length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Repair Jobs</div>
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-card)',
                padding: '12px 14px',
                borderRadius: 'var(--r-md)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'rgba(34, 197, 94, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
                <CreditCard size={18} />
              </div>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--success)' }}>
                  ₹{totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Spend Paid</div>
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-card)',
                padding: '12px 14px',
                borderRadius: 'var(--r-md)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'rgba(168, 85, 247, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc' }}>
                <FileText size={18} />
              </div>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#c084fc' }}>{invoices.length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Invoices</div>
              </div>
            </div>
          </div>

          {/* Contact Details Card */}
          <div>
            <span className="section-title">Contact &amp; Personal Info</span>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Phone Number</span>
                <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={13} color="var(--accent-light)" /> {customer.phone}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Email Address</span>
                <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {customer.email ? (
                    <>
                      <Mail size={13} color="var(--accent-light)" /> {customer.email}
                    </>
                  ) : '—'}
                </span>
              </div>
              <div className="info-item" style={{ gridColumn: 'span 2' }}>
                <span className="info-label">Address / Location</span>
                <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {customer.address ? (
                    <>
                      <MapPin size={13} color="var(--accent-light)" /> {customer.address}
                    </>
                  ) : '—'}
                </span>
              </div>
              {customer.notes && (
                <div className="info-item" style={{ gridColumn: 'span 2' }}>
                  <span className="info-label">Customer Notes</span>
                  <span className="info-value" style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                    "{customer.notes}"
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="divider" />

          {/* Service Jobs History Timeline */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Wrench size={16} color="var(--accent-light)" /> Service Jobs History ({jobs.length})
              </span>
            </div>

            {jobs.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  background: 'var(--bg-input, rgba(255,255,255,0.02))',
                  borderRadius: 'var(--r-md)',
                  border: '1px dashed var(--border)',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                }}
              >
                No service or repair jobs recorded for this customer yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {jobs.map(job => (
                  <div
                    key={job.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-md)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      transition: 'border-color var(--t-fast)',
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              color: 'var(--accent-light)',
                              background: 'rgba(59, 130, 246, 0.1)',
                              padding: '2px 6px',
                              borderRadius: 4,
                              border: '1px solid rgba(59, 130, 246, 0.2)',
                            }}
                          >
                            {job.job_code || `JOB-${job.id.substring(0, 8).toUpperCase()}`}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            {[job.device_brand, job.device_model].filter(Boolean).join(' ') || job.device_type}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: 'rgba(59, 130, 246, 0.12)',
                              color: '#60a5fa',
                              textTransform: 'uppercase',
                            }}
                          >
                            {job.device_type}
                          </span>
                        </div>
                        {job.serial_number && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'monospace' }}>
                            S/N: {job.serial_number}
                          </div>
                        )}
                      </div>
                      <StatusBadge status={job.status} />
                    </div>

                    {/* Problem Description */}
                    {job.problem_description && (
                      <div
                        style={{
                          fontSize: '0.82rem',
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-input, rgba(255,255,255,0.02))',
                          padding: '8px 10px',
                          borderRadius: 'var(--r-sm)',
                          borderLeft: '3px solid var(--accent)',
                        }}
                      >
                        <strong>Issue:</strong> {job.problem_description}
                      </div>
                    )}

                    {/* Metadata Footer Row */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        paddingTop: 8,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 14 }}>
                        <span>
                          <strong>Tech:</strong> {job.technician || 'Unassigned'}
                        </span>
                        {job.estimated_cost && (
                          <span>
                            <strong>Est. Cost:</strong> ₹{parseFloat(job.estimated_cost).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      <div>
                        {new Date(job.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>

                    {/* Linked Invoice status if generated */}
                    {job.invoice_id && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 10px',
                          borderRadius: 'var(--r-sm)',
                          background: job.invoice_status === 'Paid' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                          fontSize: '0.75rem',
                          border: `1px solid ${job.invoice_status === 'Paid' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                        }}
                      >
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-light)' }}>
                          INV-{job.invoice_id.substring(0, 8).toUpperCase()}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            ₹{parseFloat(job.invoice_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span style={{ fontWeight: 700, color: job.invoice_status === 'Paid' ? 'var(--success)' : 'var(--warning)' }}>
                            [{job.invoice_status}]
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invoices List if present */}
          {invoices.length > 0 && (
            <>
              <div className="divider" />
              <div>
                <span className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={16} color="#c084fc" /> Invoices &amp; Billing History ({invoices.length})
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {invoices.map(inv => (
                    <div
                      key={inv.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        borderRadius: 'var(--r-md)',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        fontSize: '0.82rem',
                      }}
                    >
                      <div>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-light)' }}>
                          INV-{inv.id.substring(0, 8).toUpperCase()}
                        </span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 10, fontSize: '0.75rem' }}>
                          {new Date(inv.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          ₹{parseFloat(inv.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </strong>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            background: inv.status === 'Paid' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: inv.status === 'Paid' ? '#4ade80' : '#fbbf24',
                            textTransform: 'uppercase',
                          }}
                        >
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Customers() {
  const toast = useToast()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'create' | customer obj
  const [detailCustomerId, setDetailCustomerId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setCustomers(await getCustomers(search))
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [search, toast])

  useEffect(() => { load() }, [load])

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete customer "${name}"? This cannot be undone.`)) return
    try {
      await deleteCustomer(id)
      toast('Customer deleted', 'success')
      setCustomers(prev => prev.filter(c => c.id !== id))
      if (detailCustomerId === id) setDetailCustomerId(null)
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  function handleSaved(saved) {
    setCustomers(prev => {
      const idx = prev.findIndex(c => c.id === saved.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n }
      return [saved, ...prev]
    })
    setModal(null)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">
            Manage customer records, track service history, and monitor lifetime spend.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>
          <Plus size={16} /> New Customer
        </button>
      </div>

      {/* Search */}
      <div className="toolbar">
        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input
            className="search-input"
            placeholder="Search by customer name, phone, or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : customers.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <User size={40} strokeWidth={1.2} />
            <p>{search ? 'No customers match your search.' : 'No customers yet. Add your first one!'}</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Address</th>
                <th>Jobs History</th>
                <th>Total Spent</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => {
                const jobsCount = parseInt(c.jobs_count || 0, 10)
                const spent = parseFloat(c.total_spent || 0)
                return (
                  <tr key={c.id}>
                    <td>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                        onClick={() => setDetailCustomerId(c.id)}
                        title="Click to view Customer Jobs History"
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: 'var(--accent-dim)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent)',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            flexShrink: 0,
                          }}
                        >
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                        <Phone size={13} /> {c.phone}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {c.email ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Mail size={13} /> {c.email}
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {c.address ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MapPin size={13} /> {c.address}
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setDetailCustomerId(c.id)}
                        className="btn btn-ghost btn-xs"
                        style={{
                          gap: 6,
                          background: jobsCount > 0 ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                          color: jobsCount > 0 ? '#60a5fa' : 'var(--text-muted)',
                          padding: '4px 10px',
                          borderRadius: 'var(--r-sm)',
                          fontWeight: 600,
                        }}
                        title="View Jobs History"
                      >
                        <Wrench size={13} /> {jobsCount} Job{jobsCount !== 1 ? 's' : ''}
                      </button>
                    </td>
                    <td>
                      {spent > 0 ? (
                        <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                          ₹{spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          title="View Profile & Jobs History"
                          onClick={() => setDetailCustomerId(c.id)}
                          style={{ color: 'var(--accent-light)' }}
                        >
                          <Eye size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm btn-icon" title="Edit Customer" onClick={() => setModal(c)}>
                          <Pencil size={14} />
                        </button>
                        <button className="btn btn-danger btn-sm btn-icon" title="Delete Customer" onClick={() => handleDelete(c.id, c.name)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Customer Edit/Create Modal */}
      {modal && (
        <CustomerModal
          customer={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Customer Jobs History & Profile Drawer */}
      {detailCustomerId && (
        <CustomerDetailDrawer
          customerId={detailCustomerId}
          onClose={() => setDetailCustomerId(null)}
          onEdit={(cust) => {
            setDetailCustomerId(null)
            setModal(cust)
          }}
        />
      )}
    </div>
  )
}
