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
  layout: {
    padding: 20
  },
  plugins: {
    legend: {
      position: 'right',
      labels: {
        font: { size: 12, family: 'Inter, sans-serif' },
        padding: 20,
        boxWidth: 12,
        usePointStyle: true,
        pointStyle: 'circle',
        color: '#64748b',
      },
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: 'rgba(226, 232, 240, 0.8)',
      borderWidth: 1,
      padding: 12,
      titleFont: { size: 13, weight: '600', family: 'Outfit, sans-serif' },
      bodyFont: { size: 12, family: 'Inter, sans-serif' },
      titleColor: '#1e293b',
      bodyColor: '#475569',
      callbacks: {
        label: (ctx) => {
          const label = ctx.label || ''
          const value = ctx.parsed
          const total = ctx.dataset.data.reduce((a, b) => a + b, 0)
          const percentage = ((value / total) * 100).toFixed(1)
          return ` ${label}: ${value} (${percentage}%)`
        },
      },
    },
    title: { display: false },
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

      // Color palette - Professionnelle et Harmonnieuse
      const colors = [
        '#3b82f6', // Blue 500
        '#10b981', // Emerald 500
        '#8b5cf6', // Violet 500
        '#f59e0b', // Amber 500
        '#ec4899', // Pink 500
        '#06b6d4', // Cyan 500
        '#64748b', // Slate 500
        '#ef4444', // Red 500
      ]

      const dimmedColors = colors.map(c => c + 'CC') // Légère transparence

      setChartData({
        labels,
        datasets: [
          {
            label: 'Nombre de produits',
            data,
            backgroundColor: colors,
            borderColor: '#ffffff',
            borderWidth: 2,
            hoverOffset: 4,
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
