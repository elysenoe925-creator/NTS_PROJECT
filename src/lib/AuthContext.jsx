import React, { createContext, useState, useEffect, useRef, useCallback } from 'react'
import { getCurrentUser, logout as authLogout, login as authLogin } from './authStore'

export const AuthContext = createContext(null)

// Variable globale pour stocker les callbacks - permet à authStore de notifier le contexte
let authContextCallback = null

// Cette fonction est appelée par authStore quand l'authentification change
export function notifyAuthContext(user) {
  console.log('notifyAuthContext called with:', user)
  if (authContextCallback) {
    authContextCallback(user)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCurrentUser())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log('AuthProvider: mounting')
    setIsLoading(false)
    
    // Enregistrer le callback pour que authStore puisse notifier les changements
    authContextCallback = setUser
    console.log('AuthProvider: callback registered')

    return () => {
      console.log('AuthProvider: unmounting')
      authContextCallback = null
    }
  }, [])

  const login = useCallback(async (username, password) => {
    console.log('AuthProvider: login called with username:', username)
    try {
      const userData = await authLogin(username, password)
      console.log('AuthProvider: login succeeded, userData:', userData)
      // authLogin va appeler notifyAuthContext qui mettra à jour le state
      setUser(userData)
      return userData
    } catch (err) {
      console.error('AuthProvider: login error:', err)
      throw err
    }
  }, [])

  const logout = useCallback(() => {
    console.log('AuthProvider: logout called')
    authLogout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}



