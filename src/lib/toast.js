// Simple toast dispatcher. Use CustomEvent 'toast' to notify container.
export function showToast(type, message, duration = 4000) {
  const id = String(Date.now()) + Math.floor(Math.random() * 1000)
  const ev = new CustomEvent('toast', { detail: { id, type, message, duration } })
  window.dispatchEvent(ev)
  return id
}

export function clearToast(id) {
  const ev = new CustomEvent('toast-clear', { detail: { id } })
  window.dispatchEvent(ev)
}
