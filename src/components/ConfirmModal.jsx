import React from 'react'
import { AlertCircle, Trash2, AlertTriangle, Info } from 'lucide-react'

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirmer",
    message,
    confirmText = "Confirmer",
    cancelText = "Annuler",
    type = "warning"
}) {
    if (!isOpen) return null

    const getIcon = () => {
        switch (type) {
            case 'danger': return <Trash2 className="text-red-600" size={24} />
            case 'warning': return <AlertTriangle className="text-amber-600" size={24} />
            case 'info': return <Info className="text-blue-600" size={24} />
            default: return <AlertCircle className="text-slate-600" size={24} />
        }
    }

    const getButtonClass = () => {
        switch (type) {
            case 'danger': return 'bg-red-600 hover:bg-red-700 shadow-red-100'
            case 'warning': return 'bg-amber-500 hover:bg-amber-600 shadow-amber-100'
            case 'info': return 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
            default: return 'bg-slate-800 hover:bg-slate-900 shadow-slate-100'
        }
    }

    return (
        <div className="modal-overlay show backdrop-blur-md z-[100]" onClick={onClose}>
            <div
                className="modal-dialog card show !max-w-md w-full animate-in fade-in zoom-in duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start gap-4 mb-6">
                    <div className={`p-3 rounded-xl shrink-0 ${type === 'danger' ? 'bg-red-50' :
                            type === 'warning' ? 'bg-amber-50' :
                                'bg-slate-50'
                        }`}>
                        {getIcon()}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-800 mb-1">{title}</h3>
                        <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-line">{message}</p>
                    </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-slate-500 hover:text-slate-800 font-semibold transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={() => { onConfirm(); onClose(); }}
                        className={`px-6 py-2.5 text-white rounded-xl font-bold transition-all shadow-lg uppercase tracking-wide text-sm ${getButtonClass()}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
