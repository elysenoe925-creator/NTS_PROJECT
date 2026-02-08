const STORAGE_KEY = 'gsm_sales_v1'
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    // Check structure
    const parsed = JSON.parse(raw)

    // Old format (array)
    if (Array.isArray(parsed)) return parsed

    // New format with timestamp
    if (parsed.data && parsed.timestamp) {
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        return parsed.data
      }
      return parsed.data // Return expired data but should trigger refresh
    }

    return []
  } catch (e) {
    return []
  }
}

function write(list) {
  try {
    const cacheData = {
      timestamp: Date.now(),
      data: list
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData))
  } catch (e) { }
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

// Apply a delta update (single sale change)
export function applyDelta(action, sale) {
  const current = read()
  let next = []

  switch (action) {
    case 'create':
      // Add new sale if not exists
      if (!current.some(s => s.id === sale.id)) {
        next = [...current, sale]
      } else {
        next = current
      }
      break
    case 'delete':
      next = current.filter(s => s.id !== sale.id)
      break
    default:
      next = current
  }

  if (next !== current) {
    setSales(next)
  }
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
