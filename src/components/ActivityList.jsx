import React from 'react'

const sample = [
  { id: 1, text: 'Facture #231 payée', time: '2h' },
  { id: 2, text: 'Nouveau client: Dupont SARL', time: '6h' },
  { id: 3, text: 'Commande #412 expédiée', time: '1j' },
]

export default function ActivityList() {
  return (
    <div className="card activity-container">
      <h3 className="activity-title">Activité récente</h3>
      <div className="activity-list">
        {sample.map(a => (
          <div key={a.id} className="activity-item">
            <div className="activity-text">{a.text}</div>
            <div className="activity-time">{a.time}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
