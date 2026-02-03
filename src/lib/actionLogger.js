import { getToken } from './authStore'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export async function logAction(action, description) {
  try {
    const token = getToken()
    if (!token) {
      console.warn('No token available for logging action')
      return false
    }

    const res = await fetch(API_BASE + '/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action, description })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to log action' }))
      console.error('Error logging action:', err)
      return false
    }

    return true
  } catch (e) {
    console.error('Error logging action:', e)
    return false
  }
}
