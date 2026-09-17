import { useState, useEffect, useCallback } from 'react'
import {
  Smartphone,
  Laptop,
  Monitor,
  Tablet,
  Watch,
  Gamepad2,
  Cpu,
  Plus,
  Search,
  Trash2,
  Tag,
  Layers,
  CheckCircle,
  X,
  Filter
} from 'lucide-react'
import {
  getDeviceTypes,
  createDeviceType,
  deleteDeviceType,
  getDeviceBrands,
  createDeviceBrand,
  deleteDeviceBrand,
  getDeviceModels,
  createDeviceModel,
  deleteDeviceModel
} from '../api/devices'
import { useToast } from '../context/ToastContext'

function getDeviceIcon(name) {
  const n = (name || '').toLowerCase()
  if (n.includes('mobile') || n.includes('phone')) return <Smartphone size={18} />
  if (n.includes('laptop') || n.includes('notebook')) return <Laptop size={18} />
  if (n.includes('computer') || n.includes('desktop') || n.includes('pc')) return <Monitor size={18} />
  if (n.includes('tablet') || n.includes('pad')) return <Tablet size={18} />
  if (n.includes('watch') || n.includes('wearable')) return <Watch size={18} />
  if (n.includes('console') || n.includes('game') || n.includes('gaming')) return <Gamepad2 size={18} />
  return <Cpu size={18} />
}

