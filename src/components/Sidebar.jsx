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
  { href: '#/user', id: 'user', label: 'Utilisateurs' }

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

}

export default function Sidebar({ onToggleCalculator }) {
  const [current, setCurrent] = useState(window.location.hash || '#/dashboard')
  const [user, setUser] = useState(() => getCurrentUser())
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [loadingLogout, setLoadingLogout] = useState(false)
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

  // If the user is an employee, show only Sales, Stock, and Arrivals links
  const LINKS = user && user.role === 'employee'
    ? ALL_LINKS.filter(l => l.href === '#/sales' || l.href === '#/stock' || l.href === '#/arrivals')
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

          {/* Logout Button */}
          {user && (
            <a
              href="#"
              className={`logout-nav-item ${loadingLogout ? 'loading' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                handleLogout()
                closeMobile()
              }}
              title={isCollapsed ? 'Déconnexion' : 'Déconnexion'}
            >
              <span className="link-icon-wrapper">
                {loadingLogout ? (
                  <span className="spinner-small" style={{ width: 18, height: 18 }}></span>
                ) : (
                  <span className="iconify link-icon" data-icon="mdi:logout" data-inline="false" aria-hidden="true"></span>
                )}
              </span>
              {!isCollapsed && <span className="nav-label">{loadingLogout ? 'Déconnexion...' : 'Déconnexion'}</span>}
            </a>
          )}
        </nav>

      </aside>
    </>
  )
}


