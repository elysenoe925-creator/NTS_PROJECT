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
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { getSales, subscribe, refreshSales } from '../lib/salesStore'
import { useStore } from '../lib/StoreContext'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

// --- Helpers de date ---
function monthKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function lastNMonths(n = 6) {
  const res = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    res.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('fr-FR', { month: 'short' })
    })
  }
  return res
}

// --- Options de Design ---
const options = {
  responsive: true,
  maintainAspectRatio: false,
  padding: {
    top: 5,
    bottom: 5,
    left: 5,
    right: 5
  },
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      display: true,
      position: window.innerWidth < 640 ? 'bottom' : 'right',
      align: 'center',
      labels: {
        usePointStyle: true,
        boxWidth: 8,
        font: { family: 'Inter, sans-serif', size: window.innerWidth < 640 ? 10 : 12 },
        color: '#64748b',
        padding: window.innerWidth < 640 ? 10 : 20
      }
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: 'rgba(226, 232, 240, 0.8)',
      borderWidth: 1,
      padding: window.innerWidth < 640 ? 8 : 12,
      titleFont: { size: 12, weight: '600', family: 'Outfit, sans-serif' },
      bodyFont: { size: 11, family: 'Inter, sans-serif' },
      displayColors: true,
      titleColor: '#1e293b',
      bodyColor: '#475569',
      callbacks: {
        label: (context) => ` ${context.dataset.label}: ${context.parsed.y.toLocaleString('fr-FR')} Ar`
      },
      boxPadding: 4,
      usePointStyle: true
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.04)',
        drawBorder: false,
        tickColor: 'transparent'
      },
      ticks: {
        display: window.innerWidth > 480, // Hide Y axis on very small screens to save space
        font: { size: 10, family: 'Inter, sans-serif' },
        color: '#94a3b8',
        padding: 8,
        callback: (value) => value >= 1000000 ? (value / 1000000).toFixed(1) + 'M' : value.toLocaleString('fr-FR')
      },
      border: { display: false }
    },
    x: {
      grid: { display: false, drawBorder: false },
      ticks: {
        font: { size: 10, family: 'Inter, sans-serif' },
        color: '#94a3b8',
        padding: 5,
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 6
      },
      border: { display: false }
    }
  }
}

export default function SalesChart() {
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
      const months = lastNMonths(6)

      // Si vue globale, on sépare les deux magasins
      if (currentStore === 'all') {
        const map1 = new Map(months.map(m => [m.key, 0])) // Shop 1 (Majunga)
        const map2 = new Map(months.map(m => [m.key, 0])) // Shop 2 (Tamatave)

        sales.forEach(s => {
          const k = monthKey(s.date)
          const amount = Number(s.total) || 0

          if (s.store === 'majunga') map1.set(k, map1.get(k) + amount)
          else if (s.store === 'tamatave') map2.set(k, map2.get(k) + amount)
        })

        // Calcul variation globale (somme des deux)
        const lastKey = months[months.length - 1]?.key
        const prevKey = months[months.length - 2]?.key

        const lastTotal = (map1.get(lastKey) || 0) + (map2.get(lastKey) || 0)
        const prevTotal = (map1.get(prevKey) || 0) + (map2.get(prevKey) || 0)

        let percentage = 0
        if (prevTotal > 0) {
          percentage = ((lastTotal - prevTotal) / prevTotal) * 100
        }
        setVariation({
          percentage: Math.abs(percentage),
          isPositive: lastTotal >= prevTotal,
          yesterdayTotal: prevTotal,
          todayTotal: lastTotal
        })

        const chart = chartRef.current

        let bg1 = 'rgba(99, 102, 241, 0.2)'
        let bg2 = 'rgba(16, 185, 129, 0.2)'

        if (chart) {
          const grad1 = chart.ctx.createLinearGradient(0, 0, 0, 300)
          grad1.addColorStop(0, 'rgba(99, 102, 241, 0.2)') // Indigo
          grad1.addColorStop(1, 'rgba(99, 102, 241, 0)')
          bg1 = grad1

          const grad2 = chart.ctx.createLinearGradient(0, 0, 0, 300)
          grad2.addColorStop(0, 'rgba(16, 185, 129, 0.2)') // Emerald
          grad2.addColorStop(1, 'rgba(16, 185, 129, 0)')
          bg2 = grad2
        }

        setChartData({
          labels: months.map(m => m.label),
          datasets: [
            {
              fill: true,
              label: "Majunga",
              data: months.map(m => map1.get(m.key) || 0),
              borderColor: '#6366f1', // Indigo 500
              backgroundColor: bg1,
              tension: 0.35,
              pointRadius: 0,
              pointHoverRadius: 6,
              pointBackgroundColor: '#6366f1',
              borderWidth: 2,
            },
            {
              fill: true,
              label: "Tamatave",
              data: months.map(m => map2.get(m.key) || 0),
              borderColor: '#10b981', // Emerald 500
              backgroundColor: bg2,
              tension: 0.35,
              pointRadius: 0,
              pointHoverRadius: 6,
              pointBackgroundColor: '#10b981',
              borderWidth: 2,
            }
          ]
        })

      } else {
        // Vue magasin unique
        const map = new Map(months.map(m => [m.key, 0]))

        sales.forEach(s => {
          const k = monthKey(s.date)
          if (map.has(k)) map.set(k, map.get(k) + (Number(s.total) || 0))
        })

        // Calcul de la variation
        const lastMonthTotal = map.get(months[months.length - 1]?.key) || 0
        const prevMonthTotal = map.get(months[months.length - 2]?.key) || 0
        let percentage = 0
        if (prevMonthTotal > 0) {
          percentage = ((lastMonthTotal - prevMonthTotal) / prevMonthTotal) * 100
        }
        setVariation({
          percentage: Math.abs(percentage),
          isPositive: lastMonthTotal >= prevMonthTotal,
          yesterdayTotal: prevMonthTotal,
          todayTotal: lastMonthTotal
        })

        const chart = chartRef.current
        let bg = 'rgba(99, 102, 241, 0.2)'

        if (chart) {
          const gradient = chart.ctx.createLinearGradient(0, 0, 0, 300)
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)')
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0)')
          bg = gradient
        }

        setChartData({
          labels: months.map(m => m.label),
          datasets: [{
            fill: true,
            label: "Chiffre d'affaires",
            data: months.map(m => map.get(m.key) || 0),
            borderColor: '#6366f1',
            backgroundColor: bg,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointBackgroundColor: '#6366f1',
            borderWidth: 2,
          }]
        })
      }
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
              vs mois précédent
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          <div>Précédent: {variation.yesterdayTotal.toLocaleString('fr-FR')} Ar</div>
          <div>Dernier: {variation.todayTotal.toLocaleString('fr-FR')} Ar</div>
        </div>
      </div>
      <div className="modern-chart-container" style={{ width: '100%', height: '300px', position: 'relative' }}>
        <Line ref={chartRef} options={options} data={chartData} />
      </div>
    </div>
  )
}