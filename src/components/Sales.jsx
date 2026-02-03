/*
import React, { useState, useEffect } from 'react'
import { getProducts, setProducts as storeSetProducts, subscribe, getProductsForStore, setStock, refreshProducts } from '../lib/productsStore'
import { getSales, setSales as storeSetSales, subscribe as subscribeSales, refreshSales } from '../lib/salesStore'
import { getToken } from '../lib/authStore'
import { logAction } from '../lib/actionLogger'
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'
import IconButton from './IconButton'
import { useStore } from '../lib/StoreContext'
import { showToast } from '../lib/toast'



export default function Sales() {
  const [query, setQuery] = useState('')

  const { currentStore } = useStore()

  



 
    
    const [products, setProducts] = useState(() => getProductsForStore(currentStore))
    const [selectedSku, setSelectedSku] = useState('')
    const [qty, setQty] = useState(1)
    const [client, setClient] = useState('')
    const [message, setMessage] = useState('')
    const [sales, setSales] = useState(() => getSales())
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [modalVisible, setModalVisible] = useState(false)
    const [showForm, setShowForm] = useState(false)

    useEffect(() => {
      const unsubP = subscribe(() => setProducts(getProductsForStore(currentStore)))
      const unsubS = subscribeSales(() => setSales(getSales(currentStore)))
      // initial load
      setProducts(getProductsForStore(currentStore))
      setSales(getSales(currentStore))
      return () => { unsubP(); unsubS() }
    }, [currentStore])

    async function handleSell(e) {
        e.preventDefault()
        setMessage('')
        if (!currentStore || currentStore === 'all') { setMessage('Sélectionnez une boutique avant d’enregistrer une vente'); return }
        if (!selectedSku) { setMessage('Sélectionnez un produit'); return }
        const product = products.find(p => p.sku === selectedSku)
        if (!product) { setMessage('Produit introuvable'); return }
        const available = Number(product.qty || 0)
        const sellQty = Number(qty) || 0
        if (available <= 0) { setMessage('Stock épuisé — impossible de vendre ce produit'); return }
        if (sellQty <= 0) { setMessage('Quantité invalide'); return }
        if (sellQty > available) { setMessage(`Quantité demandée supérieure au stock (${available})`); return }

        // call backend to record sale and update stock
        try {
          let token = null
          try { token = getToken && getToken() } catch (e) {}
          const res = await fetch(API_BASE + '/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ sku: selectedSku, qty: sellQty, client: client || 'Client inconnu', store: currentStore }) })
          if (!res.ok) {
            const err = await res.json().catch(()=>({ error: 'Erreur enregistre vente' }))
            const msg = err.error || 'Erreur lors de l\'enregistrement'
            setMessage(msg)
            showToast('error', msg)
            return
          }
          const data = await res.json()
          setMessage('Vente enregistrée')
          showToast('success', 'Vente enregistrée')
          // Log the action
          await logAction('VENTE', `Vente de ${sellQty} x ${product.name} (SKU: ${selectedSku}) à ${client} pour ${data.sale.total} ariary`)
          // refresh products and sales cache
          try { refreshProducts(currentStore) } catch (e) {}
          try { refreshSales(currentStore) } catch (e) {}
          // reset form
          setSelectedSku('')
          setQty(1)
          setClient('')
          setShowForm(false)
        } catch (e) {
          setMessage('Erreur réseau')
        }
    }

    function showProductDetails(sku) {
      const p = products.find(x => x.sku === sku)
      if (p) setSelectedProduct(p)
      else setSelectedProduct({ sku, name: 'Produit introuvable' })
      // show modal with animation
      setTimeout(() => setModalVisible(true), 10)
    }

    function closeDetails() {
      // animate hide then clear
      setModalVisible(false)
      setTimeout(() => setSelectedProduct(null), 200)
    }

    useEffect(() => {
      if (!selectedProduct) return
      const onKey = (e) => { if (e.key === 'Escape') closeDetails() }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }, [selectedProduct])

    function editProductFromModal(sku) {
      try { sessionStorage.setItem('gsm_focus_sku', sku) } catch (e) {}
      closeDetails()
      window.location.hash = '#/stock'
    }

    const productOptions = products.filter(p => (p.name||'').toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase()))

    function exportToCsv(filename, headers, rows) {
      const delimiter = ';'
      const esc = v => (v == null ? '' : String(v).replace(/"/g, '""'))
      const csvBody = [headers.join(delimiter)].concat(rows.map(r => r.map(c => `"${esc(c)}"`).join(delimiter))).join('\n')
      // Add UTF-8 BOM so Excel recognizes encoding and accents correctly
      const csv = '\uFEFF' + csvBody
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }

    function handleExportSales() {
      const headers = ['Id','Client','Produit','Qté','Prix unitaire','Total','Date','Boutique']
      const rows = sales.map(s => {
        const product = products.find(p => p.sku === s.sku)
        const pricePerUnit = product ? (product.price || '') : ''
        return [s.id, s.client, s.sku, s.qty, pricePerUnit, s.total, new Date(s.date).toLocaleString(), s.store || '']
      })
      exportToCsv('ventes.csv', headers, rows)
    }

    return (
      <div className="sales-container">
        <div className="sales-header">
          <h2>Ventes</h2>
          <div className="sales-controls">
             <input placeholder="Rechercher produit (nom ou SKU)" value={query} onChange={e=>setQuery(e.target.value)} className="search-input-sales" />
            <button onClick={() => { setShowForm(true); setMessage(''); setSelectedSku(''); setQty(1); setClient(''); }} className="btn btn-primary sales-new-btn" title="Nouvelle vente"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" style={{width:16, height:16}}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Nouvelle vente</button>
            <button onClick={handleExportSales} className="btn sales-export-btn" title="Exporter en CSV">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" style={{width:16, height:16}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> Exporter CSV</button>
          </div>
        </div>

       
        {showForm && (
          <div className={`modal-overlay show`} onClick={() => setShowForm(false)}>
            <div className={`modal-dialog card show`} onClick={e => e.stopPropagation()}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16}}>
                <h3 style={{margin: 0}}>Nouvelle vente</h3>
                <button className="icon-btn ghost" onClick={() => setShowForm(false)} aria-label="Fermer">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={(e)=>{ handleSell(e); }} style={{display:'grid', gap:8}}>
                <div>
                  <label className="small">Client</label>
                  <input placeholder="Nom du client" value={client} onChange={e=>setClient(e.target.value)} />
                </div>

                <div>
                  <label className="small">Produit</label>
                  <select value={selectedSku} onChange={e=>setSelectedSku(e.target.value)}>
                    <option value="">-- choisir --</option>
                    {productOptions.map(p => (
                      <option key={p.sku} value={p.sku}>{p.sku} — {p.name} (Qté: {p.qty})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="small">Quantité</label>
                  <input type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)} />
                </div>

                {message && <div style={{marginTop:8, padding: 8, borderRadius: 4, backgroundColor: message.includes('impossible') || message.includes('invalide') ? 'rgba(220, 38, 38, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: message.includes('impossible') || message.includes('invalide') ? '#dc2626' : '#10b981'}}>{message}</div>}

                <div style={{marginTop:12, display:'flex', gap:8}}>
                  <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg shadow-emerald-500/50 transition-all">Vendre</button>
                  <button type="button" onClick={() => { setShowForm(false); setMessage(''); setSelectedSku(''); setQty(1); setClient(''); }} className="btn">Annuler</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="sales-layout">
          <div className="sales-table-wrapper">
            <div className="card">
              <h3 style={{marginTop:10 , marginBottom:45 , fontSize:18}}>Ventes récentes</h3>
              
             
              <div className="table-responsive hidden-on-sales-mobile">
                <table className="sales-table">
                  <thead>
                    <tr><th>Id</th><th>Client</th><th>Produit</th><th>Qté</th><th>Total</th><th>Date</th><th></th></tr>
                  </thead>
                  <tbody>
                    {sales.map(s => (
                          <tr key={s.id}>
                            <td data-label="Id">{s.id}</td>
                            <td data-label="Client">{s.client}</td>
                            <td data-label="Produit">{s.sku}</td>
                            <td data-label="Qté">{s.qty}</td>
                            <td data-label="Total">{Number(s.total).toFixed(2)}  ariary</td>
                            <td data-label="Date">{new Date(s.date).toLocaleString()}</td>
                            <td data-label="Actions">
                              <IconButton className="ghost" onClick={() => showProductDetails(s.sku)} tooltip="Voir produit">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </IconButton>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>

             
              <div className="sales-cards-grid visible-on-sales-mobile">
                {sales.map(s => (
                  <div key={s.id} className="sales-card">
                    <div className="sales-card-header">
                      <div className="sales-card-id">#{s.id}</div>
                      <div className="sales-card-date">{new Date(s.date).toLocaleDateString()}</div>
                    </div>
                    <div className="sales-card-content">
                      <div className="sales-card-row">
                        <span className="sales-card-label">Client</span>
                        <span className="sales-card-value">{s.client}</span>
                      </div>
                      <div className="sales-card-row">
                        <span className="sales-card-label">Produit</span>
                        <span className="sales-card-value">{s.sku}</span>
                      </div>
                     
                      <div className="sales-card-row">
                        <span className="sales-card-label">Quantité</span>
                        <span className="sales-card-value">{s.qty}</span>
                      </div>
                      <div className="sales-card-row">
                        <span className="sales-card-label">Total</span>
                        <span className="sales-card-value-total">{s.total} ariary</span>
                      </div>
                      <div className="sales-card-row">
                        <span className="sales-card-label">Heure</span>
                        <span className="sales-card-value">{new Date(s.date).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <div className="sales-card-actions">
                      <button 
                        onClick={() => showProductDetails(s.sku)} 
                        className="sales-card-btn py-2 px-4 bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 focus:ring-offset-indigo-200 text-white w-full transition ease-in duration-200 text-center text-base font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg "
                        title="Voir détails produit"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Voir produit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {selectedProduct && (
                <div className={`modal-overlay ${modalVisible ? 'show' : ''}`} onClick={closeDetails}>
                  <div className={`modal-dialog card ${modalVisible ? 'show' : ''}`} onClick={e => e.stopPropagation()}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div>
                        <div style={{fontSize:16}}>{selectedProduct.sku} — {selectedProduct.name}</div>
                        <div style={{color:'#6b7280', fontSize:13}}>{selectedProduct.model || ''} {selectedProduct.category ? `• ${selectedProduct.category}` : ''}</div>
                      </div>
                      <div style={{display:'flex', gap:8}}>
                        <button className="btn btn-primary" onClick={() => editProductFromModal(selectedProduct.sku)}>Modifier</button>
                        <button className="icon-btn ghost" onClick={closeDetails} aria-label="Fermer">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginTop:12}}>
                      <div><strong>Quantité:</strong> {selectedProduct.qty != null ? selectedProduct.qty : '-'}</div>
                      <div><strong>Prix unitaire:</strong> {selectedProduct.price != null ? `${Number(selectedProduct.price).toFixed(2)}` : '-'}</div>
                      <div><strong>Emplacement:</strong> {selectedProduct.location || '-'}</div>
                      <div><strong>Fournisseur:</strong> {selectedProduct.supplier || '-'}</div>
                      <div style={{gridColumn:'1 / -1'}}><strong>Compatibles:</strong> {(selectedProduct.compatibleModels && selectedProduct.compatibleModels.length) ? selectedProduct.compatibleModels.join(', ') : '-'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    
    )
  }
  */


