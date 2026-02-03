/*import React, { useState, useEffect } from 'react'
import { getToken } from '../lib/authStore'
import { showToast } from '../lib/toast'

export default function ActivityTracking() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all') // all, user, store
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedStore, setSelectedStore] = useState('')
  const [users, setUsers] = useState([])
  const [stores, setStores] = useState(new Set())

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const token = getToken()
      let url = '/api/logs'
      
      if (filter === 'user' && selectedUser) {
        url = `/api/logs/user/${selectedUser}`
      } else if (filter === 'store' && selectedStore) {
        url = `/api/logs/store/${selectedStore}`
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch logs')
      const data = await res.json()
      setLogs(data)

      // Extract unique stores and users
      const storeSet = new Set()
      const userList = []
      data.forEach(log => {
        if (log.user) userList.push(log.user)
        if (log.store) storeSet.add(log.store)
      })
      
      // Remove duplicates from userList
      const uniqueUsers = Array.from(new Map(userList.map(u => [u.id, u])).values())
      setUsers(uniqueUsers)
      setStores(storeSet)
    } catch (e) {
      console.error('Error fetching logs:', e)
      showToast('error', 'Erreur lors du chargement des journaux')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter)
    if (newFilter === 'all') {
      setSelectedUser('')
      setSelectedStore('')
    }
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="container mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-6">Suivi des actions</h1>

     
      <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-4 py-2 rounded ${
              filter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Toutes les actions
          </button>
          <button
            onClick={() => handleFilterChange('user')}
            className={`px-4 py-2 rounded ${
              filter === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Par employé
          </button>
          <button
            onClick={() => handleFilterChange('store')}
            className={`px-4 py-2 rounded ${
              filter === 'store'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Par magasin
          </button>
        </div>

        {filter === 'user' && (
          <div className="flex gap-4 items-center">
            <label className="font-semibold">Employé:</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded"
            >
              <option value="">Sélectionner un employé</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.displayName} ({user.username})
                </option>
              ))}
            </select>
            <button
              onClick={fetchLogs}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={!selectedUser}
            >
              Filtrer
            </button>
          </div>
        )}

        {filter === 'store' && (
          <div className="flex gap-4 items-center">
            <label className="font-semibold">Magasin:</label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded"
            >
              <option value="">Sélectionner un magasin</option>
              {Array.from(stores).sort().map(store => (
                <option key={store} value={store}>
                  {store}
                </option>
              ))}
            </select>
            <button
              onClick={fetchLogs}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={!selectedStore}
            >
              Filtrer
            </button>
          </div>
        )}
      </div>

     
      {loading ? (
        <div className="text-center py-8 text-gray-500">Chargement...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Aucune action enregistrée
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-4 py-2 text-left">Date et heure</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Employé</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Action</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Magasin</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2 whitespace-nowrap text-sm">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {log.user ? (
                      <div>
                        <div className="font-semibold">{log.user.displayName}</div>
                        <div className="text-sm text-gray-500">{log.user.username}</div>
                      </div>
                    ) : (
                      'Utilisateur supprimé'
                    )}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-semibold">
                      {log.action}
                    </span>
                  </td>
                  <td className="border border-gray-300 px-4 py-2">{log.description}</td>
                  <td className="border border-gray-300 px-4 py-2">{log.store || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 text-sm text-gray-600">
        Total:{logs.length} action{logs.length !== 1?'s' : ''}
      </div>
    </div>
  )
}
*/

import React, { useState, useEffect } from 'react'
import { getToken } from '../lib/authStore'
import { showToast } from '../lib/toast'
import { fetchAllLogs, fetchUserLogs, fetchStoreLogs } from '../lib/actionLogStore'
import {
  History, User, Store, Filter,
  Search, Calendar, ArrowRight, Download,
  AlertCircle, CheckCircle2, Info, Pencil, Trash2, Plus
} from 'lucide-react'


const getActionConfig = (action) => {
  const act = action?.toLowerCase() || '';
  if (act.includes('delete') || act.includes('suppression'))
    return { color: "bg-red-50 text-red-700 border-red-100", icon: <Trash2 size={12} /> };
  if (act.includes('update') || act.includes('modification'))
    return { color: "bg-amber-50 text-amber-700 border-amber-100", icon: <Pencil size={12} /> };
  if (act.includes('create') || act.includes('creation'))
    return { color: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: <Plus size={12} /> };
  return { color: "bg-blue-50 text-blue-700 border-blue-100", icon: <Info size={12} /> };
}

