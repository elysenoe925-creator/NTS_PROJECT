
import React from 'react'
import { useSettings } from '../lib/settingsStore'

export default function Settings() {
    const { settings, updateSettings } = useSettings()

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
