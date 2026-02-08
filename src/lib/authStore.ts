import { User } from '../types/User';
import { AuthSession, LoginResponse, AuthError } from '../types/Auth';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const STORAGE_KEY = 'gsm_auth_v1';

function writeSession(obj: AuthSession): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); } catch (e) { }
}

function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function notifyListeners(user: User | null): void {
  console.log('notifyListeners called with:', user);

  // Importer dynamiquement pour éviter les dépendances circulaires
  // @ts-ignore
  import('./AuthContext.jsx').then(module => {
    if (module.notifyAuthContext) {
      console.log('Calling notifyAuthContext');
      module.notifyAuthContext(user);
    }
  }).catch(e => console.error('Error notifying auth context:', e));

  // Aussi dispatcher l'événement pour la rétrocompatibilité
  const ev = new CustomEvent('auth-changed', { detail: user });
  window.dispatchEvent(ev);
  console.log('Event dispatched');
}

export function getCurrentUser(): User | null {
  const s = readSession();
  return s ? s.user : null;
}

export function getToken(): string | null {
  const s = readSession();
  return s ? s.token : null;
}

export async function login(username: string, password: string): Promise<User> {
  const res = await fetch(API_BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' })) as AuthError;
    throw new Error(err.error || 'Login failed');
  }

  const data = await res.json() as LoginResponse;
  const session: AuthSession = { token: data.token, user: data.user };

  console.log('Login success, saving session:', session);
  writeSession(session);

  console.log('Session saved, notifying listeners...');
  notifyListeners(session.user);

  console.log('Listeners notified');
  return session.user;
}

export async function updateProfile(id: number, updates: Partial<User> & { password?: string }): Promise<User> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(API_BASE + `/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(updates)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Update failed' })) as AuthError;
    throw new Error(err.error || 'Update failed');
  }

  const updatedUser = await res.json() as User;
  const session = readSession();

  if (session && session.user && session.user.id === updatedUser.id) {
    // Merge updates while keeping token
    const newSession: AuthSession = { ...session, user: { ...session.user, ...updatedUser } };
    writeSession(newSession);
    notifyListeners(newSession.user);
  }
  return updatedUser;
}

export function logout(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) { }
  notifyListeners(null);
}

export function subscribeAuth(cb: (user: User | null) => void): () => void {
  console.log('subscribeAuth called with callback:', typeof cb);
  // S'abonner à l'événement pour la rétrocompatibilité
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<User | null>;
    cb(customEvent.detail);
  };

  window.addEventListener('auth-changed', handler);

  const unsub = () => {
    console.log('Unsubscribing from auth-changed');
    window.removeEventListener('auth-changed', handler);
  };

  return unsub;
}

