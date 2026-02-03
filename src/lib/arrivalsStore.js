import { subscribe as socketSubscribe } from './socketService'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

let arrivals = []
let subscribers = []

export function getArrivals() {
  return arrivals
}

export function setArrivals(data) {
  arrivals = data
  notifySubscribers()
}

export function subscribe(callback) {
  subscribers.push(callback)
  return () => {
    subscribers = subscribers.filter(s => s !== callback)
  }
}

function notifySubscribers() {
  subscribers.forEach(cb => cb())
}

export async function refreshArrivals(store) {
  try {
    const token = localStorage.getItem('auth_token')
    const res = await fetch(`${API_BASE}/api/arrivals?store=${store}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Failed to fetch')
    const data = await res.json()
    setArrivals(data)
    return data
  } catch (e) {
    console.error('Error refreshing arrivals:', e)
    throw e
  }
}

// Socket.IO integration
socketSubscribe('arrivals:updated', (data) => {
  setArrivals(data)
})

export default {
  getArrivals,
  setArrivals,
  subscribe,
  refreshArrivals
}
