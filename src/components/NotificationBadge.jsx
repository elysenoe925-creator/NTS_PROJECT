import React, { useState, useEffect } from 'react'
import { getCurrentUser } from '../lib/authStore'
import { subscribeActionLogs } from '../lib/actionLogStore'
import { Bell, X } from 'lucide-react'

export default function NotificationBadge({ section, className = '' }) {
  const [notifications, setNotifications] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const user = getCurrentUser()

  // Only show notifications for admins
  const isAdmin = user && user.role === 'admin'

  useEffect(() => {
    if (!isAdmin) return

    const unsubscribe = subscribeActionLogs((logs) => {
      const relevantNotifications = logs
        .filter(log => {
          const logTime = new Date(log.timestamp)
          const now = new Date()
          const hoursDiff = (now - logTime) / (1000 * 60 * 60)
          if (hoursDiff > 24) return false

          switch (section) {
            case 'sales': return log.action === 'VENTE'
            case 'stock': return ['CREATION_PRODUIT', 'MODIFICATION_PRODUIT', 'SUPPRESSION_PRODUIT', 'REAPPROVISIONNEMENT'].includes(log.action)
            case 'orders': return ['CREATION_COMMANDE', 'MODIFICATION_COMMANDE', 'ANNULATION_COMMANDE'].includes(log.action)
            case 'tracking': return true
            case 'global': return ['VENTE', 'CREATION_PRODUIT', 'MODIFICATION_PRODUIT', 'SUPPRESSION_PRODUIT', 'REAPPROVISIONNEMENT', 'CREATION_COMMANDE', 'MODIFICATION_COMMANDE', 'ANNULATION_COMMANDE'].includes(log.action)
            default: return false
          }
        })
        .slice(0, 10)

      setNotifications(relevantNotifications)
    })

    return unsubscribe
  }, [isAdmin, section])

  const clearNotification = (index) => {
    setNotifications(prev => prev.filter((_, i) => i !== index))
  }

  const clearAllNotifications = () => {
    setNotifications([])
  }

  if (!isAdmin || notifications.length === 0) {
    return null
  }

  return (
    <div className={`notif-badge-container ${className}`}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all transform active:scale-95"
        title={`${notifications.length} notification${notifications.length > 1 ? 's' : ''}`}
      >
        <Bell size={20} strokeWidth={2.5} />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold ring-2 ring-white">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          {/* Mobile Overlay backdrop */}
          <div className="notif-dropdown-overlay" onClick={() => setShowDropdown(false)} />

          <div className="notif-dropdown">
            <div className="notif-header">
              <h3 className="font-bold text-slate-900 text-sm">
                Notifications ({notifications.length})
              </h3>
              <button
                onClick={clearAllNotifications}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Tout effacer
              </button>
            </div>

            <div className="notif-content">
              {notifications.map((notification, index) => (
                <div key={`${notification.id}-${index}`} className="notif-item">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-800">
                          {notification.user?.displayName || 'Système'}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                          {new Date(notification.timestamp).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {notification.description}
                      </p>
                      {notification.store && (
                        <span className="inline-block mt-1.5 text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                          {notification.store}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => clearNotification(index)}
                      className="ml-2 text-slate-300 hover:text-slate-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="notif-footer">
              <button
                onClick={() => setShowDropdown(false)}
                className="w-full py-2 text-center text-xs font-bold text-slate-500 hover:text-slate-900"
              >
                Fermer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
