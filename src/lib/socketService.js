/**
 * Socket.IO Service
 * Gère la connexion en temps réel et synchronise les stores avec le serveur
 */

import io from 'socket.io-client'
import { getToken } from './authStore.js'
import * as usersStore from './usersStore.js'
import * as productsStore from './productsStore.js'
import * as ordersStore from './ordersStore.js'
import * as salesStore from './salesStore.js'
import * as actionLogStore from './actionLogStore.js'

const SOCKET_URL = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

let socket = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5

/**
 * Initialise la connexion Socket.IO et les listeners
 */
export function initSocket() {
  if (socket) return socket

  const token = getToken()
  if (!token) {
    console.warn('No token available, cannot initialize socket')
    return null
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    transports: ['websocket', 'polling']
  })

  setupListeners()
  return socket
}

/**
 * Configure tous les event listeners
 */
function setupListeners() {
  if (!socket) return

  // Connection events
  socket.on('connect', () => {
    console.log('✓ Socket.IO connected')
    reconnectAttempts = 0
    // Demander une synchronisation complète au connexion
    socket.emit('sync:request', { timestamp: Date.now() })
  })

  socket.on('disconnect', (reason) => {
    console.log('✗ Socket.IO disconnected:', reason)
  })

  socket.on('connect_error', (error) => {
    console.error('Socket.IO connection error:', error)
  })

  // === USERS EVENTS ===
  socket.on('users:updated', (users) => {
    console.log('📌 users:updated received')
    usersStore.setUsers(users)
  })

  socket.on('users:added', (user) => {
    console.log('📌 users:added received', user)
    const current = usersStore.getUsers()
    usersStore.setUsers([...current, user])
  })

  socket.on('users:removed', (userId) => {
    console.log('📌 users:removed received', userId)
    const current = usersStore.getUsers()
    usersStore.setUsers(current.filter(u => u.id !== userId))
  })

  // === PRODUCTS EVENTS ===
  socket.on('product:changed', (event) => {
    console.log('📦 product:changed received', event)
    productsStore.applyDelta(event.action, event.product)
  })

  socket.on('products:updated', (products) => {
    console.log('📦 products:updated received')
    productsStore.setProducts(products)
  })

  socket.on('products:added', (product) => {
    console.log('📦 products:added received', product)
    const current = productsStore.getProducts()
    productsStore.setProducts([...current, product])
  })

  socket.on('products:removed', (sku) => {
    console.log('📦 products:removed received', sku)
    const current = productsStore.getProducts()
    productsStore.setProducts(current.filter(p => p.sku !== sku))
  })

  // === STOCK EVENTS ===
  socket.on('stock:updated', (stocks) => {
    console.log('📊 stock:updated received')
    productsStore.setProducts(productsStore.getProducts()) // Trigger refresh
  })

  socket.on('stock:changed', (change) => {
    console.log('📊 stock:changed received', change)
    // Mettre à jour le produit affecté
    const products = productsStore.getProducts()
    const product = products.find(p => p.sku === change.sku)
    if (product && product.stockByStore) {
      product.stockByStore[change.store] = change.qty
      productsStore.setProducts([...products])
    }
  })

  // === ORDERS EVENTS ===
  socket.on('orders:updated', (orders) => {
    console.log('📋 orders:updated received')
    ordersStore.setOrders(orders)
  })

  socket.on('orders:added', (order) => {
    console.log('📋 orders:added received', order)
    const current = ordersStore.getOrders()
    ordersStore.setOrders([...current, order])
  })

  socket.on('orders:status-changed', (update) => {
    console.log('📋 orders:status-changed received', update)
    const current = ordersStore.getOrders()
    const updated = current.map(o =>
      o.id === update.orderId ? { ...o, status: update.status } : o
    )
    ordersStore.setOrders(updated)
  })

  // === SALES EVENTS ===
  socket.on('sale:changed', (event) => {
    console.log('💰 sale:changed received', event)
    salesStore.applyDelta(event.action, event.sale)
  })

  socket.on('sales:updated', (sales) => {
    console.log('💰 sales:updated received')
    salesStore.setSales(sales)
  })

  socket.on('sales:added', (sale) => {
    console.log('💰 sales:added received', sale)
    const current = salesStore.getSales()
    salesStore.setSales([...current, sale])
  })

  // === ACTION LOGS EVENTS ===
  socket.on('logs:added', (log) => {
    console.log('📝 logs:added received', log)
    const current = actionLogStore.getActionLogs()
    actionLogStore.setActionLogs([log, ...current])
  })

  socket.on('logs:updated', (logs) => {
    console.log('📝 logs:updated received')
    actionLogStore.setActionLogs(logs)
  })

  // === SYNC EVENT ===
  socket.on('sync:full', (data) => {
    console.log('🔄 Full sync received')
    if (data.users) usersStore.setUsers(data.users)
    if (data.products) productsStore.setProducts(data.products)
    if (data.orders) ordersStore.setOrders(data.orders)
    if (data.sales) salesStore.setSales(data.sales)
    if (data.logs) actionLogStore.setActionLogs(data.logs)
  })
}

/**
 * Émet un événement via Socket.IO
 */
export function emitSocket(event, data) {
  if (!socket || !socket.connected) {
    console.warn('Socket not connected, cannot emit:', event)
    return false
  }
  socket.emit(event, data)
  return true
}

/**
 * Demande une synchronisation complète
 */
export function requestSync() {
  emitSocket('sync:request', { timestamp: Date.now() })
}

/**
 * Ferme la connexion Socket.IO
 */
export function closeSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

/**
 * Vérifie si la socket est connectée
 */
export function isSocketConnected() {
  return socket && socket.connected
}

export default socket
