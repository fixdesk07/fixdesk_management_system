import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, Check, X, Plus, RotateCcw, Edit3 } from 'lucide-react'
import { getDeviceModels } from '../api/devices'

export const MODELS_BY_BRAND_AND_DEVICE = {
  // Apple
  'Apple_Mobile': [
    'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
    'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
    'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 mini',
    'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 12 mini',
    'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11', 'iPhone SE (3rd Gen)',
    'iPhone XR', 'iPhone XS Max', 'iPhone X'
  ],
  'Apple (iPhone)_Mobile': [
    'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
    'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
    'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 mini',
    'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 12 mini',
    'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11', 'iPhone SE (3rd Gen)'
  ],
  'Apple_Laptop': [
    'MacBook Pro 16" (M3/M2/M1)', 'MacBook Pro 14" (M3/M2/M1)', 'MacBook Pro 13" (M2/M1)',
    'MacBook Air 15" (M3/M2)', 'MacBook Air 13" (M3/M2/M1)', 'MacBook Air (Intel)',
    'MacBook Pro 15" (Intel)', 'MacBook Pro 16" (Intel)'
  ],
  'Apple (Mac)_Computer': [
    'iMac 24" (M3/M1)', 'iMac 27" 5K', 'Mac Studio (M2/M1)', 'Mac mini (M2/M1)',
    'Mac Pro (Apple Silicon)', 'Mac Pro (Trashcan/Tower)'
  ],
  'Apple_Computer': [
    'iMac 24" (M3/M1)', 'iMac 27" 5K', 'Mac Studio (M2/M1)', 'Mac mini (M2/M1)', 'Mac Pro'
  ],

  // Samsung
  'Samsung_Mobile': [
    'Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24',
    'Galaxy S23 Ultra', 'Galaxy S23+', 'Galaxy S23', 'Galaxy S23 FE',
    'Galaxy S22 Ultra', 'Galaxy S22+', 'Galaxy S22',
    'Galaxy S21 Ultra', 'Galaxy S21 FE', 'Galaxy S21',
    'Galaxy Z Fold 5', 'Galaxy Z Fold 4', 'Galaxy Z Flip 5', 'Galaxy Z Flip 4',
    'Galaxy A55', 'Galaxy A54 5G', 'Galaxy A34 5G', 'Galaxy A15', 'Galaxy A14',
    'Galaxy M54', 'Galaxy M34 5G', 'Galaxy M14', 'Galaxy F54'
  ],
  'Samsung_Laptop': [
    'Galaxy Book4 Pro 360', 'Galaxy Book4 Pro', 'Galaxy Book4 360', 'Galaxy Book4',
    'Galaxy Book3 Ultra', 'Galaxy Book3 Pro 360', 'Galaxy Book3 Pro', 'Galaxy Book2 360'
  ],

  // Dell
  'Dell_Laptop': [
    'XPS 13 Plus', 'XPS 13', 'XPS 14', 'XPS 15', 'XPS 16', 'XPS 17',
    'Inspiron 15 (3520/3530)', 'Inspiron 14 2-in-1', 'Inspiron 16',
    'Latitude 5430', 'Latitude 5440', 'Latitude 7420', 'Latitude 3420',
    'Vostro 3510', 'Vostro 3520', 'Vostro 14',
    'G15 Gaming (5530)', 'G16 Gaming', 'Alienware m16 R2', 'Alienware x14'
  ],
  'Dell_Computer': [
    'OptiPlex 7000 Micro', 'OptiPlex 7090 Tower', 'OptiPlex 5090 SFF', 'OptiPlex 3080',
    'Inspiron Desktop (3020)', 'XPS Desktop (8960)', 'Precision 3660 Tower', 'Alienware Aurora R16'
  ],

  // HP
  'HP_Laptop': [
    'Pavilion 15', 'Pavilion 14', 'Pavilion Plus 14', 'Pavilion x360 14',
    'Envy x360 15', 'Envy 16', 'Spectre x360 14', 'Spectre x360 16',
    'OMEN 16', 'OMEN Transcend 14', 'Victus 16', 'Victus 15',
    'EliteBook 840 G10', 'EliteBook 840 G9', 'EliteBook 640', 'ProBook 450 G10', 'ProBook 440 G9',
    'HP 15s (Core i5/i3)', 'HP 14s'
  ],
  'HP_Computer': [
    'Pavilion Desktop', 'OMEN 45L Gaming Desktop', 'OMEN 25L',
    'EliteDesk 800 G9 Mini', 'ProDesk 400 G7 SFF', 'HP All-in-One 27', 'HP All-in-One 24'
  ],

  // Lenovo
  'Lenovo_Laptop': [
    'ThinkPad X1 Carbon Gen 11', 'ThinkPad T14 Gen 4', 'ThinkPad T14s', 'ThinkPad E14 Gen 5',
    'ThinkPad E16', 'ThinkPad L14', 'ThinkPad P16s',
    'IdeaPad Slim 3', 'IdeaPad Slim 5', 'IdeaPad Flex 5', 'IdeaPad Gaming 3',
    'Legion Pro 7i', 'Legion Pro 5i', 'Legion Slim 5', 'LOQ 15',
    'Yoga 9i', 'Yoga 7i', 'Yoga Slim 6'
  ],
  'Lenovo_Computer': [
    'ThinkCentre M70q Tiny', 'ThinkCentre M90t Tower', 'ThinkCentre Neo 50s',
    'IdeaCentre 3', 'IdeaCentre 5', 'IdeaCentre AIO 3', 'Legion Tower 7i', 'Legion Tower 5i'
  ],

  // ASUS
  'ASUS_Laptop': [
    'ZenBook 14 OLED', 'ZenBook Duo', 'ZenBook Pro 14',
    'VivoBook 15', 'VivoBook 14', 'VivoBook S 15 OLED', 'VivoBook Pro 15',
    'ROG Zephyrus G14', 'ROG Zephyrus G16', 'ROG Strix SCAR 16', 'ROG Strix G16',
    'TUF Gaming A15', 'TUF Gaming F15', 'ROG Flow X13', 'ExpertBook B9'
  ],
  'ASUS_Computer': [
    'ROG Strix G16CHR', 'ROG Strix GT15', 'ASUS S500TC Desktop', 'ASUS All-in-One A5402'
  ],

  // Acer
  'Acer_Laptop': [
    'Aspire 5', 'Aspire 3', 'Aspire 7 Gaming', 'Swift Go 14', 'Swift X',
    'Nitro 5', 'Nitro 16', 'Predator Helios 16', 'Predator Helios Neo 16', 'Extensa 15'
  ],

  // MSI
  'MSI_Laptop': [
    'Katana 15', 'Katana 17', 'Sword 16', 'Thin GF63', 'Cyborg 15',
    'Stealth 16 AI Studio', 'Raider GE78', 'Titan 18 HX', 'Modern 14', 'Modern 15', 'Prestige 14'
  ],

  // Xiaomi / Redmi
  'Xiaomi / Redmi_Mobile': [
    'Redmi Note 13 Pro+ 5G', 'Redmi Note 13 Pro 5G', 'Redmi Note 13 5G',
    'Redmi Note 12 Pro+ 5G', 'Redmi Note 12 Pro', 'Redmi Note 12 4G',
    'Redmi 13C 5G', 'Redmi 12 5G', 'Redmi A3', 'Redmi 10',
    'Xiaomi 14 Ultra', 'Xiaomi 14', 'Xiaomi 13 Pro', 'Xiaomi 12 Pro',
    'Xiaomi 11T Pro'
  ],
  'Xiaomi_Mobile': [
    'Xiaomi 14 Ultra', 'Xiaomi 14', 'Xiaomi 13 Pro', 'Redmi Note 13 Pro+', 'Redmi Note 13'
  ],

  // OnePlus
  'OnePlus_Mobile': [
    'OnePlus 12', 'OnePlus 12R', 'OnePlus 11 5G', 'OnePlus 11R 5G',
    'OnePlus 10 Pro', 'OnePlus 10T', 'OnePlus 10R', 'OnePlus 9 Pro', 'OnePlus 9',
    'OnePlus Nord 4', 'OnePlus Nord 3 5G', 'OnePlus Nord CE 4', 'OnePlus Nord CE 3 5G', 'OnePlus Nord CE 3 Lite'
  ],

  // Vivo
  'Vivo_Mobile': [
    'Vivo X100 Pro', 'Vivo X100', 'Vivo X90 Pro', 'Vivo X90',
    'Vivo V30 Pro', 'Vivo V30', 'Vivo V29 Pro', 'Vivo V29', 'Vivo V27 Pro', 'Vivo V27',
    'Vivo T3 5G', 'Vivo T2 Pro 5G', 'Vivo T2x 5G',
    'Vivo Y200 5G', 'Vivo Y28 5G', 'Vivo Y17s'
  ],

  // Oppo
  'Oppo_Mobile': [
    'Oppo Find X7 Ultra', 'Oppo Find N3 Flip', 'Oppo Find N2 Flip',
    'Oppo Reno 11 Pro 5G', 'Oppo Reno 11 5G', 'Oppo Reno 10 Pro+ 5G', 'Oppo Reno 10 5G',
    'Oppo F25 Pro 5G', 'Oppo F23 5G', 'Oppo F21 Pro',
    'Oppo A79 5G', 'Oppo A59 5G', 'Oppo A38', 'Oppo A18'
  ],

  // Realme
  'Realme_Mobile': [
    'Realme 12 Pro+ 5G', 'Realme 12 Pro 5G', 'Realme 12+ 5G', 'Realme 12 5G',
    'Realme 11 Pro+ 5G', 'Realme 11 Pro 5G', 'Realme 11 5G', 'Realme 11x 5G',
    'Realme GT 5 Pro', 'Realme GT 2 Pro', 'Realme GT Neo 3',
    'Realme Narzo 70 Pro 5G', 'Realme Narzo 60 5G', 'Realme C67 5G', 'Realme C53'
  ],

  // Google
  'Google (Pixel)_Mobile': [
    'Pixel 8 Pro', 'Pixel 8', 'Pixel 8a', 'Pixel Fold',
    'Pixel 7 Pro', 'Pixel 7', 'Pixel 7a',
    'Pixel 6 Pro', 'Pixel 6', 'Pixel 6a'
  ],
  'Google_Mobile': [
    'Pixel 8 Pro', 'Pixel 8', 'Pixel 8a', 'Pixel 7 Pro', 'Pixel 7', 'Pixel 6a'
  ],

  // Motorola
  'Motorola_Mobile': [
    'Edge 50 Ultra', 'Edge 50 Pro', 'Edge 50 Fusion', 'Edge 40 Neo', 'Edge 40',
    'Razr 40 Ultra', 'Razr 40', 'Moto G84 5G', 'Moto G64 5G', 'Moto G54 5G',
    'Moto G34 5G', 'Moto G24 Power', 'Moto E13'
  ],

  // Custom Built PC
  'Custom Built_Computer': [
    'Custom Gaming Tower', 'Mini-ITX Compact Build', 'Workstation Build',
    'Standard ATX Desktop', 'Liquid Cooled Custom PC', 'Office Desktop PC'
  ]
}

