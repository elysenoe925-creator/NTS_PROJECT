/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE: string;
    // plus d'autres variables d'environnement si nécessaire
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