import React, { useState, useEffect } from 'react'
import { subscribe, getProductsForStore, refreshProducts } from '../lib/productsStore'
import { getSales, subscribe as subscribeSales, refreshSales } from '../lib/salesStore'
import { getToken } from '../lib/authStore'
import { logAction } from '../lib/actionLogger'
import IconButton from './IconButton'
import { useStore } from '../lib/StoreContext'
import { showToast } from '../lib/toast'
import { AlertCircle, Package, Edit2, Trash2, CheckCircle2, AlertTriangle, Search, Filter, Download, Plus, RotateCcw } from 'lucide-react'

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

    const product = products.find(p => p.sku === selectedSku)
    if (!product) { showToast('error', 'Produit introuvable'); return }

    const available = Number(product.qty || 0)
    const sellQty = Number(qty) || 0


    if (available <= 0 || sellQty > available) {
      showToast('error', `Stock insuffisant (${available} disponible(s)`)
      return
    }

    setIsSubmitting(true)
    try {
      const token = getToken ? getToken() : null
      const res = await fetch(`${API_BASE}/api/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ sku: selectedSku, qty: sellQty, client: client || 'Client inconnu', store: currentStore })
      })

      if (!res.ok) throw new Error('Erreur lors de la vente')

      const data = await res.json()
      showToast('success', 'Vente enregistrée avec succès')

      await logAction('VENTE', `Vente: ${sellQty} x ${product.name} (${selectedSku})`)

      refreshProducts(currentStore)
      refreshSales(currentStore)

      // Reset
      setShowForm(false)
      setSelectedSku('')
      setQty(1)
      setClient('')
    } catch (e) {
      showToast('error', 'Erreur réseau ou serveur')
    } finally {
      setIsSubmitting(false)
    }
  }

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
            <Download size={18}/>
            <span>Exporter</span>
          </button>
          <button onClick={() => { setModalQuery(''); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200">
            <Plus size={18}/>
            <span>Nouvelle Vente</span>
          </button>
        </div>
      </div>

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
    </div>
  )
}


