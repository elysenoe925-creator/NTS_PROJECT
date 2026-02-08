const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function testIndependence() {
    const API_BASE = 'http://localhost:4000';
    const token = ''; // We might need a real token if auth is enforced, or we can use a test route if available.
    // However, the server is running on localhost:4000 and auth usually requires one.
    // Let's try to login as admin first to get a token.

    try {
        console.log('--- Starting Independence Test ---');

        console.log('1. Logging in as test_admin...');
        const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'test_admin', password: 'test123' })
        });

        if (!loginRes.ok) {
            const errorText = await loginRes.text();
            throw new Error(`Login failed with status ${loginRes.status}: ${errorText}`);
        }

        const loginData = await loginRes.json();
        const adminToken = loginData.token;
        if (!adminToken) throw new Error('Login response missing token');
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` };

        const testSku = `TEST-DELETE-${Date.now()}`;

        console.log(`2. Creating test product: ${testSku}...`);
        const createRes = await fetch(`${API_BASE}/api/products`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                sku: testSku,
                name: 'Test Deletion Indep',
                cost: 10,
                margin: 50,
                stocks: [
                    { store: 'majunga', qty: 10 },
                    { store: 'tamatave', qty: 20 }
                ]
            })
        });

        if (!createRes.ok) {
            const createErr = await createRes.text();
            throw new Error(`Product creation failed with status ${createRes.status}: ${createErr}`);
        }

        console.log('3. Verifying product presence in both stores...');
        const resM1 = await fetch(`${API_BASE}/api/products?store=majunga`);
        const prodsM1 = await resM1.json();
        const pM1 = prodsM1.find(p => p.sku === testSku);
        console.log(`Boutique Majunga: ${pM1 ? 'PRÉSENT (' + pM1.qty + ')' : 'ABSENT'}`);

        const resT1 = await fetch(`${API_BASE}/api/products?store=tamatave`);
        const prodsT1 = await resT1.json();
        const pT1 = prodsT1.find(p => p.sku === testSku);
        console.log(`Boutique Tamatave: ${pT1 ? 'PRÉSENT (' + pT1.qty + ')' : 'ABSENT'}`);

        if (!pM1 || !pT1) throw new Error('Product creation failed');

        console.log('4. Deleting product for Majunga store only...');
        await fetch(`${API_BASE}/api/products/${encodeURIComponent(testSku)}?store=majunga`, {
            method: 'DELETE',
            headers
        });

        console.log('5. Verifying independence after deletion...');
        const resM2 = await fetch(`${API_BASE}/api/products?store=majunga`);
        const prodsM2 = await resM2.json();
        const pM2 = prodsM2.find(p => p.sku === testSku);
        console.log(`Boutique Majunga: ${pM2 ? 'PRÉSENT (ERREUR)' : 'ABSENT (SUCCÈS)'}`);

        const resT2 = await fetch(`${API_BASE}/api/products?store=tamatave`);
        const prodsT2 = await resT2.json();
        const pT2 = prodsT2.find(p => p.sku === testSku);
        console.log(`Boutique Tamatave: ${pT2 ? 'PRÉSENT (' + pT2.qty + ') (SUCCÈS)' : 'ABSENT (ERREUR)'}`);

        if (pM2 || !pT2) {
            console.error('--- TEST FAILED: Stores are still interdependent! ---');
            process.exit(1);
        } else {
            console.log('--- TEST PASSED: Stores are independent! ---');
        }

        // Cleanup
        console.log('6. Cleanup: Deleting global product...');
        await fetch(`${API_BASE}/api/products/${encodeURIComponent(testSku)}`, {
            method: 'DELETE',
            headers
        });

    } catch (err) {
        console.error('Test error:', err.message);
        process.exit(1);
    }
}

testIndependence();
