
import React, { useState, useEffect } from 'react'
import { useSettings } from '../lib/settingsStore'
import { getToken } from '../lib/authStore'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export default function Settings() {
    const { settings, updateSettings } = useSettings()
    const [backups, setBackups] = useState([])
    const [backupsLoading, setBackupsLoading] = useState(false)
    const [creatingBackup, setCreatingBackup] = useState(false)
    const mounted = React.useRef(true)

    useEffect(() => {
        return () => { mounted.current = false }
    }, [])

    useEffect(() => {
        fetchBackups()
    }, [])

    const fetchBackups = async () => {
        setBackupsLoading(true)
        try {
            const token = getToken()
            const res = await fetch(`${API_BASE}/api/backups`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setBackups(data)
            }
        } catch (e) {
            console.error('Failed to fetch backups', e)
        } finally {
            setBackupsLoading(false)
        }
    }

    const handleCreateBackup = async () => {
        setCreatingBackup(true)
        try {
            const token = getToken()
            const res = await fetch(`${API_BASE}/api/backups`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                window.location.reload()
            } else {
                alert('Échec de la création de la sauvegarde')
            }
        } catch (e) {
            console.error('Backup creation failed', e)
            alert('Erreur lors de la création de la sauvegarde')
        } finally {
            if (mounted.current) setCreatingBackup(false)
        }
    }

    const handleDeleteBackup = async (filename) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette sauvegarde ?')) return

        try {
            const token = getToken()
            const res = await fetch(`${API_BASE}/api/backups/${filename}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (res.ok) {
                // Force URL reload to ensure state is completely clean
                window.location.reload()
            } else {
                const err = await res.json()
                alert(`Erreur: ${err.error || 'Suppression échouée'}`)
            }
        } catch (e) {
            console.error('Backup deletion failed', e)
            alert('Impossible de contacter le serveur')
        }
    }

    const handleDownloadBackup = async (filename) => {
        try {
            const token = getToken()
            // Direct download link with auth token in query param would be simpler but less secure
            // Using fetch + blob
            const res = await fetch(`${API_BASE}/api/backups/${filename}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (res.ok) {
                const blob = await res.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.style.display = 'none'
                a.href = url
                a.download = filename
                document.body.appendChild(a)
                a.click()

                // Cleanup
                setTimeout(() => {
                    window.URL.revokeObjectURL(url)
                    document.body.removeChild(a)
                }, 100)
            } else {
                alert('Erreur lors du téléchargement')
            }
        } catch (e) {
            console.error('Download failed', e)
            alert('Erreur réseau lors du téléchargement')
        }
    }

    return (
        <div className="card max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <span className="iconify text-primary" data-icon="mdi:cog"></span>
                Paramètres
            </h2>

            {/* Appearance Section */}
            <section className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-100">
                <h3 className="text-lg font-semibold mb-4 text-slate-700 flex items-center gap-2">
                    <span className="iconify" data-icon="mdi:palette"></span>
                    Apparence
                </h3>

                <div className="flex items-center justify-between py-3 border-b border-slate-200 last:border-0">
                    <div>
                        <div className="font-medium text-slate-900">Thème</div>
                        <div className="text-sm text-slate-500">Choisissez l'apparence de l'application</div>
                    </div>
                    <select
                        value={settings.theme}
                        onChange={(e) => updateSettings({ theme: e.target.value })}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="light">Clair</option>
                        <option value="dark">Sombre (Bêta)</option>
                    </select>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-200 last:border-0">
                    <div>
                        <div className="font-medium text-slate-900">Langue</div>
                        <div className="text-sm text-slate-500">Langue de l'interface</div>
                    </div>
                    <select
                        value={settings.language}
                        onChange={(e) => updateSettings({ language: e.target.value })}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="fr">Français</option>
                        <option value="mg">Malgache</option>
                        <option value="en">Anglais</option>
                    </select>
                </div>
            </section>

            {/* Notifications Section */}
            <section className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-100">
                <h3 className="text-lg font-semibold mb-4 text-slate-700 flex items-center gap-2">
                    <span className="iconify" data-icon="mdi:bell"></span>
                    Notifications & Sons
                </h3>

                <div className="flex items-center justify-between py-3 border-b border-slate-200 last:border-0">
                    <div>
                        <div className="font-medium text-slate-900">Sons d'alerte</div>
                        <div className="text-sm text-slate-500">Jouer un son lors des alertes critiques</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.soundEnabled}
                            onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-200 last:border-0">
                    <div>
                        <div className="font-medium text-slate-900">Notifications visuelles</div>
                        <div className="text-sm text-slate-500">Afficher les badges et popups</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.notificationsEnabled}
                            onChange={(e) => updateSettings({ notificationsEnabled: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>
            </section>


            {/* Database Backup Section */}
            <section className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-100">
                <h3 className="text-lg font-semibold mb-4 text-slate-700 flex items-center gap-2">
                    <span className="iconify" data-icon="mdi:database"></span>
                    Sauvegardes
                </h3>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="font-medium text-slate-900">Sauvegardes de la base de données</div>
                            <div className="text-sm text-slate-500">Gérez les sauvegardes de vos données</div>
                        </div>
                        <button
                            onClick={handleCreateBackup}
                            disabled={creatingBackup}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {creatingBackup ? (
                                <span className="iconify animate-spin" data-icon="mdi:loading"></span>
                            ) : (
                                <span className="iconify" data-icon="mdi:plus"></span>
                            )}
                            Nouvelle sauvegarde
                        </button>
                    </div>

                    {backupsLoading ? (
                        <div className="text-center py-4 text-slate-500">Chargement des sauvegardes...</div>
                    ) : backups.length === 0 ? (
                        <div className="text-center py-8 bg-white rounded-lg border border-slate-200 border-dashed text-slate-500">
                            Aucune sauvegarde disponible
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Taille</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {backups.map((backup) => (
                                        <tr key={backup.filename} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                {new Date(backup.createdAt).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                {(backup.size / 1024 / 1024).toFixed(2)} MB
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleDownloadBackup(backup.filename)}
                                                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                        title="Télécharger"
                                                    >
                                                        <span className="iconify w-5 h-5" data-icon="mdi:download"></span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteBackup(backup.filename)}
                                                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Supprimer"
                                                    >
                                                        <span className="iconify w-5 h-5" data-icon="mdi:trash-can"></span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            {/* System Info Section */}
            <section className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                <h3 className="text-lg font-semibold mb-4 text-slate-700 flex items-center gap-2">
                    <span className="iconify" data-icon="mdi:information"></span>
                    Informations Système
                </h3>
                <div className="text-sm text-slate-600 space-y-2">
                    <div className="flex justify-between">
                        <span>Version</span>
                        <span className="font-mono bg-slate-200 px-2 py-0.5 rounded text-xs">v1.2.0</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Environnement</span>
                        <span className="font-medium text-indigo-600">Production</span>
                    </div>
                </div>
            </section>
        </div>
    )
}

