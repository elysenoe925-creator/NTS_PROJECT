import React, { useEffect, useState } from 'react'
import { getProducts, subscribe, getProductsForStore, setReorderRequested, isReorderRequested, refreshProducts } from '../lib/productsStore'
import { refreshSales } from '../lib/salesStore'
import { useStore } from '../lib/StoreContext'
import { useSettings } from '../lib/settingsStore'
import { playAlertSound } from '../lib/sound'
import IconButton from './IconButton'

const DEFAULT_THRESHOLD = 5

export default function LowStockAlerts() {
  const [low, setLow] = useState([])
  const [loading, setLoading] = useState(false)
  const { settings, updateSettings } = useSettings()
  const { currentStore } = useStore()

  useEffect(() => {
    let mounted = true
    const compute = () => {
      const list = getProductsForStore(currentStore)
      const items = list.filter(p => (Number(p.qty) || 0) < (p.reorderThreshold || DEFAULT_THRESHOLD))
      setLow(items)

      // Trigger notification if enabled and items found
      if (items.length > 0 && settings.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
        // Debounce or check if already notified to avoid spam? 
        // For now, simple check.
        const title = currentStore && currentStore !== 'all' ? `Stock faible (${currentStore})` : `Stock faible`
        new Notification(title, { body: `${items.length} articles sont en dessous du seuil.` })
        playAlertSound('warning') // Also play sound
      }
    }

    setLoading(true)
    Promise.all([refreshProducts(currentStore).catch(() => { }), refreshSales(currentStore).catch(() => { })]).finally(() => {
      if (!mounted) return
      compute()
      setLoading(false)
    })

    const unsub = subscribe(compute)
    return () => { mounted = false; unsub() }
  }, [currentStore, settings.notificationsEnabled]) // Re-run when settings change


  async function requestNotificationPermission() {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      updateSettings({ notificationsEnabled: true })
    }
  }

  if (loading) return <div className="card">Loading alerts...</div>
  if (!low.length) return null

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#dc2626' }}>Alertes: stock faible ({low.length})</h3>
        <div style={{ display: 'flex', gap: 8 }}>
           <button className="btn" onClick={requestNotificationPermission}>{settings.notificationsEnabled && Notification.permission === 'granted' ? 'Notifications actives' : 'Activer notifications'}</button>
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        {low.map(p => (
          <div key={p.sku} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #f3f4f6' }}>
            <div>
              <div>{p.sku} — {p.name}</div>
              <div style={{ color: '#6b7280', fontSize: 13 }}>Qté: {p.qty} • Seuil: {p.reorderThreshold || DEFAULT_THRESHOLD}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {isReorderRequested(p, currentStore) ? (
                <IconButton onClick={() => clearOrdered(p.sku)} className="" style={{ padding: '8px 12px' }} tooltip="Annuler réappro">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" style={{ width: 16, height: 16, marginRight: 8 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M8 12h8" />
                  </svg>
                  <span style={{ marginLeft: 6 }}>Annuler réappro</span>
                </IconButton>
              ) : (
                <IconButton onClick={() => markOrdered(p.sku)} className="" style={{ padding: '8px 12px', background: '#2563eb', color: '#fff' }} tooltip="Demander réappro">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" style={{ width: 16, height: 16, marginRight: 8 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M12 8v8" />
                    <path d="M8 12h8" />
                  </svg>
                  <span style={{ marginLeft: 6 }}>Demander réappro</span>
                </IconButton>
              )}
              <button className="btn" onClick={() => clearOrdered(p.sku)}>Ignorer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
