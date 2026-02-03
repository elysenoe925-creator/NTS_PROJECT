import React, { useEffect, useState } from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import { getProducts, subscribe as subscribeProducts } from '../lib/productsStore'
import { useStore } from '../lib/StoreContext'

ChartJS.register(ArcElement, Tooltip, Legend)

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: {
        font: { size: 12, family: 'Inter, sans-serif', weight: '500' },
        padding: 16,
        usePointStyle: true,
        pointStyle: 'circle',
        color: '#475569',
      },
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(249, 115, 22, 0.5)',
      borderWidth: 1,
      padding: 14,
      titleFont: { size: 13, weight: 'bold', family: 'Inter, sans-serif' },
      bodyFont: { size: 12, family: 'Inter, sans-serif' },
      titleColor: '#fef3c7',
      bodyColor: '#fed7aa',
      callbacks: {
        label: (ctx) => {
          const label = ctx.label || ''
          const value = ctx.parsed
          const total = ctx.dataset.data.reduce((a, b) => a + b, 0)
          const percentage = ((value / total) * 100).toFixed(1)
          return `${label}: ${value} produits (${percentage}%)`
        },
      },
    },
    title: {
      display: false,
    },
  },
}

export default function ProductCategoriesChart() {
  const { currentStore } = useStore()
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
  })

  useEffect(() => {
    const updateChart = () => {
      const products = getProducts()

      // Group products by category
      const categoryMap = new Map()
      products.forEach((product) => {
        const category = product.category || 'Non catégorisé'
        if (!categoryMap.has(category)) {
          categoryMap.set(category, 0)
        }
        categoryMap.set(category, categoryMap.get(category) + 1)
      })

      // Sort by count descending
      const sorted = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1])

      const labels = sorted.map(([category]) => category)
      const data = sorted.map(([, count]) => count)

      // Color palette - Palette moderne et vibrant
      const colors = [
        { bg: 'rgba(59, 130, 246, 0.85)', border: 'rgb(37, 99, 235)' },      // Bleu
        { bg: 'rgba(34, 197, 94, 0.85)', border: 'rgb(22, 163, 74)' },       // Vert
        { bg: 'rgba(249, 115, 22, 0.85)', border: 'rgb(234, 88, 12)' },      // Orange
        { bg: 'rgba(168, 85, 247, 0.85)', border: 'rgb(147, 51, 234)' },     // Violet
        { bg: 'rgba(236, 72, 153, 0.85)', border: 'rgb(219, 39, 119)' },     // Rose
        { bg: 'rgba(14, 165, 233, 0.85)', border: 'rgb(6, 182, 212)' },      // Cyan
        { bg: 'rgba(244, 63, 94, 0.85)', border: 'rgb(239, 68, 68)' },       // Rouge
        { bg: 'rgba(251, 146, 60, 0.85)', border: 'rgb(249, 115, 22)' },     // Ambre
      ]

      const backgroundColors = data.map((_, i) => colors[i % colors.length].bg)
      const borderColors = data.map((_, i) => colors[i % colors.length].border)

      setChartData({
        labels,
        datasets: [
          {
            label: 'Nombre de produits',
            data,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 2.5,
            hoverBorderWidth: 3,
            hoverOffset: 8,
          },
        ],
      })
    }

    // Initial update
    updateChart()

    // Subscribe to product updates
    const unsubscribe = subscribeProducts(() => updateChart())

    return () => {
      unsubscribe()
    }
  }, [currentStore])

  return (
    <div className="modern-chart-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
      {chartData.labels.length > 0 ? (
        <Doughnut options={options} data={chartData} />
      ) : (
        <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>
          Aucun produit disponible
        </div>
      )}
    </div>
  )
}
