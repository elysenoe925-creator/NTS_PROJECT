import React, { useEffect, useState } from 'react'
import { getProducts, subscribe, getProductsForStore, refreshProducts } from '../lib/productsStore'
import { refreshSales } from '../lib/salesStore'
import { useStore } from '../lib/StoreContext'

function computeKpis(list) {
  const totalItems = list.reduce((s, p) => s + (Number(p.qty) || 0), 0)
  const totalValue = list.reduce((s, p) => s + ((Number(p.qty) || 0) * (Number(p.price) || 0)), 0)
  const productsCount = list.length
  const lowStock = list.filter(p => {
    const qty = Number(p.qty) || 0
    const threshold = Number(p.alertThreshold) || 5
    return qty < threshold
  }).length
  return { totalItems, totalValue, productsCount, lowStock }
}

export default function StockKpis() {
  const { currentStore } = useStore()
  const [kpis, setKpis] = useState(() => computeKpis([]))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    const handler = () => setKpis(computeKpis(getProductsForStore(currentStore)))
    setLoading(true)
    Promise.all([refreshProducts(currentStore).catch(() => { }), refreshSales(currentStore).catch(() => { })]).finally(() => {
      if (!mounted) return
      handler()
      setLoading(false)
    })
    const unsub = subscribe(handler)
    return () => { mounted = false; unsub() }
  }, [currentStore])

  return (
    <div className="kpi-grid-stock">
      <div className="kpi-card kpi-products">
        <div className="kpi-icon-wrapper">
          <div className="kpi-icon products-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 16 16"><path fill="#fff" d="M12 6V0H4v6H0v7h16V6zm-5 6H1V7h2v1h2V7h2zM5 6V1h2v1h2V1h2v5zm10 6H9V7h2v1h2V7h2zM0 16h3v-1h10v1h3v-2H0z"></path></svg>
          </div>
        </div>
        <div className="kpi-content">
          <div className="kpi-label">Produits</div>
          <div className="kpi-metric">
            {loading ? '…' : kpis.productsCount}
          </div>
        </div>
      </div>

      <div className="kpi-card kpi-quantity">
        <div className="kpi-icon-wrapper">
          <div className="kpi-icon quantity-icon">
            <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </div>
        </div>
        <div className="kpi-content">
          <div className="kpi-label">Quantité totale</div>
          <div className="kpi-metric">
            {loading ? '…' : kpis.totalItems} <span className="kpi-unit">Unités</span>
          </div>
        </div>
      </div>

      <div className="kpi-card kpi-value-stock">
        <div className="kpi-icon-wrapper">
          <div className="kpi-icon value-icon">
            <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
        </div>
        <div className="kpi-content">
          <div className="kpi-label">Valeur totale</div>
          <div className="kpi-metric">
            {loading ? '…' : kpis.totalValue.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} <span className="kpi-unit">Ar</span>
          </div>
        </div>
      </div>

      <div className={`kpi-card kpi-low-stock ${kpis.lowStock > 0 ? '!bg-red-600 !text-white !shadow-lg !shadow-red-500/50 animate-pulse' : ''}`}>
        <div className="kpi-icon-wrapper">
          <div className={`kpi-icon lowstock-icon ${kpis.lowStock > 0 ? '!bg-white/20 !text-white' : ''}`}>
            <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
        </div>
        <div className="kpi-content">
          <div className={`kpi-label ${kpis.lowStock > 0 ? '!text-black/90 font-bold' : ''}`}>Bas stock (&lt;5)</div>
          <div className={`kpi-metric ${kpis.lowStock > 0 ? '!text-black' : ''}`}>
            {loading ? '…' : kpis.lowStock} <span className="kpi-unit">Alerte</span>
          </div>
        </div>
      </div>
    </div>
  )
}
