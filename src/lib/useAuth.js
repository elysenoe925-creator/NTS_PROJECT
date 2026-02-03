import { useState, useEffect } from 'react'
import { getCurrentUser, subscribeAuth } from './authStore'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Charger l'utilisateur courant
    const current = getCurrentUser()
    setUser(current)
    setIsLoading(false)

    // S'abonner aux changements
    const unsub = subscribeAuth(u => {
      setUser(u)
      setIsLoading(false)
    })

    return unsub
  }, [])

  return { user, isLoading }
}
