import React, { useState, useEffect } from 'react'
import { AlertCircle, Check, X, Plus, Edit2, Trash2, Package, TrendingDown } from 'lucide-react'
import { getProducts } from '../lib/productsStore'
import { getToken } from '../lib/authStore'
import { logAction } from '../lib/actionLogger'
import { showToast } from '../lib/toast'
import { useStore } from '../lib/StoreContext'
import IconButton from './IconButton'
import HeaderSectionTitle from './HeaderSection'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export default function Arrivals() {
  const { currentStore } = useStore()
  const [arrivals, setArrivals] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // 'all', 'pending', 'confirmed', 'cancelled'

  const [form, setForm] = useState({
    referenceNumber: '',
    supplier: '',
    arrivalDate: new Date().toISOString().split('T')[0],
    notes: '',
    items: [{ productId: '', qtyReceived: '', costPrice: '' }]
  })

  useEffect(() => {
    fetchArrivals()
    fetchProducts()

    const interval = setInterval(fetchArrivals, 30000)
    return () => clearInterval(interval)
  }, [currentStore])

  async function fetchArrivals() {
    setLoading(true)
    try {
      const token = getToken()
      if (!token) {
        console.warn('No auth token, cannot fetch arrivals')
        setLoading(false)
        return
      }
      const res = await fetch(`${API_BASE}/api/arrivals?store=${currentStore}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: res.statusText }))
        console.error('API Error:', res.status, errorData)
        throw new Error(errorData.error || `HTTP ${res.status}`)
      }

      const data = await res.json()
      setArrivals(Array.isArray(data) ? data : [])
      setError('')
    } catch (e) {
      console.error('Error fetching arrivals:', e)
      setError(`Erreur API: ${e.message}`)
      setArrivals([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchProducts() {
    try {
      const prods = getProducts()
      setProducts(prods)
    } catch (e) {
      console.error('Error fetching products:', e)
    }
  }

  function handleFormChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setError('')
  }

  function handleItemChange(index, field, value) {
    const newItems = [...form.items]
    newItems[index] = { ...newItems[index], [field]: value }
    setForm(f => ({ ...f, items: newItems }))
  }

  function addItem() {
    setForm(f => ({
      ...f,
      items: [...f.items, { productId: '', qtyReceived: '', costPrice: '' }]
    }))
  }

  function removeItem(index) {
    setForm(f => ({
      ...f,
      items: f.items.filter((_, i) => i !== index)
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!form.referenceNumber.trim() || !form.supplier.trim()) {
      setError('Numéro de référence et fournisseur requis')
      return
    }

    if (form.items.length === 0) {
      setError('Au moins un article requis')
      return
    }

    const invalidItems = form.items.some(item => !item.productId || !item.qtyReceived || !item.costPrice)
    if (invalidItems) {
      setError('Tous les articles doivent avoir un produit, une quantité et un prix')
      return
    }

    try {
      const token = getToken()
      const payload = {
        referenceNumber: form.referenceNumber,
        supplier: form.supplier,
        arrivalDate: form.arrivalDate,
        notes: form.notes,
        store: currentStore,
        items: form.items.map(item => ({
          productId: Number(item.productId),
          qtyReceived: Number(item.qtyReceived),
          costPrice: Number(item.costPrice),
          notes: item.notes || ''
        }))
      }

      const res = await fetch(`${API_BASE}/api/arrivals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create arrival')
      }

      const data = await res.json()

      await logAction('ARRIVAL_CREATED', `Arrivage créé: ${form.referenceNumber} de ${form.supplier}`)
      showToast('Arrivage créé avec succès', 'success')

      setForm({
        referenceNumber: '',
        supplier: '',
        arrivalDate: new Date().toISOString().split('T')[0],
        notes: '',
        items: [{ productId: '', qtyReceived: '', costPrice: '' }]
      })
      setShowForm(false)
      setError('')

      await fetchArrivals()
    } catch (e) {
      console.error('Error creating arrival:', e)
      setError(e.message)
      showToast(e.message, 'error')
    }
  }

  async function confirmArrival(id) {
    if (!confirm('Confirmer cet arrivage?\n\nLe stock sera augmenté et le coût moyen pondéré sera calculé automatiquement.')) return

    try {
      const token = getToken()
      const res = await fetch(`${API_BASE}/api/arrivals/${id}/confirm`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to confirm arrival')
      }

      await logAction('ARRIVAL_CONFIRMED', 'Arrivage confirmé - Stock augmenté et coût moyen pondéré calculé')
      showToast('Arrivage confirmé - Stock et coût moyen pondéré mis à jour', 'success')
      await fetchArrivals()
    } catch (e) {
      console.error('Error confirming arrival:', e)
      showToast(e.message, 'error')
    }
  }

  async function cancelArrival(id) {
    if (!confirm('Annuler cet arrivage?')) return

    try {
      const token = getToken()
      const res = await fetch(`${API_BASE}/api/arrivals/${id}/cancel`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to cancel arrival')
      }

      await logAction('ARRIVAL_CANCELLED', 'Arrivage annulé')
      showToast('Arrivage annulé', 'success')
      await fetchArrivals()
    } catch (e) {
      console.error('Error cancelling arrival:', e)
      showToast(e.message, 'error')
    }
  }

  const filtered = filter === 'all' ? arrivals : arrivals.filter(a => a.status === filter)

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && !showForm && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <strong>Erreur API:</strong> {error}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
     
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouvel Arrivage
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white p-4 rounded border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Créer un arrivage</h3>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Erreur formul
              aire: {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Numéro de Référence *</label>
                <input
                  type="text"
                  name="referenceNumber"
                  value={form.referenceNumber}
                  onChange={handleFormChange}
                  placeholder="Ex: ARR-2026-001"
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fournisseur *</label>
                <input
                  type="text"
                  name="supplier"
                  value={form.supplier}
                  onChange={handleFormChange}
                  placeholder="Ex: Fournisseur XYZ"
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date d'Arrivée *</label>
                <input
                  type="date"
                  name="arrivalDate"
                  value={form.arrivalDate}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <input
                  type="text"
                  name="notes"
                  value={form.notes}
                  onChange={handleFormChange}
                  placeholder="Ex: Bon de livraison #123"
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold">Articles *</h4>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-sm px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  + Ajouter un article
                </button>
              </div>

              <div className="space-y-2">
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-start p-3 bg-gray-50 rounded border">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Produit</label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option value="">-- Sélectionner --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.sku} - {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-20">
                      <label className="block text-xs text-gray-600 mb-1">Quantité</label>
                      <input
                        type="number"
                        min="1"
                        value={item.qtyReceived}
                        onChange={(e) => handleItemChange(idx, 'qtyReceived', e.target.value)}
                        placeholder="Qty"
                        className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs text-gray-600 mb-1">Prix Achat</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.costPrice}
                        onChange={(e) => handleItemChange(idx, 'costPrice', e.target.value)}
                        placeholder="0.00"
                        className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    {form.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="mt-5 p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Créer l'Arrivage
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b">
        {['all', 'pending', 'confirmed', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 font-medium border-b-2 transition ${filter === status
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
          >
            {status === 'all' ? 'Tous' : status === 'pending' ? 'En Attente' : status === 'confirmed' ? 'Confirmés' : 'Annulés'}
            {` (${status === 'all' ? arrivals.length : arrivals.filter(a => a.status === status).length})`}
          </button>
        ))}
      </div>

      {/* Arrivals List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Aucun arrivage</div>
        ) : (
          filtered.map(arrival => (
            <div key={arrival.id} className="bg-white border rounded p-4">
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{arrival.referenceNumber}</h3>
                  <p className="text-sm text-gray-600">
                    {arrival.supplier} • {new Date(arrival.arrivalDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded text-sm font-medium ${arrival.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      arrival.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        'bred-100 text-red-800'
                    }`}>
                    {arrival.status === 'pending' ? 'En Attente' :
                      arrival.status === 'confirmed' ? 'Confirmé' :
                        'Annulé'}
                  </span>
                  {arrival.receivedByUser && (
                    <span className="text-sm text-gray-500">
                      Par {arrival.receivedByUser.displayName}
                    </span>
                  )}
                </div>
              </div>

              {/* Notes */}
              {arrival.notes && (
                <p className="text-sm text-gray-600 mb-3">📝 {arrival.notes}</p>
              )}

              {/* Items Table */}
              <div className="mb-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-2 py-2 text-left">SKU</th>
                      <th className="px-2 py-2 text-left">Produit</th>
                      <th className="px-2 py-2 text-right">Quantité</th>
                      <th className="px-2 py-2 text-right">Prix Achat</th>
                      <th className="px-2 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arrival.items.map(item => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="px-2 py-2 font-mono text-xs">{item.sku}</td>
                        <td className="px-2 py-2">{item.productName}</td>
                        <td className="px-2 py-2 text-right font-semibold">{item.qtyReceived}</td>
                        <td className="px-2 py-2 text-right">{item.costPrice.toFixed(2)} Ar</td>
                        <td className="px-2 py-2 text-right font-semibold">{(item.qtyReceived * item.costPrice).toFixed(2)} Ar</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td colSpan="2" className="px-2 py-2">Total:</td>
                      <td className="px-2 py-2 text-right">{arrival.items.reduce((sum, i) => sum + i.qtyReceived, 0)}</td>
                      <td colSpan="2"></td>
                      <td className="px-2 py-2 text-right">
                        {arrival.items.reduce((sum, i) => sum + (i.qtyReceived * i.costPrice), 0).toFixed(2)} Ar
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Actions */}
              {arrival.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => confirmArrival(arrival.id)}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2 text-sm"
                  >
                    <Check className="w-4 h-4" />
                    Confirmer & Augmenter Stock
                  </button>
                  <button
                    onClick={() => cancelArrival(arrival.id)}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-2 text-sm"
                  >
                    <X className="w-4 h-4" />
                    Annuler
                  </button>
                </div>
              )}

              {arrival.status === 'confirmed' && (
                <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Arrivage confirmé - Stock augmenté et coût moyen pondéré calculé le {new Date(arrival.updatedAt).toLocaleDateString('fr-FR')}
                </div>
              )}

              {arrival.status === 'cancelled' && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
                  <X className="w-4 h-4" />
                  Arrivage annulé
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Comment fonctionne la traçabilité?
        </h4>
        <ul className="space-y-1 ml-6 list-disc">
          <li><strong>Créer:</strong> Enregistrez l'arrivage avec le fournisseur, la date et les articles</li>
          <li><strong>Vérifier:</strong> Vérifiez le bon de livraison avant de confirmer</li>
          <li><strong>Confirmer:</strong> Le stock est augmenté automatiquement une fois confirmé</li>
          <li><strong>Tracer:</strong> Chaque mouvement est logué avec l'utilisateur et la date</li>
        </ul>
      </div>
    </div>
  )
}
