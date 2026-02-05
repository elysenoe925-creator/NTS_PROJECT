import React from 'react'
import { ChevronRight, Home } from 'lucide-react'

export default function Breadcrumb({ route }) {
  const getBreadcrumbs = () => {
    const breadcrumbs = [{ href: '#/dashboard' }]

    const routes = {
      '#/dashboard': { label: 'Tableau de bord' },
      '#/sales': { label: 'Ventes' },
      '#/stock': { label: 'Stock' },
      '#/decisions': { label: 'Décisions (réappro)' },
      '#/orders': { label: 'Commandes' },
      '#/tracking': { label: 'Suivi des actions' },
      '#/user': { label: 'Utilisateurs' },
    }

    const current = routes[route] || { label: 'Page' }

    breadcrumbs.push(current)


    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <nav className="breadcrumb-container" aria-label="Fil d'Ariane">
      <ol className="breadcrumb-list">
        {breadcrumbs.map((crumb, index) => (
          <li key={index} className="breadcrumb-item">
            {index > 0 && (
              <ChevronRight className="breadcrumb-separator" size={16} />
            )}
            {index === breadcrumbs.length - 1 ? (
              <span className="breadcrumb-current">
                {index === 0 && <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24"><path fill="#666565" fillRule="evenodd" d="M11.293 3.293a1 1 0 0 1 1.414 0l6 6l2 2a1 1 0 0 1-1.414 1.414L19 12.414V19a2 2 0 0 1-2 2h-3a1 1 0 0 1-1-1v-3h-2v3a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2v-6.586l-.293.293a1 1 0 0 1-1.414-1.414l2-2z" clipRule="evenodd"></path></svg>}
                {crumb.label}
              </span>
            ) : (
              <a href={crumb.href} className="breadcrumb-link">
                {index === 0 && <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24"><path fill="#666565" fillRule="evenodd" d="M11.293 3.293a1 1 0 0 1 1.414 0l6 6l2 2a1 1 0 0 1-1.414 1.414L19 12.414V19a2 2 0 0 1-2 2h-3a1 1 0 0 1-1-1v-3h-2v3a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2v-6.586l-.293.293a1 1 0 0 1-1.414-1.414l2-2z" clipRule="evenodd"></path></svg>}
                {crumb.label}
              </a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
