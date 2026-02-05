/*import React, { useState, useEffect } from 'react'
import { useStore } from '../lib/StoreContext'
import { getCurrentUser, logout, subscribeAuth } from '../lib/authStore'
import RadialMenu from './RadialMenu'

export default function Topbar() {
  const { currentStore, setCurrentStore } = useStore()
  const [radialOpen, setRadialOpen] = useState(false)
  const [user, setUser] = useState(() => getCurrentUser())
  const [loadingLogout, setLoadingLogout] = useState(false)

  useEffect(() => {
    const unsub = subscribeAuth(u => setUser(u))
    return unsub
  }, [])


  return (
    <header className="topbar">
      <div className="search">
        <input placeholder="Rechercher..." style={{width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e5e7eb'}} />
      </div>
      
      {(!user || user.role !== 'employee') && (
        <div style={{marginLeft:12, position:'relative'}}>
          <div className="store-switch" role="tablist" aria-label="Sélection boutique">
            <div className="store-switch-inner">
              {['all','majunga','tamatave'].map(key => {
                const labels = { all: 'Toutes', majunga: 'Majunga', tamatave: 'Tamatave' }
                const active = currentStore === key
                const allowed = !user || user.role === 'admin' || user.store === key
                return (
                  <button
                    key={key}
                    onClick={() => allowed && setCurrentStore(key)}
                    role="tab"
                    aria-selected={active}
                    disabled={!allowed}
                    className={`store-switch-btn ${active ? 'active' : ''}`}
                  >
                    {labels[key]}
                  </button>
                )
              })}
            </div>
            <div className="store-switch-pill" style={{transform: `translateX(${['all','majunga','tamatave'].indexOf(currentStore) * 100}%)`}} aria-hidden="true" />
          </div>

          
        </div>
      )}
      <div className="user">
        <div style={{textAlign: 'right'}}>
          <div>{user ? user.displayName : 'Invité'}</div>
          <div style={{fontSize:12, color:'#6b7280'}}>{user ? `${user.role} • ${user.store}` : 'Non connecté'}</div>
        </div>
        {user && <button className="btn" style={{marginLeft:12}} onClick={() => {
            setLoadingLogout(true)
            // small delay to show animation
            setTimeout(() => {
              logout()
              setLoadingLogout(false)
              window.location.hash = '#/'
            }, 4000)
          }} disabled={loadingLogout}>
          {loadingLogout ? <span className="spinner" aria-hidden></span> : <span className="iconify" data-icon="mdi:logout" data-inline="false" style={{marginRight:8, fontSize:16}}></span>}
          {loadingLogout ? 'Déconnexion...' : 'Déconnexion'}
        </button>}
      </div>
    </header>
  )
}
*/

import React, { useState, useEffect } from 'react'
import { useStore } from '../lib/StoreContext'
import { getCurrentUser, subscribeAuth } from '../lib/authStore'
import NotificationBadge from './NotificationBadge'
import { useSettings } from '../lib/settingsStore'

export default function Topbar() {
  const { currentStore, setCurrentStore } = useStore()
  const [user, setUser] = useState(() => getCurrentUser())
  const [searchFocus, setSearchFocus] = useState(false)
  const [route, setRoute] = useState(window.location.hash || '#/dashboard')
  const { settings } = useSettings()

  useEffect(() => {
    const unsub = subscribeAuth(u => setUser(u))
    return unsub
  }, [])

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || '#/dashboard')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <header className="topbar-responsive">
      <div className="topbar-container">
        {/* Left Section - Search */}
        <div className="topbar-section topbar-left">

        </div>

        {/* Center Section - Store Selector */}
        {(!user || user.role !== 'employee') && (
          <div className="topbar-section topbar-center">
            <div className="store-selector">
              {(() => {
                // Determine available stores based on current route
                let availableStores = ['all', 'majunga', 'tamatave']

                if (route === '#/user') {
                  // Users section: only "Tous"
                  availableStores = ['all']
                } else if (['#/arrivals', '#/orders', '#/decisions'].includes(route)) {
                  // Arrivals, Orders, Decisions sections: only Majunga and Tamatave
                  availableStores = ['majunga', 'tamatave']
                }

                return availableStores.map((key) => {
                  const labels = { all: 'Toutes', majunga: 'Majunga', tamatave: 'Tamatave' }
                  const active = currentStore === key
                  const allowed = !user || user.role === 'admin' || user.store === key

                  return (
                    <button
                      key={key}
                      disabled={!allowed}
                      onClick={() => allowed && setCurrentStore(key)}
                      className={`store-btn ${active ? 'active' : ''} ${!allowed ? 'disabled' : ''}`}
                      title={!allowed ? 'Accès refusé' : `Select ${labels[key]}`}
                    >
                      <span className="store-label">{labels[key]}</span>
                      {active && <span className="store-indicator"></span>}
                    </button>
                  )
                })
              })()}
            </div>
          </div>
        )}

        {/* Right Section - User Info */}
        <div className="topbar-section topbar-right">
          <div className="user-info">
            <div className="user-details">
              <div className="user-name">{user ? user.displayName : 'Invité'}</div>
              <div className="user-role">{user ? `${user.role} • ${user.store}` : 'Non connecté'}</div>
            </div>

            {user && user.role === 'admin' && (
              <NotificationBadge section="global" className="mr-3" />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}