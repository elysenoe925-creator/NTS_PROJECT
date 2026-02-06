import React, { useState, useEffect } from 'react'
import { getCurrentUser, logout, subscribeAuth } from '../lib/authStore'
import { LogOut } from 'lucide-react'
import { useSettings } from '../lib/settingsStore'

const ALL_LINKS = [
  { href: '#/dashboard', id: 'dashboard', label: 'Tableau de bord' },
  { href: '#/sales', id: 'sales', label: 'Ventes' },
  { href: '#/stock', id: 'stock', label: 'Stock' },
  { href: '#/arrivals', id: 'arrivals', label: 'Arrivages' },
  { href: '#/decisions', id: 'decisions', label: 'Décisions' },
  { href: '#/orders', id: 'orders', label: 'Commandes' },
  { href: '#/tracking', id: 'tracking', label: 'Suivi' },
  { href: '#/user', id: 'user', label: 'Utilisateurs' },
  { href: '#/settings', id: 'settings', label: 'Paramètres' }

]

const ICONS = {
  '#/dashboard': 'mdi:view-dashboard',
  '#/sales': 'mdi:cash-register',
  '#/stock': 'mdi:package-variant-closed',
  '#/arrivals': 'mdi:truck-delivery',
  '#/decisions': 'mdi:clipboard-text',
  '#/orders': 'mdi:clipboard-list',
  '#/tracking': 'mdi:history',
  '#/user': 'mdi:user',
  '#/settings': 'mdi:cog'

}

export default function Sidebar({ onToggleCalculator }) {
  const [current, setCurrent] = useState(window.location.hash || '#/dashboard')
  const [user, setUser] = useState(() => getCurrentUser())
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [loadingLogout, setLoadingLogout] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const { settings } = useSettings() // Subscribe to settings changes

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

  // If the user is an employee, show Dashboard, Sales, Stock, and Arrivals links
  const LINKS = user && user.role === 'employee'
    ? ALL_LINKS.filter(l => l.href === '#/dashboard' || l.href === '#/sales' || l.href === '#/stock' || l.href === '#/arrivals')
    : ALL_LINKS.filter(l => l.href !== '#/tracking' || (user && user.role === 'admin'))

  const closeMobile = () => setMobileOpen(false)

  return (
    <>
      {/* Mobile menu toggle button */}
      <button
        className={`mobile-menu-btn ${mobileOpen ? 'active' : ''}`}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={mobileOpen}
        aria-controls="sidebar"
      >
        <span className="hamburger-icon">
          <span className="hamburger-line hamburger-line-1"></span>
          <span className="hamburger-line hamburger-line-2"></span>
          <span className="hamburger-line hamburger-line-3"></span>
        </span>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="mobile-overlay"
          onClick={closeMobile}
          aria-hidden="true"
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar-responsive ${mobileOpen ? 'sidebar-open' : 'sidebar-closed'} ${isCollapsed ? 'sidebar-collapsed' : ''}`} id="sidebar">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 lg:justify-between">
          {!isCollapsed && (
            <div className="logo-section">
              <div className="logo-icon">
                <span className="iconify text-3xl" data-icon="mdi:package-variant-closed"></span>
              </div>
              <div>
                <div className="logo-text">Ntsoa GSM</div>
                <div className="logo-subtitle">Gestion Stock</div>
              </div>
            </div>
          )}
          {isCollapsed && <div className="logo-icon-only">
            <span className="iconify text-2xl" data-icon="mdi:package-variant-closed"></span>
          </div>}
          <div className="flex gap-1">
            <button
              className="lg:flex hidden p-2 rounded-lg transition-all duration-300 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Développer" : "Réduire"}
              aria-label="Toggle sidebar collapse"
            >
              <span className="iconify text-xl" data-icon={isCollapsed ? "mdi:chevron-right" : "mdi:chevron-left"}></span>
            </button>
            <button
              className="lg:hidden p-2 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
              onClick={closeMobile}
              aria-label="Close sidebar"
            >
              <span className="iconify text-2xl" data-icon="mdi:close"></span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="nav flex-1">
          {LINKS.map(l => (
            <a
              key={l.href}
              href={l.href}
              className={current === l.href ? 'active' : ''}
              onClick={closeMobile}
              title={isCollapsed ? ICONS[l.href] : l.label}
            >
              <span className="link-icon-wrapper">
                <span className="iconify link-icon" data-icon={ICONS[l.href]} data-inline="false" aria-hidden="true"></span>
              </span>
              {!isCollapsed && <span className="nav-label">{l.label}</span>}
            </a>
          ))}

          {/* Calculator Button */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              if (onToggleCalculator) onToggleCalculator()
              closeMobile()
            }}
            title={isCollapsed ? 'Calculatrice' : 'Calculatrice'}
          >
            <span className="link-icon-wrapper">
              <span className="iconify link-icon" data-icon="mdi:calculator" data-inline="false" aria-hidden="true"></span>
            </span>
            {!isCollapsed && <span className="nav-label">Calculatrice</span>}
          </a>

        </nav>

        {/* User Profile Section */}
        {user && (
          <div className={`p-4 border-t border-slate-200 mt-auto ${isCollapsed ? 'flex justify-center' : ''}`}>
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="relative group">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center cursor-pointer relative">
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-sm z-10">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-slate-500">{user.displayName?.charAt(0).toUpperCase()}</span>
                  )}
                  {/* Upload overlay */}
                  <label htmlFor="avatar-upload" className={`absolute inset-0 bg-black/50 ${uploadingAvatar ? 'hidden' : 'hidden group-hover:flex'} items-center justify-center cursor-pointer transition-opacity opacity-0 group-hover:opacity-100`}>
                    <span className="iconify text-white text-xs" data-icon="mdi:camera"></span>
                  </label>
                  <input
                    type="file"
                    id="avatar-upload"
                    className="hidden"
                    accept="image/*"
                    disabled={uploadingAvatar}
                    onChange={(e) => {
                      const file = e.target.files[0]
                      if (file) {
                        setUploadingAvatar(true)
                        const reader = new FileReader()
                        reader.onloadstart = () => {
                          setUploadingAvatar(true)
                        }
                        reader.onloadend = async () => {
                          try {
                            const { updateProfile } = await import('../lib/authStore')
                            await updateProfile(user.id, { avatar: reader.result })
                            setTimeout(() => setUploadingAvatar(false), 300)
                          } catch (err) {
                            setUploadingAvatar(false)
                            alert('Erreur lors de la mise à jour de la photo: ' + err.message)
                          }
                        }
                        reader.onerror = () => {
                          setUploadingAvatar(false)
                          alert('Erreur lors du chargement de l\'image')
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                  />
                </div>
              </div>

              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">{user.displayName}</div>
                  <div className="text-xs text-slate-500 truncate capitalize">{user.role}</div>
                </div>
              )}

              {!isCollapsed && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    handleLogout()
                    closeMobile()
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Déconnexion"
                >
                  <span className="iconify text-xl" data-icon="mdi:logout"></span>
                </button>
              )}
            </div>
          </div>
        )}

      </aside>
    </>
  )
}


