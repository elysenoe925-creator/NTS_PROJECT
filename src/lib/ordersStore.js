/**
 * Orders Store
 * Gère les commandes (purchase orders) et leur cycle de vie
 * Intégré avec l'API backend et Socket.IO pour synchronisation temps réel
 */

import { getProducts } from './productsStore'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

// États possibles d'une commande
export const ORDER_STATUSES = {
  DRAFT: 'draft',           // Brouillon (en création)
  PENDING: 'pending',       // En attente (soumise pour approbation)
  APPROVED: 'approved',     // Approuvée par admin
  REJECTED: 'rejected',     // Rejetée par admin
  CONFIRMED: 'confirmed',   // Confirmée par fournisseur
  SHIPPED: 'shipped',       // Expédiée
  DELIVERED: 'delivered',   // Livrée
  CANCELLED: 'cancelled'    // Annulée
}

// Cache local pour performance
let ordersCache = []

function dispatch(list) {
  const ev = new CustomEvent('orders-updated', { detail: list })
  window.dispatchEvent(ev)
}

/**
 * Récupère le token d'authentification
 */
function getAuthToken() {
  try {
    const authData = localStorage.getItem('gsm_auth_v1')
    if (!authData) return null
    const parsed = JSON.parse(authData)
    return parsed.token
  } catch (e) {
    return null
  }
}

/**
 * Crée une nouvelle commande à partir d'une recommandation
 */
export async function createOrder(items, options = {}) {
  try {
    const token = getAuthToken()
    if (!token) throw new Error('Not authenticated')

    // Get all products to map SKUs to IDs
    const allProducts = getProducts()
    const productMap = new Map(allProducts.map(p => [p.sku, p]))

    console.log('Creating order with items:', items)
    console.log('Product map size:', productMap.size)

    // Map items to ensure we have valid product IDs
    const mappedItems = items.map(item => {
      let productId = item.productId || item.id

      // If no productId but we have SKU, look it up
      if (!productId && item.sku) {
        const product = productMap.get(item.sku)
        if (product) {
          productId = product.id
        }
      }

      if (!productId) {
        throw new Error(`Cannot find product ID for item: ${item.sku || item.name || 'unknown'}`)
      }

      return {
        productId: Number(productId),
        quantity: item.orderQty || item.quantity || 0,
        unitPrice: item.price || item.unitPrice || item.cost || 0,
        notes: item.notes || null
      }
    })

    console.log('Mapped items:', mappedItems)

    const requestBody = {
      items: mappedItems,
      notes: options.notes || '',
      supplier: options.supplier || null,
      targetDate: options.targetDate || null,
      deliveryDate: options.deliveryDate || null
    }

    console.log('Request body:', requestBody)

    const response = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('Server error response:', error)
      throw new Error(error.error || 'Failed to create order')
    }

    const data = await response.json()
    await refreshOrders() // Refresh cache
    return data.order
  } catch (e) {
    console.error('Error creating order:', e)
    throw e
  }
}

/**
 * Retourne la liste complète des commandes
 */
export function getOrders() {
  return ordersCache
}

/**
 * Remplace complètement la liste des commandes (utile pour sync Socket.IO)
 */
export function setOrders(list) {
  ordersCache = list
  dispatch(list)
}

/**
 * Retourne une commande spécifique
 */
export function getOrderById(orderId) {
  return ordersCache.find(o => o.id === orderId)
}

/**
 * Met à jour une commande existante (notes, dates, supplier)
 */
export async function updateOrder(orderId, updates) {
  try {
    const token = getAuthToken()
    if (!token) throw new Error('Not authenticated')

    const response = await fetch(`${API_BASE}/api/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update order')
    }

    const data = await response.json()
    await refreshOrders()
    return data.order
  } catch (e) {
    console.error('Error updating order:', e)
    throw e
  }
}

/**
 * Change le statut d'une commande
 */
export async function updateOrderStatus(orderId, newStatus) {
  try {
    const token = getAuthToken()
    if (!token) throw new Error('Not authenticated')

    const response = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update order status')
    }

    const data = await response.json()
    await refreshOrders()
    return data.order
  } catch (e) {
    console.error('Error updating order status:', e)
    throw e
  }
}

/**
 * Ajoute des lignes à une commande
 */
export async function addOrderItems(orderId, items) {
  try {
    const token = getAuthToken()
    if (!token) throw new Error('Not authenticated')

    const response = await fetch(`${API_BASE}/api/orders/${orderId}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        items: items.map(item => ({
          productId: item.id || item.productId,
          quantity: item.quantity || 1,
          unitPrice: item.price || item.unitPrice || 0,
          notes: item.notes || null
        }))
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to add items')
    }

    await refreshOrders()
    return true
  } catch (e) {
    console.error('Error adding order items:', e)
    throw e
  }
}

