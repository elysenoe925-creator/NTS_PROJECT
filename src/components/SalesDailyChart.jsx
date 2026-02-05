import React, { useEffect, useState, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  BarElement,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { TrendingUp, TrendingDown } from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

import { getSales, subscribe, refreshSales } from '../lib/salesStore'
import { useStore } from '../lib/StoreContext'
import { GrEbay } from 'react-icons/gr'

// Helper pour obtenir la clé de date (YYYY-MM-DD)
function dateKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Générer les 30 derniers jours
function lastNDays(n = 30) {
  const res = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const label = d.toLocaleString('fr-FR', { month: 'short', day: 'numeric' })
    res.push({ key, label, date: d })
  }
  return res
}

const options = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgb(8, 255, 28)',
      borderWidth: 1,
      padding: window.innerWidth < 640 ? 10 : 14,
      titleFont: { size: 12, weight: 'bold', family: 'Inter, sans-serif' },
      bodyFont: { size: 11, family: 'Inter, sans-serif' },
      displayColors: false,
      titleColor: '#f0f9ff',
      bodyColor: '#bfdbfe',
      callbacks: {
        label: (context) => ` ${context.parsed.y.toLocaleString('fr-FR')} Ar`
      }
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(233, 233, 233, 0.08)',
        drawBorder: false,
        lineWidth: 1
      },
      ticks: {
        font: { size: window.innerWidth < 640 ? 10 : 11, family: 'Inter, sans-serif', weight: '500' },
        color: '#64748b',
        callback: (value) => value.toLocaleString('fr-FR')
      }
    },
    x: {
      grid: { display: false, drawBorder: false },
      ticks: {
        font: { size: window.innerWidth < 640 ? 9 : 10, family: 'Inter, sans-serif', weight: '500' },
        color: '#64748b',
        maxRotation: 45,
        minRotation: 0
      }
    }
  }
}

export default function SalesDailyChart() {
  const { currentStore } = useStore()
  const chartRef = useRef(null)
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  })
  const [variation, setVariation] = useState({ percentage: 0, isPositive: false, yesterdayTotal: 0, todayTotal: 0 })

  useEffect(() => {
    let mounted = true

    const compute = (sales) => {
      const days = lastNDays(15)
      const map = new Map(days.map(d => [d.key, 0]))

      sales.forEach(s => {
        try {
          const k = dateKey(s.date)
          if (map.has(k)) {
            map.set(k, map.get(k) + (Number(s.total) || 0))
          }
        } catch (e) { }
      })

      // Calcul de la variation (aujourd'hui vs hier)
      const todayTotal = map.get(days[days.length - 1].key) || 0
      const yesterdayTotal = map.get(days[days.length - 2]?.key) || 0
      let percentage = 0
      if (yesterdayTotal > 0) {
        percentage = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100
      }
      setVariation({
        percentage: Math.abs(percentage),
        isPositive: todayTotal >= yesterdayTotal,
        yesterdayTotal,
        todayTotal
      })

      const chart = chartRef.current
      if (!chart) {
        setChartData({
          labels: days.map(d => d.label),
          datasets: [{
            label: 'Ventes du jour',
            data: days.map(d => map.get(d.key) || 0),
            backgroundColor: 'rgba(187, 201, 183, 0.3)',
            borderColor: '#2563eb',
            borderWidth: 0,
            borderRadius: 6,
            borderSkipped: false,
            hoverBackgroundColor: 'rgba(59, 130, 246, 0.8)',
            hoverBorderColor: '#1d4ed8',
            hoverBorderWidth: 1,
          }]
        })
        return
      }

      // Création du dégradé si le canvas existe
      const gradient = chart.ctx.createLinearGradient(0, 0, 0, 400)
      gradient.addColorStop(0, 'rgba(0, 0, 128, 0.6)')
      gradient.addColorStop(1, 'rgb(23, 98, 218)')

      setChartData({
        labels: days.map(d => d.label),
        datasets: [{
          label: 'Ventes du jour',
          data: days.map(d => map.get(d.key) || 0),
          backgroundColor: gradient,
          // Couleur de la ligne opaque
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 0,
          borderRadius: 6,
          borderSkipped: false,
          hoverBackgroundColor: 'rgba(59, 130, 246, 0.8)',
          hoverBorderColor: '#1d4ed8',
          hoverBorderWidth: 1,
        }]
      })
    }

    refreshSales(currentStore).finally(() => {
      if (mounted) compute(getSales(currentStore))
    })

    const unsub = subscribe(() => compute(getSales(currentStore)))
    return () => { mounted = false; unsub() }
  }, [currentStore])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${variation.isPositive ? 'bg-green-50' : 'bg-red-50'}`}>
          {variation.isPositive ? (
            <TrendingUp className="text-green-600" size={20} />
          ) : (
            <TrendingDown className="text-red-600" size={20} />
          )}
          <div className="flex flex-col">
            <span className={`text-sm font-semibold ${variation.isPositive ? 'text-green-700' : 'text-red-700'}`}>
              {variation.isPositive ? '+' : ''}{variation.percentage.toFixed(1)}%
            </span>
            <span className="text-xs text-gray-600">
              vs jour précédent
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          <div>Hier: {variation.yesterdayTotal.toLocaleString('fr-FR')} Ar</div>
          <div>Aujourd'hui: {variation.todayTotal.toLocaleString('fr-FR')} Ar</div>
        </div>
      </div>
      <div className="modern-chart-container " style={{ width: '100%', position: 'relative' }}>
        <Bar ref={chartRef} options={options} data={chartData} />
      </div>
    </div>
  )
}
