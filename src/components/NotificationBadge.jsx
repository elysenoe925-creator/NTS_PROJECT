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

    // Subscribe to action log updates
    const unsubscribe = subscribeActionLogs((logs) => {
      // Filter notifications based on section and recent actions
      const relevantNotifications = logs
        .filter(log => {
          // Only show notifications from the last 24 hours
          const logTime = new Date(log.timestamp)
          const now = new Date()
          const hoursDiff = (now - logTime) / (1000 * 60 * 60)
          if (hoursDiff > 24) return false

          // Filter by section
          switch (section) {
            case 'sales':
              return log.action === 'VENTE'
            case 'stock':
              return ['CREATION_PRODUIT', 'MODIFICATION_PRODUIT', 'SUPPRESSION_PRODUIT', 'REAPPROVISIONNEMENT'].includes(log.action)
            case 'orders':
              return ['CREATION_COMMANDE', 'MODIFICATION_COMMANDE', 'ANNULATION_COMMANDE'].includes(log.action)
            case 'tracking':
              return true // Show all actions in tracking section
            case 'global':
              // Show all relevant actions for global notifications
              return ['VENTE', 'CREATION_PRODUIT', 'MODIFICATION_PRODUIT', 'SUPPRESSION_PRODUIT', 'REAPPROVISIONNEMENT', 'CREATION_COMMANDE', 'MODIFICATION_COMMANDE', 'ANNULATION_COMMANDE'].includes(log.action)
            default:
              return false
          }
        })
        .slice(0, 10) // Limit to 10 most recent notifications

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
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
        title={`${notifications.length} nouvelle${notifications.length > 1 ? 's' : ''} notification${notifications.length > 1 ? 's' : ''}`}
      >
        <Bell size={20} />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 sm:right-0 sm:left-auto left-0">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">
              Notifications ({notifications.length})
            </h3>
            <button
              onClick={clearAllNotifications}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Tout effacer
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification, index) => (
              <div key={`${notification.id}-${index}`} className="p-3 border-b border-gray-100 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {notification.user?.displayName || 'Utilisateur inconnu'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(notification.timestamp).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {notification.description}
                    </p>
                    {notification.store && (
                      <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {notification.store}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => clearNotification(index)}
                    className="ml-2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-gray-200">
            <button
              onClick={() => setShowDropdown(false)}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-800"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}