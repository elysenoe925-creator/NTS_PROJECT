import React, { useEffect, useState } from 'react'
import { getProducts, subscribe as subscribeProducts, refreshProducts } from '../lib/productsStore'
import { getSales, subscribe as subscribeSales, refreshSales } from '../lib/salesStore'
import { computeDecisions, getStockHealth } from '../lib/advancedDecisionEngine'
import { createOrder, getOrders } from '../lib/ordersStore'
import { getCurrentUser } from '../lib/authStore'
import { useStore } from '../lib/StoreContext'
import { TrendingUp, AlertTriangle, CheckCircle, Package, DollarSign, Calendar, ArrowRight, Loader2 } from 'lucide-react'
import { showToast } from '../lib/toast'



export default function DecisionCenter() {
  // State and Logic
  const user = getCurrentUser()
  if (user && user.role === 'employee') {
    return (
      <div className="card">
        <h3>Accès refusé</h3>
        <div>Vous n'avez pas les droits pour accéder à ce panneau.</div>
      </div>
    )
  }
  const { currentStore } = useStore()
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(false)
  const [leadDays, setLeadDays] = useState(120) // default 4 months
  const [lookback, setLookback] = useState(7) // base on one week by default
  const [items, setItems] = useState([])
  const [opportunities, setOpportunities] = useState([]) // New state for investment opportunities
  const [health, setHealth] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])

  useEffect(() => {
    let mounted = true
    const compute = async () => {
      // Utiliser le moteur de décision amélioré
      try {
        const decisions = await computeDecisions({
          lookback,
          leadDays,
          storeId: currentStore === 'all' ? null : currentStore,
          includeDetails: true
        })

        const healthData = await getStockHealth({ lookback, leadDays, storeId: currentStore === 'all' ? null : currentStore })

        // Calculer les opportunités d'investissement (Top 5)
        const topOpportunities = decisions
          .filter(d => d.projectedDemand > 5 && d.expectedProfit > 0)
          .sort((a, b) => b.opportunityScore - a.opportunityScore)
          .slice(0, 5)

        if (mounted) {
          setItems(decisions)
          setHealth(healthData)
          setOpportunities(topOpportunities)
        }
      } catch (e) {
        console.error("Erreur calcul décisions", e)
      }
    }

    setLoading(true)
    Promise.all([refreshProducts().catch(() => { }), refreshSales().catch(() => { })]).finally(() => {
      if (!mounted) return
      setProducts(getProducts())
      setSales(getSales())
      compute().finally(() => {
        if (mounted) setLoading(false)
      })
    })

    const unsubP = subscribeProducts(() => compute())
    const unsubS = subscribeSales(() => compute())
    return () => { mounted = false; unsubP(); unsubS() }
  }, [leadDays, lookback, currentStore])

  const handleSelectItem = (sku) => {
    setSelectedItems(prev =>
      prev.includes(sku)
        ? prev.filter(s => s !== sku)
        : [...prev, sku]
    )
  }

  const handleCreateOrder = async () => {
    if (selectedItems.length === 0) {
      showToast('Sélectionnez au moins un produit à commander', 'error')
      return
    }

    const itemsToOrder = items.filter(item => selectedItems.includes(item.sku))
    try {
      const order = await createOrder(itemsToOrder)
      showToast(`Commande créée (#${order.referenceNumber || order.id}). Allez dans "Commandes" pour la finaliser.`, 'success')
      setSelectedItems([])
    } catch (e) {
      showToast(e.message, 'error')
    }
  }
  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    padding: '20px',
    border: '1px solid #f3f4f6'
  }

  var badgeStyle = (color) => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    backgroundColor: color === 'green' ? '#dcfce7' : color === 'red' ? '#fee2e2' : '#fef9c3',
    color: color === 'green' ? '#166534' : color === 'red' ? '#991b1b' : '#854d0e',
  })

  // ... (use existing logic for loading/error)

  return (
    <div className="decision-container" style={{ maxWidth: '100vw', margin: '0 auto', padding: '0 10px', animation: 'fadeIn 0.5s ease-out' }}>

      {/* Header Section */}
      <div style={{ ...cardStyle, marginBottom: '24px', background: 'linear-gradient(to right, #1e293b, #334155)', color: 'white', border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={24} /> Centre de décision
            </h2>
            <p style={{ margin: '4px 0 0', opacity: 0.8, fontSize: '0.9rem' }}>Analysez, planifiez et optimisez vos approvisionnements avec l'IA.</p>
          </div>

          <div className="decision-controls" style={{ display: 'flex', gap: '16px' }}>
            <div className="control-group">
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', opacity: 0.9 }}>Analyse (jours)</label>
              <input
                type="number"
                value={lookback}
                onChange={e => setLookback(Math.max(1, Number(e.target.value || 1)))}
                style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', width: '100px', fontSize: '0.9rem', color: '#1f2937' }}
              />
            </div>
            <div className="control-group">
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', opacity: 0.9 }}>Délais d'import (jours)</label>
              <input
                type="number"
                value={leadDays}
                onChange={e => setLeadDays(Math.max(1, Number(e.target.value || 1)))}
                style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', width: '100px', fontSize: '0.9rem', color: '#1f2937' }}
              />
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
          <Loader2 className="spin-slow" size={48} color="#3b82f6" />
          <p style={{ marginTop: '16px', color: '#64748b', fontWeight: 500 }}>Analyse des données en cours...</p>
          <style>{` .spin-slow { animation: spin 1.5s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } `}</style>
        </div>
      )}

      {!loading && health && (
        <>
          {/* Health Metrics Dashboard */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>

            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Santé du Stock</p>
                  <h3 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '8px 0', color: health.healthScore >= 70 ? '#16a34a' : health.healthScore >= 40 ? '#ca8a04' : '#dc2626' }}>
                    {health.healthScore}%
                  </h3>
                </div>
                <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: '#f0f9ff', color: '#0369a1' }}>
                  <TrendingUp size={24} />
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Score global d'efficacité</p>
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Couverture</p>
                  <h3 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '8px 0', color: '#1e293b' }}>
                    {health.coverageRatio}x
                  </h3>
                </div>
                <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: '#fdf4ff', color: '#a21caf' }}>
                  <Package size={24} />
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Ratio Stock / Demande prévue</p>
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Critique</p>
                  <h3 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '8px 0', color: '#dc2626' }}>
                    {health.urgentReorder}
                  </h3>
                </div>
                <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: '#fef2f2', color: '#dc2626' }}>
                  <AlertTriangle size={24} />
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Produits en rupture imminente</p>
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action Requise</p>
                  <h3 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '8px 0', color: '#ca8a04' }}>
                    {health.warningReorder}
                  </h3>
                </div>
                <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: '#fffbeb', color: '#b45309' }}>
                  <Calendar size={24} />
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Commandes à planifier</p>
            </div>
          </div>

          {/* Investment Opportunities */}
          {opportunities.length > 0 && (
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '6px', height: '24px', backgroundColor: '#3b82f6', borderRadius: '4px' }}></div>
                Top Opportunités d'Investissement
                <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#64748b', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>Basé sur l'IA</span>
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                {opportunities.map((opp, idx) => (
                  <div key={opp.sku} style={{
                    ...cardStyle,
                    border: idx === 0 ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    position: 'relative',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    cursor: 'default'
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = cardStyle.boxShadow; }}
                  >
                    {idx === 0 && (
                      <div style={{
                        position: 'absolute', top: '-12px', right: '20px',
                        background: '#3b82f6', color: 'white', padding: '4px 12px',
                        borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold',
                        boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)'
                      }}>
                        ★ Choix N°1
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>SKU: {opp.sku}</span>
                      <span style={badgeStyle(opp.aiPrediction?.confidence > 0.8 ? 'green' : 'yellow')}>
                        Confiance IA: {opp.aiPrediction && !isNaN(opp.aiPrediction.confidence) ? Math.round(opp.aiPrediction.confidence * 100) + '%' : 'N/A'}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px', lineHeight: 1.3 }}>{opp.name}</h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Profit Estimé</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#16a34a' }}>{Math.round(opp.expectedProfit).toLocaleString()} Ar</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Retour (ROI)</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0ea5e9' }}>{Math.round(opp.roi)}%</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.9rem', color: '#334155' }}>
                        Prévision: <strong>{Math.round(opp.projectedDemandAdjusted)} unités</strong> <span style={{ fontSize: '0.8em', color: '#94a3b8' }}>/ {leadDays}j</span>
                      </div>
                      {/* Button to quickly add to selection could go here */}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div style={{ position: 'sticky', top: '10px', zIndex: 10, marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            {selectedItems.length > 0 && (
              <div style={{
                backgroundColor: '#1e293b',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '999px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 'bold' }}>{selectedItems.length} produits sélectionnés</span>
                  <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Total: {items.filter(it => selectedItems.includes(it.sku)).reduce((sum, it) => sum + (it.orderQty * it.price), 0).toFixed(2)} Ar</span>
                </div>
                <button
                  onClick={handleCreateOrder}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: '20px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.target.style.backgroundColor = '#2563eb'}
                  onMouseLeave={e => e.target.style.backgroundColor = '#3b82f6'}
                >
                  Commander <ArrowRight size={16} />
                </button>
              </div>
            )}
            <style>{` @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } } `}</style>
          </div>

          {/* Data Table */}
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '16px', textAlign: 'left', width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedItems.length === items.filter(it => it.reorderNeeded).length && items.filter(it => it.reorderNeeded).length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems(items.filter(it => it.reorderNeeded).map(it => it.sku))
                          } else {
                            setSelectedItems([])
                          }
                        }}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Produit</th>
                    <th style={{ padding: '16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock Actuel</th>
                    <th style={{ padding: '16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vélocité</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Couverture</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recommandation</th>
                    <th style={{ padding: '16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date Commande</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const now = new Date()
                    const isUrgent = it.reorderNeeded && it.orderDate <= now
                    const isWarning = it.reorderNeeded && !isUrgent

                    return (
                      <tr key={it.sku} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? 'white' : '#fcfcfc' }}>
                        <td style={{ padding: '16px' }}>
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(it.sku)}
                            onChange={() => handleSelectItem(it.sku)}
                            disabled={!it.reorderNeeded}
                            style={{ cursor: it.reorderNeeded ? 'pointer' : 'not-allowed', width: '16px', height: '16px', opacity: it.reorderNeeded ? 1 : 0.5 }}
                          />
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{it.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{it.sku}</div>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                          {it.stock}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right', color: '#64748b' }}>
                          {it.avgSalesPerDay != null ? it.avgSalesPerDay.toFixed(2) : '-'} <span style={{ fontSize: '0.75em' }}>/j</span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          {it.coverageDays !== null ? (
                            <span style={badgeStyle(it.coverageDays < 15 ? 'red' : it.coverageDays < 45 ? 'yellow' : 'green')}>
                              {it.coverageDays} jours
                            </span>
                          ) : '-'}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          {it.reorderNeeded ? (
                            <span style={{
                              display: 'inline-block',
                              backgroundColor: isUrgent ? '#fee2e2' : '#fff7ed',
                              color: isUrgent ? '#dc2626' : '#ea580c',
                              padding: '4px 12px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              border: `1px solid ${isUrgent ? '#fecaca' : '#ffedd5'}`
                            }}>
                              + {it.orderQty} unités
                            </span>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right', fontWeight: 500, color: isUrgent ? '#dc2626' : '#64748b' }}>
                          {it.reorderNeeded ? (it.orderDate <= now ? 'Maintenant' : it.orderDate.toLocaleDateString()) : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}



