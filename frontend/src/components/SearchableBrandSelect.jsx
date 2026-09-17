import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, Check, X, Plus, RotateCcw, Edit3 } from 'lucide-react'
import { getDeviceBrands } from '../api/devices'

export const DEVICE_TYPES = ['Laptop', 'Computer', 'Mobile']

export const BRANDS_BY_DEVICE = {
  Laptop: [
    'Apple', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'MSI',
    'Samsung', 'LG', 'Microsoft Surface', 'Razer', 'Toshiba',
    'Sony VAIO', 'Huawei', 'Alienware', 'Gigabyte'
  ],
  Computer: [
    'Custom Built', 'Dell', 'HP', 'Lenovo', 'Apple (Mac)',
    'ASUS', 'Acer', 'MSI', 'Corsair', 'Intel NUC', 'Gigabyte',
    'Alienware', 'NZXT', 'iBUYPOWER'
  ],
  Mobile: [
    'Apple (iPhone)', 'Samsung', 'Xiaomi / Redmi', 'OnePlus',
    'Vivo', 'Oppo', 'Realme', 'Google (Pixel)', 'Motorola',
    'Nothing', 'POCO', 'Infinix', 'Tecno', 'Honor', 'Nokia',
    'IQOO', 'Sony Xperia', 'Asus ROG'
  ],
}

// Complete deduplicated list of all brands
export const ALL_BRANDS = Array.from(
  new Set([
    ...BRANDS_BY_DEVICE.Laptop,
    ...BRANDS_BY_DEVICE.Computer,
    ...BRANDS_BY_DEVICE.Mobile,
  ])
).sort()

export default function SearchableBrandSelect({
  value,
  onChange,
  deviceType,
  placeholder = 'Select or search brand…'
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dbBrands, setDbBrands] = useState([])

  useEffect(() => {
    getDeviceBrands().then(setDbBrands).catch(() => {})
  }, [])

  const [isOther, setIsOther] = useState(() => {
    return !!(value && !ALL_BRANDS.some(b => b.toLowerCase() === value.toLowerCase()))
  })
  const [customBrand, setCustomBrand] = useState(() => {
    return (value && !ALL_BRANDS.some(b => b.toLowerCase() === value.toLowerCase())) ? value : ''
  })

  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const customInputRef = useRef(null)

  // Sync if value changes externally
  useEffect(() => {
    if (value && !ALL_BRANDS.some(b => b.toLowerCase() === value.toLowerCase())) {
      setIsOther(true)
      setCustomBrand(value)
    } else if (value && ALL_BRANDS.some(b => b.toLowerCase() === value.toLowerCase())) {
      setIsOther(false)
      setCustomBrand('')
    }
  }, [value])

  // Suggested brands based on selected device type + DB brands
  const matchedDbBrands = deviceType
    ? dbBrands.filter(b => b.device_type === deviceType).map(b => b.name)
    : dbBrands.map(b => b.name)

  const staticSuggestedBrands = (deviceType && BRANDS_BY_DEVICE[deviceType])
    ? BRANDS_BY_DEVICE[deviceType]
    : ALL_BRANDS

  const combinedAllBrands = Array.from(new Set([...ALL_BRANDS, ...dbBrands.map(b => b.name)])).sort()
  const suggestedBrands = Array.from(new Set([...matchedDbBrands, ...staticSuggestedBrands]))

  // Filtered brands matching search query
  const filteredBrands = query.trim()
    ? combinedAllBrands.filter(b => b.toLowerCase().includes(query.toLowerCase()))
    : suggestedBrands

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(brand) {
    setIsOther(false)
    setCustomBrand('')
    onChange(brand)
    setOpen(false)
    setQuery('')
  }

  function handleSelectOther() {
    setIsOther(true)
    setOpen(false)
    setQuery('')
    onChange(customBrand || '')
    setTimeout(() => customInputRef.current?.focus(), 50)
  }

  function handleSwitchToList() {
    setIsOther(false)
    setCustomBrand('')
    onChange('')
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleCustomChange(e) {
    const val = e.target.value
    setCustomBrand(val)
    onChange(val)
  }

  function handleCustomInput(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (query.trim()) {
        handleSelect(query.trim())
      }
    }
  }

  if (isOther) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            ref={customInputRef}
            type="text"
            className="form-input"
            value={customBrand}
            onChange={handleCustomChange}
            placeholder="Specify custom brand name (e.g. Raspberry Pi, Nothing)…"
            style={{ paddingRight: 80 }}
            required
            autoFocus
          />
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={handleSwitchToList}
            style={{
              position: 'absolute',
              right: 6,
              fontSize: '0.72rem',
              gap: 4,
              color: 'var(--accent-light)',
              padding: '2px 6px',
            }}
            title="Switch back to brand dropdown list"
          >
            <RotateCcw size={11} /> List
          </button>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--accent-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Edit3 size={11} /> Custom brand mode active. Type your custom brand name above.
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger Button */}
      <div
        className="form-input"
        onClick={() => {
          setOpen(prev => !prev)
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          gap: 8,
          background: 'var(--bg-input)',
        }}
      >
        <span style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: value ? 500 : 400 }}>
          {value || placeholder}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 2,
                display: 'flex',
                alignItems: 'center',
              }}
              title="Clear brand"
            >
              <X size={13} />
            </button>
          )}
          <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 1050,
            background: 'var(--bg-elevated, #1a2234)',
            border: '1px solid var(--border-light, #2d3748)',
            borderRadius: 'var(--r-md, 8px)',
            boxShadow: 'var(--shadow-lg, 0 10px 25px -5px rgba(0, 0, 0, 0.4))',
            overflow: 'hidden',
            maxHeight: 280,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search Input Box */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-light, #2d3748)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleCustomInput}
              placeholder="Search or type brand name…"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* List of brands */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
            {/* If query doesn't match existing brands, offer to use query as custom brand */}
            {query.trim() && !ALL_BRANDS.some(b => b.toLowerCase() === query.trim().toLowerCase()) && (
              <button
                type="button"
                onClick={() => handleSelect(query.trim())}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 14px',
                  background: 'var(--accent-dim, rgba(59, 130, 246, 0.12))',
                  border: 'none',
                  color: 'var(--accent-light, #60a5fa)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>Use custom: &quot;<strong>{query.trim()}</strong>&quot;</span>
              </button>
            )}

            {filteredBrands.length === 0 && !query.trim() ? (
              <div style={{ padding: '12px 14px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                No brands available
              </div>
            ) : (
              filteredBrands.map((brand) => {
                const isSelected = value?.toLowerCase() === brand.toLowerCase()
                return (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => handleSelect(brand)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 14px',
                      background: isSelected ? 'var(--accent-dim, rgba(59, 130, 246, 0.15))' : 'transparent',
                      border: 'none',
                      color: isSelected ? 'var(--accent-light, #60a5fa)' : 'var(--text-primary)',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background var(--t-fast, 0.15s)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--bg-card-hover, rgba(255, 255, 255, 0.05))'
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <span>{brand}</span>
                    {isSelected && <Check size={13} style={{ color: 'var(--accent-light, #60a5fa)' }} />}
                  </button>
                )
              })
            )}

            {/* Other / Custom Brand Option */}
            <div style={{ borderTop: '1px solid var(--border-light, #2d3748)', marginTop: 4, paddingTop: 4 }}>
              <button
                type="button"
                onClick={handleSelectOther}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '9px 14px',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: 'none',
                  color: 'var(--accent-light, #60a5fa)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.18)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)'
                }}
              >
                <Plus size={13} />
                <span>Other (Specify custom brand…)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