/**
 * Supprime une ligne de commande
 */
export async function removeOrderItem(orderId, itemId) {
  try {
    const token = getAuthToken()
    if (!token) throw new Error('Not authenticated')

    const response = await fetch(`${API_BASE}/api/orders/${orderId}/items/${itemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to remove item')
    }

    await refreshOrders()
    return true
  } catch (e) {
    console.error('Error removing order item:', e)
    throw e
  }
}

/**
 * Met à jour la quantité d'une ligne
 */
export async function updateOrderItemQuantity(orderId, itemId, newQuantity) {
  try {
    const token = getAuthToken()
    if (!token) throw new Error('Not authenticated')

    const response = await fetch(`${API_BASE}/api/orders/${orderId}/items/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ quantity: newQuantity })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update item quantity')
    }

    await refreshOrders()
    return true
  } catch (e) {
    console.error('Error updating order item quantity:', e)
    throw e
  }
}

/**
 * Supprime une commande
 */
export async function deleteOrder(orderId) {
  try {
    const token = getAuthToken()
    if (!token) throw new Error('Not authenticated')

    const response = await fetch(`${API_BASE}/api/orders/${orderId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete order')
    }

    await refreshOrders()
    return true
  } catch (e) {
    console.error('Error deleting order:', e)
    throw e
  }
}

/**
 * Valide et envoie une commande (passe en PENDING)
 */
export async function submitOrder(orderId) {
  return updateOrderStatus(orderId, ORDER_STATUSES.PENDING)
}

/**
 * Réceptionne une commande (crée un arrivage)
 */
export async function receiveOrder(orderId) {
  try {
    const token = getAuthToken()
    if (!token) throw new Error('Not authenticated')

    const response = await fetch(`${API_BASE}/api/orders/${orderId}/receive`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to receive order')
    }

    const data = await response.json()
    await refreshOrders()
    return data.arrivalId
  } catch (e) {
    console.error('Error receiving order:', e)
    throw e
  }
}

/**
 * Retourne les statistiques des commandes
 */
export function getOrderStats() {
  const orders = ordersCache

  const stats = {
    total: orders.length,
    byStatus: {},
    totalAmount: 0,
    averageAmount: 0,
    recentOrders: []
  }

  Object.keys(ORDER_STATUSES).forEach(key => {
    stats.byStatus[ORDER_STATUSES[key]] = 0
  })

  orders.forEach(order => {
    stats.byStatus[order.status] = (stats.byStatus[order.status] || 0) + 1
    stats.totalAmount += order.totalAmount || 0
  })

  stats.averageAmount = stats.total > 0 ? stats.totalAmount / stats.total : 0

  // Commandes récentes (derniers 7 jours)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  stats.recentOrders = orders.filter(o => new Date(o.createdAt) > sevenDaysAgo)

  return stats
}

/**
 * Retourne les commandes par statut
 */
export function getOrdersByStatus(status) {
  return ordersCache.filter(o => o.status === status)
}

/**
 * S'abonne aux changements de commandes
 */
export function subscribe(cb) {
  const handler = (e) => cb(e.detail)
  window.addEventListener('orders-updated', handler)

  return () => {
    window.removeEventListener('orders-updated', handler)
  }
}

/**
 * Fetch commandes depuis API et met à jour le cache
 */
export async function refreshOrders() {
  try {
    const token = getAuthToken()
    if (!token) {
      console.log('No auth token, skipping orders refresh')
      return []
    }

    const response = await fetch(`${API_BASE}/api/orders`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch orders')
    }

    const orders = await response.json()
    setOrders(orders)
    return orders
  } catch (e) {
    console.error('Error refreshing orders:', e)
    return ordersCache
  }
}