const ExpandableDescription = ({ text }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = text && text.length > 60; // Heuristic for showing the button

  if (!isLong) {
    return <p className="text-sm text-slate-600 leading-relaxed font-medium max-w-md">{text}</p>;
  }

  return (
    <div className="max-w-md">
      <p className={`text-sm text-slate-600 leading-relaxed font-medium transition-all ${expanded ? '' : 'line-clamp-2'}`}>
        {text}
      </p>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs font-bold text-blue-600 hover:text-blue-800 mt-1 inline-flex items-center gap-1 transition-colors"
      >
        {expanded ? (
          <>Voir moins</>
        ) : (
          <>Voir plus</>
        )}
      </button>
    </div>
  );
};

export default function ActivityTracking() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedStore, setSelectedStore] = useState('')
  const [users, setUsers] = useState([])
  const [stores, setStores] = useState(new Set())

  useEffect(() => {
    const token = getToken()
    if (token) fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      let data = []
      if (filter === 'user' && selectedUser) data = await fetchUserLogs(selectedUser)
      else if (filter === 'store' && selectedStore) data = await fetchStoreLogs(selectedStore)
      else data = await fetchAllLogs()

      setLogs(data)
      const storeSet = new Set()
      const userMap = new Map()
      data.forEach(log => {
        if (log.user) userMap.set(log.user.id, log.user)
        if (log.store) storeSet.add(log.store)
      })
      setUsers(Array.from(userMap.values()))
      setStores(storeSet)
    } catch (e) {
      showToast('error', 'Impossible de charger l\'historique')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (ts) => {
    const date = new Date(ts)
    return {
      main: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-10 font-sans text-slate-900">

      {/* Header avec Actions */}
      <div className="max-w-5xl mx-15 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10" >
        <div>
          <div className="flex items-center gap-3 mb-2">
          </div>
          <p className="text-slate-500 text-sm">Surveillance en temps réel des flux de données et actions utilisateurs.</p>
        </div>

      </div>

      <div className="max-w-9xl mx-15 space-y-6">

        {/* Barre de Filtres Flottante */}
        <div className="bg-white rounded-md shadow-sm border border-slate-200 p-2 flex flex-col lg:flex-row gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'all', label: 'Global', icon: <History size={16} /> },
              { id: 'user', label: 'Par Employé', icon: <User size={16} /> },
              { id: 'store', label: 'Par Magasin', icon: <Store size={16} /> }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => { setFilter(f.id); if (f.id === 'all') fetchLogs(); }}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${filter === f.id ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>

          {filter !== 'all' && (
            <div className=" max-w-2xl flex-grow flex  sm:flex-row gap-5 animate-in zoom-in-95 duration-200  ">
              <select
                value={filter === 'user' ? selectedUser : selectedStore}
                onChange={(e) => filter === 'user' ? setSelectedUser(e.target.value) : setSelectedStore(e.target.value)}
                className="flex-grow bg-slate-100 border-2  rounded-md text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 px-10"
              >
                <option className='' value="">Sélectionner {filter === 'user' ? 'un compte' : 'un point de vente'}...</option>
                {filter === 'user'
                  ? users.map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)
                  : Array.from(stores).map(s => <option key={s} value={s}>{s}</option>)
                }
              </select>
              <button
                onClick={fetchLogs}
                className="bg-slate-900 rounded-md hover:bg-slate-800 text-white px-8 py-2  text-sm font-bold transition-transform active:scale-95"
              >
                Filtrer
              </button>
            </div>
          )}
        </div>

        {/* Table d'activité */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Heure</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Intervenant</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type d'Action</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Détails de l'opération</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Boutique</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="5" className="px-6 py-4"><div className="h-6 bg-slate-100 rounded-md w-full"></div></td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3 bg-slate-50 rounded-full">
                          <Search size={32} className="text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">Aucune activité trouvée</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const config = getActionConfig(log.action);
                    const dateInfo = formatDate(log.timestamp);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-700">{dateInfo.main}</span>
                            <span className="text-xs text-slate-500">{dateInfo.time}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs ring-2 ring-white shadow-sm">
                              {log.user?.displayName?.charAt(0) || '?'}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-900">{log.user?.displayName || 'Inconnu'}</span>
                              <span className="text-xs text-slate-500">@{log.user?.username || '—'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
                            {config.icon}
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <ExpandableDescription text={log.description} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {log.store ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                              <Store size={12} className="text-slate-400" /> {log.store}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Système actif
            </div>
            <span className="text-xs font-medium text-slate-400">
              {logs.length} entrées
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}