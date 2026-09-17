import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Wrench,
  Package,
  FileText,
  UserCheck,
  Cpu,
  Shield,
  LogOut,
  User,
  Layers
} from 'lucide-react'
import { ToastProvider, useToast } from './context/ToastContext'
import { AuthRoleProvider, useAuthRole } from './context/AuthRoleContext'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Jobs from './pages/Jobs'
import TechnicianPortal from './pages/TechnicianPortal'
import Parts from './pages/Parts'
import Invoices from './pages/Invoices'
import Staff from './pages/Staff'
import Devices from './pages/Devices'
import Login from './pages/Login'

const ALL_NAV_ITEMS = [
  { to: '/',            label: 'Dashboard',           icon: LayoutDashboard, roles: ['Admin'] },
  { to: '/technician',  label: 'My Workbench',        icon: Cpu,             roles: ['Admin', 'Technician'] },
  { to: '/jobs',        label: 'Service Jobs',        icon: Wrench,          roles: ['Admin', 'Technician', 'Receptionist'] },
  { to: '/customers',   label: 'Customers',           icon: Users,           roles: ['Admin', 'Receptionist'] },
  { to: '/devices',     label: 'Device Management',   icon: Layers,          roles: ['Admin', 'Technician', 'Receptionist'] },
  { to: '/parts',       label: 'Parts & Stock',       icon: Package,         roles: ['Admin', 'Technician'] },
  { to: '/invoices',    label: 'Invoices & Billing',  icon: FileText,        roles: ['Admin', 'Receptionist'] },
  { to: '/staff',       label: 'Staff & Team',        icon: UserCheck,       roles: ['Admin'] },
]

function RoleBadge({ role }) {
  const isAdm = role === 'Admin'
  const isTech = role === 'Technician'
  const color = isAdm ? '#f87171' : isTech ? '#60a5fa' : '#34d399'
  const bg = isAdm ? 'rgba(239,68,68,0.12)' : isTech ? 'rgba(59,130,246,0.12)' : 'rgba(16,185,129,0.12)'
  const border = isAdm ? 'rgba(239,68,68,0.25)' : isTech ? 'rgba(59,130,246,0.25)' : 'rgba(16,185,129,0.25)'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 99,
        fontSize: '0.68rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        background: bg,
        color: color,
        border: `1px solid ${border}`,
      }}
    >
      {role}
    </span>
  )
}

function Sidebar() {
  const { user, logoutUser } = useAuthRole()
  const toast = useToast()
  const navigate = useNavigate()

  const userRole = user?.role || ''
  const navItems = ALL_NAV_ITEMS.filter(item => item.roles.includes(userRole))

  function handleLogout() {
    logoutUser()
    toast('Logged out successfully', 'info')
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      {/* Brand Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Wrench size={20} />
        </div>
        <div>
          <div className="sidebar-logo-text">FixDesk</div>
          <div className="sidebar-logo-sub">
            {userRole === 'Technician' ? 'Technician Portal' : userRole === 'Receptionist' ? 'Front Desk Desk' : 'Shop Management'}
          </div>
        </div>
      </div>

      {/* Logged in User Profile Card */}
      {user && (
        <div
          style={{
            margin: '0 12px 14px 12px',
            padding: '10px 12px',
            background: 'var(--bg-input, rgba(255,255,255,0.03))',
            borderRadius: 'var(--r-md, 8px)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: userRole === 'Admin' ? 'rgba(239,68,68,0.15)' : userRole === 'Technician' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
              color: userRole === 'Admin' ? '#f87171' : userRole === 'Technician' ? '#60a5fa' : '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.85rem',
              flexShrink: 0,
            }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </div>
            <div style={{ marginTop: 2 }}>
              <RoleBadge role={user.role} />
            </div>
          </div>
        </div>
      )}

      {/* Role-filtered Navigation */}
      <nav className="sidebar-nav" style={{ flex: 1 }}>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/' || to === '/technician'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout & Footer */}
      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          type="button"
          onClick={handleLogout}
          className="btn btn-ghost btn-sm"
          style={{
            width: '100%',
            justifyContent: 'center',
            gap: 8,
            color: 'var(--danger)',
            borderColor: 'rgba(239,68,68,0.2)',
          }}
        >
          <LogOut size={14} /> Sign Out
        </button>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          FixDesk v1.0 &middot; Authenticated
        </div>
      </div>
    </aside>
  )
}

function ProtectedLayout({ allowedRoles, children }) {
  const { isAuthenticated, loading, user } = useAuthRole()

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // If not authorized for this specific page, redirect to their role home
    if (user.role === 'Technician') {
      return <Navigate to="/technician" replace />
    } else if (user.role === 'Receptionist') {
      return <Navigate to="/jobs" replace />
    }
    return <Navigate to="/" replace />
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthRoleProvider>
        <ToastProvider>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Admin-only Dashboard */}
            <Route
              path="/"
              element={
                <ProtectedLayout allowedRoles={['Admin']}>
                  <Dashboard />
                </ProtectedLayout>
              }
            />

            {/* Technician & Admin Workbench */}
            <Route
              path="/technician"
              element={
                <ProtectedLayout allowedRoles={['Admin', 'Technician']}>
                  <TechnicianPortal />
                </ProtectedLayout>
              }
            />

            {/* Service Jobs (Admin, Tech, Receptionist) */}
            <Route
              path="/jobs"
              element={
                <ProtectedLayout allowedRoles={['Admin', 'Technician', 'Receptionist']}>
                  <Jobs />
                </ProtectedLayout>
              }
            />

            {/* Customers (Admin, Receptionist) */}
            <Route
              path="/customers"
              element={
                <ProtectedLayout allowedRoles={['Admin', 'Receptionist']}>
                  <Customers />
                </ProtectedLayout>
              }
            />

            {/* Device Catalog Management (Admin, Technician, Receptionist) */}
            <Route
              path="/devices"
              element={
                <ProtectedLayout allowedRoles={['Admin', 'Technician', 'Receptionist']}>
                  <Devices />
                </ProtectedLayout>
              }
            />

            {/* Parts & Stock (Admin, Technician) */}
            <Route
              path="/parts"
              element={
                <ProtectedLayout allowedRoles={['Admin', 'Technician']}>
                  <Parts />
                </ProtectedLayout>
              }
            />

            {/* Invoices & Billing (Admin, Receptionist) */}
            <Route
              path="/invoices"
              element={
                <ProtectedLayout allowedRoles={['Admin', 'Receptionist']}>
                  <Invoices />
                </ProtectedLayout>
              }
            />

            {/* Staff Management (Admin only) */}
            <Route
              path="/staff"
              element={
                <ProtectedLayout allowedRoles={['Admin']}>
                  <Staff />
                </ProtectedLayout>
              }
            />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthRoleProvider>
    </BrowserRouter>
  )
}
