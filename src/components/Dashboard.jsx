import React, { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Breadcrumb from './Breadcrumb'
import KpiCard from './KpiCard'
import ActivityList from './ActivityList'
import CompanyCard from './CompanyCard'
import StockKpis from './StockKpis'
import SalesKpis from './SalesKpis'
import DecisionCenter from './DecisionCenter'
import Orders from './Orders'
import Sales from './Sales'
import Stock from './Stock'
import Arrivals from './Arrivals'
import SalesChart from './SalesChart'
import SalesDailyChart from './SalesDailyChart'
import ProductCategoriesChart from './ProductCategoriesChart'
import Users from './Users'
import Settings from './Settings'
import ActivityTracking from './ActivityTracking'

import Calculator from './Calculator'
import ToastContainer from './ToastContainer'
import { getCurrentUser, subscribeAuth } from '../lib/authStore'
import { useStore } from '../lib/StoreContext'

export default function Dashboard() {
  const [route, setRoute] = useState(window.location.hash || '#/dashboard')
  const [user, setUser] = useState(() => getCurrentUser())
  const { currentStore, setCurrentStore } = useStore()

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || '#/dashboard')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const unsub = subscribeAuth(u => setUser(u))
    return unsub
  }, [])

  useEffect(() => {
    // Restrictions locales si nécessaire, mais on ouvre le dashboard à tous
    /* 
    if (user && user.role === 'employee') {
       // Keep access to decisions restricted if needed, but allow dashboard
       if (route === '#/decisions') {
          window.location.hash = '#/sales'
       }
    }
    */
  }, [user, route])

  useEffect(() => {
    // Auto-adjust store based on route restrictions
    // For routes that don't allow "Tous", switch to Majunga if currently on "Tous"
    if (['#/arrivals', '#/orders', '#/decisions', '#/stock'].includes(route) && currentStore === 'all') {
      setCurrentStore('majunga')
    }
  }, [route, currentStore, setCurrentStore])

  const renderContent = () => {
    if (route === '#/settings') return <Settings />
    if (route === '#/user') return <Users />
    if (route === '#/sales') return <Sales />
    if (route === '#/stock') return <Stock />
    if (route === '#/arrivals') return <Arrivals />
    if (route === '#/orders') {
      if (user && user.role === 'employee') return (
        <div className="card"><h3>Accès refusé</h3><div>Vous n'avez pas les droits pour voir ce panneau.</div></div>
      )
      return <Orders />
    }
    if (route === '#/tracking') {
      if (user && user.role !== 'admin') return (
        <div className="card"><h3>Accès refusé</h3><div>Vous n'avez pas les droits pour voir ce panneau.</div></div>
      )
      return <ActivityTracking />
    }
    if (route === '#/decisions') {
      if (user && user.role === 'employee') return (
        <div className="card"><h3>Accès refusé</h3><div>Vous n'avez pas les droits pour voir ce panneau.</div></div>
      )
      return <DecisionCenter />
    }

    // default dashboard
    return (
      <div className="dashboard-container">

        {/* Company Presentation */}
        <CompanyCard />

        {/* Stock Section */}
        <section className="dashboard-section ">

          <StockKpis />

        </section>

        {/* Sales Section */}
        <section className="dashboard-section">
          <SalesKpis />
        </section>

        {/* Alerts Section */}


        {/* Charts and Activity Section */}
        <section className="widgets">
          <div className="card chart-container">
            <p className="chart-title">Ventes par jour (30 jours)</p>
            <div className="chart-wrapper">
              <SalesDailyChart />
            </div>

          </div>
          <div className="card chart-container ">
            <p className="chart-title">Graphique des ventes (par mois)</p>
            <div className="chart-wrapper">
              <SalesChart />
            </div>

          </div>
        </section>

        {/* Categories Section */}
        <section className="widgets">
          <div className="card chart-container">
            <p className="chart-title">Catégories de produits</p>
            <div className="chart-wrapper">
              <ProductCategoriesChart />
            </div>
          </div>
        </section>

        {/* Activity Section */}

      </div>
    )
  }

  const [showCalculator, setShowCalculator] = useState(false)

  return (
    <div className="app">
      <Sidebar onToggleCalculator={() => setShowCalculator(!showCalculator)} />
      <div className="main-area ">
        <Topbar />
        <Breadcrumb route={route} />
        <main className="main">
          {renderContent()}
        </main>
        {showCalculator && (
          <div className="fixed bottom-8 right-8 z-50">
            <Calculator onClose={() => setShowCalculator(false)} />
          </div>
        )}
        <ToastContainer />
      </div>
    </div>
  )
}
