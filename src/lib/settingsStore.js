
import { useState, useEffect } from 'react'

const SETTINGS_KEY = 'app_settings'

const DEFAULT_SETTINGS = {
    theme: 'light',
    language: 'fr',
    soundEnabled: true,
    notificationsEnabled: true,
}

export function getSettings() {
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (saved) {
        return JSON.parse(saved)
    }
    return DEFAULT_SETTINGS
}

export function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    // Dispatch a custom event so components can react immediately if needed
    window.dispatchEvent(new Event('settings-changed'))
}

// Hook for using settings in components
export function useSettings() {
    const [settings, setSettings] = useState(getSettings())

    useEffect(() => {
        const onSettingsChanged = () => {
            setSettings(getSettings())
        }
        window.addEventListener('settings-changed', onSettingsChanged)
        return () => window.removeEventListener('settings-changed', onSettingsChanged)
    }, [])

    const updateSettings = (newSettings) => {
        const updated = { ...settings, ...newSettings }
        saveSettings(updated)
    }

    return { settings, updateSettings }
}
