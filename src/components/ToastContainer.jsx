import React, { useEffect, useState } from 'react'

import { playAlertSound } from '../lib/sound'
import { useSettings } from '../lib/settingsStore'

export default function ToastContainer() {
  const [toasts, setToasts] = useState([])
  const { settings } = useSettings()

  useEffect(() => {
    const onToast = (e) => {
      const t = e.detail

      // Play sound based on type
      if (t.type === 'error') playAlertSound('error')
      else if (t.type === 'success') playAlertSound('success')
      else playAlertSound('info')

      // Only show visual toast if notifications are enabled
      if (settings.notificationsEnabled) {
        setToasts(prev => [...prev, t])
        if (t.duration && t.duration > 0) {
          setTimeout(() => {
            setToasts(prev => prev.filter(x => x.id !== t.id))
          }, t.duration)
        }
      }
    }
    const onClear = (e) => {
      const id = e.detail && e.detail.id
      if (!id) return
      setToasts(prev => prev.filter(x => x.id !== id))
    }
    window.addEventListener('toast', onToast)
    window.addEventListener('toast-clear', onClear)
    return () => {
      window.removeEventListener('toast', onToast)
      window.removeEventListener('toast-clear', onClear)
    }
  }, [])

  if (!toasts || toasts.length === 0) return null

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ minWidth: 220, maxWidth: 380, padding: '10px 12px', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', background: t.type === 'error' ? '#fee2e2' : t.type === 'warn' ? '#fffbeb' : '#ecfdf5', color: t.type === 'error' ? '#991b1b' : '#064e3b' }}>
          <div style={{ fontWeight: 600, marginBottom: 4, textTransform: 'capitalize' }}>{t.type}</div>
          <div style={{ fontSize: 13 }}>{t.message}</div>
        </div>
      ))}
    </div>
  )
}
