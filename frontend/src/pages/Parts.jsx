import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, Package, AlertTriangle } from 'lucide-react'
import { getParts, createPart, updatePart, deletePart } from '../api/parts'
import { useToast } from '../context/ToastContext'

const EMPTY = {
  name: '', part_number: '', compatible_models: '',
  quantity: 0, min_quantity: 0,
  purchase_price: 0, selling_price: 0, supplier: '',
}

function PartModal({ part, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(part ? {
    name: part.name || '', part_number: part.part_number || '',
    compatible_models: part.compatible_models || '',
    quantity: part.quantity ?? 0, min_quantity: part.min_quantity ?? 0,
    purchase_price: part.purchase_price ?? 0, selling_price: part.selling_price ?? 0,
    supplier: part.supplier || '',
  } : { ...EMPTY })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) { toast('Part name is required', 'error'); return }
    if (!form.part_number.trim()) { toast('Part number is required', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        quantity: parseFloat(form.quantity) || 0,
        min_quantity: parseFloat(form.min_quantity) || 0,
        purchase_price: parseFloat(form.purchase_price) || 0,
        selling_price: parseFloat(form.selling_price) || 0,
      }
      const saved = part ? await updatePart(part.id, payload) : await createPart(payload)
      toast(part ? 'Part updated' : 'Part added', 'success')
      onSaved(saved)
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{part ? 'Edit Part' : 'Add Part'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Part Name <span style={{color:'var(--danger)'}}>*</span></label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Display Screen" required />
            </div>
            <div className="form-group">
              <label className="form-label">Part Number <span style={{color:'var(--danger)'}}>*</span></label>
              <input className="form-input" value={form.part_number} onChange={e => set('part_number', e.target.value)} placeholder="SCR-001" required />
            </div>
            <div className="form-group form-grid-full">
              <label className="form-label">Compatible Models <span className="optional">(optional)</span></label>
              <input className="form-input" value={form.compatible_models} onChange={e => set('compatible_models', e.target.value)} placeholder="iPhone 13, iPhone 14…" />
            </div>
            <div className="form-group">
              <label className="form-label">Quantity in Stock</label>
              <input className="form-input" type="number" min="0" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Min Quantity (reorder at)</label>
              <input className="form-input" type="number" min="0" value={form.min_quantity} onChange={e => set('min_quantity', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Purchase Price (₹)</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Selling Price (₹)</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.selling_price} onChange={e => set('selling_price', e.target.value)} />
            </div>
            <div className="form-group form-grid-full">
              <label className="form-label">Supplier <span className="optional">(optional)</span></label>
              <input className="form-input" value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="Supplier name" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : part ? 'Save Changes' : 'Add Part'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Parts() {
  const toast = useToast()
  const [parts, setParts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [showLowOnly, setShowLowOnly] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setParts(await getParts(search)) }
    catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }, [search, toast])

  useEffect(() => { load() }, [load])

  const displayed = showLowOnly ? parts.filter(p => p.low_stock) : parts

  function handleSaved(saved) {
    setParts(prev => {
      const idx = prev.findIndex(p => p.id === saved.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n }
      return [...prev, saved]
    })
    setModal(null)
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete part "${name}"? This cannot be undone.`)) return
    try {
      await deletePart(id)
      toast('Part deleted', 'success')
      setParts(prev => prev.filter(p => p.id !== id))
    } catch (err) { toast(err.message, 'error') }
  }

  const lowCount = parts.filter(p => p.low_stock).length

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Parts &amp; Inventory</h1>
          <p className="page-subtitle">
            {parts.length} part{parts.length !== 1 ? 's' : ''}
            {lowCount > 0 && <span style={{ color:'var(--danger)', marginLeft:8 }}>· {lowCount} low stock</span>}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>
          <Plus size={16} /> Add Part
        </button>
      </div>

      <div className="toolbar">
        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input className="search-input" placeholder="Search by name, part number or supplier…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button
          className={`btn ${showLowOnly ? 'btn-primary' : 'btn-ghost'} btn-sm`}
          onClick={() => setShowLowOnly(o => !o)}
          style={{ whiteSpace:'nowrap' }}
        >
          <AlertTriangle size={14} /> Low Stock Only
        </button>
      </div>

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : displayed.length === 0 ? (
        <div className="table-wrapper">
          <div className="empty-state">
            <Package size={40} strokeWidth={1.2} />
            <p>{search || showLowOnly ? 'No parts match your filter.' : 'No parts yet. Add your first part!'}</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Part Name</th>
                <th>Part #</th>
                <th>Compatible Models</th>
                <th>Stock</th>
                <th>Min Qty</th>
                <th>Purchase (₹)</th>
                <th>Selling (₹)</th>
                <th>Supplier</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(p => (
                <tr key={p.id} className={p.low_stock ? 'low-stock' : ''}>
                  <td>
                    <div style={{ fontWeight:600 }}>{p.name}</div>
                    {p.low_stock && (
                      <span className="low-stock-badge">
                        <AlertTriangle size={10} /> Low Stock
                      </span>
                    )}
                  </td>
                  <td style={{ color:'var(--text-secondary)', fontFamily:'monospace', fontSize:'0.82rem' }}>{p.part_number}</td>
                  <td style={{ color:'var(--text-secondary)' }}>{p.compatible_models || <span style={{color:'var(--text-muted)'}}>—</span>}</td>
                  <td>
                    <span style={{ fontWeight:700, color: p.low_stock ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {p.quantity}
                    </span>
                  </td>
                  <td style={{ color:'var(--text-secondary)' }}>{p.min_quantity}</td>
                  <td style={{ color:'var(--text-secondary)' }}>
                    {parseFloat(p.purchase_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ color:'var(--success)', fontWeight:600 }}>
                    {parseFloat(p.selling_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ color:'var(--text-secondary)' }}>{p.supplier || <span style={{color:'var(--text-muted)'}}>—</span>}</td>
                  <td>
                    <div className="actions-cell">
                      <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={() => setModal(p)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-danger btn-sm btn-icon" title="Delete" onClick={() => handleDelete(p.id, p.name)}>
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
        <PartModal
          part={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
