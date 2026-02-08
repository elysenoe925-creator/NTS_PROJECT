import React, { useEffect, useState } from 'react'
import { getProducts, subscribe, getProductsForStore, refreshProducts } from '../lib/productsStore'
import { refreshSales } from '../lib/salesStore'
import { useStore } from '../lib/StoreContext'
import { Package, Layers, CircleDollarSign, AlertTriangle } from 'lucide-react'

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
      <div className="kpi-card kpi-blue">
        <div className="kpi-icon-wrapper">
          <div className="kpi-icon">
            <Package size={24} />
          </div>
        </div>
        <div className="kpi-content">
          <div className="kpi-label">Produits</div>
          <div className="kpi-metric">
            {loading ? '…' : kpis.productsCount}
          </div>
        </div>
      </div>

      <div className="kpi-card kpi-violet">
        <div className="kpi-icon-wrapper">
          <div className="kpi-icon">
            <Layers size={24} />
          </div>
        </div>
        <div className="kpi-content">
          <div className="kpi-label">Quantité totale</div>
          <div className="kpi-metric">
            {loading ? '…' : kpis.totalItems} <span className="kpi-unit">unités</span>
          </div>
        </div>
      </div>

      <div className="kpi-card kpi-emerald">
        <div className="kpi-icon-wrapper">
          <div className="kpi-icon">
            <CircleDollarSign size={24} />
          </div>
        </div>
        <div className="kpi-content">
          <div className="kpi-label">Valeur du stock</div>
          <div className="kpi-metric">
            {loading ? '…' : kpis.totalValue.toLocaleString('fr-FR')} <span className="kpi-unit">Ar</span>
          </div>
        </div>
      </div>

      <div className={`kpi-card kpi-amber ${kpis.lowStock > 0 ? 'alert-active' : ''}`}>
        <div className="kpi-icon-wrapper">
          <div className="kpi-icon">
            <AlertTriangle size={24} />
          </div>
        </div>
        <div className="kpi-content">
          <div className="kpi-label">Stock bas (&lt;5)</div>
          <div className="kpi-metric">
            {loading ? '…' : kpis.lowStock} <span className="kpi-unit">alertes</span>
          </div>
        </div>
      </div>
    </div>
  )
}
