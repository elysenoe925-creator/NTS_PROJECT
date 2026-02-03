import React, { createContext, useContext, useState, useEffect } from 'react'
import { getCurrentUser, subscribeAuth } from './authStore'

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [currentStore, setCurrentStore] = useState(() => {
    const user = getCurrentUser()
    // If user is an employee with a store assigned, use their store
    if (user && user.role === 'employee' && user.store && user.store !== 'all') {
      return user.store
    }
    return 'all'
  })

  // Update store when user changes (e.g., on login/logout)
  useEffect(() => {
    const unsub = subscribeAuth((user) => {
      if (user && user.role === 'employee' && user.store && user.store !== 'all') {
        setCurrentStore(user.store)
      } else if (!user) {
        setCurrentStore('all')
      }
    })
    return unsub
  }, [])

  return (
    <StoreContext.Provider value={{ currentStore, setCurrentStore }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}

export default StoreContext
