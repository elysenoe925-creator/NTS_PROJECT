
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
  Filler, // Requis pour le remplissage sous la courbe
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { TrendingUp, TrendingDown } from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

import { getSales, subscribe, refreshSales } from '../lib/salesStore'
import { useStore } from '../lib/StoreContext'

// --- Helpers de date restants identiques ---
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

// --- Options de Design Améliorées ---
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
      borderColor: 'rgba(59, 246, 184, 0.5)',
      borderWidth: 1,
      padding: window.innerWidth < 640 ? 10 : 14,
      titleFont: { size: 12, weight: 'thin', family: 'Inter, sans-serif' },
      bodyFont: { size: 11, family: 'Inter, sans-serif' },
      displayColors: false,
      titleColor: '#f0fdfa',
      bodyColor: '#d1fae5',
      callbacks: {
        label: (context) => ` ${context.parsed.y.toLocaleString('fr-FR')} Ar`
      }
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(255, 255, 255, 0.08)',
        drawBorder: false,
        lineWidth: 1
      },
      ticks: {
        font: { size: window.innerWidth < 640 ? 10 : 11, family: 'Inter, sans-serif' },
        color: '#64748b',
        callback: (value) => value.toLocaleString('fr-FR')
      }
    },
    x: {
      grid: { display: false, drawBorder: false },
      ticks: {
        font: { size: window.innerWidth < 640 ? 10 : 11, family: 'Inter, sans-serif' },
        color: '#64748b',
        maxRotation: 45,
        minRotation: 0
      }
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
      const months = lastNMonths(3)
      const map = new Map(months.map(m => [m.key, 0]))

      sales.forEach(s => {
        const k = monthKey(s.date)
        if (map.has(k)) map.set(k, map.get(k) + (Number(s.total) || 0))
      })

      // Calcul de la variation (dernier mois vs mois précédent)
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
      if (!chart) return

      // Création du dégradé avec des couleurs plus modernes
      const gradient = chart.ctx.createLinearGradient(0, 0, 0, 400)
      gradient.addColorStop(0, 'rgba(34, 197, 94, 0.25)') // Vert lumineux
      gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.1)')
      gradient.addColorStop(1, 'rgba(34, 197, 94, 0)')

      setChartData({
        labels: months.map(m => m.label),
        datasets: [{
          fill: true,
          label: "Chiffre d'affaires",
          data: months.map(m => map.get(m.key) || 0),
          borderColor: '#16a34a', // Vert principal (Green 600)
          backgroundColor: gradient,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#16a34a',
          pointBorderWidth: 2,
          pointHoverRadius: 7,
          pointHoverBackgroundColor: '#22c55e',
          borderWidth: 2.5,
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
              vs mois précédent
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          <div>Précédent: {variation.yesterdayTotal.toLocaleString('fr-FR')} Ar</div>
          <div>Dernier: {variation.todayTotal.toLocaleString('fr-FR')} Ar</div>
        </div>
      </div>
      <div className="modern-chart-container  " style={{ width: '100%', position: 'relative' }}>
        <Line ref={chartRef} options={options} data={chartData} />
      </div>
    </div>
  )
}