export default function Devices() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('models') // 'models' | 'brands' | 'types'

  // Data states
  const [types, setTypes] = useState([])
  const [brands, setBrands] = useState([])
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [selectedType, setSelectedType] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [search, setSearch] = useState('')

  // Modals
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [showBrandModal, setShowBrandModal] = useState(false)
  const [showModelModal, setShowModelModal] = useState(false)

  // Form states
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeDesc, setNewTypeDesc] = useState('')

  const [newBrandName, setNewBrandName] = useState('')
  const [newBrandType, setNewBrandType] = useState('')

  const [newModelName, setNewModelName] = useState('')
  const [newModelBrand, setNewModelBrand] = useState('')
  const [newModelType, setNewModelType] = useState('')

  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [tList, bList, mList] = await Promise.all([
        getDeviceTypes(),
        getDeviceBrands(),
        getDeviceModels()
      ])
      setTypes(tList)
      setBrands(bList)
      setModels(mList)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handlers for Device Types
  async function handleCreateType(e) {
    e.preventDefault()
    if (!newTypeName.trim()) return
    setSaving(true)
    try {
      const created = await createDeviceType({ name: newTypeName.trim(), description: newTypeDesc.trim() })
      toast(`Device type "${created.name}" created`, 'success')
      setTypes(prev => [...prev, created])
      setShowTypeModal(false)
      setNewTypeName('')
      setNewTypeDesc('')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteType(id, name) {
    if (!window.confirm(`Delete device type "${name}"? This will also remove associated brands and models.`)) return
    try {
      await deleteDeviceType(id)
      toast(`Device type "${name}" deleted`, 'success')
      loadData()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  // Handlers for Brands
  async function handleCreateBrand(e) {
    e.preventDefault()
    if (!newBrandName.trim() || !newBrandType) {
      toast('Brand name and device type are required', 'error')
      return
    }
    setSaving(true)
    try {
      const created = await createDeviceBrand({ name: newBrandName.trim(), device_type: newBrandType })
      toast(`Brand "${created.name}" added to ${created.device_type}`, 'success')
      setBrands(prev => [...prev, created])
      setShowBrandModal(false)
      setNewBrandName('')
      setNewBrandType('')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteBrand(id, name, type) {
    if (!window.confirm(`Delete brand "${name}" from ${type}? This will also delete its linked models.`)) return
    try {
      await deleteDeviceBrand(id)
      toast(`Brand "${name}" deleted`, 'success')
      loadData()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  // Handlers for Models
  async function handleCreateModel(e) {
    e.preventDefault()
    if (!newModelName.trim() || !newModelBrand || !newModelType) {
      toast('Model name, brand, and device type are required', 'error')
      return
    }
    setSaving(true)
    try {
      const created = await createDeviceModel({
        name: newModelName.trim(),
        brand: newModelBrand,
        device_type: newModelType
      })
      toast(`Model "${created.name}" created successfully`, 'success')
      setModels(prev => [created, ...prev])
      setShowModelModal(false)
      setNewModelName('')
      setNewModelBrand('')
      setNewModelType('')
      // Refresh brands in case auto-created
      getDeviceBrands().then(setBrands).catch(() => {})
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteModel(id, name) {
    if (!window.confirm(`Delete model "${name}"?`)) return
    try {
      await deleteDeviceModel(id)
      toast(`Model "${name}" deleted`, 'success')
      setModels(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  // Filtered lists
  const filteredBrandsForDropdown = newModelType
    ? brands.filter(b => b.device_type === newModelType)
    : brands

  const displayedModels = models.filter(m => {
    if (selectedType && m.device_type !== selectedType) return false
    if (selectedBrand && m.brand !== selectedBrand) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        m.name.toLowerCase().includes(q) ||
        m.brand.toLowerCase().includes(q) ||
        m.device_type.toLowerCase().includes(q)
      )
    }
    return true
  })

  const displayedBrands = brands.filter(b => {
    if (selectedType && b.device_type !== selectedType) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return b.name.toLowerCase().includes(q) || b.device_type.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Device Catalog &amp; Hardware</h1>
          <p className="page-subtitle">
            Manage device categories, manufacturer brands, and supported repair model matrices.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {activeTab === 'models' && (
            <button className="btn btn-primary" onClick={() => setShowModelModal(true)}>
              <Plus size={16} /> Add Model
            </button>
          )}
          {activeTab === 'brands' && (
            <button className="btn btn-primary" onClick={() => setShowBrandModal(true)}>
              <Plus size={16} /> Add Brand
            </button>
          )}
          {activeTab === 'types' && (
            <button className="btn btn-primary" onClick={() => setShowTypeModal(true)}>
              <Plus size={16} /> Add Device Type
            </button>
          )}
        </div>
      </div>

      {/* Metrics Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '16px 20px',
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{ width: 42, height: 42, borderRadius: 'var(--r-md)', background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{types.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Device Categories</div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            padding: '16px 20px',
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{ width: 42, height: 42, borderRadius: 'var(--r-md)', background: 'rgba(168, 85, 247, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc' }}>
            <Tag size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#c084fc' }}>{brands.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Manufacturer Brands</div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            padding: '16px 20px',
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{ width: 42, height: 42, borderRadius: 'var(--r-md)', background: 'rgba(34, 197, 94, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
            <Cpu size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>{models.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Supported Models</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'models' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('models')}
          style={{ gap: 8 }}
        >
          <Cpu size={15} /> Models Matrix ({models.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'brands' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('brands')}
          style={{ gap: 8 }}
        >
          <Tag size={15} /> Brands Directory ({brands.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'types' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('types')}
          style={{ gap: 8 }}
        >
          <Layers size={15} /> Device Categories ({types.length})
        </button>
      </div>

      {/* Toolbar & Filters */}
      <div className="toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="search-wrap" style={{ minWidth: 260 }}>
          <Search size={15} className="search-icon" />
          <input
            className="search-input"
            placeholder={
              activeTab === 'models'
                ? 'Search model name, brand, or category…'
                : activeTab === 'brands'
                ? 'Search brand name…'
                : 'Search device types…'
            }
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Category Filter */}
        {(activeTab === 'models' || activeTab === 'brands') && (
          <select
            className="form-select"
            value={selectedType}
            onChange={e => {
              setSelectedType(e.target.value)
              setSelectedBrand('')
            }}
            style={{ width: 180, height: 38, fontSize: '0.82rem' }}
          >
            <option value="">All Device Types</option>
            {types.map(t => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))}
          </select>
        )}

        {/* Brand Filter (Models Tab only) */}
        {activeTab === 'models' && (
          <select
            className="form-select"
            value={selectedBrand}
            onChange={e => setSelectedBrand(e.target.value)}
            style={{ width: 180, height: 38, fontSize: '0.82rem' }}
          >
            <option value="">All Brands</option>
            {brands
              .filter(b => !selectedType || b.device_type === selectedType)
              .map(b => (
                <option key={b.id} value={b.name}>{b.name} ({b.device_type})</option>
              ))}
          </select>
        )}

        {(search || selectedType || selectedBrand) && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setSearch('')
              setSelectedType('')
              setSelectedBrand('')
            }}
            style={{ fontSize: '0.8rem' }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : activeTab === 'models' ? (
        /* MODELS TAB */
        displayedModels.length === 0 ? (
          <div className="table-wrapper">
            <div className="empty-state">
              <Cpu size={40} strokeWidth={1.2} />
              <p>No models found matching your search. Add one with "+ Add Model".</p>
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Model Name</th>
                  <th>Brand</th>
                  <th>Device Category</th>
                  <th>Registered</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {displayedModels.map(m => (
                  <tr key={m.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{m.name}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--accent-light)' }}>{m.brand}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: 'rgba(59, 130, 246, 0.12)',
                          color: '#60a5fa',
                          textTransform: 'uppercase',
                        }}
                      >
                        {m.device_type}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="btn btn-danger btn-sm btn-icon"
                          title="Delete Model"
                          onClick={() => handleDeleteModel(m.id, m.name)}
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
        )
      ) : activeTab === 'brands' ? (
        /* BRANDS TAB */
        displayedBrands.length === 0 ? (
          <div className="table-wrapper">
            <div className="empty-state">
              <Tag size={40} strokeWidth={1.2} />
              <p>No brands found matching your search.</p>
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Brand Name</th>
                  <th>Device Category</th>
                  <th>Models Count</th>
                  <th>Registered</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {displayedBrands.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 700, fontSize: '0.8rem' }}>
                          {b.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{b.name}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: 'rgba(59, 130, 246, 0.12)',
                          color: '#60a5fa',
                          textTransform: 'uppercase',
                        }}
                      >
                        {b.device_type}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {b.models_count !== undefined ? b.models_count : models.filter(m => m.brand === b.name && m.device_type === b.device_type).length} Models
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="btn btn-danger btn-sm btn-icon"
                          title="Delete Brand"
                          onClick={() => handleDeleteBrand(b.id, b.name, b.device_type)}
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
        )
      ) : (
        /* DEVICE TYPES TAB */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {types.map(t => {
            const bCount = brands.filter(b => b.device_type === t.name).length
            const mCount = models.filter(m => m.device_type === t.name).length
            return (
              <div
                key={t.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-md)',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 'var(--r-sm)', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                      {getDeviceIcon(t.name)}
                    </div>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{t.name}</span>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm btn-icon"
                    onClick={() => handleDeleteType(t.id, t.name)}
                    title="Delete Category"
                  >
                    <Trash2 size={14} color="var(--danger)" />
                  </button>
                </div>

                {t.description && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {t.description}
                  </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <span>{bCount} Brands</span>
                  <span>{mCount} Models</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* CREATE MODEL MODAL */}
      {showModelModal && (
        <div className="modal-overlay" onClick={() => setShowModelModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <span className="modal-title">Add New Hardware Model</span>
              <button className="modal-close" onClick={() => setShowModelModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateModel}>
              <div className="form-grid">
                <div className="form-group form-grid-full">
                  <label className="form-label">Device Category <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    className="form-select"
                    value={newModelType}
                    onChange={e => {
                      setNewModelType(e.target.value)
                      setNewModelBrand('')
                    }}
                    required
                  >
                    <option value="">— Select Category —</option>
                    {types.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group form-grid-full">
                  <label className="form-label">Manufacturer Brand <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    className="form-select"
                    value={newModelBrand}
                    onChange={e => setNewModelBrand(e.target.value)}
                    required
                    disabled={!newModelType}
                  >
                    <option value="">{newModelType ? '— Select Brand —' : '— Select Category First —'}</option>
                    {filteredBrandsForDropdown.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group form-grid-full">
                  <label className="form-label">Model Name / Number <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    className="form-input"
                    placeholder="e.g. iPhone 16 Pro Max, XPS 15 9530, PS5 Slim"
                    value={newModelName}
                    onChange={e => setNewModelName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModelModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Create Model'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE BRAND MODAL */}
      {showBrandModal && (
        <div className="modal-overlay" onClick={() => setShowBrandModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <span className="modal-title">Add Manufacturer Brand</span>
              <button className="modal-close" onClick={() => setShowBrandModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateBrand}>
              <div className="form-grid">
                <div className="form-group form-grid-full">
                  <label className="form-label">Device Category <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    className="form-select"
                    value={newBrandType}
                    onChange={e => setNewBrandType(e.target.value)}
                    required
                  >
                    <option value="">— Select Category —</option>
                    {types.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group form-grid-full">
                  <label className="form-label">Brand Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    className="form-input"
                    placeholder="e.g. Nothing, Raspberry Pi, Garmin, Bose"
                    value={newBrandName}
                    onChange={e => setNewBrandName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowBrandModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Add Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TYPE MODAL */}
      {showTypeModal && (
        <div className="modal-overlay" onClick={() => setShowTypeModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <span className="modal-title">Add Device Category</span>
              <button className="modal-close" onClick={() => setShowTypeModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateType}>
              <div className="form-grid">
                <div className="form-group form-grid-full">
                  <label className="form-label">Category Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    className="form-input"
                    placeholder="e.g. Drone, Audio Equipment, TV / Monitor"
                    value={newTypeName}
                    onChange={e => setNewTypeName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group form-grid-full">
                  <label className="form-label">Description (Optional)</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Brief description of device types in this category…"
                    value={newTypeDesc}
                    onChange={e => setNewTypeDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowTypeModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
