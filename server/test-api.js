(async ()=>{
  const base = 'http://localhost:4000'
  try {
    console.log('\n== LOGIN ==')
    const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin123' }) })
    const loginJson = await login.json()
    console.log('status', login.status)
    console.log(JSON.stringify(loginJson, null, 2))
    const token = loginJson.token

    console.log('\n== PRODUCTS ==')
    const prods = await fetch(base + '/api/products')
    console.log('status', prods.status)
    console.log(JSON.stringify(await prods.json(), null, 2))

    console.log('\n== PRODUCTS (majunga) ==')
    const prodsMj = await fetch(base + '/api/products?store=majunga')
    console.log('status', prodsMj.status)
    console.log(JSON.stringify(await prodsMj.json(), null, 2))

    console.log('\n== SALES (majunga) ==')
    const sales = await fetch(base + '/api/sales?store=majunga', { headers: token ? { authorization: `Bearer ${token}` } : undefined })
    console.log('status', sales.status)
    console.log(JSON.stringify(await sales.json(), null, 2))

    console.log('\n== CREATE SALE (P-001 qty 1 majunga) ==')
    const create = await fetch(base + '/api/sales', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ sku: 'P-001', qty: 1, client: 'Automated Test', store: 'majunga' }) })
    console.log('status', create.status)
    console.log(JSON.stringify(await create.json(), null, 2))

    console.log('\n== STOCKS (majunga) ==')
    const stocks = await fetch(base + '/api/stock?store=majunga')
    console.log('status', stocks.status)
    console.log(JSON.stringify(await stocks.json(), null, 2))

    // give pending network handles a moment to close cleanly
    await new Promise(r => setTimeout(r, 250))
    console.log('Test script finished')
  } catch (e) {
    console.error('Test failed', e)
    // allow some time for cleanup, then rethrow to exit with error
    await new Promise(r => setTimeout(r, 250))
    throw e
  }
})();
