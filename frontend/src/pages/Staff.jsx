import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, UserCheck, Phone, Mail, Wrench, Shield, Briefcase, UserX } from 'lucide-react'
import { getStaff, createStaffMember, updateStaffMember, deleteStaffMember } from '../api/staff'
import { useToast } from '../context/ToastContext'

const ROLES = ['Technician', 'Receptionist', 'Manager']
const STATUSES = ['Active', 'On Leave', 'Inactive']

const EMPTY_STAFF = {
  name: '',
  username: '',
  password: '',
  phone: '',
  email: '',
  role: 'Technician',
  specialization: '',
  status: 'Active',
  notes: ''
}

function RoleBadge({ role }) {
  const styles = {
    Manager: { bg: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.25)', icon: Briefcase },
    Technician: { bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.25)', icon: Wrench },
    Receptionist: { bg: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: 'rgba(16, 185, 129, 0.25)', icon: UserCheck },
  }

  const s = styles[role] || styles.Technician
  const Icon = s.icon

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: 99,
        fontSize: '0.72rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      <Icon size={11} /> {role}
    </span>
  )
}

function StatusBadge({ status }) {
  const isGood = status === 'Active'
  const isLeave = status === 'On Leave'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: 99,
        fontSize: '0.72rem',
        fontWeight: 700,
        background: isGood ? 'rgba(34, 197, 94, 0.12)' : isLeave ? 'rgba(245, 158, 11, 0.12)' : 'rgba(107, 114, 128, 0.12)',
        color: isGood ? '#4ade80' : isLeave ? '#fbbf24' : '#9ca3af',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
      {status}
    </span>
  )
}

function StaffModal({ staff, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(staff ? { ...staff, password: '' } : { ...EMPTY_STAFF })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) { toast('Full name is required', 'error'); return }
    if (!form.username.trim()) { toast('Username is required for portal login', 'error'); return }
    if (!staff && (!form.password || form.password.length < 3)) {
      toast('Password must be at least 3 characters', 'error'); return
    }
    if (!form.phone.trim()) { toast('Phone number is required', 'error'); return }
    if (!form.role) { toast('Role is required', 'error'); return }

    setSaving(true)
    try {
      const saved = staff
        ? await updateStaffMember(staff.id, form)
        : await createStaffMember(form)
      toast(staff ? 'Staff details updated' : `Staff added! Login: ${form.username}`, 'success')
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
          <span className="modal-title">{staff ? 'Edit Staff Member' : 'Add New Staff Member'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                className="form-input"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Marcus Vance"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Username (for Portal Login) <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                className="form-input"
                value={form.username || ''}
                onChange={e => set('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="e.g. marcus"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Password {staff ? <span className="optional">(leave blank to keep unchanged)</span> : <span style={{ color: 'var(--danger)' }}>*</span>}
              </label>
              <input
                className="form-input"
                type="password"
                value={form.password || ''}
                onChange={e => set('password', e.target.value)}
                placeholder={staff ? '••••••••' : 'Set portal password'}
                required={!staff}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                className="form-input"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+91 98765 43210"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address <span className="optional">(optional)</span></label>
              <input
                className="form-input"
                type="email"
                value={form.email || ''}
                onChange={e => set('email', e.target.value)}
                placeholder="name@fixdesk.com"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Role <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select
                className="form-select"
                value={form.role}
                onChange={e => set('role', e.target.value)}
                required
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Specialization / Skills</label>
              <input
                className="form-input"
                value={form.specialization || ''}
                onChange={e => set('specialization', e.target.value)}
                placeholder="e.g. Laptop Motherboard / Apple Hardware / Front Desk"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Employment Status</label>
              <select
                className="form-select"
                value={form.status}
                onChange={e => set('status', e.target.value)}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group form-grid-full">
              <label className="form-label">Notes & Comments <span className="optional">(optional)</span></label>
              <textarea
                className="form-textarea"
                value={form.notes || ''}
                onChange={e => set('notes', e.target.value)}
                placeholder="Shift timings, internal notes, certifications…"
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : staff ? 'Save Changes' : 'Create Staff & Login Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Staff() {
  const toast = useToast()
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getStaff({
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      })
      setStaffList(data)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, statusFilter, toast])

  useEffect(() => { load() }, [load])

  async function handleDelete(id, name) {
    if (!window.confirm(`Remove staff member "${name}"?`)) return
    try {
      await deleteStaffMember(id)
      toast('Staff member removed', 'success')
      setStaffList(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  function handleSaved(saved) {
    setStaffList(prev => {
      const idx = prev.findIndex(s => s.id === saved.id)
      if (idx >= 0) {
        const n = [...prev]
        n[idx] = saved
        return n
      }
      return [saved, ...prev]
    })
    setModal(null)
  }

  // Count aggregates
  const totalCount = staffList.length
  const techCount = staffList.filter(s => s.role === 'Technician').length
  const receptionCount = staffList.filter(s => s.role === 'Receptionist').length
  const activeCount = staffList.filter(s => s.status === 'Active').length

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">
            {totalCount} staff members &middot; {techCount} Technicians &middot; {receptionCount} Front Desk &middot; {activeCount} Active
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>
          <Plus size={16} /> Add Staff Member
        </button>
      </div>

      {/* Role Filter Chips */}
      <div className="filter-chips">
        {['', ...ROLES].map(r => (
          <button
            key={r}
            className={`chip${roleFilter === r ? ' active' : ''}`}
            onClick={() => setRoleFilter(r)}
          >
            {r ? `${r}s` : 'All Roles'}
          </button>
        ))}
      </div>

      {/* Toolbar: Search and Status toggle */}
      <div className="toolbar">
        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input
            className="search-input"
            placeholder="Search by name, phone, email or specialization…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['', 'Active', 'On Leave', 'Inactive'].map(st => (
            <button
              key={st}
              className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStatusFilter(st)}
            >
              {st || 'All Statuses'}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Table */}
      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : staffList.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <UserX size={40} strokeWidth={1.2} />
            <p>{search || roleFilter || statusFilter ? 'No staff members match your filter.' : 'No staff members yet. Add your first team member!'}</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Role</th>
                <th>Contact</th>
                <th>Specialization</th>
                <th>Active Jobs</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {staffList.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: s.role === 'Manager' ? 'rgba(168,85,247,0.15)' : s.role === 'Technician' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                          color: s.role === 'Manager' ? '#c084fc' : s.role === 'Technician' ? '#60a5fa' : '#34d399',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          flexShrink: 0,
                        }}
                      >
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{s.name}</span>
                          {s.username && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--accent-light)', background: 'var(--accent-dim)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>
                              @{s.username}
                            </span>
                          )}
                        </div>
                        {s.notes && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {s.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <RoleBadge role={s.role} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                        <Phone size={12} /> {s.phone}
                      </div>
                      {s.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          <Mail size={12} /> {s.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {s.specialization ? (
                      <span style={{ fontSize: '0.82rem' }}>{s.specialization}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>&mdash;</span>
                    )}
                  </td>
                  <td>
                    {s.role === 'Technician' ? (
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          color: Number(s.active_jobs_count) > 0 ? 'var(--accent-light)' : 'var(--text-muted)',
                        }}
                      >
                        {s.active_jobs_count || 0} active job{s.active_jobs_count !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>&mdash;</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={s.status} />
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="Edit Staff"
                        onClick={() => setModal(s)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn btn-danger btn-sm btn-icon"
                        title="Delete Staff"
                        onClick={() => handleDelete(s.id, s.name)}
                      >
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

      {/* Modal */}
      {modal && (
        <StaffModal
          staff={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
