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
      if (newStatus === ORDER_STATUSES.DELIVERED) {
        if (!window.confirm("Confirmer la réception de la commande ?\n\nCela va générer un ARRIVAGE en attente que vous devrez confirmer pour mettre à jour le stock.")) {
          return;
        }
      }
      await updateOrderStatus(orderId, newStatus)
      alert('Statut mis à jour avec succès!' + (newStatus === ORDER_STATUSES.DELIVERED ? ' Arrivage généré.' : ''))
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

  const getStatusClasses = (status) => {
    switch (status) {
      case ORDER_STATUSES.DRAFT: return 'bg-gray-100 text-gray-800 border-gray-200'
      case ORDER_STATUSES.PENDING: return 'bg-amber-50 text-amber-700 border-amber-200'
      case ORDER_STATUSES.APPROVED: return 'bg-blue-50 text-blue-700 border-blue-200'
      case ORDER_STATUSES.REJECTED: return 'bg-red-50 text-red-700 border-red-200'
      case ORDER_STATUSES.CONFIRMED: return 'bg-purple-50 text-purple-700 border-purple-200'
      case ORDER_STATUSES.SHIPPED: return 'bg-cyan-50 text-cyan-700 border-cyan-200'
      case ORDER_STATUSES.DELIVERED: return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case ORDER_STATUSES.CANCELLED: return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
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
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Gestion des commandes</h3>
          <p className="text-slate-500 text-sm">Suivez et gérez les commandes envoyées et reçues</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Commandes</div>
            <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Montant Total</div>
            <div className="text-2xl font-bold text-indigo-600">{stats.totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} <span className="text-sm font-medium text-slate-400">Ar</span></div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">En attente</div>
            <div className="text-2xl font-bold text-amber-500">{stats.byStatus[ORDER_STATUSES.PENDING] || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Terminées (Livrées)</div>
            <div className="text-2xl font-bold text-emerald-500">{stats.byStatus[ORDER_STATUSES.DELIVERED] || 0}</div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 sticky top-[70px] z-30 bg-slate-50/90 backdrop-blur py-2 -mx-2 px-2 border-b border-white/0 transition-all">
        <button
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${!selectedStatus ? 'bg-slate-800 text-white shadow-md ring-2 ring-slate-200' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
          onClick={() => setSelectedStatus(null)}
        >
          Toutes
        </button>
        {Object.values(ORDER_STATUSES).map(status => (
          <button
            key={status}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedStatus === status
              ? getStatusClasses(status) + ' shadow-md ring-2 ring-offset-1 ring-white'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
            onClick={() => setSelectedStatus(status)}
          >
            {getStatusLabel(status)}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="text-slate-400 text-lg">Aucune commande trouvée</div>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div
                className="p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusClasses(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(order.createdAt).toLocaleDateString('fr-FR')} {new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-800">{order.totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Ar</div>
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <div className="font-bold text-slate-700 text-lg mb-1">{order.referenceNumber || `Commande #${order.id}`}</div>
                    <div className="text-sm text-slate-500">
                      {order.items?.length || 0} article(s) • Demandé par <span className="font-medium text-slate-700">{order.createdByUser ? order.createdByUser.displayName : 'Inconnu'}</span> <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{order.createdByUser?.store || '?'}</span>
                    </div>
                  </div>
                  {/* Destination Pill */}
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-xs text-slate-400">Destination</div>
                    <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <span className="text-sm font-semibold text-slate-700">{order.store}</span>
                    </div>
                    {order.arrival && (
                      <div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 mt-1">
                        <span className="text-xs font-medium text-emerald-700">Arrivage: {order.arrival.referenceNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedOrderId === order.id && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-4 animate-fade-in">
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                          <tr>
                            <th className="px-4 py-3">SKU</th>
                            <th className="px-4 py-3">Produit</th>
                            <th className="px-4 py-3 text-right">Qté</th>
                            <th className="px-4 py-3 text-right">P.U.</th>
                            <th className="px-4 py-3 text-right">Total</th>
                            <th className="px-4 py-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(order.items || []).map(item => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.sku}</td>
                              <td className="px-4 py-3 font-medium text-slate-700">{item.productName || item.name}</td>
                              <td className="px-4 py-3 text-right">
                                {order.status === ORDER_STATUSES.DRAFT ? (
                                  <input
                                    type="number"
                                    className="w-16 px-2 py-1 text-right text-sm border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateItemQuantity(order.id, item.id, Number(e.target.value))}
                                    min="1"
                                  />
                                ) : (
                                  <span className="font-semibold">{item.quantity}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-500">{item.unitPrice.toLocaleString()} Ar</td>
                              <td className="px-4 py-3 text-right font-bold text-slate-800">{(item.totalPrice).toLocaleString()} Ar</td>
                              <td className="px-4 py-3 text-center">
                                {order.status === ORDER_STATUSES.DRAFT && (
                                  <button
                                    onClick={() => handleRemoveItem(order.id, item.id)}
                                    className="p-1 hover:bg-red-50 text-red-500 rounded transition-colors"
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
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                      <span className="text-slate-500 mr-2">Total Global:</span>
                      <span className="font-bold text-lg text-slate-800">{order.totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Ar</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes</label>
                    <textarea
                      value={order.notes || ''}
                      onChange={(e) => handleUpdateNotes(order.id, e.target.value)}
                      placeholder="Ajouter des notes..."
                      disabled={order.status !== ORDER_STATUSES.DRAFT && order.status !== ORDER_STATUSES.PENDING}
                      className="w-full p-3 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500 transition-all font-mono"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3 justify-end flex-wrap pt-2 border-t border-slate-200">
                    {order.status === ORDER_STATUSES.DRAFT && (
                      <>
                        <button
                          className="px-4 py-2 bg-white text-red-600 border border-red-200 hover:bg-red-50 font-medium rounded-lg text-sm transition-all"
                          onClick={() => handleDeleteOrder(order.id)}
                        >
                          Supprimer
                        </button>
                        <button
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm shadow-sm hover:shadow transition-all"
                          onClick={() => handleSubmitOrder(order.id)}
                        >
                          Soumettre pour approbation
                        </button>
                      </>
                    )}
                    {order.status === ORDER_STATUSES.PENDING && isAdmin && (
                      <>
                        <button
                          className="px-4 py-2 bg-white text-red-600 border border-red-200 hover:bg-red-50 font-medium rounded-lg text-sm transition-all"
                          onClick={() => handleStatusChange(order.id, ORDER_STATUSES.REJECTED)}
                        >
                          Rejeter
                        </button>
                        <button
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm shadow-sm hover:shadow transition-all"
                          onClick={() => handleStatusChange(order.id, ORDER_STATUSES.APPROVED)}
                        >
                          Approuver
                        </button>
                      </>
                    )}
                    {order.status === ORDER_STATUSES.APPROVED && (
                      <button
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg text-sm shadow-sm hover:shadow transition-all"
                        onClick={() => handleStatusChange(order.id, ORDER_STATUSES.CONFIRMED)}
                      >
                        Marquer confirmée
                      </button>
                    )}
                    {order.status === ORDER_STATUSES.CONFIRMED && (
                      <button
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg text-sm shadow-sm hover:shadow transition-all"
                        onClick={() => handleStatusChange(order.id, ORDER_STATUSES.SHIPPED)}
                      >
                        Marquer expédiée
                      </button>
                    )}
                    {order.status === ORDER_STATUSES.SHIPPED && (
                      <button
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm shadow-sm hover:shadow transition-all flex items-center gap-2"
                        onClick={() => handleStatusChange(order.id, ORDER_STATUSES.DELIVERED)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        Reçu / Créer Arrivage
                      </button>
                    )}
                    {[ORDER_STATUSES.PENDING, ORDER_STATUSES.APPROVED, ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.SHIPPED].includes(order.status) && (
                      <button
                        className="px-4 py-2 bg-white text-red-700 border border-red-200 hover:bg-red-50 font-medium rounded-lg text-sm transition-all"
                        onClick={() => handleStatusChange(order.id, ORDER_STATUSES.CANCELLED)}
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
