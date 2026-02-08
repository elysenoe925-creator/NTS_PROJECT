


import React, { useState, useEffect } from 'react'
import { subscribe, getProductsForStore, refreshProducts } from '../lib/productsStore'
import { getSales, subscribe as subscribeSales, refreshSales } from '../lib/salesStore'
import { getToken } from '../lib/authStore'
import { logAction } from '../lib/actionLogger'
import IconButton from './IconButton'
import { useStore } from '../lib/StoreContext'
import { showToast } from '../lib/toast'
import { AlertCircle, Package, Edit2, Trash2, CheckCircle2, AlertTriangle, Search, Filter, Download, Plus, RotateCcw } from 'lucide-react'
import ConfirmModal from './ConfirmModal'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export default function Sales() {
  const [query, setQuery] = useState('')
  const { currentStore } = useStore()

  const [products, setProducts] = useState(() => getProductsForStore(currentStore))
  const [sales, setSales] = useState(() => getSales(currentStore))
  const [selectedSku, setSelectedSku] = useState('')
  const [qty, setQty] = useState(1)
  const [client, setClient] = useState('')
  const [message, setMessage] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalQuery, setModalQuery] = useState('') // Separate query for modal

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: '', message: '', type: 'warning', onConfirm: () => { }
  })

  useEffect(() => {
    const unsubP = subscribe(() => setProducts(getProductsForStore(currentStore)))
    const unsubS = subscribeSales(() => setSales(getSales(currentStore)))
    setProducts(getProductsForStore(currentStore))
    setSales(getSales(currentStore))

    // Auto-refresh from backend to ensure latest data (and new 'model' field)
    refreshProducts(currentStore)
    refreshSales(currentStore)

    return () => { unsubP(); unsubS() }
  }, [currentStore])

  async function handleSell(e) {
    e.preventDefault()
    setMessage('')

    if (!currentStore || currentStore === 'all') {
      showToast('error', 'Sélectionnez une boutique'); return
    }

    const sellQty = parseInt(qty)
    if (isNaN(sellQty) || sellQty <= 0) {
      showToast('error', 'Quantité invalide'); return
    }

    const product = products.find(p => p.sku === selectedSku)
    if (!product) { showToast('error', 'Produit introuvable'); return }

    const available = Number(product.qty || 0)

    if (available <= 0 || sellQty > available) {
      showToast('error', `Stock insuffisant (${available} disponible(s))`)
      return
    }

    // High value or quantity confirmation
    const total = Number(product.price) * sellQty
    const isHighValue = total > 1000000 // 1M Ar as threshold

    if (isHighValue || sellQty > 10) {
      setConfirmModal({
        isOpen: true,
        title: "Confirmer la vente importante",
        message: `Confirmer la vente de ${sellQty} x ${product.name} pour un total de ${total.toLocaleString()} Ar ?`,
        type: 'warning',
        confirmText: "Confirmer la vente",
        onConfirm: () => executeSell(product, sellQty)
      })
      return
    }

    executeSell(product, sellQty)
  }

  async function executeSell(product, sellQty) {
    setIsSubmitting(true)
    try {
      const token = getToken ? getToken() : null
      const res = await fetch(`${API_BASE}/api/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          sku: selectedSku,
          qty: sellQty,
          client: client.trim() || 'Client inconnu',
          store: currentStore
        })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Erreur lors de la vente')
      }

      await res.json()
      showToast('success', 'Vente enregistrée avec succès')
      await logAction('VENTE', `Vente: ${sellQty} x ${product.name} (${selectedSku})`)
      await Promise.all([refreshProducts(currentStore), refreshSales(currentStore)])

      // Reset
      setShowForm(false)
      setSelectedSku('')
      setQty(1)
      setClient('')
      setModalQuery('')
    } catch (e) {
      showToast('error', e.message || 'Erreur réseau ou serveur')
    } finally {
      setIsSubmitting(false)
    }
  }

  /* 
  Ancienne logique handleSell conservée pour référence (partie API)
  async function handleSell_partie_api(e) {
    // ... logic moving to executeSell
  }
  */

  // --- Logic for Modal & Export (Inchangé mais utilisé dans le JSX) ---
  function showProductDetails(sku) {
    const p = products.find(x => x.sku === sku)
    setSelectedProduct(p || { sku, name: 'Produit introuvable' })
    setTimeout(() => setModalVisible(true), 10)
  }

  function closeDetails() {
    setModalVisible(false)
    setTimeout(() => setSelectedProduct(null), 200)
  }

  const productOptions = products.filter(p =>
    (p.name || '').toLowerCase().includes(modalQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(modalQuery.toLowerCase())
  )

  const filteredSales = sales.filter(s => {
    const q = query.toLowerCase()
    const skuMatch = (s.sku || '').toLowerCase().includes(q)
    const modelMatch = (s.model || '').toLowerCase().includes(q)
    const clientMatch = (s.client || '').toLowerCase().includes(q)

    // If model info is missing in sale but available in products list, try that too
    let productModelMatch = false
    if (!s.model && products.length > 0) {
      const p = products.find(prod => prod.sku === s.sku)
      if (p && p.model && p.model.toLowerCase().includes(q)) {
        productModelMatch = true
      }
    }

    return skuMatch || modelMatch || clientMatch || productModelMatch
  })

  const handleExportSales = () => {
    const headers = ['ID', 'Client', 'SKU', 'Modèle', 'Quantité', 'Total', 'Date']
    const rows = filteredSales.map(s => [s.id, s.client, s.sku, s.model || '', s.qty, `${Number(s.total).toFixed(2)} Ar`, new Date(s.date).toLocaleString()])

    const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `ventes_${currentStore}_${new Date().toLocaleDateString()}.csv`)
    link.click()
  }

  return (
    <div className="sales-container p-4 lg:p-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-slate-500 text-sm">Suivez et enregistrez les transactions de la boutique</p>
        </div>

        <div className="flex gap-2">
          <button onClick={handleExportSales} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
            <Download size={18} />
            <span>Exporter</span>
          </button>
          {currentStore !== 'all' && (
            <button onClick={() => { setModalQuery(''); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200">
              <Plus size={18} />
              <span>Nouvelle Vente</span>
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
            <p className="text-sm opacity-90">Veuillez sélectionner une boutique spécifique pour enregistrer de nouvelles ventes.</p>
          </div>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="relative mb-6">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </span>
        <input
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm"
          placeholder={('rechercher...')}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {/* SALES MODAL FORM */}
      {showForm && (
        <div className="modal-overlay show backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="modal-dialog card show !max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">{('record_sale')}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSell} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{('rechercher article')}</label>
                <input
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none mb-2"
                  placeholder={('article...')}
                  value={modalQuery}
                  onChange={e => setModalQuery(e.target.value)}
                />
                <select
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={selectedSku}
                  onChange={e => setSelectedSku(e.target.value)}
                  required
                >
                  <option value="">{("Choisir l'article")}</option>
                  {productOptions.map(p => (
                    <option key={p.sku} value={p.sku} disabled={p.qty <= 0}>
                      {p.name} ({p.qty} {('in_stock')}) — {p.sku}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
                <input
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Nom du client (optionnel)"
                  value={client}
                  onChange={e => setClient(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{('quantité')}</label>
                <input
                  type="number"
                  min="1"
                  placeholder="quantité"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                >
                  {isSubmitting ? ('loading') : ('confirmer vente')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {('annuler')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MAIN TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="table-responsive hidden-on-sales-mobile">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Client</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">{('product')}</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">{('model')}</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-center">{('qty')}</th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Total</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Date</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSales.length > 0 ? filteredSales.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-slate-400">#{s.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-700">{s.client}</td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">{s.sku}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{s.model || '-'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">{s.qty}</span>
                  </td>

                  <td className="px-6 py-4 font-bold text-indigo-600">{Number(s.total).toFixed(2)} Ar</td>
                  <td className="px-6 py-4 text-right text-sm text-slate-500">{new Date(s.date).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <IconButton className="hover:text-indigo-600 transition-colors" onClick={() => showProductDetails(s.sku)} tooltip="Détails">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </IconButton>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">{('no_sales')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS */}
        <div className="visible-on-sales-mobile divide-y divide-slate-100">
          {filteredSales.map(s => (
            <div key={s.id} className="p-4 bg-white active:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-mono text-slate-400">#{s.id}</span>
                <span className="text-sm font-bold text-indigo-600">{Number(s.total).toFixed(2)} Ar</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-800">{s.client}</div>
                  <div className="text-sm text-slate-500">{s.sku} {s.model ? `(${s.model})` : ''} • {s.qty} unité(s)</div>
                  <div className="text-xs text-slate-400 mt-1">{new Date(s.date).toLocaleString()}</div>
                </div>
                <button
                  onClick={() => showProductDetails(s.sku)}
                  className="p-2 bg-slate-50 text-slate-400 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PRODUCT DETAIL MODAL (Inchangé structurellement, style harmonisé) */}
      {selectedProduct && (
        <div className={`modal-overlay ${modalVisible ? 'show' : ''}`} onClick={closeDetails}>
          <div className={`modal-dialog card !max-w-lg ${modalVisible ? 'show' : ''}`} onClick={e => e.stopPropagation()}>
            {/* ... contenu du modal similaire au précédent mais avec styles plus propres ... */}
            <div className="flex justify-between border-b pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold">{selectedProduct.name}</h3>
                <p className="text-sm text-slate-500 uppercase tracking-wider">{selectedProduct.sku}</p>
              </div>
              <button onClick={closeDetails} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-50 p-3 rounded-lg">
                <span className="block text-xs text-slate-500">Stock actuel</span>
                <span className="text-xl font-bold text-slate-800">{selectedProduct.qty}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <span className="block text-xs text-slate-500">Prix unitaire</span>
                <span className="text-xl font-bold text-indigo-600">{Number(selectedProduct.price).toFixed(2)} Ar</span>
              </div>
            </div>
            <button
              className="w-full mt-6 py-3 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-900 transition-all"
              onClick={() => {
                sessionStorage.setItem('gsm_focus_sku', selectedProduct.sku);
                window.location.hash = '#/stock';
              }}
            >
              Gérer le stock
            </button>
          </div>
        </div>
      )}
      <ConfirmModal
        {...confirmModal}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}


