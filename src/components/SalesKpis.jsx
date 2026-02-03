import React, { useEffect, useState } from 'react'
import { getSales, subscribe } from '../lib/salesStore'
import { useStore } from '../lib/StoreContext'
import { ChartLine, CircleCheck, ShoppingCart } from 'lucide-react'

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
    // initial
    handler()
    const unsub = subscribe(handler)
    return unsub
  }, [currentStore])

  return (
    <div className="kpi-grid-sales">
      <div className="kpi-card kpi-revenue">
        <div className="kpi-icon-wrapper">
          <div className="kpi-icon revenue-icon">
            <ChartLine />
          </div>
        </div>
        <div className="kpi-content">
          <div className="kpi-label">Chiffre d'affaires {currentStore && currentStore !== 'all' ? `(${currentStore})` : ''}</div>
          <div className="kpi-metric">
            {kpis.revenue.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} <span className="kpi-unit">Ar</span>
          </div>
        </div>
      </div>

      <div className="kpi-card kpi-sold">
        <div className="kpi-icon-wrapper">
          <div className="kpi-icon sold-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24"><path fill="#fff" fillRule="evenodd" d="M3.04 2.292a.75.75 0 0 0-.497 1.416l.261.091c.668.235 1.107.39 1.43.549c.303.149.436.27.524.398c.09.132.16.314.2.677c.04.38.042.875.042 1.615V9.64c0 2.942.063 3.912.93 4.826c.866.914 2.26.914 5.05.914h5.302c1.561 0 2.342 0 2.893-.45c.552-.45.71-1.214 1.025-2.742l.5-2.425c.347-1.74.52-2.609.076-3.186S18.816 6 17.131 6H6.492a9 9 0 0 0-.043-.738c-.054-.497-.17-.95-.452-1.362c-.284-.416-.662-.682-1.103-.899c-.412-.202-.936-.386-1.552-.603zm12.477 6.165c.3.286.312.76.026 1.06l-2.857 3a.75.75 0 0 1-1.086 0l-1.143-1.2a.75.75 0 1 1 1.086-1.034l.6.63l2.314-2.43a.75.75 0 0 1 1.06-.026" clipRule="evenodd"></path><path fill="#fff" d="M7.5 18a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3m9 0a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3"></path></svg>
          </div>
        </div>
        <div className="kpi-content">
          <div className="kpi-label">Articles vendus</div>
          <div className="kpi-metric">
            {kpis.itemsSold} <span className="kpi-unit">unités</span>
          </div>
        </div>
      </div>

      <div className="kpi-card kpi-orders">
        <div className="kpi-icon-wrapper">
          <div className="kpi-icon orders-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 512 512"><path fill="#fff" d="M454.65 169.4A31.82 31.82 0 0 0 432 160h-64v-16a112 112 0 0 0-224 0v16H80a32 32 0 0 0-32 32v216c0 39 33 72 72 72h272a72.22 72.22 0 0 0 50.48-20.55a69.48 69.48 0 0 0 21.52-50.2V192a31.75 31.75 0 0 0-9.35-22.6M332.49 274l-89.6 112a16 16 0 0 1-12.23 6h-.26a16 16 0 0 1-12.16-5.6l-38.4-44.88a16 16 0 1 1 24.32-20.8L230 350.91L307.51 254a16 16 0 0 1 25 20ZM336 160H176v-16a80 80 0 0 1 160 0Z" strokeWidth={13} stroke="#fff"></path></svg>
          </div>
        </div>
        <div className="kpi-content">
          <div className="kpi-label">Ventes effectuées</div>
          <div className="kpi-metric">
            {kpis.orders}
          </div>
        </div>
      </div>
    </div>
  )
}
