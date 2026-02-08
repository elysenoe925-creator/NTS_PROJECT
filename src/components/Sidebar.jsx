import React, { useState, useEffect } from 'react'
import { getCurrentUser, logout, subscribeAuth } from '../lib/authStore'
import {
  LogOut,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  ClipboardCheck,
  ClipboardList,
  History,
  Users,
  Settings,
  Calculator,
  ChevronLeft,
  ChevronRight,
  X,
  Camera
} from 'lucide-react'
import { useSettings } from '../lib/settingsStore'
import { showToast } from '../lib/toast'

const ALL_LINKS = [
  { href: '#/dashboard', id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '#/sales', id: 'sales', label: 'Ventes', icon: ShoppingCart },
  { href: '#/stock', id: 'stock', label: 'Stock', icon: Package },
  { href: '#/arrivals', id: 'arrivals', label: 'Arrivages', icon: Truck },
  { href: '#/decisions', id: 'decisions', label: 'Décisions', icon: ClipboardCheck },
  { href: '#/orders', id: 'orders', label: 'Commandes', icon: ClipboardList },
  { href: '#/tracking', id: 'tracking', label: 'Suivi', icon: History },
  { href: '#/user', id: 'user', label: 'Utilisateurs', icon: Users },
  { href: '#/settings', id: 'settings', label: 'Paramètres', icon: Settings }
]

export default function Sidebar({ onToggleCalculator }) {
  const [current, setCurrent] = useState(window.location.hash || '#/dashboard')
  const [user, setUser] = useState(() => getCurrentUser())
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [loadingLogout, setLoadingLogout] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const { settings } = useSettings()

  useEffect(() => {
    const onHash = () => setCurrent(window.location.hash || '#/dashboard')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const unsub = subscribeAuth(u => setUser(u))
    return unsub
  }, [])

  const handleLogout = () => {
    setLoadingLogout(true)
    setTimeout(() => {
      logout()
      setLoadingLogout(false)
      window.location.hash = '#/'
    }, 1500)
  }

  const LINKS = user && user.role === 'employee'
    ? ALL_LINKS.filter(l => l.href === '#/dashboard' || l.href === '#/sales' || l.href === '#/stock' || l.href === '#/arrivals')
    : ALL_LINKS.filter(l => l.href !== '#/tracking' || (user && user.role === 'admin'))

  const closeMobile = () => setMobileOpen(false)

  // Generate initials for avatar fallback
  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
  }

  // Get color for avatar fallback
  const getAvatarColor = (name) => {
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
    if (!name) return colors[0]
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <>
      {/* Mobile menu toggle */}
      <button
        className={`mobile-menu-btn ${mobileOpen ? 'active' : ''}`}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
      >
        <span className="hamburger-icon">
          <span className="hamburger-line hamburger-line-1"></span>
          <span className="hamburger-line hamburger-line-2"></span>
          <span className="hamburger-line hamburger-line-3"></span>
        </span>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && <div className="mobile-overlay" onClick={closeMobile} />}

      {/* Sidebar */}
      <aside className={`sidebar-responsive ${mobileOpen ? 'sidebar-open' : 'sidebar-closed'} ${isCollapsed ? 'sidebar-collapsed' : ''}`} id="sidebar">
        {/* Header / Logo */}
        <div className="flex items-center justify-between mb-10">
          {!isCollapsed ? (
            <div className="logo-section">
              <div className="logo-icon">
                <Package size={22} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <div className="logo-text">
                  Ntsoa <span className="logo-text-accent">GSM</span>
                </div>
               
              </div>
            </div>
          ) : (
            <div className="logo-icon-only mx-auto">
              <Package size={20} strokeWidth={2.5} />
            </div>
          )}

          <button
            className="hidden lg:flex p-2 rounded-xl transition-all duration-300 text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Développer" : "Réduire"}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>

          
        </div>

        {/* Navigation */}
        <nav className="nav flex-1 space-y-1">
          {LINKS.map(l => {
            const Icon = l.icon
            return (
              <a
                key={l.href}
                href={l.href}
                className={current === l.href ? 'active' : ''}
                onClick={closeMobile}
              >
                <span className="link-icon-wrapper">
                  <Icon size={20} className="link-icon" />
                </span>
                {!isCollapsed && <span className="nav-label">{l.label}</span>}
              </a>
            )
          })}

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              if (onToggleCalculator) onToggleCalculator()
              closeMobile()
            }}
          >
            <span className="link-icon-wrapper">
              <Calculator size={20} className="link-icon" />
            </span>
            {!isCollapsed && <span className="nav-label">Calculatrice</span>}
          </a>
        </nav>

        {/* User Profile Footer */}
        {user && (
          <div className="sidebar-footer pt-6">
            <div className={`user-section ${isCollapsed ? 'p-2 justify-center' : 'p-3'}`}>
              <div className="relative group">
                <div
                  className="w-10 h-10 rounded-xl overflow-hidden shadow-sm flex items-center justify-center relative cursor-pointer border-2 border-white"
                  style={{ backgroundColor: user.avatar ? 'transparent' : getAvatarColor(user.displayName) }}
                >
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-sm z-10">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-white">{getInitials(user.displayName)}</span>
                  )}

                  <label htmlFor="sidebar-avatar" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                    <Camera size={14} className="text-white" />
                  </label>
                  <input
                    type="file"
                    id="sidebar-avatar"
                    className="hidden"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files[0]
                      if (!file) return
                      setUploadingAvatar(true)
                      const reader = new FileReader()
                      reader.onloadend = async () => {
                        try {
                          const { updateProfile } = await import('../lib/authStore')
                          await updateProfile(user.id, { avatar: reader.result })
                          showToast('Photo de profil mise à jour !', 'success')
                        } catch (err) {
                          showToast('Erreur: ' + err.message, 'error')
                        } finally {
                          setUploadingAvatar(false)
                        }
                      }
                      reader.readAsDataURL(file)
                    }}
                  />
                </div>
              </div>

              {!isCollapsed && (
                <div className="flex-1 min-w-0 ml-1">
                  <div className="text-sm font-bold text-slate-900 truncate">{user.displayName}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{user.role}</div>
                </div>
              )}

              {!isCollapsed && (
                <button
                  onClick={handleLogout}
                  className="ml-auto p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="Déconnexion"
                >
                  <LogOut size={18} />
                </button>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Logout Overlay */}
      {loadingLogout && (
        <div className="logout-overlay">
          <div className="logout-content">
            <div className="logout-spinner" />
            <div className="logout-text">Session fermée...</div>
          </div>
        </div>
      )}
    </>
  )
}


