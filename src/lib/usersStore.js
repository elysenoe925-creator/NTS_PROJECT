const STORAGE_KEY = 'gsm_users_v1'
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'
import { getToken } from './authStore.js'

const defaultUsers = [
  { id: 'u-admin', username: 'admin', displayName: 'Administrateur', role: 'admin', store: 'all' }
]

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultUsers
    return JSON.parse(raw)
  } catch (e) { return defaultUsers }
}

function write(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch (e) {}
}

function dispatch(list) {
  const ev = new CustomEvent('users-updated', { detail: list })
  window.dispatchEvent(ev)
}

export function getUsers() { return read() }

export function findByUsername(username) {
  return read().find(u => u.username === username)
}

export function setUsers(list) {
  write(list)
  dispatch(list)
}

export function subscribe(cb) {
  const handler = (e) => cb(e.detail)
  window.addEventListener('users-updated', handler)
  return () => window.removeEventListener('users-updated', handler)
}

// API helpers
export async function refreshUsers() {
  try {
    const url = API_BASE + '/api/users'
    const token = getToken()
    if (!token) {
      console.warn('No token available for fetching users')
      return []
    }
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
    if (!res.ok) {
      // Si 401 (Unauthorized), retourner silencieusement un tableau vide
      if (res.status === 401 || res.status === 403) {
        console.warn('Unauthorized access to users - user may not be authenticated or may not have admin rights')
        return []
      }
      return []
    }
    const data = await res.json()
    // normalize to local format (string ids)
    const mapped = data.map(u => ({ id: String(u.id), username: u.username, displayName: u.displayName, role: u.role, store: u.store }))
    write(mapped)
    dispatch(mapped)
    return mapped
  } catch (e) { 
    console.error('Error refreshing users:', e)
    return []
  }
}

export async function createUser(payload, token) {
  try {
    const res = await fetch(API_BASE + '/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) })
    if (!res.ok) {
      const err = await res.json().catch(()=>({ error: 'Create failed' }))
      throw new Error(err.error || 'Create failed')
    }
    const user = await res.json()
    await refreshUsers()
    return user
  } catch (e) { throw e }
}

export async function updateUser(id, payload, token) {
  try {
    const res = await fetch(API_BASE + '/api/users/' + encodeURIComponent(id), { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) })
    if (!res.ok) {
      const err = await res.json().catch(()=>({ error: 'Update failed' }))
      throw new Error(err.error || 'Update failed')
    }
    const user = await res.json()
    await refreshUsers()
    return user
  } catch (e) { throw e }
}

export async function deleteUser(id, token) {
  try {
    const res = await fetch(API_BASE + '/api/users/' + encodeURIComponent(id), { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
    if (!res.ok) {
      const err = await res.json().catch(()=>({ error: 'Delete failed' }))
      throw new Error(err.error || 'Delete failed')
    }
    await refreshUsers()
    return true
  } catch (e) { throw e }
}
