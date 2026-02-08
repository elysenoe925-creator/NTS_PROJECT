import React, { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

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
  }, [settings.notificationsEnabled])

  const removeToast = (id) => {
    setToasts(prev => prev.filter(x => x.id !== id))
  }

  const getToastStyles = (type) => {
    const baseStyles = {
      success: {
        bg: '#10b981',
        border: '#059669',
        text: '#ffffff',
        icon: CheckCircle2
      },
      error: {
        bg: '#ef4444',
        border: '#dc2626',
        text: '#ffffff',
        icon: AlertCircle
      },
      warn: {
        bg: '#f59e0b',
        border: '#d97706',
        text: '#ffffff',
        icon: AlertCircle
      },
      info: {
        bg: '#3b82f6',
        border: '#2563eb',
        text: '#ffffff',
        icon: Info
      }
    }
    return baseStyles[type] || baseStyles.info
  }

  if (!toasts || toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-sm pointer-events-none">
      {toasts.map(t => {
        const style = getToastStyles(t.type)
        const Icon = style.icon

        return (
          <div
            key={t.id}
            className="pointer-events-auto animate-slide-in-right flex items-start gap-2 p-3 rounded-lg shadow-lg backdrop-blur-sm"
            style={{
              backgroundColor: style.bg,
              borderLeft: `4px solid ${style.border}`,
              color: style.text,
              minWidth: '200px',
              maxWidth: '100%'
            }}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium leading-tight break-words">{t.message}</div>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 ml-2 hover:opacity-70 transition-opacity"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
