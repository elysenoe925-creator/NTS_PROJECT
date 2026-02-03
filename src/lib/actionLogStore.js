const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'
const STORAGE_KEY = 'gsm_action_logs_v1'
import { getToken } from './authStore.js'

let actionLogsCache = []

function readCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch (e) {
    return []
  }
}

function writeCache(logs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
    actionLogsCache = logs
  } catch (e) {
    console.error('Error writing action logs cache:', e)
  }
}

function dispatch(logs) {
  const ev = new CustomEvent('action-logs-updated', { detail: logs })
  window.dispatchEvent(ev)
}

// Initialize cache
actionLogsCache = readCache()

// Get cached action logs
export function getActionLogs() {
  return actionLogsCache
}

// Set action logs (utile pour sync Socket.IO)
export function setActionLogs(logs) {
  writeCache(logs)
  dispatch(logs)
}

// Subscribe to action logs updates
export function subscribeActionLogs(cb) {
  const handler = (e) => cb(e.detail)
  window.addEventListener('action-logs-updated', handler)
  return () => window.removeEventListener('action-logs-updated', handler)
}

// Log an action
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

    // Optionally refresh logs after logging
    const newLog = await res.json().catch(() => null)
    if (newLog?.log) {
      // Add to cache and dispatch update
      const updatedLogs = [newLog.log, ...actionLogsCache]
      writeCache(updatedLogs)
      dispatch(updatedLogs)
    }

    return true
  } catch (e) {
    console.error('Error logging action:', e)
    return false
  }
}

// Fetch all action logs (admin only)
export async function fetchAllLogs() {
  try {
    const token = getToken()
    if (!token) {
      console.warn('No token available for fetching logs')
      return []
    }

    const res = await fetch(API_BASE + '/api/logs', {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      }
    })

    if (!res.ok) {
      // Si 401 (Unauthorized), retourner silencieusement un tableau vide
      if (res.status === 401 || res.status === 403) {
        console.warn('Unauthorized access to logs - user may not be authenticated or may not have admin rights')
        return []
      }
      const err = await res.json().catch(() => ({ error: 'Failed to fetch logs' }))
      console.error('Error fetching logs:', err.error || 'Failed to fetch logs')
      return []
    }

    const logs = await res.json()
    writeCache(logs)
    dispatch(logs)
    return logs
  } catch (e) {
    console.error('Error fetching logs:', e)
    return []
  }
}

// Fetch logs for a specific user (admin only)
export async function fetchUserLogs(userId) {
  try {
    const token = getToken()
    if (!token) {
      console.warn('No token available for fetching user logs')
      return []
    }

    const res = await fetch(API_BASE + `/api/logs/user/${encodeURIComponent(userId)}`, {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      }
    })

    if (!res.ok) {
      // Si 401 (Unauthorized), retourner silencieusement un tableau vide
      if (res.status === 401 || res.status === 403) {
        console.warn('Unauthorized access to user logs - user may not be authenticated or may not have admin rights')
        return []
      }
      const err = await res.json().catch(() => ({ error: 'Failed to fetch user logs' }))
      console.error('Error fetching user logs:', err.error || 'Failed to fetch user logs')
      return []
    }

    const logs = await res.json()
    return logs
  } catch (e) {
    console.error('Error fetching user logs:', e)
    return []
  }
}

// Fetch logs for a specific store (admin only)
export async function fetchStoreLogs(store) {
  try {
    const token = getToken()
    if (!token) {
      console.warn('No token available for fetching store logs')
      return []
    }

    const res = await fetch(API_BASE + `/api/logs/store/${encodeURIComponent(store)}`, {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      }
    })

    if (!res.ok) {
      // Si 401 (Unauthorized), retourner silencieusement un tableau vide
      if (res.status === 401 || res.status === 403) {
        console.warn('Unauthorized access to store logs - user may not be authenticated or may not have admin rights')
        return []
      }
      const err = await res.json().catch(() => ({ error: 'Failed to fetch store logs' }))
      console.error('Error fetching store logs:', err.error || 'Failed to fetch store logs')
      return []
    }

    const logs = await res.json()
    return logs
  } catch (e) {
    console.error('Error fetching store logs:', e)
    return []
  }
}
