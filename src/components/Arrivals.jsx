import React, { useState, useEffect } from 'react'
import { AlertCircle, Check, X, Plus, Edit2, Trash2, Package, TrendingDown, Download, Search, FileText, CheckCircle2 } from 'lucide-react'
import { getProducts, refreshProducts } from '../lib/productsStore'
import { getToken } from '../lib/authStore'
import { logAction } from '../lib/actionLogger'
import { showToast } from '../lib/toast'
import { useStore } from '../lib/StoreContext'
import IconButton from './IconButton'
import HeaderSectionTitle from './HeaderSection'
import { AlertTriangle } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export default function Arrivals() {
  const { currentStore } = useStore()
  const [arrivals, setArrivals] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // 'all', 'pending', 'confirmed', 'cancelled'
  const [searchTerm, setSearchTerm] = useState('')

  const [form, setForm] = useState({
    referenceNumber: '',
    supplier: '',
    arrivalDate: new Date().toISOString().split('T')[0],
    notes: '',
    items: [{ productId: '', qtyReceived: '', costPrice: '' }]
  })

  useEffect(() => {
    // Reset form when store changes
    setForm({
      referenceNumber: '',
      supplier: '',
      arrivalDate: new Date().toISOString().split('T')[0],
      notes: '',
      items: [{ productId: '', qtyReceived: '', costPrice: '' }]
    })
    setShowForm(false) // Optionally close form or keep it open but reset? User said "when I fill form...", implies they might be in the middle of it.
    // Resetting ensures no "cross-store" data pollution.

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
      const prods = await refreshProducts(currentStore)
      if (prods) setProducts(prods)
      else setProducts(getProducts())
    } catch (e) {
      console.error('Error fetching products:', e)
      setProducts(getProducts())
    }
  }

  // Add a separate effect for product subscription if needed, or just rely on manual fetch. 
  // Given the structure, let's keep it simple for now as the user primarily complained about form persistence.
  // But let's verify if getProducts() is sufficient.
  // Actually, let's import subscribe from productsStore.
  /*
  useEffect(() => {
    return subscribe((list) => setProducts(list))
  }, [])
  */
  // Since I don't want to add imports and complicate the file too much if not requested, I will stick to the form reset which is the direct fix.

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

  function handleExportCSV() {
    const delimiter = ';'
    const headers = ['Référence', 'Fournisseur', 'Date', 'Statut', 'Articles', 'Modèles', 'Total']
    const rows = arrivals.map(a => [
      a.referenceNumber,
      a.supplier,
      new Date(a.arrivalDate).toLocaleDateString('fr-FR'),
      a.status === 'pending' ? 'En Attente' : a.status === 'confirmed' ? 'Confirmé' : 'Annulé',
      a.items.map(i => `${i.productName} (${i.qtyReceived})`).join(', '),
      a.items.map(i => `${i.model || ''} ${i.compatibleModels ? `[${i.compatibleModels}]` : ''}`).join(' | '),
      a.items.reduce((sum, i) => sum + (i.qtyReceived * i.costPrice), 0).toFixed(2) + ' Ar'
    ])

    const esc = v => (v == null ? '' : String(v).replace(/"/g, '""'))
    const csvContent = '\uFEFF' + [headers.join(delimiter)].concat(rows.map(r => r.map(c => `"${esc(c)}"`).join(delimiter))).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `arrivages_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
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
      setIsSubmitting(true)
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

      await res.json()

      showToast('Arrivage créé avec succès', 'success')
      await logAction('ARRIVAGE_CREE', `Nouvel arrivage: ${form.referenceNumber} de ${form.supplier}`)

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
    } finally {
      setIsSubmitting(false)
    }
  }

  async function confirmArrival(id) {
    if (!confirm('Confirmer cet arrivage?\n\nLe stock sera augmenté et le coût moyen pondéré sera calculé automatiquement.')) return

    try {
      setIsSubmitting(true)
      const token = getToken()
      const res = await fetch(`${API_BASE}/api/arrivals/${id}/confirm`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to confirm arrival')
      }

      showToast('Arrivage confirmé - Stock et coût moyen pondéré mis à jour', 'success')
      await logAction('ARRIVAGE_CONFIRME', `Arrivage confirmé ID: ${id}`)
      await fetchArrivals()
    } catch (e) {
      console.error('Error confirming arrival:', e)
      showToast(e.message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function cancelArrival(id) {
    if (!confirm('Annuler cet arrivage?')) return

    try {
      setIsSubmitting(true)
      const token = getToken()
      const res = await fetch(`${API_BASE}/api/arrivals/${id}/cancel`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to cancel arrival')
      }

      showToast('Arrivage annulé', 'success')
      await logAction('ARRIVAGE_ANNULE', `Arrivage annulé ID: ${id}`)
      await fetchArrivals()
    } catch (e) {
      console.error('Error cancelling arrival:', e)
      showToast(e.message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filtered = arrivals.filter(a => {
    const statusMatch = filter === 'all' || a.status === filter
    const searchMatch = !searchTerm ||
      (a.referenceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.supplier || '').toLowerCase().includes(searchTerm.toLowerCase())
    return statusMatch && searchMatch
  })

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && !showForm && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <strong>Erreur API:</strong> {error}
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-blue-600" /> Gestion des Arrivages
          </h2>
          <p className="text-slate-500 text-sm">Suivez et validez les réceptions de marchandises</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download size={18} />
            <span>Exporter</span>
          </button>
          {currentStore !== 'all' && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
            >
              <Plus size={18} />
              <span>{showForm ? 'Fermer Formulaire' : 'Nouvel Arrivage'}</span>
            </button>
          )}
        </div>
      </div>

      {/* GLOBAL VIEW GUIDANCE */}
      {currentStore === 'all' && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800 shadow-sm">
          <AlertTriangle className="text-amber-500 shrink-0" size={24} />
          <div>
            <p className="font-bold text-sm uppercase tracking-wide">Vue Globale - Lecture seule</p>
            <p className="text-sm opacity-90">Veuillez sélectionner une boutique spécifique pour enregistrer de nouveaux arrivages ou les confirmer.</p>
          </div>
        </div>
      )}

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div key={idx} className="flex flex-col md:flex-row gap-4 items-start p-4 bg-slate-50/50 rounded-xl border border-slate-200/60 shadow-sm">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-tight mb-1">Produit</label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-all font-medium"
                      >
                        <option value="">-- Sélectionner --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.sku} - {p.name} {p.model ? `(${p.model})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full md:w-32">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-tight mb-1">Quantité</label>
                      <input
                        type="number"
                        min="1"
                        value={item.qtyReceived}
                        onChange={(e) => handleItemChange(idx, 'qtyReceived', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-all font-mono"
                      />
                    </div>
                    <div className="w-full md:w-40">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-tight mb-1">Prix Achat (Unitaire)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.costPrice}
                          onChange={(e) => handleItemChange(idx, 'costPrice', e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-all font-mono text-right"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Ar</span>
                      </div>
                    </div>
                    <div className="w-full md:w-auto self-end md:self-auto flex justify-end">
                      {form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                          title="Supprimer l'article"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-slate-100">
              <div className="flex flex-col md:flex-row gap-2 order-2 md:order-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center justify-center gap-2 font-bold shadow-md shadow-green-100 transition-all active:scale-95 whitespace-nowrap"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  {isSubmitting ? 'Enregistrement...' : "Enregistrer l'Arrivage"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors font-bold"
                >
                  Annuler
                </button>
              </div>

              <div className="ml-auto flex flex-col items-end justify-center order-1 md:order-2 bg-slate-50 px-6 py-2 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-0.5">Total estimé</span>
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {form.items.reduce((sum, i) => sum + (Number(i.qtyReceived || 0) * Number(i.costPrice || 0)), 0).toLocaleString()} <span className="text-sm font-bold text-slate-400">Ar</span>
                </span>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-2">
        <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl w-full md:w-fit">
          {['all', 'pending', 'confirmed', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${filter === status
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}
            >
              {status === 'all' ? 'Tous' : status === 'pending' ? 'En Attente' : status === 'confirmed' ? 'Confirmés' : 'Annulés'}
              <span className="ml-2 py-0.5 px-1.5 bg-slate-200 text-slate-600 rounded text-[10px]">
                {status === 'all' ? arrivals.length : arrivals.filter(a => a.status === status).length}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-slate-400" size={18} />
          </div>
          <input
            type="text"
            placeholder="Référence or fournisseur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Arrivals List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Aucun arrivage</div>
        ) : (
          filtered.map(arrival => (
            <div key={arrival.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl ${arrival.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                    arrival.status === 'confirmed' ? 'bg-emerald-100 text-emerald-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">{arrival.referenceNumber}</h3>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">
                      {arrival.supplier} • {new Date(arrival.arrivalDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm border ${arrival.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                    arrival.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      'bg-red-50 text-red-700 border-red-100'
                    }`}>
                    {arrival.status === 'pending' ? <AlertCircle size={12} /> :
                      arrival.status === 'confirmed' ? <CheckCircle2 size={12} /> :
                        <X size={12} />}
                    {arrival.status === 'pending' ? 'En Attente' :
                      arrival.status === 'confirmed' ? 'Confirmé' :
                        'Annulé'}
                  </div>
                  {arrival.receivedByUser && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      Par {arrival.receivedByUser.displayName}
                    </span>
                  )}
                </div>
              </div>

              {/* Notes */}
              {arrival.notes && (
                <p className="text-sm text-gray-600 mb-3">📝 {arrival.notes}</p>
              )}

              {/* Items Table - Desktop View */}
              <div className="hidden-on-sales-mobile mb-4 overflow-x-auto rounded-xl border border-slate-100 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">SKU</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Produit</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modèle</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Compatibilité</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quantité</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prix Achat</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {arrival.items.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.sku}</td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{item.productName}</td>
                        <td className="px-4 py-3 text-slate-600">{item.model || '-'}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs italic">{item.compatibleModels || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">{item.qtyReceived}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">{item.costPrice.toFixed(2)} Ar</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">{(item.qtyReceived * item.costPrice).toFixed(2)} Ar</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50/30 font-bold border-t border-slate-100">
                      <td colSpan="4" className="px-4 py-3 text-slate-500 uppercase text-xs">Total cumulé</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-slate-900">{arrival.items.reduce((sum, i) => sum + i.qtyReceived, 0)} items</span>
                      </td>
                      <td colSpan="2" className="px-4 py-3 text-right">
                        <span className="text-blue-600 font-black text-lg">
                          {arrival.items.reduce((sum, i) => sum + (i.qtyReceived * i.costPrice), 0).toFixed(2)} Ar
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Items List - Mobile View */}
              <div className="visible-on-sales-mobile space-y-3 mb-4">
                {arrival.items.map(item => (
                  <div key={item.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.sku}</div>
                        <div className="font-bold text-slate-800">{item.productName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quantité</div>
                        <div className="text-blue-600 font-black">{item.qtyReceived}</div>
                      </div>
                    </div>

                    {(item.model || item.compatibleModels) && (
                      <div className="mb-3 p-2 bg-white/50 rounded-lg border border-slate-200/50 text-[11px]">
                        {item.model && <div className="text-slate-600 font-medium">Modèle: {item.model}</div>}
                        {item.compatibleModels && <div className="text-slate-500 italic mt-0.5">Compatibilité: {item.compatibleModels}</div>}
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prix Unitaire</div>
                        <div className="text-slate-600 font-mono text-xs">{item.costPrice.toFixed(2)} Ar</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sous-total</div>
                        <div className="text-slate-900 font-bold">{(item.qtyReceived * item.costPrice).toFixed(2)} Ar</div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Mobile Total */}
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex justify-between items-center">
                  <div className="text-xs font-bold text-blue-700 uppercase">Total Arrivage</div>
                  <div className="text-xl font-black text-blue-800">
                    {arrival.items.reduce((sum, i) => sum + (i.qtyReceived * i.costPrice), 0).toFixed(2)} Ar
                  </div>
                </div>
              </div>

              {/* Actions */}
              {arrival.status === 'pending' && currentStore !== 'all' && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => confirmArrival(arrival.id)}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-2 text-sm font-bold shadow-md shadow-emerald-100 transition-all active:scale-95"
                  >
                    {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check className="w-4 h-4" />}
                    {isSubmitting ? 'Confirmation...' : 'Confirmer & Augmenter Stock'}
                  </button>
                  <button
                    onClick={() => cancelArrival(arrival.id)}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 flex items-center justify-center gap-2 text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
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
