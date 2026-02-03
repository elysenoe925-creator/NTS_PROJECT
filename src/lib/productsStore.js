const STORAGE_KEY = 'gsm_products_v1'
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

const defaultProducts = [
  { sku: 'P-001', name: 'Composant: Résistance 10k', model: 'RES-10K', compatibleModels: ['MB-100', 'MB-101'], stockByStore: { majunga: 80, tamatave: 40 }, location: 'Entrepôt A', category: 'Composants', supplier: 'Electronix', price: '0.05' },
  { sku: 'P-002', name: 'Accessoire: Coque iPhone 12', model: 'CASE-IP12', compatibleModels: ['iPhone12'], stockByStore: { majunga: 20, tamatave: 25 }, location: 'Entrepôt B', category: 'Accessoires', supplier: 'MobileCases', price: '5.00' },
  { sku: 'P-003', name: 'Composant: Condensateur 100uF', model: 'CAP-100uF', compatibleModels: [], stockByStore: { majunga: 0, tamatave: 0 }, location: 'Entrepôt A', category: 'Composants', supplier: 'Electronix', price: '0.12' },
]

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultProducts
    return JSON.parse(raw)
  } catch (e) {
    return defaultProducts
  }
}

function write(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch (e) { }
}

function dispatch(list) {
  const ev = new CustomEvent('products-updated', { detail: list })
  window.dispatchEvent(ev)
}

export function getProducts() { return read() }

export function setProducts(list) {
  write(list)
  dispatch(list)
}

// Fetch latest products from API for optional store and update cache
export async function refreshProducts(storeId) {
  try {
    const url = (storeId && storeId !== 'all') ? API_BASE + `/api/products?store=${encodeURIComponent(storeId)}` : API_BASE + '/api/products'
    const res = await fetch(url)
    if (!res.ok) return
    const data = await res.json()
    // write to local cache for compatibility with existing code
    write(data)
    dispatch(data)
    return data
  } catch (e) { /* ignore */ }
}

export function subscribe(cb) {
  const handler = (e) => cb(e.detail)
  window.addEventListener('products-updated', handler)

  // also listen to storage events (other tabs)
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
    window.removeEventListener('products-updated', handler)
    window.removeEventListener('storage', storageHandler)
  }
}

// Helper: return products adapted to a specific storeId
export function getProductsForStore(storeId) {
  const all = read() || []
  if (!storeId || storeId === 'all') return all.map(p => ({ ...p, qty: sumStock(p) }))
  // Only return products that have an explicit stock entry for this store.
  // This avoids showing a product in another store with an implicit zero quantity
  // when the product was created for a different store.
  return all
    .filter(p => p.stockByStore && Object.prototype.hasOwnProperty.call(p.stockByStore, storeId))
    .map(p => ({ ...p, qty: getStock(p, storeId) }))
}

export function getStock(product, storeId) {
  if (!product) return 0
  const s = product.stockByStore || {}
  return Number(s[storeId] || 0)
}

export function setStock(sku, storeId, qty) {
  const list = read()
  const next = list.map(p => {
    if (p.sku !== sku) return p
    const nextStock = { ...(p.stockByStore || {}) }
    nextStock[storeId] = Number(qty || 0)
    return { ...p, stockByStore: nextStock }
  })
  write(next)
  dispatch(next)
  return next
}

function sumStock(p) {
  if (!p) return 0
  const s = p.stockByStore || {}
  return Object.values(s).reduce((a, b) => a + Number(b || 0), 0)
}

// Reorder requested helpers (per-store)
export function isReorderRequested(product, storeId) {
  if (!product) return false
  // Backwards compat: if boolean flag exists, treat as global
  if (product.reorderRequested === true && (!product.reorderRequestedByStore || Object.keys(product.reorderRequestedByStore).length === 0)) {
    return true
  }
  const map = product.reorderRequestedByStore || {}
  if (!storeId || storeId === 'all') {
    // any store requested?
    return Object.values(map).some(v => !!v)
  }
  return !!map[storeId]
}

export function setReorderRequested(sku, storeId, value) {
  const list = read()
  const next = list.map(p => {
    if (p.sku !== sku) return p
    const map = { ...(p.reorderRequestedByStore || {}) }
    if (storeId === 'all') {
      // set for all known stores (or at least mark in map with provided key)
      // We'll set the flag for existing stores in stockByStore; if none, use 'majunga' and 'tamatave'
      const stores = Object.keys(p.stockByStore || {})
      const target = stores.length ? stores : ['majunga', 'tamatave']
      for (const s of target) map[s] = !!value
    } else {
      map[storeId] = !!value
    }
    return { ...p, reorderRequestedByStore: map }
  })
  write(next)
  dispatch(next)
  return next
}

import { getToken } from './authStore'

export async function requestRestock(sku, storeId, qty, notes) {
  try {
    const token = getToken()
    const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(sku)}/reorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ store: storeId, qty, notes })
    })

    if (res.ok) {
      // Refresh products to see the updated flag
      await refreshProducts(storeId)
      return true
    }
    return false
  } catch (e) {
    console.error(e)
    return false
  }
}


export async function cancelRestock(sku, storeId) {
  try {
    const token = getToken()
    const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(sku)}/cancel-reorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ store: storeId })
    })

    if (res.ok) {
      await refreshProducts(storeId)
      return true
    }
    return false
  } catch (e) {
    console.error(e)
    return false
  }
}

