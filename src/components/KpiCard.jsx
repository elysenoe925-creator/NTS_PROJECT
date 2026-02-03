import React from 'react'

export default function KpiCard({ title, value, change }) {
  return (
    <div className="card">
      <div className="title">{title}</div>
      <div className="value">{value}</div>
      {change && <div className="change">{change}</div>}
    </div>
  )
}
