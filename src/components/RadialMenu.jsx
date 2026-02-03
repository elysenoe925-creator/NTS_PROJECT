import React from 'react'

export default function RadialMenu({ open, options = [], radius = 80, onSelect = () => {}, onClose = () => {} }) {
  if (!open) return null
  return (
    <div style={{position:'absolute', left:0, top:40, pointerEvents:'auto'}}>
      <div style={{background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, padding:8, boxShadow:'0 6px 18px rgba(0,0,0,0.06)'}}>
        {options.map(opt => (
          <button key={opt.key} onClick={() => onSelect(opt.key)} style={{display:'block', padding:'6px 10px', margin:'4px 0'}}>{opt.label}</button>
        ))}
        <div style={{textAlign:'right'}}>
          <button onClick={onClose} className="btn" style={{marginTop:6}}>Fermer</button>
        </div>
      </div>
    </div>
  )
}
