import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wrench, Users, Package, FileText, TrendingUp, ArrowRight } from 'lucide-react'
import { getStats, getRecent } from '../api/invoices'
import StatusBadge from '../components/StatusBadge'

function StatCard({ icon: Icon, value, label, color, bg }) {
  return (
    <div className="stat-card">
      <div className="stat-icon-wrap" style={{ background: bg }}>
        <Icon size={22} color={color} />
      </div>
      <div className="stat-body">
        <div className="stat-value" style={{ color }}>{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats]   = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([getStats(), getRecent()])
      .then(([s, r]) => { setStats(s); setRecent(r) })
      .catch(err => {
        console.error('Dashboard load error:', err)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="page">
      <div className="spinner-wrap"><div className="spinner" /></div>
    </div>
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back — here's your shop at a glance.</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid-4">
        <StatCard
          icon={Wrench}
          value={stats?.openJobs ?? '—'}
          label="Open Jobs"
          color="var(--accent-light)"
          bg="var(--accent-dim)"
        />
        <StatCard
          icon={Package}
          value={stats?.lowStockParts ?? '—'}
          label="Low Stock Parts"
          color="var(--warning)"
          bg="var(--warning-dim)"
        />
        <StatCard
          icon={FileText}
          value={stats?.unpaidInvoices ?? '—'}
          label="Unpaid Invoices"
          color="var(--danger)"
          bg="var(--danger-dim)"
        />
        <StatCard
          icon={TrendingUp}
          value={stats ? `₹${Number(stats.totalRevenue).toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : '—'}
          label="Total Revenue"
          color="var(--success)"
          bg="var(--success-dim)"
        />
      </div>

      {/* Recent jobs */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <p className="section-title" style={{ marginBottom: 0 }}>Recent Service Jobs</p>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/jobs')}>
            View all <ArrowRight size={14} />
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="empty-state">
            <Wrench size={36} strokeWidth={1.2} />
            <p>No jobs yet. Create your first service job.</p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Device</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(job => (
                  <tr key={job.id} onClick={() => navigate('/jobs')} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600 }}>{job.customer_name || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {job.device_type}{job.device_model ? ` · ${job.device_model}` : ''}
                    </td>
                    <td><StatusBadge status={job.status} /></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(job.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick nav */}
      <div className="grid-2" style={{ marginTop: 20 }}>
        <button className="card" style={{ textAlign:'left', cursor:'pointer', border:'1px solid var(--border)' }}
          onClick={() => navigate('/customers')}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div className="stat-icon-wrap" style={{ background:'rgba(99,102,241,0.12)', width:44, height:44 }}>
              <Users size={20} color="#6366F1" />
            </div>
            <div>
              <div style={{ fontWeight:700, marginBottom:2 }}>Manage Customers</div>
              <div style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>Add or search customers</div>
            </div>
            <ArrowRight size={16} style={{ marginLeft:'auto', color:'var(--text-muted)' }} />
          </div>
        </button>
        <button className="card" style={{ textAlign:'left', cursor:'pointer', border:'1px solid var(--border)' }}
          onClick={() => navigate('/parts')}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div className="stat-icon-wrap" style={{ background:'rgba(16,185,129,0.12)', width:44, height:44 }}>
              <Package size={20} color="var(--success)" />
            </div>
            <div>
              <div style={{ fontWeight:700, marginBottom:2 }}>Parts & Inventory</div>
              <div style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>Monitor stock levels</div>
            </div>
            <ArrowRight size={16} style={{ marginLeft:'auto', color:'var(--text-muted)' }} />
          </div>
        </button>
      </div>
    </div>
  )
}
