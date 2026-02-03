const http = require('http')

const data = JSON.stringify({ username: 'admin', password: 'admin123' })

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}

const req = http.request(options, res => {
  let body = ''
  res.on('data', chunk => body += chunk)
  res.on('end', () => {
    console.log('STATUS', res.statusCode)
    try { console.log('BODY', JSON.parse(body)) } catch (e) { console.log('BODY', body) }
  })
})

req.on('error', err => { console.error('ERROR', err.message) })
req.write(data)
req.end()
