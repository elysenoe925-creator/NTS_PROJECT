const STORAGE_KEY = 'gsm_sales_v1'
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch (e) {
    return []
  }
}

function write(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch (e) { }
}

function dispatch(list) {
  const ev = new CustomEvent('sales-updated', { detail: list })
  window.dispatchEvent(ev)
}

// getSales(storeId?) -> if storeId provided, filter by sale.store
export function getSales(storeId) {
  const all = read()
  if (!storeId || storeId === 'all') return all
  return all.filter(s => s.store === storeId)
}

export function setSales(list) {
  write(list)
  dispatch(list)
}

// Refresh sales from API for optional store and update cache
export async function refreshSales(storeId) {
  try {
    const url = (storeId && storeId !== 'all') ? API_BASE + `/api/sales?store=${encodeURIComponent(storeId)}` : API_BASE + '/api/sales'
    const res = await fetch(url)
    if (!res.ok) return
    const data = await res.json()
    write(data)
    dispatch(data)
    return data
  } catch (e) { /* ignore */ }
}

export function subscribe(cb) {
  const handler = (e) => cb(e.detail)
  window.addEventListener('sales-updated', handler)

  const storageHandler = (e) => {
    if (e.key === STORAGE_KEY) {
      try {
        const val = e.newValue ? JSON.parse(e.newValue) : []
        cb(val)
      } catch (err) { /* ignore */ }
    }
  }
  window.addEventListener('storage', storageHandler)

  return () => {
    window.removeEventListener('sales-updated', handler)
    window.removeEventListener('storage', storageHandler)
  }
}
