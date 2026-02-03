import React, { useEffect, useState } from 'react'
import { getOrders, getOrderStats, getOrdersByStatus, updateOrderStatus, deleteOrder, updateOrderItemQuantity, removeOrderItem, updateOrder, subscribe, refreshOrders, ORDER_STATUSES, submitOrder } from '../lib/ordersStore'
import { getCurrentUser } from '../lib/authStore'

export default function Orders() {
  const user = getCurrentUser()
  const isAdmin = user && user.role === 'admin'
 

  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(null)
  const [expandedOrderId, setExpandedOrderId] = useState(null)

  useEffect(() => {
    let mounted = true
    const compute = () => {
      const allOrders = getOrders()
      setOrders(selectedStatus ? getOrdersByStatus(selectedStatus) : allOrders)
      setStats(getOrderStats())
    }

    setLoading(true)
    refreshOrders().catch(() => { }).finally(() => {
      if (!mounted) return
      compute()
      setLoading(false)
    })

    const unsub = subscribe(compute)
    return () => { mounted = false; unsub() }
  }, [selectedStatus])

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus)
      alert('Statut mis à jour avec succès!')
    } catch (e) {
      alert('Erreur: ' + e.message)
    }
  }

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm('Confirmer la suppression de cette commande?')) {
      try {
        await deleteOrder(orderId)
        alert('Commande supprimée!')
      } catch (e) {
        alert('Erreur: ' + e.message)
      }
    }
  }

  const handleSubmitOrder = async (orderId) => {
    try {
      await submitOrder(orderId)
      alert('Commande soumise pour approbation!')
    } catch (e) {
      alert('Erreur: ' + e.message)
    }
  }

  const handleUpdateNotes = async (orderId, notes) => {
    try {
      await updateOrder(orderId, { notes })
    } catch (e) {
      console.error('Error updating notes:', e)
    }
  }

  const handleUpdateItemQuantity = async (orderId, itemId, quantity) => {
    try {
      await updateOrderItemQuantity(orderId, itemId, quantity)
    } catch (e) {
      alert('Erreur: ' + e.message)
    }
  }

  const handleRemoveItem = async (orderId, itemId) => {
    if (window.confirm('Supprimer cet article?')) {
      try {
        await removeOrderItem(orderId, itemId)
      } catch (e) {
        alert('Erreur: ' + e.message)
      }
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case ORDER_STATUSES.DRAFT: return '#6b7280'
      case ORDER_STATUSES.PENDING: return '#f59e0b'
      case ORDER_STATUSES.APPROVED: return '#3b82f6'
      case ORDER_STATUSES.REJECTED: return '#ef4444'
      case ORDER_STATUSES.CONFIRMED: return '#8b5cf6'
      case ORDER_STATUSES.SHIPPED: return '#06b6d4'
      case ORDER_STATUSES.DELIVERED: return '#10b981'
      case ORDER_STATUSES.CANCELLED: return '#dc2626'
      default: return '#6b7280'
    }
  }

  const getStatusLabel = (status) => {
    const labels = {
      [ORDER_STATUSES.DRAFT]: 'Brouillon',
      [ORDER_STATUSES.PENDING]: 'En attente',
      [ORDER_STATUSES.APPROVED]: 'Approuvée',
      [ORDER_STATUSES.REJECTED]: 'Rejetée',
      [ORDER_STATUSES.CONFIRMED]: 'Confirmée',
      [ORDER_STATUSES.SHIPPED]: 'Expédiée',
      [ORDER_STATUSES.DELIVERED]: 'Livrée',
      [ORDER_STATUSES.CANCELLED]: 'Annulée'
    }
    return labels[status] || status
  }

  return (
    <div className="card orders-container" style={{ marginBottom: 12 }}>
      <div className="decision-header">
        <h3 style={{ margin: 0 }}>Gestion des commandes</h3>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div style={{ padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
            <div className="small" style={{ color: '#666' }}>Total</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.total}</div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
            <div className="small" style={{ color: '#666' }}>Montant total</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{Math.round(stats.totalAmount)} Ar</div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '4px' }}>
            <div className="small" style={{ color: '#666' }}>Brouillon</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#6b7280' }}>{stats.byStatus[ORDER_STATUSES.DRAFT] || 0}</div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '4px' }}>
            <div className="small" style={{ color: '#666' }}>En attente</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.byStatus[ORDER_STATUSES.PENDING] || 0}</div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '4px' }}>
            <div className="small" style={{ color: '#666' }}>Approuvée</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>{stats.byStatus[ORDER_STATUSES.APPROVED] || 0}</div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '4px' }}>
            <div className="small" style={{ color: '#666' }}>Livrée</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{stats.byStatus[ORDER_STATUSES.DELIVERED] || 0}</div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          className={`btn ${!selectedStatus ? 'btn-primary' : ''}`}
          onClick={() => setSelectedStatus(null)}
          style={{ backgroundColor: !selectedStatus ? '#0ea5e9' : '#e5e7eb', color: !selectedStatus ? 'white' : '#666' }}
        >
          Tous
        </button>
        {Object.values(ORDER_STATUSES).map(status => (
          <button
            key={status}
            className={`btn ${selectedStatus === status ? 'btn-primary' : ''}`}
            onClick={() => setSelectedStatus(status)}
            style={{ backgroundColor: selectedStatus === status ? getStatusColor(status) : '#e5e7eb', color: selectedStatus === status ? 'white' : '#666' }}
          >
            {getStatusLabel(status)}
          </button>
        ))}
      </div>

      <div className="orders-list">
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>Chargement...</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Aucune commande</div>
        ) : (
          orders.map(order => (
            <div key={order.id} style={{ marginBottom: '16px', border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
              <div
                style={{
                  padding: '12px',
                  backgroundColor: getStatusColor(order.status),
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
              >
                <div>
                  <div style={{ fontWeight: 'bold' }}>{order.referenceNumber || `Commande #${order.id}`}</div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>
                    {new Date(order.createdAt).toLocaleDateString('fr-FR')} • {order.items?.length || 0} article(s)
                    {order.createdByUser && ` • ${order.createdByUser.displayName}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{Math.round(order.totalAmount)} Ar</div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>{getStatusLabel(order.status)}</div>
                </div>
              </div>

              {expandedOrderId === order.id && (
                <div style={{ padding: '16px', backgroundColor: '#f9fafb' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <h4>Articles</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <th style={{ textAlign: 'left', padding: '8px' }}>SKU</th>
                          <th style={{ textAlign: 'left', padding: '8px' }}>Produit</th>
                          <th style={{ textAlign: 'right', padding: '8px' }}>Qté</th>
                          <th style={{ textAlign: 'right', padding: '8px' }}>P.U.</th>
                          <th style={{ textAlign: 'right', padding: '8px' }}>Total</th>
                          <th style={{ textAlign: 'center', padding: '8px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(order.items || []).map(item => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '8px' }}>{item.sku}</td>
                            <td style={{ padding: '8px' }}>{item.productName || item.name}</td>
                            <td style={{ textAlign: 'right', padding: '8px' }}>
                              {order.status === ORDER_STATUSES.DRAFT ? (
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItemQuantity(order.id, item.id, Number(e.target.value))}
                                  min="1"
                                  style={{ width: '50px', padding: '4px' }}
                                />
                              ) : (
                                item.quantity
                              )}
                            </td>
                            <td style={{ textAlign: 'right', padding: '8px' }}>{item.unitPrice.toFixed(2)} Ar</td>
                            <td style={{ textAlign: 'right', padding: '8px', fontWeight: 'bold' }}>{item.totalPrice.toFixed(2)} Ar</td>
                            <td style={{ textAlign: 'center', padding: '8px' }}>
                              {order.status === ORDER_STATUSES.DRAFT && (
                                <button
                                  onClick={() => handleRemoveItem(order.id, item.id)}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}
                                  title="Supprimer"
                                >
                                  ✕
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: 'white', borderRadius: '4px' }}>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Notes</div>
                    <textarea
                      value={order.notes || ''}
                      onChange={(e) => handleUpdateNotes(order.id, e.target.value)}
                      placeholder="Notes supplémentaires..."
                      disabled={order.status !== ORDER_STATUSES.DRAFT && order.status !== ORDER_STATUSES.PENDING}
                      style={{
                        width: '100%',
                        minHeight: '80px',
                        padding: '8px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        opacity: (order.status !== ORDER_STATUSES.DRAFT && order.status !== ORDER_STATUSES.PENDING) ? 0.6 : 1
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    {order.status === ORDER_STATUSES.DRAFT && (
                      <>
                        <button
                          className="btn"
                          onClick={() => handleDeleteOrder(order.id)}
                          style={{ backgroundColor: '#ef4444', color: 'white' }}
                        >
                          Supprimer
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleSubmitOrder(order.id)}
                        >
                          Soumettre pour approbation
                        </button>
                      </>
                    )}
                    {order.status === ORDER_STATUSES.PENDING && isAdmin && (
                      <>
                        <button
                          className="btn"
                          onClick={() => handleStatusChange(order.id, ORDER_STATUSES.REJECTED)}
                          style={{ backgroundColor: '#ef4444', color: 'white' }}
                        >
                          Rejeter
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleStatusChange(order.id, ORDER_STATUSES.APPROVED)}
                          style={{ backgroundColor: '#3b82f6' }}
                        >
                          Approuver
                        </button>
                      </>
                    )}
                    {order.status === ORDER_STATUSES.APPROVED && (
                      <button
                        className="btn btn-primary"
                        onClick={() => handleStatusChange(order.id, ORDER_STATUSES.CONFIRMED)}
                        style={{ backgroundColor: '#8b5cf6' }}
                      >
                        Marquer confirmée
                      </button>
                    )}
                    {order.status === ORDER_STATUSES.CONFIRMED && (
                      <button
                        className="btn btn-primary"
                        onClick={() => handleStatusChange(order.id, ORDER_STATUSES.SHIPPED)}
                        style={{ backgroundColor: '#06b6d4' }}
                      >
                        Marquer expédiée
                      </button>
                    )}
                    {order.status === ORDER_STATUSES.SHIPPED && (
                      <button
                        className="btn btn-primary"
                        onClick={() => handleStatusChange(order.id, ORDER_STATUSES.DELIVERED)}
                        style={{ backgroundColor: '#10b981' }}
                      >
                        Marquer livrée
                      </button>
                    )}
                    {[ORDER_STATUSES.PENDING, ORDER_STATUSES.APPROVED, ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.SHIPPED].includes(order.status) && (
                      <button
                        className="btn"
                        onClick={() => handleStatusChange(order.id, ORDER_STATUSES.CANCELLED)}
                        style={{ backgroundColor: '#fca5a5', color: '#7f1d1d' }}
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