// Fallback generic models by device type
export const GENERIC_MODELS = {
  Laptop: [
    'Gaming Laptop 15.6"', 'Ultrabook 14"', 'Business Notebook 15"',
    'Convertible 2-in-1 Touch', 'Workstation Laptop 16"'
  ],
  Computer: [
    'Custom ATX Gaming PC', 'Mini ITX Desktop', 'Tower Workstation',
    'Slim Form Factor (SFF) PC', 'All-in-One Desktop'
  ],
  Mobile: [
    'Pro Flagship Series', 'Standard 5G Edition', 'Lite / Essential Edition',
    'Ultra Edition', 'Max Edition'
  ]
}

export default function SearchableModelSelect({
  value,
  onChange,
  brand,
  deviceType,
  placeholder = 'Select or search model…'
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dbModels, setDbModels] = useState([])

  useEffect(() => {
    getDeviceModels().then(setDbModels).catch(() => {})
  }, [])

  // Lookup key
  const lookupKey = `${brand}_${deviceType}`
  const brandModels = MODELS_BY_BRAND_AND_DEVICE[lookupKey] || []
  const fallbackModels = (deviceType && GENERIC_MODELS[deviceType]) ? GENERIC_MODELS[deviceType] : []

  // Matched live DB models
  const matchedDbModels = dbModels
    .filter(m => (!deviceType || m.device_type === deviceType) && (!brand || m.brand.toLowerCase() === brand.toLowerCase()))
    .map(m => m.name)

  const availableModels = Array.from(new Set([...matchedDbModels, ...brandModels, ...(brandModels.length === 0 && matchedDbModels.length === 0 ? fallbackModels : [])]))

  const [isOther, setIsOther] = useState(() => {
    return !!(value && availableModels.length > 0 && !availableModels.some(m => m.toLowerCase() === value.toLowerCase()))
  })
  const [customModel, setCustomModel] = useState(() => {
    return (value && availableModels.length > 0 && !availableModels.some(m => m.toLowerCase() === value.toLowerCase())) ? value : ''
  })

  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const customInputRef = useRef(null)

  // Sync if value changes externally
  useEffect(() => {
    if (value && availableModels.length > 0 && !availableModels.some(m => m.toLowerCase() === value.toLowerCase())) {
      setIsOther(true)
      setCustomModel(value)
    } else if (value && availableModels.some(m => m.toLowerCase() === value.toLowerCase())) {
      setIsOther(false)
      setCustomModel('')
    }
  }, [value, availableModels])

  // Filtered models
  const filteredModels = query.trim()
    ? availableModels.filter(m => m.toLowerCase().includes(query.toLowerCase()))
    : availableModels

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

  function handleSelect(model) {
    setIsOther(false)
    setCustomModel('')
    onChange(model)
    setOpen(false)
    setQuery('')
  }

  function handleSelectOther() {
    setIsOther(true)
    setOpen(false)
    setQuery('')
    onChange(customModel || '')
    setTimeout(() => customInputRef.current?.focus(), 50)
  }

  function handleSwitchToList() {
    setIsOther(false)
    setCustomModel('')
    onChange('')
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleCustomChange(e) {
    const val = e.target.value
    setCustomModel(val)
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
            value={customModel}
            onChange={handleCustomChange}
            placeholder={brand ? `Specify custom model for ${brand}…` : 'Specify custom model name / number…'}
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
            title="Switch back to model dropdown list"
          >
            <RotateCcw size={11} /> List
          </button>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--accent-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Edit3 size={11} /> Custom model mode active. Type custom model name above.
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
              title="Clear model"
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
              placeholder={brand ? `Search or type ${brand} model…` : 'Search or type model…'}
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

          {/* List of models */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
            {/* Custom entry if not exact match */}
            {query.trim() && !availableModels.some(m => m.toLowerCase() === query.trim().toLowerCase()) && (
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

            {filteredModels.length === 0 && !query.trim() ? (
              <div style={{ padding: '12px 14px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                No standard models found
              </div>
            ) : (
              filteredModels.map((model) => {
                const isSelected = value?.toLowerCase() === model.toLowerCase()
                return (
                  <button
                    key={model}
                    type="button"
                    onClick={() => handleSelect(model)}
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
                    <span>{model}</span>
                    {isSelected && <Check size={13} style={{ color: 'var(--accent-light, #60a5fa)' }} />}
                  </button>
                )
              })
            )}

            {/* Other / Custom Model Option */}
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
                <span>Other (Specify custom model…)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
