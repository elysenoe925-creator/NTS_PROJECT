import React, { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'

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
        // Add ID if missing
        const newToast = { ...t, id: t.id || Date.now() + Math.random() }

        setToasts(prev => [...prev, newToast])
        if (t.duration && t.duration > 0) {
          setTimeout(() => {
            setToasts(prev => prev.filter(x => x.id !== newToast.id))
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
        bg: 'bg-white',
        border: 'border-emerald-100',
        text: 'text-slate-800',
        iconColor: 'text-emerald-500',
        ring: 'ring-emerald-500/10',
        icon: CheckCircle2
      },
      error: {
        bg: 'bg-white',
        border: 'border-red-100',
        text: 'text-slate-800',
        iconColor: 'text-red-500',
        ring: 'ring-red-500/10',
        icon: AlertCircle
      },
      warn: {
        bg: 'bg-white',
        border: 'border-amber-100',
        text: 'text-slate-800',
        iconColor: 'text-amber-500',
        ring: 'ring-amber-500/10',
        icon: AlertTriangle
      },
      info: {
        bg: 'bg-white',
        border: 'border-blue-100',
        text: 'text-slate-800',
        iconColor: 'text-blue-500',
        ring: 'ring-blue-500/10',
        icon: Info
      }
    }
    return baseStyles[type] || baseStyles.info
  }

  if (!toasts || toasts.length === 0) return null

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[400px] z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map(t => {
        const style = getToastStyles(t.type)
        const Icon = style.icon

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-4 p-4 rounded-2xl shadow-xl shadow-slate-200/50 border ${style.bg} ${style.border} animate-in slide-in-from-top-4 fade-in duration-300 ring-1 ${style.ring}`}
          >
            <div className={`p-2 rounded-full ${style.iconColor} bg-current/10 shrink-0`}>
              <Icon className="w-5 h-5" strokeWidth={2.5} />
            </div>

            <div className="flex-1 min-w-0 pt-1">
              {t.title && <h4 className="font-semibold text-sm mb-0.5">{t.title}</h4>}
              <p className={`text-sm font-medium leading-snug break-words ${t.title ? 'text-slate-500' : 'text-slate-700'}`}>
                {t.message}
              </p>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 -mr-1 -mt-1 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
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
