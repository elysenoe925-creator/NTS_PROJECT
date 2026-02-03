const fetch = require('node-fetch')
;(async ()=>{
  try {
    const base = 'http://localhost:4000'
    // login as admin (seed uses admin/admin123)
    const r1 = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin123' }) })
    const data = await r1.json()
    if (!r1.ok) { console.error('Login failed', data); process.exit(1) }
    const token = data.token
    console.log('Got token for admin')
    const r2 = await fetch(base + '/api/users', { headers: { Authorization: `Bearer ${token}` } })
    const users = await r2.json()
    console.log('Users:', JSON.stringify(users, null, 2))
  } catch (e) { console.error(e) }
})();
