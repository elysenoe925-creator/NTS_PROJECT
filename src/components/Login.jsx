

import React, { useState, useEffect } from 'react'
import { subscribeAuth } from '../lib/authStore'
import { useStore } from '../lib/StoreContext'
import { useAuth } from '../lib/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const { setCurrentStore } = useStore()
  const { login } = useAuth()

  useEffect(() => {
    const unsub = subscribeAuth(user => {
      if (user && user.store && user.role !== 'admin') {
        setCurrentStore(user.store)
      }
    })
    return unsub
  }, [setCurrentStore])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username.trim(), password)
      // La mise à jour d'état se fera automatiquement via useAuth hook
    } catch (err) {
      setError(err.message || 'Identifiants incorrects')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Hero Section */}
        <div className={`text-center mb-12 transition-all duration-500 ${showForm ? ' hidden transform -translate-y-4 pointer-events-none' : 'opacity-100 transform translate-y-0'}`}>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            NTSOA <span className="text-indigo-600">GSM</span>
          </h1>
          <p className="text-xl text-gray-600 mb-6 max-w-2xl mx-auto">
            Système de Gestion de Stock et Magasin - Optimisez votre inventaire,
            suivez vos ventes et prenez des décisions éclairées pour votre entreprise.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500 mb-8">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Gestion d'inventaire intelligente
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Suivi des ventes en temps réel
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analyses et rapports détaillés
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Accèder à l'espace de travail
          </button>
        </div>

        {/* Login Form */}
        <div className={`max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 transition-all duration-500 ${showForm ? 'opacity-100 transform translate-y-0' : 'hidden transform translate-y-4 pointer-events-none'}`}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Connexion</h2>

            {error && (
              <div className="mb-4 p-3 rounded bg-red-50 text-red-600 text-sm border border-red-100">
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Identifiant</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="Ex: admin"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="••••••••"
              disabled={loading}
            />
            <div className="mt-1 flex justify-end">
              <button
                type="button"
                className="text-xs text-gray-500 hover:text-indigo-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Masquer" : "Afficher"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="ml-2 text-sm text-gray-600">Se souvenir de moi</span>
            </label>
            
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              "Se connecter"
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
            Après votre connection vous auriez accès à votre espace de travail {''}
          <a href="#" className="text-indigo-600 hover:text-indigo-500 font-medium">Compris</a>
        </div>
      </div>
    </div>
    </div>
  )
}
