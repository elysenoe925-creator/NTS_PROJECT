import './index.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App' 
import ErrorBoundary from './components/ErrorBoundary'

import { StoreProvider } from './lib/StoreContext'
import { AuthProvider } from './lib/AuthContext'

const container = document.getElementById('root')
const root = createRoot(container)
root.render(
	<ErrorBoundary>
		<AuthProvider>
			<StoreProvider>
				<App />
			</StoreProvider>
		</AuthProvider>
	</ErrorBoundary>
)
