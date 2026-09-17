import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Printer,
  Trash2,
  Search,
  DollarSign,
  Clock,
  User,
  Phone,
  Wrench,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  Download,
  Percent,
  Tag
} from 'lucide-react'
import { getInvoices, getInvoice, createInvoice, payInvoice, cancelInvoice, deleteInvoice } from '../api/invoices'
import { getJobs, getJob } from '../api/jobs'
import { getCustomers } from '../api/customers'
import { getParts } from '../api/parts'
import { useToast } from '../context/ToastContext'
import StatusBadge from '../components/StatusBadge'
import { printInvoiceDocument, downloadInvoiceHTML } from '../utils/invoicePdf'

function GenerateModal({ jobs, customers, onClose, onCreated }) {
  const toast = useToast()
  const [mode, setMode] = useState('job') // 'job' or 'direct'
  const [jobId, setJobId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [laborCost, setLaborCost] = useState('0')
  const [taxRate, setTaxRate] = useState(18)
  const [discountType, setDiscountType] = useState('fixed') // 'fixed' (₹) or 'percentage' (%)
  const [discountValue, setDiscountValue] = useState('0')
  const [status, setStatus] = useState('Unpaid')
  const [saving, setSaving] = useState(false)

  // Direct parts builder
  const [availableParts, setAvailableParts] = useState([])
  const [selectedPartId, setSelectedPartId] = useState('')
  const [partQty, setPartQty] = useState(1)
  const [directItems, setDirectItems] = useState([]) // [{ part_id, description, quantity, unit_price }]
  const [jobParts, setJobParts] = useState([])
  const [loadingJobDetails, setLoadingJobDetails] = useState(false)

  useEffect(() => {
    getParts().then(setAvailableParts).catch(() => {})
  }, [])

  // When a job is selected, fetch its attached parts
  useEffect(() => {
    if (!jobId) {
      setJobParts([])
      setLaborCost('0')
      return
    }
    setLoadingJobDetails(true)
    getJob(jobId)
      .then(j => {
        setLaborCost(j.estimated_cost || '0')
        setJobParts(j.parts || [])
      })
      .catch(err => toast(err.message, 'error'))
      .finally(() => setLoadingJobDetails(false))
  }, [jobId, toast])

  const selectedJob = jobs.find(j => j.id === jobId)

  function handleAddDirectPart(e) {
    if (e) e.preventDefault()
    if (!selectedPartId) return
    const part = availableParts.find(p => p.id === selectedPartId)
    if (!part) return

    const qty = parseInt(partQty, 10) || 1
    if (qty > part.quantity) {
      toast(`Only ${part.quantity} in stock for ${part.name}!`, 'error')
      return
    }

    setDirectItems(prev => {
      const existingIndex = prev.findIndex(item => item.part_id === part.id)
      if (existingIndex >= 0) {
        const newQty = prev[existingIndex].quantity + qty
        if (newQty > part.quantity) {
          toast(`Cannot exceed available stock (${part.quantity})!`, 'error')
          return prev
        }
        const copy = [...prev]
        copy[existingIndex] = { ...copy[existingIndex], quantity: newQty }
        return copy
      }
      return [
        ...prev,
        {
          part_id: part.id,
          description: `${part.name} (${part.part_number})`,
          quantity: qty,
          unit_price: parseFloat(part.selling_price) || 0,
        }
      ]
    })
    setSelectedPartId('')
    setPartQty(1)
  }

  function handleRemoveDirectItem(idx) {
    setDirectItems(prev => prev.filter((_, i) => i !== idx))
  }

  // Calculate totals with custom discount applied after tax (No labour in direct part sale)
  const jobPartsTotal = jobParts.reduce((sum, p) => sum + (p.quantity_used * parseFloat(p.unit_price)), 0)
  const directPartsTotal = directItems.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0)
  const totalPartsAmount = mode === 'job' ? jobPartsTotal : directPartsTotal
  const laborAmount = mode === 'job' ? parseFloat(laborCost || 0) : 0
  const subtotal = totalPartsAmount + laborAmount

  const taxAmount = (subtotal * (parseFloat(taxRate) || 0)) / 100
  const subtotalWithTax = subtotal + taxAmount

  const parsedDiscVal = Math.max(0, parseFloat(discountValue || 0))
  const discountAmount = discountType === 'percentage'
    ? Math.min(subtotalWithTax, (subtotalWithTax * parsedDiscVal) / 100)
    : Math.min(subtotalWithTax, parsedDiscVal)
  const grandTotal = Math.max(0, subtotalWithTax - discountAmount)

  async function submit(e) {
    e.preventDefault()

    let itemsToSubmit = mode === 'direct' ? [...directItems] : []

    if (mode === 'job') {
      if (!jobId) {
        toast('Please select a service job', 'error')
        return
      }
    } else {
      if (!customerId) {
        toast('Please select a customer', 'error')
        return
      }

      // If user selected a part in the dropdown but didn't click "+ Add", auto-include it
      if (selectedPartId) {
        const part = availableParts.find(p => p.id === selectedPartId)
        if (part) {
          const qty = parseInt(partQty, 10) || 1
          if (qty <= part.quantity) {
            const existingIndex = itemsToSubmit.findIndex(it => it.part_id === part.id)
            if (existingIndex >= 0) {
              itemsToSubmit[existingIndex].quantity += qty
            } else {
              itemsToSubmit.push({
                part_id: part.id,
                description: `${part.name} (${part.part_number})`,
                quantity: qty,
                unit_price: parseFloat(part.selling_price) || 0,
              })
            }
          }
        }
      }

      if (itemsToSubmit.length === 0) {
        toast('Please add at least one spare part item to the sale', 'error')
        return
      }
    }

    setSaving(true)
    try {
      const payload = {
        job_id: mode === 'job' ? jobId : null,
        customer_id: mode === 'direct' ? customerId : (selectedJob?.customer_id || null),
        labor_cost: mode === 'job' ? laborAmount : 0,
        items: itemsToSubmit,
        discount_type: discountType,
        discount_rate: discountType === 'percentage' ? parsedDiscVal : (subtotalWithTax > 0 ? (discountAmount / subtotalWithTax) * 100 : 0),
        discount_amount: discountAmount,
        tax_rate: parseFloat(taxRate) || 0,
        status: status,
      }

      const inv = await createInvoice(payload)
      toast('Invoice generated successfully', 'success')
      onCreated(inv)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <span className="modal-title">Generate Invoice &amp; Bill</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', gap: 8, padding: '0 24px 14px', borderBottom: '1px solid var(--border)' }}>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'job' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('job')}
            style={{ flex: 1, justifyContent: 'center', gap: 6 }}
          >
            <Wrench size={14} /> From Service Job
          </button>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'direct' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('direct')}
            style={{ flex: 1, justifyContent: 'center', gap: 6 }}
          >
            <Package size={14} /> Direct Parts &amp; Sale
          </button>
        </div>

        <form onSubmit={submit} style={{ padding: '16px 24px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'job' ? (
              <div>
                <div className="form-group">
                  <label className="form-label">
                    Select Service Job <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <select
                    className="form-select"
                    value={jobId}
                    onChange={e => setJobId(e.target.value)}
                    required
                  >
                    <option value="">— Select a repair job —</option>
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>
                        JOB-{j.id.substring(0, 8).toUpperCase()} — {j.customer_name} ({j.device_brand} {j.device_model}) [{j.status}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Job Attached Parts Preview */}
                {jobId && (
                  <div style={{ marginTop: 10, background: 'var(--bg-input, rgba(255,255,255,0.02))', padding: '12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                      Attached Replaced Parts ({jobParts.length})
                    </div>
                    {loadingJobDetails ? (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Loading parts…</div>
                    ) : jobParts.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {jobParts.map(p => (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                            <span>{p.part_name} × {p.quantity_used}</span>
                            <strong style={{ color: 'var(--accent-light)' }}>
                              ₹{(p.quantity_used * parseFloat(p.unit_price)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No spare parts attached to this job.</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="form-group">
                  <label className="form-label">
                    Select Customer <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <select
                    className="form-select"
                    value={customerId}
                    onChange={e => setCustomerId(e.target.value)}
                    required
                  >
                    <option value="">— Select customer —</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Direct Parts Selector */}
                <div style={{ marginTop: 10, padding: '12px', background: 'var(--bg-input, rgba(255,255,255,0.02))', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                    Add Spare Parts from Inventory
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      className="form-select"
                      value={selectedPartId}
                      onChange={e => setSelectedPartId(e.target.value)}
                      style={{ flex: 2 }}
                    >
                      <option value="">— Select part from stock —</option>
                      {availableParts.map(p => (
                        <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                          {p.name} ({p.part_number}) — ₹{parseFloat(p.selling_price).toLocaleString('en-IN')} (Stock: {p.quantity})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={partQty}
                      onChange={e => setPartQty(e.target.value)}
                      style={{ width: 70 }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleAddDirectPart}
                      disabled={!selectedPartId}
                    >
                      + Add
                    </button>
                  </div>

                  {/* Direct Items List */}
                  {directItems.length > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {directItems.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <span>{it.description} × {it.quantity}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <strong>₹{(it.quantity * it.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                            <button type="button" onClick={() => handleRemoveDirectItem(idx)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {mode === 'job' ? (
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">
                    Labour / Service Fee (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input"
                    value={laborCost}
                    onChange={e => setLaborCost(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">GST Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="form-input"
                    value={taxRate}
                    onChange={e => setTaxRate(e.target.value)}
                    placeholder="18"
                  />
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">GST Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="form-input"
                  value={taxRate}
                  onChange={e => setTaxRate(e.target.value)}
                  placeholder="18"
                />
              </div>
            )}

            {/* Custom Discount Control */}
            <div className="form-group" style={{ background: 'var(--bg-input, rgba(255,255,255,0.02))', padding: '12px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="form-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  <Tag size={14} color="#10b981" /> Custom Discount
                </label>
                <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', padding: 2, borderRadius: 'var(--r-sm)' }}>
                  <button
                    type="button"
                    className={`btn btn-xs ${discountType === 'fixed' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '2px 8px', fontSize: '0.75rem', height: 24 }}
                    onClick={() => setDiscountType('fixed')}
                  >
                    ₹ Fixed
                  </button>
                  <button
                    type="button"
                    className={`btn btn-xs ${discountType === 'percentage' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '2px 8px', fontSize: '0.75rem', height: 24 }}
                    onClick={() => setDiscountType('percentage')}
                  >
                    % Percent
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="number"
                    min="0"
                    max={discountType === 'percentage' ? '100' : undefined}
                    step={discountType === 'percentage' ? '1' : '0.01'}
                    className="form-input"
                    value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'percentage' ? 'e.g. 10 for 10%' : '0.00'}
                    style={{ paddingRight: 32 }}
                  />
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                    {discountType === 'percentage' ? '%' : '₹'}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    -₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Status</label>
              <select
                className="form-select"
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                <option value="Unpaid">Unpaid / Pending</option>
                <option value="Paid">Paid (Cash / UPI / Card)</option>
              </select>
            </div>

            {/* Financial Totals Breakdown Preview */}
            <div
              style={{
                padding: '14px 16px',
                background: 'var(--bg-card)',
                borderRadius: 'var(--r-md)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {mode === 'job' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <span>Parts Total:</span>
                    <span>₹{totalPartsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <span>Labour / Service:</span>
                    <span>₹{laborAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                    <span>Gross Subtotal:</span>
                    <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <span>Parts Subtotal:</span>
                  <span>₹{totalPartsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <span>GST Tax ({taxRate || 0}%):</span>
                <span>₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <span>Subtotal (incl. Tax):</span>
                  <span>₹{subtotalWithTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--success)', fontWeight: 600 }}>
                  <span>Custom Discount ({discountType === 'percentage' ? `${parsedDiscVal}% off` : 'Special Promo'}):</span>
                  <span>-₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                <span>Grand Total:</span>
                <span style={{ color: 'var(--success)' }}>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: 20, padding: 0 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Generating…' : 'Issue Invoice & Sync Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function InvoiceDetail({ invoiceId, onClose, onUpdated, onDeleted }) {
  const toast = useToast()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const data = await getInvoice(invoiceId)
      setInvoice(data)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [invoiceId, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handlePay() {
    setActionLoading(true)
    try {
      const updated = await payInvoice(invoice.id)
      setInvoice(updated)
      toast('Invoice marked as Paid', 'success')
      onUpdated(updated)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCancel() {
    if (!window.confirm('Cancel this invoice?')) return
    setActionLoading(true)
    try {
      const updated = await cancelInvoice(invoice.id)
      setInvoice(updated)
      toast('Invoice cancelled', 'info')
      onUpdated(updated)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Permanently delete this invoice?')) return
    setActionLoading(true)
    try {
      await deleteInvoice(invoice.id)
      toast('Invoice deleted', 'info')
      onDeleted(invoice.id)
      onClose()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  function handlePrint() {
    printInvoiceDocument(invoice)
  }

  function handleDownload() {
    printInvoiceDocument(invoice) // Opens print dialog with instant Save-as-PDF preview
  }

  function handleDownloadHTML() {
    downloadInvoiceHTML(invoice)
  }

  if (loading) {
    return (
      <div className="drawer-overlay" onClick={onClose}>
        <div className="drawer" onClick={e => e.stopPropagation()} style={{ width: 660 }}>
          <div className="spinner-wrap"><div className="spinner" /></div>
        </div>
      </div>
    )
  }

  if (!invoice) return null

  const invoiceNumber = `INV-${invoice.id.substring(0, 8).toUpperCase()}`
  const items = invoice.items || []
  const subtotal = parseFloat(invoice.subtotal || 0)
  const discountAmount = parseFloat(invoice.discount_amount || 0)
  const discountRate = parseFloat(invoice.discount_rate || 0)
  const discountType = invoice.discount_type || 'fixed'
  const taxableAmount = Math.max(0, subtotal - discountAmount)

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()} style={{ width: 680, maxWidth: '95vw' }}>
        {/* Header */}
        <div className="drawer-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="drawer-title">{invoiceNumber}</span>
              <StatusBadge status={invoice.status} />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Issued: {new Date(invoice.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleDownload}
              title="Download Branded Invoice as PDF"
              style={{ gap: 6 }}
            >
              <Download size={14} /> Download PDF
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handlePrint}
              title="Print Receipt"
              style={{ gap: 6 }}
            >
              <Printer size={14} /> Print
            </button>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Customer Info Card */}
          <div>
            <span className="section-title">Customer Details</span>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Customer Name</span>
                <span className="info-value" style={{ fontWeight: 600 }}>{invoice.customer_name || '—'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Phone Number</span>
                <span className="info-value">{invoice.customer_phone || '—'}</span>
              </div>
              {invoice.customer_email && (
                <div className="info-item">
                  <span className="info-label">Email</span>
                  <span className="info-value">{invoice.customer_email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Device Info (if from service job) */}
          {invoice.device_type && (
            <>
              <div className="divider" />
              <div>
                <span className="section-title">Device Repaired</span>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Device</span>
                    <span className="info-value">
                      {[invoice.device_brand, invoice.device_model].filter(Boolean).join(' ') || invoice.device_type}
                    </span>
                  </div>
                  {invoice.serial_number && (
                    <div className="info-item">
                      <span className="info-label">Serial Number</span>
                      <span className="info-value" style={{ fontFamily: 'monospace' }}>{invoice.serial_number}</span>
                    </div>
                  )}
                  {invoice.technician && (
                    <div className="info-item">
                      <span className="info-label">Technician</span>
                      <span className="info-value">{invoice.technician}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Itemized Line Items Table */}
          <div className="divider" />
          <div>
            <span className="section-title">Itemized Bill Breakdown</span>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length > 0 ? (
                    items.map(it => (
                      <tr key={it.id}>
                        <td style={{ fontWeight: 600 }}>{it.description}</td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: it.is_part ? 'rgba(59,130,246,0.12)' : 'rgba(168,85,247,0.12)',
                              color: it.is_part ? '#60a5fa' : '#c084fc',
                              textTransform: 'uppercase',
                            }}
                          >
                            {it.is_part ? 'Spare Part' : 'Labor Fee'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{it.quantity}</td>
                        <td>₹{parseFloat(it.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          ₹{parseFloat(it.total_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px' }}>
                        Labor &amp; Service Fee: ₹{parseFloat(invoice.subtotal).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Totals */}
          <div className="divider" />
          <div>
            <span className="section-title">Payment Summary</span>
            <div
              style={{
                background: 'var(--bg-input, rgba(255,255,255,0.03))',
                padding: '16px',
                borderRadius: 'var(--r-md)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div className="invoice-total-row">
                <span>Gross Subtotal (Parts + Labour)</span>
                <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="invoice-total-row">
                <span>GST Tax ({invoice.tax_rate}%)</span>
                <span>₹{parseFloat(invoice.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {discountAmount > 0 && (
                <div className="invoice-total-row">
                  <span>Subtotal (incl. Tax)</span>
                  <span>₹{(subtotal + parseFloat(invoice.tax_amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              {discountAmount > 0 && (
                <div className="invoice-total-row" style={{ color: 'var(--success)', fontWeight: 600 }}>
                  <span>Custom Discount ({discountType === 'percentage' ? `${discountRate}% off` : 'Special Promo'}):</span>
                  <span>-₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="invoice-total-row grand" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <span>Grand Total Due</span>
                <span style={{ color: invoice.status === 'Paid' ? 'var(--success)' : 'var(--text-primary)' }}>
                  ₹{parseFloat(invoice.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            {invoice.status === 'Unpaid' && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={handlePay}
                disabled={actionLoading}
              >
                <CheckCircle size={16} /> Mark as Paid
              </button>
            )}

            {invoice.status === 'Paid' && (
              <div
                style={{
                  flex: 1,
                  textAlign: 'center',
                  background: 'rgba(34, 197, 94, 0.1)',
                  color: '#4ade80',
                  padding: '10px',
                  borderRadius: 'var(--r-md)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                ✓ Paid on {invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Settled'}
              </div>
            )}

            {invoice.status === 'Unpaid' && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleCancel}
                disabled={actionLoading}
                style={{ color: 'var(--warning)' }}
              >
                <XCircle size={15} /> Cancel Bill
              </button>
            )}

            <button
              type="button"
              className="btn btn-danger btn-icon"
              title="Delete Invoice"
              onClick={handleDelete}
              disabled={actionLoading}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Invoices() {
  const toast = useToast()
  const [invoices, setInvoices] = useState([])
  const [jobs, setJobs] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showGenerate, setShowGenerate] = useState(false)
  const [detailId, setDetailId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [inv, j, c] = await Promise.all([
        getInvoices(),
        getJobs(),
        getCustomers(),
      ])
      setInvoices(inv)
      setJobs(j)
      setCustomers(c)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const displayed = invoices.filter(inv => {
    if (filter && inv.status !== filter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const match =
        inv.customer_name?.toLowerCase().includes(q) ||
        inv.customer_phone?.toLowerCase().includes(q) ||
        inv.device_model?.toLowerCase().includes(q) ||
        inv.id?.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })

  // KPI calculations
  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + parseFloat(i.total || 0), 0)
  const unpaidTotal = invoices.filter(i => i.status === 'Unpaid').reduce((sum, i) => sum + parseFloat(i.total || 0), 0)
  const unpaidCount = invoices.filter(i => i.status === 'Unpaid').length
  const paidCount = invoices.filter(i => i.status === 'Paid').length

  function handleCreated(inv) {
    setInvoices(prev => [inv, ...prev])
    setShowGenerate(false)
    setDetailId(inv.id)
  }

  function handleUpdated(updated) {
    setInvoices(prev => prev.map(i => (i.id === updated.id ? { ...i, ...updated } : i)))
  }

  function handleDeleted(id) {
    setInvoices(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices &amp; Billing</h1>
          <p className="page-subtitle">
            Generate itemized receipts, track spare parts billing, and manage payments.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowGenerate(true)}>
          <Plus size={16} /> Generate Invoice
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(34, 197, 94, 0.12)' }}>
            <DollarSign size={22} color="var(--success)" />
          </div>
          <div className="stat-body">
            <div className="stat-value" style={{ color: 'var(--success)' }}>
              ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div className="stat-label">Collected Revenue ({paidCount})</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.12)' }}>
            <Clock size={22} color="var(--warning)" />
          </div>
          <div className="stat-body">
            <div className="stat-value" style={{ color: 'var(--warning)' }}>
              ₹{unpaidTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div className="stat-label">Unpaid Receivables ({unpaidCount})</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)' }}>
            <FileText size={22} color="var(--accent-light)" />
          </div>
          <div className="stat-body">
            <div className="stat-value" style={{ color: 'var(--accent-light)' }}>{invoices.length}</div>
            <div className="stat-label">Total Invoices</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(168, 85, 247, 0.12)' }}>
            <CheckCircle size={22} color="#c084fc" />
          </div>
          <div className="stat-body">
            <div className="stat-value" style={{ color: '#c084fc' }}>
              {invoices.length > 0 ? `${Math.round((paidCount / invoices.length) * 100)}%` : '0%'}
            </div>
            <div className="stat-label">Settlement Rate</div>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="filter-chips">
        {['', 'Unpaid', 'Paid', 'Cancelled'].map(s => (
          <button
            key={s}
            className={`chip${filter === s ? ' active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s ? `${s} (${invoices.filter(i => i.status === s).length})` : `All Invoices (${invoices.length})`}
          </button>
        ))}
      </div>

      {/* Search Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input
            className="search-input"
            placeholder="Search by customer name, phone, device model, or invoice #…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Invoices Table */}
      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : displayed.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <FileText size={40} strokeWidth={1.2} />
            <p>{filter ? `No ${filter.toLowerCase()} invoices found.` : 'No invoices yet. Click "Generate Invoice" to create your first bill.'}</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Device / Reference</th>
                <th>Status</th>
                <th>Subtotal</th>
                <th>Discount</th>
                <th>GST</th>
                <th>Grand Total</th>
                <th>Date Issued</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(inv => {
                const discAmt = parseFloat(inv.discount_amount || 0)
                return (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-light)' }}>
                      INV-{inv.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{inv.customer_name || 'Walk-in Customer'}</div>
                      {inv.customer_phone && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.customer_phone}</div>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {inv.device_type ? (
                        <span>{[inv.device_brand, inv.device_model].filter(Boolean).join(' ') || inv.device_type}</span>
                      ) : (
                        <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Direct Service &amp; Parts</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={inv.status} />
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      ₹{parseFloat(inv.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      {discAmt > 0 ? (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(34, 197, 94, 0.12)',
                            color: '#4ade80',
                          }}
                        >
                          -₹{discAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {inv.tax_rate}%
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      ₹{parseFloat(inv.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(inv.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-icon"
                          title="Download PDF"
                          onClick={async () => {
                            try {
                              const full = await getInvoice(inv.id)
                              printInvoiceDocument(full)
                            } catch (e) {
                              toast(e.message, 'error')
                            }
                          }}
                          style={{ color: 'var(--accent-light)' }}
                        >
                          <Download size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-icon"
                          title="View Invoice Details"
                          onClick={() => setDetailId(inv.id)}
                        >
                          <Eye size={14} />
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

      {/* Generate Invoice Modal */}
      {showGenerate && (
        <GenerateModal
          jobs={jobs}
          customers={customers}
          onClose={() => setShowGenerate(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Invoice Detail Drawer */}
      {detailId && (
        <InvoiceDetail
          invoiceId={detailId}
          onClose={() => setDetailId(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
