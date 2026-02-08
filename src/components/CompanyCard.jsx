import React, { useState, useEffect } from 'react'
import { Building2, Calendar, Clock, MapPin } from 'lucide-react'
import { useStore } from '../lib/StoreContext'
import { getCurrentUser } from '../lib/authStore'
import '../styles/waves.css'

export default function CompanyCard() {
  const { currentStore } = useStore()
  const user = getCurrentUser()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const storeInfo = {
    all: {
      name: 'NTSOA GSM - Central',
      location: ' Madagascar',
      bgGradient: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
      accent: 'rgba(59, 130, 246, 0.5)'
    },
    majunga: {
      name: 'NTSOA GSM Majunga',
      location: 'Majunga, Madagascar',
      bgGradient: 'linear-gradient(135deg, #064e3b 0%, #10b981 100%)',
      accent: 'rgba(16, 185, 129, 0.5)'
    },
    tamatave: {
      name: 'NTSOA GSM Toamasina',
      location: 'Toamasina, Madagascar',
      bgGradient: 'linear-gradient(135deg, #4c1d95 0%, #8b5cf6 100%)',
      accent: 'rgba(139, 92, 246, 0.5)'
    }
  }

  const info = storeInfo[currentStore] || storeInfo.all

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date)
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div
      className="rounded-2xl p-6 mb-8 shadow-2xl text-white overflow-hidden relative transition-all duration-500"
      style={{
        background: info.bgGradient,
        height: "240px",
        boxShadow: `0 20px 40px -15px ${info.accent}`
      }}
    >
      {/* Vagues animées en fond */}
      <svg className="waves opacity-40" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path d="M0,60 Q300,30 600,60 T1200,60 L1200,120 L0,120 Z" fill="rgba(255,255,255,0.15)" className="wave wave1"></path>
        <path d="M0,60 Q300,90 600,60 T1200,60 L1200,120 L0,120 Z" fill="rgba(255,255,255,0.1)" className="wave wave2"></path>
        <path d="M0,60 Q300,30 600,60 T1200,60 L1200,120 L0,120 Z" fill="rgba(255,255,255,0.2)" className="wave wave3"></path>
      </svg>

      {/* Glassmorphism Decoration */}
      <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-50px] left-[-20%] w-80 h-80 bg-black/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="h-full flex flex-col justify-between relative z-10">
        {/* Top Section: Header & Location */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md border border-white/30 shadow-xl">
              <Building2 size={32} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase">{info.name}</h1>
              <div className="flex items-center gap-1.5 text-white/80 text-sm font-medium mt-0.5">
                <MapPin size={14} />
                <span>{info.location}</span>
              </div>
            </div>
          </div>

          {/* Clock & Date Widget */}
          <div className="hidden sm:flex flex-col items-end bg-black/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 font-bold text-lg">
              <Clock size={16} />
              <span>{formatTime(now)}</span>
            </div>
            <div className="flex items-center gap-2 text-white/70 text-xs font-semibold uppercase tracking-wider mt-0.5">
              <Calendar size={12} />
              <span>{formatDate(now)}</span>
            </div>
          </div>
        </div>

        {/* Bottom Section: Personal Welcome */}
        <div className="mt-auto">
         
          <h2 className="text-4xl font-bold tracking-tight">
            Bonjour, <span className="text-white/90">{user ? user.displayName : 'Invité'}</span>
          </h2>
          <p className="text-white/70 font-medium text-lg mt-1">
            Ravi de vous revoir sur votre espace de gestion.
          </p>
        </div>
      </div>
    </div>
  )
}
