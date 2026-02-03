const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'
const STORAGE_KEY = 'gsm_auth_v1'

function writeSession(obj) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)) } catch (e) {}
}

function readSession() {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null } catch (e) { return null }
}

function notifyListeners(user) {
  console.log('notifyListeners called with:', user)
  
  // Importer dynamiquement pour éviter les dépendances circulaires
  import('./AuthContext.jsx').then(module => {
    if (module.notifyAuthContext) {
      console.log('Calling notifyAuthContext')
      module.notifyAuthContext(user)
    }
  }).catch(e => console.error('Error notifying auth context:', e))
  
  // Aussi dispatcher l'événement pour la rétrocompatibilité
  const ev = new CustomEvent('auth-changed', { detail: user })
  window.dispatchEvent(ev)
  console.log('Event dispatched')
}

export function getCurrentUser() { const s = readSession(); return s ? s.user : null }
export function getToken() { const s = readSession(); return s ? s.token : null }

export async function login(username, password) {
  const res = await fetch(API_BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
  if (!res.ok) {
    const err = await res.json().catch(()=>({ error: 'Login failed' }))
    throw new Error(err.error || 'Login failed')
  }
  const data = await res.json()
  const session = { token: data.token, user: data.user }
  console.log('Login success, saving session:', session)
  writeSession(session)
  console.log('Session saved, notifying listeners...')
  notifyListeners(session.user)
  console.log('Listeners notified')
  return session.user
}

export function logout() {
  try { localStorage.removeItem(STORAGE_KEY) } catch (e) {}
  notifyListeners(null)
}

export function subscribeAuth(cb) {
  console.log('subscribeAuth called with callback:', typeof cb)
  // S'abonner à l'événement pour la rétrocompatibilité
  const handler = (e) => cb(e.detail)
  window.addEventListener('auth-changed', handler)
  
  const unsub = () => {
    console.log('Unsubscribing from auth-changed')
    window.removeEventListener('auth-changed', handler)
  }
  
  return unsub
}

