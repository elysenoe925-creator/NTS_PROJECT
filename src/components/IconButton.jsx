import React from 'react'

export default function IconButton({ children, title, onClick, className = '', tooltip, style }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} className={`icon-btn ${className}`} data-tooltip={tooltip || title} style={style}>
      {children}
    </button>
  )
}
