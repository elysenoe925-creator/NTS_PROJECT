import React, { useEffect, useState } from 'react'
import { getProducts, subscribe as subscribeProducts, isReorderRequested, setReorderRequested, refreshProducts } from '../lib/productsStore'
import { refreshSales, subscribe as subscribeSales } from '../lib/salesStore'
import { useStore } from '../lib/StoreContext'
import { computeDecisions } from '../lib/advancedDecisionEngine'
import IconButton from './IconButton'

const DEFAULT_LEAD_DAYS = 120
const DEFAULT_LOOKBACK_DAYS = 7

export default function DecisionEngine() {
  const [leadDays, setLeadDays] = useState(DEFAULT_LEAD_DAYS)
  const [lookback, setLookback] = useState(DEFAULT_LOOKBACK_DAYS)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const { currentStore } = useStore()

  useEffect(() => {
    let mounted = true
    const compute = () => {
      // Utiliser le moteur de décision amélioré
      const decisions = computeDecisions({
        lookback,
        leadDays,
        storeId: currentStore === 'all' ? null : currentStore,
        includeDetails: false
      })

      // Marquer les items avec status de requête
      const list = decisions.map(item => ({
        ...item,
        requested: isReorderRequested(getProducts().find(x => x.sku === item.sku), currentStore)
      }))

      setItems(list.slice(0, 8))
    }

    // refresh remote data then compute
    setLoading(true)
    Promise.all([refreshProducts(currentStore).catch(()=>{}), refreshSales(currentStore).catch(()=>{})]).finally(() => {
      if (!mounted) return
      compute()
      setLoading(false)
    })

    const unsubP = subscribeProducts(compute)
    const unsubS = subscribeSales(compute)
    return () => { mounted = false; unsubP(); unsubS() }
  }, [leadDays, lookback, currentStore])

  function markReorder(sku) {
    try {
      setReorderRequested(sku, currentStore === 'all' ? 'all' : currentStore, !(isReorderRequested(getProducts().find(p => p.sku === sku), currentStore)))
    } catch (e) { /* ignore */ }
  }

  return (
    <div className="card" style={{marginBottom:12}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h3 style={{margin:0}}>Suggestions basées sur ventes (Moteur amélioré)</h3>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <label className="small">Délai (jours)</label>
          <input type="number" value={leadDays} onChange={e => setLeadDays(Math.max(1, Number(e.target.value || 1)))} style={{width:60}} />
          <label className="small">Historique (jours)</label>
          <input type="number" value={lookback} onChange={e => setLookback(Math.max(1, Number(e.target.value || 1)))} style={{width:60}} />
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:10, marginTop:12}}>
          {loading ? <div>Loading...</div> : items.map(it => (
          <div key={it.sku} className="card">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div>
                <div>{it.sku} — {it.name}</div>
                <div className="small">Vendu (période): {it.sold} • Vitesse: {it.velocity.toFixed(2)}/j</div>
              </div>
              <div style={{textAlign:'right'}}>
                {it.reorderNeeded ? <div style={{color:'#b91c1c'}}>Priorité</div> : <div className="small">OK</div>}
                <div style={{marginTop:6}}>{it.expectedProfit > 0 ? `${it.expectedProfit.toFixed(2)} Ar` : '-'} </div>
              </div>
            </div>
            <div style={{marginTop:8}}>
              <div>Stock: {it.stock} • Seuil: {it.threshold}</div>
              <div>Demande projetée ({leadDays}j): {it.projectedDemand.toFixed(1)} unités</div>
              <div style={{marginTop:6, padding:'8px', backgroundColor:'#f3f4f6', borderRadius:'4px'}}>
                <div className="small" style={{color:'#666'}}>Couverture restante:</div>
                <div style={{fontSize:'16px', fontWeight:'bold', color: it.coverageDays !== null && it.coverageDays <= 7 ? '#b91c1c' : it.coverageDays !== null && it.coverageDays < 15 ? '#d97706' : '#16a34a'}}>
                  {it.coverageDays !== null ? `${it.coverageDays} jour${it.coverageDays !== 1 ? 's' : ''}` : 'Aucune vente'}
                </div>
              </div>
                <div style={{marginTop:8, display:'flex', justifyContent:'flex-end'}}>
                  <button className="btn btn-primary" onClick={() => markReorder(it.sku)} style={{display:'inline-flex', alignItems:'center'}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" style={{width:16, height:16, marginRight:8}}>
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M12 8v8" />
                      <path d="M8 12h8" />
                    </svg>
                    {(isReorderRequested(getProducts().find(p => p.sku === it.sku), currentStore) ? 'Annuler réappro' : (it.reorderNeeded ? 'Marquer réappro' : 'Demander réappro'))}
                  </button>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

