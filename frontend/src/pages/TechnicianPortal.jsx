import { useState, useEffect, useCallback } from 'react'
import {
  Wrench,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  Plus,
  Trash2,
  Cpu,
  User,
  Phone,
  Tag,
  ArrowRight,
  ShieldAlert,
  Check
} from 'lucide-react'
import { getJobs, getJob, patchStatus, updateJob, addJobPart, removeJobPart } from '../api/jobs'
import { getParts } from '../api/parts'
import { getStaff } from '../api/staff'
import { useToast } from '../context/ToastContext'
import StatusBadge, { STATUS_MAP } from '../components/StatusBadge'

const WORKBENCH_PIPELINE = [
  'Received',
  'Diagnosis',
  'Waiting for Approval',
  'Approved',
  'Repairing',
  'Quality Check',
  'Ready for Pickup',
  'Completed',
]

const SIDE_STATUSES = ['Waiting for Parts', 'Unrepairable', 'Cancelled']

function RepairDrawer({ jobId, activeTech, onClose, onJobUpdated }) {
  const toast = useToast()
  const [job, setJob] = useState(null)
  const [partsInventory, setPartsInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingPart, setAddingPart] = useState(false)
  const [selectedPartId, setSelectedPartId] = useState('')
  const [partQty, setPartQty] = useState(1)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const loadJob = useCallback(async () => {
    try {
      const [j, p] = await Promise.all([getJob(jobId), getParts()])
      setJob(j)
      setPartsInventory(p)
      setNotes(j.problem_description || '')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [jobId, toast])

  useEffect(() => {
    loadJob()
  }, [loadJob])

  async function handleStatusChange(newStatus) {
    if (!job || job.status === newStatus) return
    try {
      const updated = await patchStatus(job.id, newStatus)
      setJob(prev => ({ ...prev, ...updated }))
      toast(`Status updated to ${newStatus}`, 'success')
      onJobUpdated(updated)
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function handleClaimJob() {
    if (!job || !activeTech) return
    try {
      const updated = await updateJob(job.id, {
        customer_id: job.customer_id,
        device_type: job.device_type,
        device_brand: job.device_brand,
        device_model: job.device_model,
        serial_number: job.serial_number,
        technician: activeTech,
        status: job.status,
        problem_description: job.problem_description,
        estimated_cost: job.estimated_cost,
      })
      setJob(prev => ({ ...prev, ...updated }))
      toast(`Assigned to ${activeTech}`, 'success')
      onJobUpdated(updated)
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function handleAddPart(e) {
    e.preventDefault()
    if (!selectedPartId) {
      toast('Select a part to attach', 'error')
      return
    }
    const part = partsInventory.find(p => p.id === selectedPartId)
    if (!part) return

    setAddingPart(true)
    try {
      await addJobPart(job.id, {
        part_id: part.id,
        quantity_used: parseInt(partQty, 10) || 1,
        unit_price: parseFloat(part.selling_price) || 0,
      })
      toast(`Attached ${part.name} to job`, 'success')
      setSelectedPartId('')
      setPartQty(1)
      await loadJob()
      onJobUpdated({ ...job })
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setAddingPart(false)
    }
  }

  async function handleRemovePart(jpId) {
    try {
      await removeJobPart(job.id, jpId)
      toast('Part removed and stock restored', 'info')
      await loadJob()
      onJobUpdated({ ...job })
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function handleSaveNotes() {
    setSavingNotes(true)
    try {
      const updated = await updateJob(job.id, {
        customer_id: job.customer_id,
        device_type: job.device_type,
        device_brand: job.device_brand,
        device_model: job.device_model,
        serial_number: job.serial_number,
        technician: job.technician,
        status: job.status,
        problem_description: notes,
        estimated_cost: job.estimated_cost,
      })
      setJob(prev => ({ ...prev, ...updated }))
      toast('Repair notes saved', 'success')
      onJobUpdated(updated)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSavingNotes(false)
    }
  }

  if (loading) {
    return (
      <div className="drawer-overlay" onClick={onClose}>
        <div className="drawer" onClick={e => e.stopPropagation()} style={{ width: 640 }}>
          <div className="spinner-wrap"><div className="spinner" /></div>
        </div>
      </div>
    )
  }

  if (!job) return null

  const partsTotal = (job.parts || []).reduce((sum, p) => sum + (p.quantity_used * p.unit_price), 0)

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()} style={{ width: 680, maxWidth: '95vw' }}>
        {/* Header */}
        <div className="drawer-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="drawer-title">
                {job.device_brand} {job.device_model}
              </span>
              <StatusBadge status={job.status} />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Serial: <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{job.serial_number}</span> &middot; Type: {job.device_type}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Quick Info Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              padding: '14px 16px',
              background: 'var(--bg-input, rgba(255,255,255,0.03))',
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--border)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Customer</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: 2 }}>{job.customer_name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Phone size={11} /> {job.customer_phone}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Assigned Technician</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: 2, color: job.technician ? 'var(--accent-light)' : 'var(--warning)' }}>
                {job.technician || 'Unassigned'}
              </div>
              {!job.technician && activeTech && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleClaimJob}
                  style={{ padding: '2px 8px', fontSize: '0.75rem', marginTop: 4, color: 'var(--accent-light)' }}
                >
                  + Assign to Me
                </button>
              )}
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Est. Repair Cost</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--success)', marginTop: 2 }}>
                ₹{job.estimated_cost ? parseFloat(job.estimated_cost).toLocaleString('en-IN') : '0'}
              </div>
            </div>
          </div>

          {/* Status Stepper Pipeline */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span className="section-title" style={{ marginBottom: 0 }}>Repair Pipeline Progression</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click any step to update</span>
            </div>

            {/* Stepper Buttons */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {WORKBENCH_PIPELINE.map((st, index) => {
                const currentIdx = WORKBENCH_PIPELINE.indexOf(job.status)
                const isCurrent = job.status === st
                const isPast = currentIdx !== -1 && index < currentIdx

                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(st)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 11px',
                      borderRadius: 'var(--r-md)',
                      fontSize: '0.78rem',
                      fontWeight: isCurrent ? 700 : 500,
                      cursor: 'pointer',
                      border: isCurrent
                        ? '1px solid var(--accent)'
                        : isPast
                        ? '1px solid rgba(34, 197, 94, 0.3)'
                        : '1px solid var(--border)',
                      background: isCurrent
                        ? 'var(--accent)'
                        : isPast
                        ? 'rgba(34, 197, 94, 0.1)'
                        : 'var(--bg-card)',
                      color: isCurrent
                        ? '#fff'
                        : isPast
                        ? '#4ade80'
                        : 'var(--text-secondary)',
                      transition: 'all var(--t-fast)',
                    }}
                  >
                    {isPast && <Check size={12} />}
                    {index + 1}. {st}
                  </button>
                )
              })}
            </div>

            {/* Side Statuses (Waiting for Parts, Cancelled, Unrepairable) */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: 4 }}>Exceptions:</span>
              {SIDE_STATUSES.map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleStatusChange(st)}
                  className={`chip ${job.status === st ? 'active' : ''}`}
                  style={{
                    fontSize: '0.72rem',
                    padding: '3px 8px',
                    borderColor: st === 'Unrepairable' ? 'rgba(239, 68, 68, 0.4)' : undefined,
                    color: st === 'Unrepairable' && job.status !== st ? 'var(--danger)' : undefined,
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="divider" />

          {/* Parts Used & Inventory logger */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <span className="section-title" style={{ marginBottom: 2 }}>Spare Parts Used</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Attaching parts automatically deducts them from your live inventory.
                </p>
              </div>
              {partsTotal > 0 && (
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-light)' }}>
                  Parts Total: ₹{partsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>

            {/* Currently attached parts list */}
            {job.parts && job.parts.length > 0 ? (
              <div className="table-wrapper" style={{ marginBottom: 14 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Part Name</th>
                      <th>Part #</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.parts.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.part_name}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{p.part_number}</td>
                        <td style={{ fontWeight: 700 }}>{p.quantity_used}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>₹{parseFloat(p.unit_price).toLocaleString('en-IN')}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          ₹{(p.quantity_used * p.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm btn-icon"
                            title="Remove part and restore stock"
                            onClick={() => handleRemovePart(p.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                style={{
                  padding: '16px',
                  background: 'var(--bg-input, rgba(255,255,255,0.02))',
                  borderRadius: 'var(--r-md)',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.82rem',
                  border: '1px dashed var(--border)',
                  marginBottom: 14,
                }}
              >
                No spare parts attached to this job yet.
              </div>
            )}

            {/* Add Part Form */}
            <form onSubmit={handleAddPart} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: 220 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Select Part from Stock</label>
                <select
                  className="form-select"
                  value={selectedPartId}
                  onChange={e => setSelectedPartId(e.target.value)}
                >
                  <option value="">— Select inventory part —</option>
                  {partsInventory.map(p => (
                    <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                      {p.name} ({p.part_number}) — Stock: {p.quantity} — ₹{parseFloat(p.selling_price).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ width: 80 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Qty</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={partQty}
                  onChange={e => setPartQty(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={addingPart || !selectedPartId}
                style={{ height: 38 }}
              >
                <Plus size={15} /> Attach Part
              </button>
            </form>
          </div>

          <div className="divider" />

          {/* Technician Problem Description & Repair Notes */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span className="section-title" style={{ marginBottom: 0 }}>Repair Notes &amp; Findings</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleSaveNotes}
                disabled={savingNotes}
                style={{ fontSize: '0.78rem' }}
              >
                {savingNotes ? 'Saving…' : 'Save Notes'}
              </button>
            </div>
            <textarea
              className="form-textarea"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Record inspection findings, diagnostics, thermal test results, replaced components, etc."
              rows={4}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TechnicianPortal() {
  const toast = useToast()
  const [jobs, setJobs] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [activeTech, setActiveTech] = useState('')
  const [filterTab, setFilterTab] = useState('active') // 'active', 'my', 'unassigned', 'diagnosis', 'repairing', 'quality', 'completed'
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [workbenchJobId, setWorkbenchJobId] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [j, staffList] = await Promise.all([
        getJobs(),
        getStaff({ role: 'Technician', status: 'Active' }).catch(() => [])
      ])
      setJobs(j)
      setTechnicians(staffList)
      if (staffList.length > 0 && !activeTech) {
        setActiveTech(staffList[0].name)
      }
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [activeTech, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  function handleJobUpdated(updated) {
    setJobs(prev => prev.map(j => (j.id === updated.id ? { ...j, ...updated } : j)))
  }

  // Filter jobs based on active tab & active technician
  const filteredJobs = jobs.filter(j => {
    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      const match =
        j.customer_name?.toLowerCase().includes(q) ||
        j.device_brand?.toLowerCase().includes(q) ||
        j.device_model?.toLowerCase().includes(q) ||
        j.serial_number?.toLowerCase().includes(q) ||
        j.problem_description?.toLowerCase().includes(q)
      if (!match) return false
    }

    // Tab filter
    if (filterTab === 'my') {
      return j.technician === activeTech && !['Completed', 'Cancelled', 'Unrepairable'].includes(j.status)
    }
    if (filterTab === 'unassigned') {
      return !j.technician && !['Completed', 'Cancelled', 'Unrepairable'].includes(j.status)
    }
    if (filterTab === 'diagnosis') {
      return j.status === 'Diagnosis'
    }
    if (filterTab === 'repairing') {
      return j.status === 'Repairing'
    }
    if (filterTab === 'quality') {
      return j.status === 'Quality Check'
    }
    if (filterTab === 'ready') {
      return j.status === 'Ready for Pickup'
    }
    if (filterTab === 'completed') {
      return j.status === 'Completed'
    }
    // 'active' (all active jobs)
    return !['Completed', 'Cancelled', 'Unrepairable'].includes(j.status)
  })

  // Quick stats for active technician
  const myActiveCount = jobs.filter(j => j.technician === activeTech && !['Completed', 'Cancelled', 'Unrepairable'].includes(j.status)).length
  const myRepairingCount = jobs.filter(j => j.technician === activeTech && j.status === 'Repairing').length
  const myDiagCount = jobs.filter(j => j.technician === activeTech && j.status === 'Diagnosis').length
  const unassignedCount = jobs.filter(j => !j.technician && !['Completed', 'Cancelled', 'Unrepairable'].includes(j.status)).length

  return (
    <div className="page">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title">Technician Workbench</h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 10px',
                borderRadius: 99,
                background: 'rgba(59,130,246,0.15)',
                color: '#60a5fa',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              <Cpu size={12} /> Workshop View
            </span>
          </div>
          <p className="page-subtitle">
            Manage repair pipeline, attach spare parts, and log diagnostic findings.
          </p>
        </div>

        {/* Technician Profile Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-card)', padding: '6px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
          <User size={16} color="var(--accent-light)" />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Operating as:</span>
          <select
            className="form-select"
            value={activeTech}
            onChange={e => setActiveTech(e.target.value)}
            style={{ width: 'auto', padding: '5px 10px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}
          >
            {technicians.map(t => (
              <option key={t.id} value={t.name}>{t.name} ({t.specialization || 'General'})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Metric Cards for Active Technician */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(59,130,246,0.12)' }}>
            <Wrench size={22} color="var(--accent-light)" />
          </div>
          <div className="stat-body">
            <div className="stat-value" style={{ color: 'var(--accent-light)' }}>{myActiveCount}</div>
            <div className="stat-label">My Assigned Jobs</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(6,182,212,0.12)' }}>
            <Cpu size={22} color="#06b6d4" />
          </div>
          <div className="stat-body">
            <div className="stat-value" style={{ color: '#06b6d4' }}>{myRepairingCount}</div>
            <div className="stat-label">In Active Repair</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(139,92,246,0.12)' }}>
            <Clock size={22} color="#a855f7" />
          </div>
          <div className="stat-body">
            <div className="stat-value" style={{ color: '#a855f7' }}>{myDiagCount}</div>
            <div className="stat-label">In Diagnosis</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(245,158,11,0.12)' }}>
            <AlertCircle size={22} color="var(--warning)" />
          </div>
          <div className="stat-body">
            <div className="stat-value" style={{ color: 'var(--warning)' }}>{unassignedCount}</div>
            <div className="stat-label">Unclaimed Jobs</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-chips">
        <button className={`chip ${filterTab === 'active' ? 'active' : ''}`} onClick={() => setFilterTab('active')}>
          All Active ({jobs.filter(j => !['Completed', 'Cancelled', 'Unrepairable'].includes(j.status)).length})
        </button>
        <button className={`chip ${filterTab === 'my' ? 'active' : ''}`} onClick={() => setFilterTab('my')}>
          My Jobs ({myActiveCount})
        </button>
        <button className={`chip ${filterTab === 'unassigned' ? 'active' : ''}`} onClick={() => setFilterTab('unassigned')}>
          Unclaimed Pool ({unassignedCount})
        </button>
        <button className={`chip ${filterTab === 'diagnosis' ? 'active' : ''}`} onClick={() => setFilterTab('diagnosis')}>
          Diagnosis
        </button>
        <button className={`chip ${filterTab === 'repairing' ? 'active' : ''}`} onClick={() => setFilterTab('repairing')}>
          Repairing
        </button>
        <button className={`chip ${filterTab === 'quality' ? 'active' : ''}`} onClick={() => setFilterTab('quality')}>
          Quality Check
        </button>
        <button className={`chip ${filterTab === 'ready' ? 'active' : ''}`} onClick={() => setFilterTab('ready')}>
          Ready for Pickup
        </button>
        <button className={`chip ${filterTab === 'completed' ? 'active' : ''}`} onClick={() => setFilterTab('completed')}>
          Completed
        </button>
      </div>

      {/* Toolbar Search */}
      <div className="toolbar">
        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input
            className="search-input"
            placeholder="Search by customer, device model, serial number, problem…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Jobs Grid / Table */}
      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : filteredJobs.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <CheckCircle size={40} strokeWidth={1.2} />
            <p>No service jobs in this queue.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {filteredJobs.map(j => {
            const isMine = j.technician === activeTech
            return (
              <div
                key={j.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                  border: isMine ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid var(--border)',
                  background: isMine ? 'rgba(59, 130, 246, 0.03)' : 'var(--bg-card)',
                  transition: 'transform var(--t-fast), border-color var(--t-fast)',
                }}
              >
                <div>
                  {/* Card Header: Device & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {j.device_brand} {j.device_model}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {j.device_type} &middot; SN: <span style={{ fontFamily: 'monospace' }}>{j.serial_number}</span>
                      </div>
                    </div>
                    <StatusBadge status={j.status} />
                  </div>

                  {/* Problem Description */}
                  <div
                    style={{
                      background: 'var(--bg-input, rgba(255,255,255,0.02))',
                      padding: '10px 12px',
                      borderRadius: 'var(--r-sm)',
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                      marginBottom: 12,
                    }}
                  >
                    {j.problem_description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No problem description recorded.</span>}
                  </div>

                  {/* Customer & Technician meta */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <User size={13} />
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{j.customer_name}</span>
                    </div>
                    <div>
                      Tech: <span style={{ fontWeight: 600, color: j.technician ? 'var(--accent-light)' : 'var(--warning)' }}>{j.technician || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Action */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--success)' }}>
                    ₹{j.estimated_cost ? parseFloat(j.estimated_cost).toLocaleString('en-IN') : '0.00'}
                  </span>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setWorkbenchJobId(j.id)}
                    style={{ gap: 6 }}
                  >
                    <Wrench size={13} /> Open Workbench <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Repair Workbench Drawer */}
      {workbenchJobId && (
        <RepairDrawer
          jobId={workbenchJobId}
          activeTech={activeTech}
          onClose={() => setWorkbenchJobId(null)}
          onJobUpdated={handleJobUpdated}
        />
      )}
    </div>
  )
}
