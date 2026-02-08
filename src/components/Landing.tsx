import React from 'react';
import { Smartphone, Wrench, Package, ArrowRight, ShieldCheck, Cpu, Battery } from 'lucide-react';

interface LandingProps {
    onLoginClick: () => void;
}

export default function Landing({ onLoginClick }: LandingProps) {
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Navigation */}
            <nav className="fixed w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <Smartphone className="text-white w-5 h-5" />
                            </div>
                            <span className="font-bold text-xl tracking-tight text-slate-900">NTSOA GSM</span>
                        </div>
                        <button
                            onClick={onLoginClick}
                            className="px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                        >
                            Accès ERP
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-50/50 rounded-full blur-3xl"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-6">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                        Expert Pièces Détachées
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6">
                        La référence pour vos <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">
                            pièces smartphones
                        </span>
                    </h1>
                    <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
                        NTSOA GSM est votre partenaire de confiance pour la vente de pièces détachées de qualité.
                        Écrans, batteries, nappes et accessoires pour toutes les marques.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={onLoginClick}
                            className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 group"
                        >
                            Accéder à l'espace pro
                            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </button>
                       
                    </div>
                </div>
            </section>

            {/* Services Grid */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Card 1 */}
                        <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600">
                                <Cpu size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Pièces Détachées</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Large stock d'écrans LCD/OLED, vitres tactiles, connecteurs de charge et composants internes pour Samsung, Apple, Huawei, Xiaomi...
                            </p>
                        </div>

                        {/* Card 2 */}
                        <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6 text-green-600">
                                <Battery size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Batteries & Qualité</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Batteries haute capacité et d'origine. Chaque pièce est rigoureusement testée pour garantir une fiabilité maximale à vos clients.
                            </p>
                        </div>

                        {/* Card 3 */}
                        <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6 text-purple-600">
                                <Wrench size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Service & Conseil</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Une équipe d'experts à votre écoute pour vous conseiller sur la compatibilité et les techniques de réparation les plus récentes.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Stripe */}
            <section className="py-16 bg-slate-900 text-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-80">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="text-emerald-400" />
                            <span className="font-medium">Garantie Qualité</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Package className="text-blue-400" />
                            <span className="font-medium">Stock Disponible</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Smartphone className="text-purple-400" />
                            <span className="font-medium">Compatible Multi-marques</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-50 border-t border-slate-200 pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                                <Smartphone className="text-white w-4 h-4" />
                            </div>
                            <span className="font-bold text-lg text-slate-900">NTSOA GSM</span>
                        </div>
                        <p className="text-slate-500 text-sm">
                            © {new Date().getFullYear()} NTSOA GSM. Tous droits réservés.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
