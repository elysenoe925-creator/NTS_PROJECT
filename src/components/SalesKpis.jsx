import React, { useEffect, useState } from 'react'
import { getSales, subscribe } from '../lib/salesStore'
import { useStore } from '../lib/StoreContext'
import { TrendingUp, ShoppingBag, ReceiptText } from 'lucide-react'

function compute(list) {
  const itemsSold = list.reduce((s, sale) => s + (Number(sale.qty) || 0), 0)
  const revenue = list.reduce((s, sale) => s + (Number(sale.total) || 0), 0)
  const orders = list.length
  return { itemsSold, revenue, orders }
}

export default function SalesKpis() {
  const { currentStore } = useStore()
  const [kpis, setKpis] = useState(() => compute(getSales(currentStore)))

  useEffect(() => {
    const handler = () => setKpis(compute(getSales(currentStore)))
    handler()
    const unsub = subscribe(handler)
    return unsub
  }, [currentStore])

  return (
    <div className="kpi-grid-sales">
      <div className="kpi-card kpi-sky">
        <div className="kpi-icon-wrapper">
          <div className="kpi-icon">
            <TrendingUp size={24} />
          </div>
        </div>
        <div className="kpi-content">
          <div className="kpi-label">CA {currentStore && currentStore !== 'all' ? `(${currentStore})` : 'Global'}</div>
          <div className="kpi-metric">
            {kpis.revenue.toLocaleString('fr-FR')} <span className="kpi-unit">Ar</span>
          </div>
        </div>
      </div>

      <div className="kpi-card kpi-rose">
        <div className="kpi-icon-wrapper">
          <div className="kpi-icon">
            <ShoppingBag size={24} />
          </div>
        </div>
        <div className="kpi-content">
          <div className="kpi-label">Articles vendus</div>
          <div className="kpi-metric">
            {kpis.itemsSold} <span className="kpi-unit">unités</span>
          </div>
        </div>
      </div>

      <div className="kpi-card kpi-emerald">
        <div className="kpi-icon-wrapper">
          <div className="kpi-icon">
            <ReceiptText size={24} />
          </div>
        </div>
        <div className="kpi-content">
          <div className="kpi-label">Transactions</div>
          <div className="kpi-metric">
            {kpis.orders} <span className="kpi-unit">ventes</span>
          </div>
        </div>
      </div>
    </div>
  )
}
