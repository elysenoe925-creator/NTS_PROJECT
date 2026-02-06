import React, { useEffect, useState } from 'react'
import { refreshUsers, createUser, updateUser, deleteUser, subscribe } from '../lib/usersStore'
import { showToast } from '../lib/toast'
import { getToken } from '../lib/authStore'
import {
  UserPlus, RefreshCw, ShieldCheck, MapPin,
  User, Mail, Trash2, Edit2, X, Lock, Fingerprint
} from 'lucide-react'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ username: '', displayName: '', password: '', role: 'employee', store: 'majunga' })
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    refreshUsers().catch(() => { }).finally(() => {
      if (mounted) setLoading(false)
    })
    const unsub = subscribe(list => setUsers(list || []))
    return () => unsub()
  }, [])

  const handleOpenForm = (u = null) => {
    if (u) {
      setEditing(u)
      setForm({ username: u.username, displayName: u.displayName || '', password: '', role: u.role || 'employee', store: u.store || 'majunga', avatar: u.avatar || null })
    } else {
      setEditing(null)
      setForm({ username: '', displayName: '', password: '', role: 'employee', store: 'majunga', avatar: null })
    }
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const token = getToken()
    try {
      if (editing) {
        const payload = { displayName: form.displayName, role: form.role, store: form.store, avatar: form.avatar }
        if (form.password) payload.password = form.password
        await updateUser(editing.id, payload, token)
        showToast('success', 'Profil mis à jour')
      } else {
        if (!form.username || !form.password) throw new Error('Identifiant et mot de passe requis')
        await createUser(form, token)
        showToast('success', 'Nouvel utilisateur créé')
      }
      setShowForm(false)
      refreshUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-7xl mx-15 p-4 sm:p-6 lg:p-8 space-y-8 bg-gray-50/50 min-h-screen">

      {/* Header Professionnel */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          {/*<h1 className="text-3xl font-bold text-gray-900 tracking-tight">Utilisateurs</h1>*/}
          <p className="text-gray-500 font-medium text-md">Contrôlez les accès et les permissions de votre équipe.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshUsers()}
            className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl border border-transparent hover:border-gray-200 transition-all shadow-sm bg-white"
            title="Rafraîchir"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => handleOpenForm()}
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-gray-200 transition-all active:scale-95"
          >
            <UserPlus size={19} />
            <span>Ajouter un membre</span>
          </button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <User size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Total Membres</div>
            <div className="text-2xl font-bold text-slate-800">{users.length}</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Admins</div>
            <div className="text-2xl font-bold text-slate-800">{users.filter(u => u.role === 'admin').length}</div>
          </div>
        </div>
      </div>

      {/* Grid de Cartes Utilisateurs */}
      {loading && users.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-200 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {users.map(u => (
            <div key={u.id} className="group bg-white border border-slate-200 rounded-3xl p-6 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                <button onClick={() => handleOpenForm(u)} className="p-2 bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl shadow-sm border border-slate-100 transition-colors">
                  <Edit2 size={16} />
                </button>
                {u.username !== 'admin' && (
                  <button onClick={() => handleDelete(u)} className="p-2 bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl shadow-sm border border-slate-100 transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="flex flex-col items-center text-center space-y-4 pt-2">
                <div className="relative">
                  <div className={`w-24 h-24 rounded-full border-4 ${u.role === 'admin' ? 'border-indigo-100' : 'border-slate-100'} shadow-sm overflow-hidden bg-slate-50 flex items-center justify-center`}>
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className={`text-3xl font-bold ${u.role === 'admin' ? 'text-indigo-300' : 'text-slate-300'}`}>
                        {u.displayName?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className={`absolute bottom-1 right-1 p-1.5 rounded-full border-2 border-white ${u.role === 'admin' ? 'bg-indigo-500 text-white' : 'bg-slate-400 text-white'}`}>
                    {u.role === 'admin' ? <ShieldCheck size={12} /> : <User size={12} />}
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-800">{u.displayName || u.username}</h3>
                  <div className="flex items-center justify-center gap-1.5 text-sm text-slate-400 font-medium bg-slate-50 py-1 px-3 rounded-full mx-auto w-fit">
                    <Mail size={12} />
                    <span>{u.username}</span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-2 w-full pt-2 border-t border-slate-50">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl border ${u.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                    u.role === 'manager' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                    {u.role}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 shadow-sm">
                    <MapPin size={10} /> {u.store}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" onClick={() => setShowForm(false)} />

          <div className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-y-auto max-h-[90dvh] transform transition-all animate-in slide-in-from-bottom-8 duration-300">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                  <User size={28} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {editing ? 'Modifier le membre' : 'Nouveau membre'}
                </h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:bg-white hover:text-gray-600 rounded-full transition-all border border-transparent hover:border-gray-200">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="flex justify-center mb-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full border-4 border-slate-100 shadow-sm overflow-hidden bg-slate-50 flex items-center justify-center">
                    {form.avatar ? (
                      <img src={form.avatar} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User size={40} className="text-slate-300" />
                    )}
                  </div>
                  <label htmlFor="modal-avatar-upload" className="absolute bottom-0 right-0 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full cursor-pointer shadow-lg transition-transform hover:scale-105 active:scale-95">
                    <span className="iconify" data-icon="mdi:camera" data-width="16"></span>
                    <input
                      type="file"
                      id="modal-avatar-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            setForm({ ...form, avatar: reader.result })
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Nom d'affichage</label>
                  <input
                    name="displayName"
                    value={form.displayName}
                    onChange={e => setForm({ ...form, displayName: e.target.value })}
                    placeholder="Jean Dupont"
                    className="w-full bg-gray-50 border-gray-200 border rounded-2xl p-3 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-gray-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Identifiant</label>
                  <input
                    name="username"
                    value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                    disabled={!!editing}
                    className="w-full bg-gray-50 border-gray-200 border rounded-2xl p-3 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2  -translate-y-1/2 text-gray-300" size={16} />
                    <input
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder={editing ? "••••••••" : "Requis"}
                      className="w-full bg-gray-50 border-gray-200 border rounded-2xl p-3 pl-10 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Rôle</label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })}
                    className="w-full bg-gray-50 border-gray-200 border rounded-2xl p-3 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="admin">Administrateur</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employé</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Boutique</label>
                  <select
                    name="store"
                    value={form.store}
                    onChange={e => setForm({ ...form, store: e.target.value })}
                    className="w-full bg-gray-50 border-gray-200 border rounded-2xl p-3 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="tamatave">Tamatave</option>
                    <option value="majunga">Majunga</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100 flex items-center gap-2 animate-bounce">
                  <X size={16} className="shrink-0" /> {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-3.5 text-gray-500 font-bold hover:bg-gray-100 rounded-2xl transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-95"
                >
                  {editing ? 'Mettre à jour' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
