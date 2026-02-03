import React from 'react'
import { Building2 } from 'lucide-react'
import { useStore } from '../lib/StoreContext'
import '../styles/waves.css'

export default function CompanyCard() {
  const { currentStore } = useStore()

  const storeInfo = {
    all: {
      name: 'NTSOA GSM - Central',
      tagline: 'Gestion intégrée',
      bgGradient: 'linear-gradient(to right, #2563eb, #1e40af)'
    },
    majunga: {
      name: 'NTSOA GSM Majunga',
      tagline: 'Magasin Majunga - Centre de distribution',
      bgGradient: 'linear-gradient(to right, #059669, #065f46)'
    },
    tamatave: {
      name: 'NTSOA GSM Toamasina',
      tagline: 'Magasin Toamasina - Centre de distribution',
      bgGradient: 'linear-gradient(to right, #9333ea, #581c87)'
    }
   
  }

  const info = storeInfo[currentStore] || storeInfo.all

  return (
    <div className="rounded-xl p-8 mb-6 shadow-lg text-white overflow-hidden relative " style={{ background: info.bgGradient, height:"250px" }}>
      {/* Vagues animées en fond */}
      <svg className="waves" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path d="M0,50 Q300,0 600,50 T1200,50 L1200,120 L0,120 Z" fill="rgba(255,255,255,0.1)" className="wave wave1"></path>
        <path d="M0,60 Q300,10 600,60 T1200,60 L1200,120 L0,120 Z" fill="rgba(255,255,255,0.05)" className="wave wave2"></path>
        <path d="M0,70 Q300,20 600,70 T1200,70 L1200,120 L0,120 Z" fill="rgba(255,255,255,0.08)" className="wave wave3"></path>
      </svg>

      {/* Contenu au-dessus des vagues */}
      <div className="flex items-center gap-4 relative z-10">
        <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
          <Building2 size={40} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-1">{info.name}</h1>
          <p className="text-white/90 text-lg">{info.tagline}</p>
        </div>
      </div>
     
    </div>
  )
}
