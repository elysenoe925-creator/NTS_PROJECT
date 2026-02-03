import React, { useState, useEffect } from 'react'
import { getProducts, setProducts as storeSetProducts, subscribe, getProductsForStore, requestRestock, cancelRestock, isReorderRequested, refreshProducts } from '../lib/productsStore'
import { refreshSales } from '../lib/salesStore'
import IconButton from './IconButton'
import { showToast } from '../lib/toast'
import { getToken } from '../lib/authStore'
import { logAction } from '../lib/actionLogger'
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'
import { useStore } from '../lib/StoreContext'
import HeaderSectionTitle from './HeaderSection'
import { AlertCircle, Package, Edit2, Trash2, CheckCircle2, AlertTriangle, Search, Filter, Download, Plus, RotateCcw } from 'lucide-react'

export default function Stock() {
  const { currentStore } = useStore()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const DEFAULT_THRESHOLD = 5
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ sku: '', name: '', model: '', compatibleModels: '', qty: '', location: '', category: '', supplier: '', cost: '', margin: '' })
  const [filters, setFilters] = useState({ model: '', location: '', category: '', compatibleModels: '' })
  const [sortPrice, setSortPrice] = useState('')
  const [editingSku, setEditingSku] = useState(null)
  const [error, setError] = useState('')

  // Restock logic
  const [showRestockForm, setShowRestockForm] = useState(false)
  const [restockSku, setRestockSku] = useState(null)
  const [restockQty, setRestockQty] = useState('')
  const [restockNotes, setRestockNotes] = useState('')

  useEffect(() => {
    let mounted = true
    const update = () => setProducts(getProductsForStore(currentStore))
    setLoading(true)
    Promise.all([refreshProducts(currentStore).catch(() => { }), refreshSales(currentStore).catch(() => { })]).finally(() => {
      if (!mounted) return
      update()
      setLoading(false)
    })
    const unsub = subscribe(update)
    return () => { mounted = false; unsub() }
  }, [currentStore])

  if (loading) return <div>Loading stock...</div>

  const filtered = products.filter(p => {
    const qMatch = (!q) || p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase())
    if (!qMatch) return false

    // model filter
    if (filters.model && !(p.model || '').toLowerCase().includes(filters.model.toLowerCase())) return false

    // location filter
    if (filters.location && !(p.location || '').toLowerCase().includes(filters.location.toLowerCase())) return false

    // category filter
    if (filters.category && (p.category || '').toLowerCase() !== filters.category.toLowerCase()) return false

    // compatible models filter
    if (filters.compatibleModels && !(p.compatibleModels || []).some(cm => cm.toLowerCase().includes(filters.compatibleModels.toLowerCase()))) return false

    return true
  })

  // apply sorting by price if requested
  const displayed = (() => {
    const copy = filtered.slice()
    if (sortPrice === 'asc') return copy.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
    if (sortPrice === 'desc') return copy.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
    return copy
  })()

  function handleFilterChange(e) {
    const { name, value } = e.target
    setFilters(f => ({ ...f, [name]: value }))
  }

  function resetFilters() {
    setFilters({ model: '', location: '', category: '', compatibleModels: '' })
    setSortPrice('')
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setError('')
  }

  async function handleAdd(e) {
    e.preventDefault()
    // basic validation
    if (!form.sku.trim() || !form.name.trim()) { setError('SKU et nom requis'); return }
    const token = getToken()
    try {
      if (editingSku) {
        // update existing product via API
        // Si on modifie cost ou margin et qu'on est dans une boutique spécifique, mettre à jour par store
        const hasStorePricing = (form.cost || form.margin) && currentStore && currentStore !== 'all'

        const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(editingSku)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            ...(hasStorePricing && { store: currentStore }), // Ajouter store pour les mises à jour par boutique
            sku: !hasStorePricing ? form.sku.trim() : undefined,
            name: !hasStorePricing ? form.name.trim() : undefined,
            model: !hasStorePricing ? (form.model.trim() || null) : undefined,
            compatibleModels: !hasStorePricing ? (form.compatibleModels ? form.compatibleModels.split(',').map(s => s.trim()).filter(Boolean) : []) : undefined,
            location: !hasStorePricing ? (form.location.trim() || null) : undefined,
            category: !hasStorePricing ? (form.category.trim() || null) : undefined,
            supplier: !hasStorePricing ? (form.supplier.trim() || null) : undefined,
            cost: form.cost || null,
            margin: form.margin || null,
            qty: Number(form.qty) || 0,
            ...(hasStorePricing ? {} : { stocks: [{ store: currentStore === 'all' ? 'majunga' : currentStore, qty: Number(form.qty) || 0 }] })
          })
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Erreur mise à jour' }))
          setError(err.error || 'Erreur lors de la mise à jour')
          return
        }
        await logAction('MISE_A_JOUR_PRODUIT', `Produit ${editingSku} mis à jour: ${form.name}`)
        await refreshProducts(currentStore)
        showToast('success', 'Produit mis à jour')
        setEditingSku(null)
        setForm({ sku: '', name: '', model: '', compatibleModels: '', qty: '', location: '', category: '', supplier: '', cost: '', margin: '' })
        return
      }

      // create new product via API
      const stockKey = currentStore === 'all' ? 'majunga' : currentStore
      const payload = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        model: form.model.trim() || null,
        compatibleModels: form.compatibleModels ? form.compatibleModels.split(',').map(s => s.trim()).filter(Boolean) : [],
        location: form.location.trim() || null,
        category: form.category.trim() || null,
        supplier: form.supplier.trim() || null,
        cost: form.cost || null,
        margin: form.margin || null,
        stocks: [{ store: stockKey, qty: Number(form.qty) || 0 }]
      }
      const res = await fetch(`${API_BASE}/api/products`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur création' }))
        setError(err.error || 'Erreur lors de la création')
        return
      }
      await logAction('CREATION_PRODUIT', `Produit créé: ${form.sku} - ${form.name} (Qté: ${form.qty})`)
      await refreshProducts(currentStore)
      showToast('success', 'Produit créé')
      setForm({ sku: '', name: '', model: '', compatibleModels: '', qty: '', location: '', category: '', supplier: '', cost: '', margin: '' })
    } catch (e) {
      setError('Erreur réseau')
    }
  }

  function handleEdit(sku) {
    const p = products.find(x => x.sku === sku)
    if (!p) return
    setForm({ sku: p.sku, name: p.name, model: p.model || '', compatibleModels: (p.compatibleModels || []).join(', '), qty: String(p.qty || ''), location: p.location || '', category: p.category || '', supplier: p.supplier || '', cost: p.cost || '', margin: p.margin || '' })
    setEditingSku(sku)
    setError('')
    // open the modal form for editing
    setShowForm(true)
  }

  function handleDelete(sku) {
    if (!confirm(`Supprimer le produit ${sku} ?`)) return
    const token = getToken()
    fetch(`${API_BASE}/api/products/${encodeURIComponent(sku)}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
      .then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Erreur suppression' }))
          alert(err.error || 'Erreur lors de la suppression')
          return
        }
        await logAction('SUPPRESSION_PRODUIT', `Produit ${sku} supprimé`)
        await refreshProducts(currentStore)
        setProducts(getProductsForStore(currentStore))
        showToast('success', 'Produit supprimé')
      }).catch(() => alert('Erreur réseau'))
  }

  function openRestockModal(sku) {
    setRestockSku(sku)
    setRestockQty('')
    setRestockNotes('')
    setShowRestockForm(true)
  }

  async function handleRestockSubmit(e) {
    e.preventDefault()
    if (!restockSku) return
    const success = await requestRestock(restockSku, currentStore === 'all' ? 'majunga' : currentStore, restockQty, restockNotes)
    if (success) {
      showToast('success', 'Demande envoyée aux commandes')
      setShowRestockForm(false)
      setRestockSku(null)
    } else {

      showToast('error', 'Erreur lors de la demande')
    }
  }

  async function handleCancelRestock(sku) {
    if (!confirm('Annuler la demande de réapprovisionnement ? Cela supprimera la commande en attente.')) return
    const success = await cancelRestock(sku, currentStore === 'all' ? 'majunga' : currentStore)
    if (success) {
      showToast('success', 'Demande annulée')
      await refreshProducts(currentStore)
    } else {
      showToast('error', 'Erreur lors de l\'annulation')
    }
  }

  return (
    <div className="stock-container p-4 lg:p-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-slate-500 text-sm">Gérer et suivre l'inventaire des produits</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              const delimiter = ';'
              const headers = ['SKU', 'Produit', 'Modèle', 'Compatibles', 'Qté', 'Emplacement', 'Prix d\'achat', 'Marge bénéficière', 'Prix de vente', 'Catégorie', 'Fournisseur']
              const rows = products.map(p => [p.sku, p.name, p.model || '', (p.compatibleModels || []).join(', '), p.qty, p.location || '', p.cost || '', p.margin || '', p.price || '', p.category || '', p.supplier || ''])
              const esc = v => (v == null ? '' : String(v).replace(/"/g, '""'))
              const csvBody = [headers.join(delimiter)].concat(rows.map(r => r.map(c => `"${esc(c)}"`).join(delimiter))).join('\n')
              const csv = '\uFEFF' + csvBody
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'stock.csv'
              document.body.appendChild(a)
              a.click()
              a.remove()
              URL.revokeObjectURL(url)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download size={18} />
            <span>Exporter</span>
          </button>
          <button
            onClick={() => { setShowForm(true); setEditingSku(null); setForm({ sku: '', name: '', model: '', compatibleModels: '', qty: '', location: '', category: '', supplier: '', cost: '', margin: '' }) }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200"
          >
            <Plus size={18} />
            <span>Nouveau Produit</span>
          </button>
        </div>
      </div>

      {/* SEARCH & FILTERS SECTION */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Search Box */}
          <div className="lg:col-span-4 relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search size={18} />
            </span>
            <input
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Rechercher produit..."
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>

          {/* Filter Inputs Grid */}
          <div className="lg:col-span-8 flex flex-wrap gap-2">
            <input
              name="model"
              placeholder="Modèle"
              value={filters.model}
              onChange={handleFilterChange}
              className="flex-1 min-w-[120px] px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <input
              name="location"
              placeholder="Emplacement"
              value={filters.location}
              onChange={handleFilterChange}
              className="flex-1 min-w-[140px] px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <input
              name="compatibleModels"
              placeholder="Modèles compatibles"
              value={filters.compatibleModels}
              onChange={handleFilterChange}
              className="flex-1 min-w-[160px] px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />

            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="flex-1 min-w-[140px] px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Toutes catégories</option>
              {Array.from(new Set(products.map(p => p.category || 'Autre'))).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              name="sortPrice"
              value={sortPrice}
              onChange={e => setSortPrice(e.target.value)}
              className="flex-1 min-w-[140px] px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Trier par prix</option>
              <option value="asc">Prix croissant</option>
              <option value="desc">Prix décroissant</option>
            </select>

            <button
              type="button"
              onClick={resetFilters}
              className="px-3 py-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
              title="Réinitialiser"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      </div>



      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* DESKTOP TABLE */}
        <div className="table-responsive hidden-on-sales-mobile">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase">SKU</th>
                <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase">Produit</th>
                <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase">Fournisseur</th>
                <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase">Modèle</th>
                <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase">Catégorie</th>
                <th className="px-2 py-4 text-xs font-semibold text-slate-500 uppercase text-center">Qté</th>
                <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Prix Achat</th>
                <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase ">Marge bénéficiaire %</th>
                <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Prix Vente</th>
                <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase">Emplacement</th>
                <th className="px-4 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayed.length > 0 ? displayed.map(p => {
                const thresh = (p.reorderThreshold != null) ? Number(p.reorderThreshold) : DEFAULT_THRESHOLD
                const qty = Number(p.qty || 0)
                const isLow = qty > 0 && qty < thresh
                const isCritical = qty <= 0
                const requested = isReorderRequested(p, currentStore)

                return (
                  <tr key={p.sku} className={`hover:bg-slate-50/80 transition-colors ${requested ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-4 py-4 font-mono text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        {isCritical ? <span className="w-2 h-2 bg-red-500 rounded-full" /> : (isLow ? <span className="w-2 h-2 bg-amber-500 rounded-full" /> : null)}
                        {p.sku}
                      </div>
                      {requested && <span className="text-[10px] text-amber-600 font-bold block mt-1 uppercase">Réappro demandée</span>}
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-700">{p.name}</td>
                    <td className="px-4 py-4 font-medium text-slate-700">{p.supplier}</td>
                    <td className="px-4 py-4 text-slate-500 text-sm">
                      {p.model || '-'}
                      <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{(p.compatibleModels || []).join(', ')}</div>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-700">{p.category}</td>
                    <td className="px-2 py-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${isCritical ? 'bg-red-100 text-red-600' : (isLow ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600')}`}>
                        {qty}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-slate-600 text-sm font-mono">{p.cost != null ? Number(p.cost).toLocaleString() : '-'}</td>
                    <td className="px-4 py-4 text-center text-slate-600 text-sm font-mono">{p.margin} %</td>
                    <td className="px-4 py-4 text-right font-bold text-indigo-600">{p.price ? Number(p.price).toLocaleString() : '-'} Ar</td>
                    <td className="px-4 py-4 text-slate-500 text-xs italic">{p.location || '-'}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <IconButton onClick={() => handleEdit(p.sku)} className="hover:text-amber-600 transition-colors" tooltip="Modifier">
                          <Edit2 size={16} />
                        </IconButton>
                        <IconButton
                          onClick={() => requested ? handleCancelRestock(p.sku) : openRestockModal(p.sku)}
                          className={`transition-colors ${requested ? "text-amber-600" : "hover:text-indigo-600 text-slate-400"}`}
                          tooltip={requested ? "Annuler demande" : "Demander réappro"}
                        >
                          <Package size={16} />
                        </IconButton>
                        <IconButton onClick={() => handleDelete(p.sku)} className="hover:text-red-600 transition-colors text-slate-400" tooltip="Supprimer">
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400">Aucun produit trouvé</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS VIEW */}
        <div className="visible-on-sales-mobile divide-y divide-slate-100">
          {displayed.map(p => {
            const qty = Number(p.qty || 0)
            const requested = isReorderRequested(p, currentStore)
            return (
              <div key={p.sku} className={`p-4 bg-white active:bg-slate-50 transition-colors ${requested ? 'bg-amber-50/50' : ''}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-mono text-slate-400">#{p.sku}</span>
                    <h3 className="font-bold text-slate-800 text-base mt-0.5">{p.name}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-indigo-600">{p.price ? Number(p.price).toLocaleString() : '-'} Ar</div>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-1 ${qty <= 0 ? 'bg-red-100 text-red-600' : (qty < 5 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600')}`}>
                      Stock: {qty}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs mb-4">
                  <div>
                    <span className="text-slate-400 block mb-0.5 uppercase tracking-tighter text-[9px] font-bold">Modèle</span>
                    <span className="text-slate-700">{p.model || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5 uppercase tracking-tighter text-[9px] font-bold">Compatibles</span>
                    <span className="text-slate-700 truncate block">{(p.compatibleModels || []).join(', ') || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5 uppercase tracking-tighter text-[9px] font-bold">Prix Achat</span>
                    <span className="text-slate-600 font-mono">{p.cost != null ? Number(p.cost).toLocaleString() : '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5 uppercase tracking-tighter text-[9px] font-bold">Marge</span>
                    <span className="text-slate-600">{p.margin != null ? `${Number(p.margin).toFixed(2)}%` : '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5 uppercase tracking-tighter text-[9px] font-bold">Catégorie</span>
                    <span className="text-slate-700">{p.category || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5 uppercase tracking-tighter text-[9px] font-bold">Emplacement</span>
                    <span className="text-slate-700 italic">{p.location || '-'}</span>
                  </div>
                  <div className="col-span-2 border-t border-slate-50 pt-2">
                    <span className="text-slate-400 block mb-0.5 uppercase tracking-tighter text-[9px] font-bold">Fournisseur</span>
                    <span className="text-slate-700">{p.supplier || '-'}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-50 mt-1">
                  <button onClick={() => handleEdit(p.sku)} className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1">
                    <Edit2 size={12} /> Modifier
                  </button>
                  <button
                    onClick={() => requested ? handleCancelRestock(p.sku) : openRestockModal(p.sku)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${requested ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}
                  >
                    <Package size={12} /> {requested ? 'Annuler Réappro' : 'Réappro'}
                  </button>
                  <button onClick={() => handleDelete(p.sku)} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    



    {
    showForm && (
      <div className="modal-overlay show backdrop-blur-sm" onClick={() => setShowForm(false)}>
        <div className="modal-dialog card show !max-w-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">{editingSku ? 'Modifier le produit' : 'Ajouter un produit'}</h3>
            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <IconButton className="ghost">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </IconButton>
            </button>
          </div>

          <form onSubmit={(e) => { handleAdd(e); setShowForm(false); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
                <input name="sku" placeholder="Ex: P-010" value={form.sku} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom du produit</label>
                <input name="name" placeholder="Nom descriptif" value={form.name} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Modèle</label>
                <input name="model" placeholder="Ex: RES-10K" value={form.model} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Modèles compatibles</label>
                <input name="compatibleModels" placeholder="Séparez par des virgules" value={form.compatibleModels} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantité</label>
                <input name="qty" placeholder="0" value={form.qty} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Emplacement</label>
                <input name="location" placeholder="Entrepôt A" value={form.location} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
                <input name="category" placeholder="Composants" value={form.category} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fournisseur</label>
                <input name="supplier" placeholder="Fournisseur" value={form.supplier} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prix d'achat (coût)</label>
                <input name="cost" placeholder="0.00" value={form.cost} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Marge (%)</label>
                <input name="margin" placeholder="0.00" value={form.margin} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="md:col-span-2 bg-indigo-50 p-3 rounded-lg flex justify-between items-center">
                <span className="text-sm font-semibold text-indigo-700 uppercase tracking-wider">Prix de vente estimé:</span>
                <span className="text-xl font-bold text-indigo-600 font-mono">
                  {form.cost && form.margin ? Number(Number(form.cost) * (1 + Number(form.margin) / 100)).toLocaleString() : '-'} Ar
                </span>
              </div>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium">{error}</div>}

            <div className="pt-4 flex gap-3">
              <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 uppercase tracking-wide">
                {editingSku ? 'Sauvegarder' : 'Ajouter au stock'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  {
    showRestockForm && (
      <div className="modal-overlay show backdrop-blur-sm" onClick={() => setShowRestockForm(false)}>
        <div className="modal-dialog card show !max-w-md" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-slate-800">Demander réappro</h3>
            <button onClick={() => setShowRestockForm(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="mb-6 p-3 bg-amber-50 rounded-lg border border-amber-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
              <Package size={20} />
            </div>
            <div>
              <div className="text-xs text-amber-700 font-bold uppercase">Produit</div>
              <div className="text-sm font-bold text-slate-800 uppercase">{products.find(p => p.sku === restockSku)?.name || restockSku}</div>
            </div>
          </div>

          <form onSubmit={handleRestockSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantité souhaitée</label>
              <input type="number" name="qty" placeholder="Ex: 10" value={restockQty} onChange={e => setRestockQty(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optionnel)</label>
              <textarea name="notes" placeholder="Détails, urgence..." value={restockNotes} onChange={e => setRestockNotes(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]" />
            </div>

            <div className="pt-2 flex gap-3">
              <button type="submit" className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-100">
                Envoyer la demande
              </button>
              <button type="button" onClick={() => setShowRestockForm(false)} className="px-6 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }
    </div >
  )
}




