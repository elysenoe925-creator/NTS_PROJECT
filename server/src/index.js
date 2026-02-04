require('dotenv').config()
const express = require('express')
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const path = require('path')
const { Server } = require('socket.io')
const http = require('http')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./dev.db'
    }
  }
})
const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET || 'change_me_local'

// Socket.IO initialization
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:4000',
      'https://localhost:5173',
      'https://nts-project.vercel.app',
      process.env.FRONTEND_URL || ''
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  },
  transports: ['websocket', 'polling']
})

// Configuration CORS pour production
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:4000',
    'https://localhost:5173',
    'https://nts-project.vercel.app',
    process.env.FRONTEND_URL || ''
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

app.use(cors(corsOptions))
app.use(express.json())

// Simple auth - returns JWT
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' })
  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  const token = jwt.sign({ sub: user.id, role: user.role, store: user.store }, JWT_SECRET, { expiresIn: '8h' })
  res.json({ token, user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role, store: user.store } })
})

// User management endpoints (admin only)
app.get('/api/users', auth, async (req, res) => {
  try {
    // only admin can list users
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const users = await prisma.user.findMany({ select: { id: true, username: true, displayName: true, role: true, store: true } })
    res.json(users)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const { username, password, displayName, role, store } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Missing username or password' })
    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { username, passwordHash: hash, displayName: displayName || username, role: role || 'employee', store: store || 'all' } })
    broadcastUsers() // Notifier tous les clients
    res.json({ id: user.id, username: user.username, displayName: user.displayName, role: user.role, store: user.store })
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Username already exists' })
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/users/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const id = Number(req.params.id)
    const { username, password, displayName, role, store } = req.body
    const data = {}
    if (username != null) data.username = username
    if (displayName != null) data.displayName = displayName
    if (role != null) data.role = role
    if (store != null) data.store = store
    if (password != null) data.passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.update({ where: { id }, data })
    broadcastUsers() // Notifier tous les clients
    res.json({ id: user.id, username: user.username, displayName: user.displayName, role: user.role, store: user.store })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/users/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const id = Number(req.params.id)
    await prisma.user.delete({ where: { id } })
    broadcastUsers() // Notifier tous les clients
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Middleware to protect routes (optional)
function auth(req, res, next) {
  const hdr = req.headers.authorization
  if (!hdr) return res.status(401).json({ error: 'Missing token' })
  const parts = hdr.split(' ')
  if (parts.length !== 2) return res.status(401).json({ error: 'Invalid token' })
  try {
    const payload = jwt.verify(parts[1], JWT_SECRET)
    req.user = payload
    return next()
  } catch (e) { return res.status(401).json({ error: 'Invalid token' }) }
}

// Products list; optional ?store=majunga to include qty and prices for that store
app.get('/api/products', async (req, res) => {
  const store = req.query.store
  const prods = await prisma.product.findMany({ include: { stocks: true } })
  const mapped = prods.map(p => {
    // Créer des maps pour qty, cost, margin par store
    const stockMap = (p.stocks || []).reduce((acc, s) => {
      acc[s.store] = { qty: s.qty, cost: s.cost, margin: s.margin, reorderRequested: s.reorderRequested }
      return acc
    }, {})

    // Create a simple stockByStore with just quantities for frontend compatibility
    const stockByStore = {}
    const reorderRequestedByStore = {}
    for (const [storeName, stockData] of Object.entries(stockMap)) {
      stockByStore[storeName] = stockData.qty
      if (stockData.reorderRequested) reorderRequestedByStore[storeName] = true
    }

    // Si store spécifié, récupérer les prix de ce store sinon utiliser globaux
    let cost = p.cost
    let margin = p.margin
    if (store && stockMap[store]) {
      cost = stockMap[store].cost != null ? stockMap[store].cost : p.cost
      margin = stockMap[store].margin != null ? stockMap[store].margin : p.margin
    }

    // Calcul du prix: price = cost * (1 + margin/100)
    const calculatedPrice = (cost != null && margin != null) ? Number(cost) * (1 + Number(margin) / 100) : p.price

    const qty = store ? (stockMap[store] != null ? stockMap[store].qty : 0) : Object.values(stockMap).reduce((a, b) => a + (b.qty || 0), 0)

    return {
      id: p.id, sku: p.sku, name: p.name, model: p.model, compatibleModels: p.compatibleModels ? p.compatibleModels.split(',') : [],
      price: calculatedPrice, cost: cost, margin: margin,
      location: p.location, category: p.category, supplier: p.supplier,
      stockByStore: stockByStore, reorderRequestedByStore: reorderRequestedByStore, qty
    }
  })
  // If store provided, filter out products that don't have an explicit entry for that store (behaviour matching frontend expectation)
  const result = store ? mapped.filter(p => p.stockByStore && Object.prototype.hasOwnProperty.call(p.stockByStore, store)) : mapped
  res.json(result)
})

// Create product with optional stock entries
app.post('/api/products', auth, async (req, res) => {
  const data = req.body
  try {
    // Calcul du prix: price = cost * (1 + margin/100)
    const cost = data.cost != null ? Number(data.cost) : null
    const margin = data.margin != null ? Number(data.margin) : null
    const calculatedPrice = data.price != null ? Number(data.price) : (cost != null && margin != null ? cost * (1 + margin / 100) : null)
    const p = await prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        model: data.model || null,
        compatibleModels: (data.compatibleModels || []).join ? (data.compatibleModels.join(',')) : (data.compatibleModels || null),
        cost: cost,
        margin: margin,
        price: calculatedPrice,
        location: data.location || null,
        category: data.category || null,
        supplier: data.supplier || null,
      }
    })
    // create stock rows if provided
    if (data.stocks && Array.isArray(data.stocks)) {
      for (const s of data.stocks) {
        await prisma.stock.create({ data: { productId: p.id, store: s.store, qty: Number(s.qty || 0), cost: cost, margin: margin } })
      }
    }
    broadcastProducts() // Notifier tous les clients
    res.json({ ok: true, product: p })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Update product by SKU (partial update). Accepts fields and optional stocks array to upsert stock rows with store-specific pricing
app.put('/api/products/:sku', auth, async (req, res) => {
  const sku = req.params.sku
  const data = req.body || {}
  const store = data.store // Store optionnel pour les mises à jour par boutique
  try {
    const product = await prisma.product.findUnique({ where: { sku } })
    if (!product) return res.status(404).json({ error: 'Product not found' })

    // Si store est fourni, mettre à jour uniquement pour ce store
    if (store) {
      const existing = await prisma.stock.findUnique({ where: { productId_store: { productId: product.id, store } } }).catch(() => null)
      if (!existing) return res.status(404).json({ error: 'Stock entry for this store not found' })

      const newCost = data.cost != null ? Number(data.cost) : existing.cost
      const newMargin = data.margin != null ? Number(data.margin) : existing.margin

      await prisma.stock.update({
        where: { id: existing.id }, data: {
          qty: data.qty != null ? Number(data.qty) : existing.qty,
          cost: newCost,
          margin: newMargin
        }
      })
    } else {
      // Sinon, mettre à jour le produit global (compatibilité)
      const newCost = data.cost != null ? Number(data.cost) : product.cost
      const newMargin = data.margin != null ? Number(data.margin) : product.margin
      const newPrice = data.price != null ? Number(data.price) : (newCost != null && newMargin != null ? newCost * (1 + newMargin / 100) : product.price)

      await prisma.product.update({
        where: { id: product.id }, data: {
          sku: data.sku || product.sku,
          name: data.name != null ? data.name : product.name,
          model: data.model != null ? data.model : product.model,
          compatibleModels: data.compatibleModels ? (Array.isArray(data.compatibleModels) ? data.compatibleModels.join(',') : data.compatibleModels) : product.compatibleModels,
          cost: newCost,
          margin: newMargin,
          price: newPrice,
          location: data.location != null ? data.location : product.location,
          category: data.category != null ? data.category : product.category,
          supplier: data.supplier != null ? data.supplier : product.supplier,
        }
      })

      // upsert stocks if provided
      if (data.stocks && Array.isArray(data.stocks)) {
        for (const s of data.stocks) {
          const existing = await prisma.stock.findUnique({ where: { productId_store: { productId: product.id, store: s.store } } }).catch(() => null)
          if (existing) {
            await prisma.stock.update({ where: { id: existing.id }, data: { qty: Number(s.qty || 0) } })
          } else {
            await prisma.stock.create({ data: { productId: product.id, store: s.store, qty: Number(s.qty || 0) } })
          }
        }
      }
    }

    broadcastProducts() // Notifier tous les clients
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Request restock: Set flag and create pending order
app.post('/api/products/:sku/reorder', auth, async (req, res) => {
  const sku = req.params.sku
  const { store, qty, notes } = req.body
  const quantity = Number(qty || 0)
  const targetStore = store || req.user.store

  if (!targetStore) return res.status(400).json({ error: 'Store required' })

  try {
    const product = await prisma.product.findUnique({ where: { sku } })
    if (!product) return res.status(404).json({ error: 'Product not found' })

    // 1. Update Stock reorderRequested flag
    const existingStock = await prisma.stock.findUnique({ where: { productId_store: { productId: product.id, store: targetStore } } }).catch(() => null)

    if (existingStock) {
      await prisma.stock.update({ where: { id: existingStock.id }, data: { reorderRequested: true } })
    } else {
      // Create stock entry if missing, with flag true
      await prisma.stock.create({ data: { productId: product.id, store: targetStore, qty: 0, reorderRequested: true } })
    }

    // 2. Create Order
    // Check if there is already a pending order for this product/store? User wants "Examiner", so maybe just create a NEW request every time?
    // "Les utilisateurs doivent pouvoir demander réapprovisionnement" -> implies sending a request.
    // Creating a new order seems safest to avoid modifying existing logic/orders unintentionally.

    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    const referenceNumber = `REQ-${dateStr}-${randomNum}` // REQ prefix for requests? Or just ORD? Let's use REQ to distinguish if needed, or stick to ORD. User said "section des commandes". ORD is better.
    // Actually let's use ORD but maybe a specific note.

    const unitPrice = product.cost || 0
    const totalAmount = quantity * unitPrice

    const order = await prisma.order.create({
      data: {
        referenceNumber: `REQ-${dateStr}-${randomNum}`, // Using REQ to easily identify auto-requests
        createdBy: req.user.sub,
        status: 'pending', // Pending approval
        store: targetStore,
        totalAmount,
        notes: `Demande de réapprovisionnement: ${notes || ''}`,
        items: {
          create: [{
            productId: product.id,
            quantity,
            unitPrice,
            totalPrice: totalAmount,
            notes: notes
          }]
        }
      }
    })

    await prisma.actionLog.create({
      data: {
        userId: req.user.sub,
        action: 'RESTOCK_REQUEST',
        description: `Demande de réappro pour ${sku} (${quantity})`,
        store: targetStore
      }
    })

    broadcastProducts()
    broadcastOrders()
    broadcastLogs()

    res.json({ ok: true, orderId: order.id })
  } catch (e) {
    console.error('Restock request error:', e)
    res.status(500).json({ error: e.message })
  }
})

// Cancel restock request: Unset flag and delete pending auto-request orders
app.post('/api/products/:sku/cancel-reorder', auth, async (req, res) => {
  const sku = req.params.sku
  const { store } = req.body
  const targetStore = store || req.user.store

  if (!targetStore) return res.status(400).json({ error: 'Store required' })

  try {
    const product = await prisma.product.findUnique({ where: { sku } })
    if (!product) return res.status(404).json({ error: 'Product not found' })

    // 1. Unset Stock reorderRequested flag
    const existingStock = await prisma.stock.findUnique({ where: { productId_store: { productId: product.id, store: targetStore } } }).catch(() => null)
    if (existingStock) {
      await prisma.stock.update({ where: { id: existingStock.id }, data: { reorderRequested: false } })
    }

    // 2. Find and delete PENDING auto-created orders for this product/store
    // We look for orders that:
    // - are for this store
    // - are pending
    // - have reference number starting with REQ-
    // - contain an item for this product
    const pendingRequests = await prisma.order.findMany({
      where: {
        store: targetStore,
        status: 'pending',
        referenceNumber: { startsWith: 'REQ-' },
        items: {
          some: { productId: product.id }
        }
      },
      include: { items: true }
    })

    // For each found order, we should theoretically only remove THIS item if there are multiple, 
    // but our current logic creates one order per request. Safe to delete the whole order if it matches the pattern.
    // However, to be extra safe, let's just delete the order if it was created as a single-product request.
    for (const order of pendingRequests) {
      // Delete order items first (cascade usually handles this but let's be explicit or rely on deletion)
      await prisma.orderItem.deleteMany({ where: { orderId: order.id } })
      await prisma.order.delete({ where: { id: order.id } })
    }

    await prisma.actionLog.create({
      data: {
        userId: req.user.sub,
        action: 'RESTOCK_CANCEL',
        description: `Demande de réappro annulée pour ${sku}`,
        store: targetStore
      }
    })

    broadcastProducts()
    broadcastOrders()
    broadcastLogs()

    res.json({ ok: true })
  } catch (e) {
    console.error('Restock cancel error:', e)
    res.status(500).json({ error: e.message })
  }
})


// Delete product and related stocks/sales
app.delete('/api/products/:sku', auth, async (req, res) => {
  const sku = req.params.sku
  try {
    const product = await prisma.product.findUnique({ where: { sku } })
    if (!product) return res.status(404).json({ error: 'Product not found' })
    // delete stocks and sales first
    await prisma.stock.deleteMany({ where: { productId: product.id } })
    await prisma.sale.deleteMany({ where: { productId: product.id } })
    await prisma.product.delete({ where: { id: product.id } })
    broadcastProducts() // Notifier tous les clients
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Get stock rows for a store
app.get('/api/stock', async (req, res) => {
  const store = req.query.store
  const where = store ? { where: { store } } : undefined
  const stocks = await prisma.stock.findMany(where)
  res.json(stocks)
})

// Get sales list, optional ?store=majunga
app.get('/api/sales', async (req, res) => {
  const store = req.query.store
  const where = store ? { where: { store } } : undefined
  const sales = await prisma.sale.findMany({ ...(where || {}), include: { product: true } })
  const mapped = sales.map(s => ({
    id: s.id,
    productId: s.productId,
    sku: s.product ? s.product.sku : null,
    model: s.product ? s.product.model : null, // Add model here
    qty: s.qty,
    total: s.total,
    client: s.client,
    date: s.date,
    store: s.store
  }))
  res.json(mapped)
})

// ===== ORDERS ENDPOINTS =====

// Get all orders for a store (or all if admin)
app.get('/api/orders', auth, async (req, res) => {
  try {
    const store = req.query.store || req.user.store
    const where = req.user.role === 'admin' && !req.query.store ? {} : { store }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: { product: true }
        },
        user: { select: { id: true, username: true, displayName: true, store: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    const mapped = orders.map(o => ({
      id: o.id,
      referenceNumber: o.referenceNumber,
      createdBy: o.createdBy,
      createdByUser: o.user,
      status: o.status,
      store: o.store,
      supplier: o.supplier,
      totalAmount: o.totalAmount,
      notes: o.notes,
      deliveryDate: o.deliveryDate,
      targetDate: o.targetDate,
      items: o.items.map(i => ({
        id: i.id,
        productId: i.productId,
        sku: i.product?.sku,
        productName: i.product?.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        notes: i.notes
      })),
      createdAt: o.createdAt,
      updatedAt: o.updatedAt
    }))

    res.json(mapped)
  } catch (e) {
    console.error('Error fetching orders:', e)
    res.status(500).json({ error: e.message })
  }
})

// Get single order by ID
app.get('/api/orders/:id', auth, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, username: true, displayName: true, store: true } }
      }
    })

    if (!order) return res.status(404).json({ error: 'Order not found' })

    const mapped = {
      id: order.id,
      referenceNumber: order.referenceNumber,
      createdBy: order.createdBy,
      createdByUser: order.user,
      status: order.status,
      store: order.store,
      supplier: order.supplier,
      totalAmount: order.totalAmount,
      notes: order.notes,
      deliveryDate: order.deliveryDate,
      targetDate: order.targetDate,
      items: order.items.map(i => ({
        id: i.id,
        productId: i.productId,
        sku: i.product?.sku,
        productName: i.product?.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        notes: i.notes
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }

    res.json(mapped)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Create new order with items
app.post('/api/orders', auth, async (req, res) => {
  try {
    const { items, notes, supplier, targetDate, deliveryDate } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid items' })
    }

    // Generate unique reference number: ORD-YYYYMMDD-XXXX
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    const referenceNumber = `ORD-${dateStr}-${randomNum}`

    // Calculate total amount
    let totalAmount = 0
    const orderItems = []

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: Number(item.productId) } })
      if (!product) {
        return res.status(404).json({ error: `Product not found: ${item.productId}` })
      }

      const quantity = Number(item.quantity || item.orderQty || 0)
      const unitPrice = Number(item.unitPrice || item.price || product.cost || 0)
      const totalPrice = quantity * unitPrice

      orderItems.push({
        productId: product.id,
        quantity,
        unitPrice,
        totalPrice,
        notes: item.notes || null
      })

      totalAmount += totalPrice
    }

    // Create order with items
    const order = await prisma.order.create({
      data: {
        referenceNumber,
        createdBy: req.user.sub,
        status: 'draft',
        store: req.user.store,
        supplier: supplier || null,
        totalAmount,
        notes: notes || null,
        targetDate: targetDate ? new Date(targetDate) : null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        items: {
          create: orderItems
        }
      },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, username: true, displayName: true, store: true } }
      }
    })

    // Log the action
    await prisma.actionLog.create({
      data: {
        userId: req.user.sub,
        action: 'ORDER_CREATED',
        description: `Commande créée: ${referenceNumber} (${items.length} articles, ${totalAmount.toFixed(2)} Ar)`,
        store: req.user.store
      }
    })

    broadcastOrders()
    broadcastLogs()

    res.json({ ok: true, order })
  } catch (e) {
    console.error('Error creating order:', e)
    res.status(500).json({ error: e.message })
  }
})

// Update order status
app.put('/api/orders/:id/status', auth, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { status } = req.body

    if (!status) return res.status(400).json({ error: 'Missing status' })

    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) return res.status(404).json({ error: 'Order not found' })

    // Validation: only admin can approve/reject
    if ((status === 'approved' || status === 'rejected') && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can approve or reject orders' })
    }

    // Update status
    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, username: true, displayName: true, store: true } }
      }
    })

    // Log the action
    await prisma.actionLog.create({
      data: {
        userId: req.user.sub,
        action: 'ORDER_STATUS_CHANGED',
        description: `Commande ${order.referenceNumber}: ${order.status} → ${status}`,
        store: order.store
      }
    })

    broadcastOrders()
    broadcastLogs()

    res.json({ ok: true, order: updated })
  } catch (e) {
    console.error('Error updating order status:', e)
    res.status(500).json({ error: e.message })
  }
})

// Update order (notes, dates, supplier)
app.put('/api/orders/:id', auth, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { notes, supplier, targetDate, deliveryDate } = req.body

    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) return res.status(404).json({ error: 'Order not found' })

    // Only allow updates if draft or pending
    if (!['draft', 'pending'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot update order in current status' })
    }

    const data = {}
    if (notes !== undefined) data.notes = notes
    if (supplier !== undefined) data.supplier = supplier
    if (targetDate !== undefined) data.targetDate = targetDate ? new Date(targetDate) : null
    if (deliveryDate !== undefined) data.deliveryDate = deliveryDate ? new Date(deliveryDate) : null

    const updated = await prisma.order.update({
      where: { id },
      data,
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, username: true, displayName: true, store: true } }
      }
    })

    broadcastOrders()

    res.json({ ok: true, order: updated })
  } catch (e) {
    console.error('Error updating order:', e)
    res.status(500).json({ error: e.message })
  }
})

// Add items to order
app.post('/api/orders/:id/items', auth, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { items } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid items' })
    }

    const order = await prisma.order.findUnique({ where: { id }, include: { items: true } })
    if (!order) return res.status(404).json({ error: 'Order not found' })

    if (!['draft', 'pending'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot modify order in current status' })
    }

    // Create new items
    const orderItems = []
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: Number(item.productId) } })
      if (!product) continue

      const quantity = Number(item.quantity || 0)
      const unitPrice = Number(item.unitPrice || product.cost || 0)
      const totalPrice = quantity * unitPrice

      orderItems.push({
        orderId: id,
        productId: product.id,
        quantity,
        unitPrice,
        totalPrice,
        notes: item.notes || null
      })
    }

    await prisma.orderItem.createMany({ data: orderItems })

    // Recalculate total
    const allItems = await prisma.orderItem.findMany({ where: { orderId: id } })
    const totalAmount = allItems.reduce((sum, item) => sum + item.totalPrice, 0)

    await prisma.order.update({
      where: { id },
      data: { totalAmount }
    })

    broadcastOrders()

    res.json({ ok: true })
  } catch (e) {
    console.error('Error adding items to order:', e)
    res.status(500).json({ error: e.message })
  }
})

// Update order item quantity
app.put('/api/orders/:id/items/:itemId', auth, async (req, res) => {
  try {
    const orderId = Number(req.params.id)
    const itemId = Number(req.params.itemId)
    const { quantity } = req.body

    if (quantity === undefined) return res.status(400).json({ error: 'Missing quantity' })

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) return res.status(404).json({ error: 'Order not found' })

    if (!['draft', 'pending'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot modify order in current status' })
    }

    const item = await prisma.orderItem.findUnique({ where: { id: itemId } })
    if (!item || item.orderId !== orderId) {
      return res.status(404).json({ error: 'Item not found' })
    }

    const newQuantity = Number(quantity)
    const totalPrice = newQuantity * item.unitPrice

    await prisma.orderItem.update({
      where: { id: itemId },
      data: { quantity: newQuantity, totalPrice }
    })

    // Recalculate total
    const allItems = await prisma.orderItem.findMany({ where: { orderId } })
    const totalAmount = allItems.reduce((sum, i) => sum + i.totalPrice, 0)

    await prisma.order.update({
      where: { id: orderId },
      data: { totalAmount }
    })

    broadcastOrders()

    res.json({ ok: true })
  } catch (e) {
    console.error('Error updating order item:', e)
    res.status(500).json({ error: e.message })
  }
})

// Delete order item
app.delete('/api/orders/:id/items/:itemId', auth, async (req, res) => {
  try {
    const orderId = Number(req.params.id)
    const itemId = Number(req.params.itemId)

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) return res.status(404).json({ error: 'Order not found' })

    if (!['draft', 'pending'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot modify order in current status' })
    }

    const item = await prisma.orderItem.findUnique({ where: { id: itemId } })
    if (!item || item.orderId !== orderId) {
      return res.status(404).json({ error: 'Item not found' })
    }

    await prisma.orderItem.delete({ where: { id: itemId } })

    // Recalculate total
    const allItems = await prisma.orderItem.findMany({ where: { orderId } })
    const totalAmount = allItems.reduce((sum, i) => sum + i.totalPrice, 0)

    await prisma.order.update({
      where: { id: orderId },
      data: { totalAmount }
    })

    broadcastOrders()

    res.json({ ok: true })
  } catch (e) {
    console.error('Error deleting order item:', e)
    res.status(500).json({ error: e.message })
  }
})

// Delete order
app.delete('/api/orders/:id', auth, async (req, res) => {
  try {
    const id = Number(req.params.id)

    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) return res.status(404).json({ error: 'Order not found' })

    // Only allow deletion if draft or cancelled
    if (!['draft', 'cancelled', 'rejected'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot delete order in current status' })
    }

    await prisma.order.delete({ where: { id } })

    // Log the action
    await prisma.actionLog.create({
      data: {
        userId: req.user.sub,
        action: 'ORDER_DELETED',
        description: `Commande supprimée: ${order.referenceNumber}`,
        store: order.store
      }
    })

    broadcastOrders()
    broadcastLogs()

    res.json({ ok: true })
  } catch (e) {
    console.error('Error deleting order:', e)
    res.status(500).json({ error: e.message })
  }
})

// set stock for a product (create or update)
app.post('/api/stock', auth, async (req, res) => {
  const { sku, store, qty } = req.body
  if (!sku || !store) return res.status(400).json({ error: 'Missing sku or store' })
  try {
    const product = await prisma.product.findUnique({ where: { sku } })
    if (!product) return res.status(404).json({ error: 'Product not found' })
    const existing = await prisma.stock.findUnique({ where: { productId_store: { productId: product.id, store } } }).catch(() => null)
    let row
    if (existing) {
      row = await prisma.stock.update({ where: { id: existing.id }, data: { qty: Number(qty || 0) } })
    } else {
      row = await prisma.stock.create({ data: { productId: product.id, store, qty: Number(qty || 0) } })
    }
    broadcastProducts() // Notifier tous les clients
    res.json({ ok: true, stock: row })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Record a sale: decrement stock and create sale row
// Record a sale: decrement stock and create sale row (Transactional)
app.post('/api/sales', auth, async (req, res) => {
  const { productId, sku, qty, client, store } = req.body
  const quantity = Number(qty)

  if (!quantity || quantity <= 0) return res.status(400).json({ error: 'Invalid quantity' })

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find Product
      const product = productId
        ? await tx.product.findUnique({ where: { id: Number(productId) } })
        : await tx.product.findUnique({ where: { sku } })

      if (!product) throw new Error('Product not found')

      // 2. Find Stock for Store
      const stockRow = await tx.stock.findUnique({
        where: { productId_store: { productId: product.id, store } }
      })

      if (!stockRow) throw new Error(`No stock entry for store: ${store}`)
      if (stockRow.qty < quantity) throw new Error(`Not enough stock. Available: ${stockRow.qty}`)

      // 3. Decrement Stock (Atomic)
      await tx.stock.update({
        where: { id: stockRow.id },
        data: { qty: { decrement: quantity } }
      })

      // 4. Create Sale Record

      // Calculate Price: Use Store-Specific Price if defined (cost & margin override), otherwise use global product price
      let unitPrice = Number(product.price || 0)

      if (stockRow.cost != null && stockRow.margin != null) {
        // Recalculate price based on store specific cost & margin
        unitPrice = Number(stockRow.cost) * (1 + Number(stockRow.margin) / 100)
      }

      const total = unitPrice * quantity

      const sale = await tx.sale.create({
        data: {
          productId: product.id,
          qty: quantity,
          total: total,
          client: client || 'Client inconnu',
          store: store || 'unknown'
        },
        include: { product: true }
      })

      return sale
    })

    broadcastProducts() // Notify stock change
    broadcastSales() // Notify sales update

    // Return formatted sale for frontend
    res.json({ ok: true, sale: result })

  } catch (e) {
    console.error('Sale transaction failed:', e)
    const message = e.message || 'Transaction failed'
    if (message.includes('Product not found')) return res.status(404).json({ error: 'Product not found' })
    if (message.includes('Not enough stock')) return res.status(400).json({ error: message })
    res.status(500).json({ error: message })
  }
})

// Log an action
app.post('/api/logs', auth, async (req, res) => {
  try {
    const { action, description } = req.body
    if (!action || !description) return res.status(400).json({ error: 'Missing action or description' })
    const log = await prisma.actionLog.create({
      data: {
        userId: req.user.sub,
        action,
        description,
        store: req.user.store
      }
    })
    broadcastLogs() // Notifier tous les clients
    res.json({ ok: true, log })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Get action logs (admin only)
app.get('/api/logs', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const logs = await prisma.actionLog.findMany({
      include: {
        user: { select: { id: true, username: true, displayName: true, store: true } }
      },
      orderBy: { timestamp: 'desc' }
    })
    res.json(logs)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Get action logs for a specific user (admin only)
app.get('/api/logs/user/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const userId = Number(req.params.userId)
    const logs = await prisma.actionLog.findMany({
      where: { userId },
      include: {
        user: { select: { id: true, username: true, displayName: true, store: true } }
      },
      orderBy: { timestamp: 'desc' }
    })
    res.json(logs)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Get action logs for a store (admin only)
app.get('/api/logs/store/:store', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const store = req.params.store
    const logs = await prisma.actionLog.findMany({
      where: { store },
      include: {
        user: { select: { id: true, username: true, displayName: true, store: true } }
      },
      orderBy: { timestamp: 'desc' }
    })
    res.json(logs)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ===== ARRIVALS ENDPOINTS =====

// Get all arrivals for a store
app.get('/api/arrivals', auth, async (req, res) => {
  try {
    const store = req.query.store || req.user.store
    console.log(`[DEBUG] GET /api/arrivals - store: ${store}, user: ${req.user.sub}`)
    const arrivals = await prisma.arrival.findMany({
      where: { store },
      include: {
        items: {
          include: { product: true }
        },
        user: { select: { id: true, username: true, displayName: true } }
      },
      orderBy: { arrivalDate: 'desc' }
    })
    console.log(`[DEBUG] Found ${arrivals.length} arrivals`)
    const mapped = arrivals.map(a => ({
      id: a.id,
      referenceNumber: a.referenceNumber,
      supplier: a.supplier,
      arrivalDate: a.arrivalDate,
      receivedBy: a.receivedBy,
      receivedByUser: a.user,
      status: a.status,
      notes: a.notes,
      store: a.store,
      items: a.items.map(i => ({
        id: i.id,
        productId: i.productId,
        sku: i.product?.sku,
        productName: i.product?.name,
        qtyReceived: i.qtyReceived,
        costPrice: i.costPrice,
        notes: i.notes
      })),
      createdAt: a.createdAt,
      updatedAt: a.updatedAt
    }))
    res.json(mapped)
  } catch (e) {
    console.error(`[ERROR] GET /api/arrivals:`, e)
    res.status(500).json({ error: e.message })
  }
})

// Get single arrival by ID
app.get('/api/arrivals/:id', auth, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const arrival = await prisma.arrival.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true }
        },
        user: { select: { id: true, username: true, displayName: true } }
      }
    })
    if (!arrival) return res.status(404).json({ error: 'Arrival not found' })
    const mapped = {
      id: arrival.id,
      referenceNumber: arrival.referenceNumber,
      supplier: arrival.supplier,
      arrivalDate: arrival.arrivalDate,
      receivedBy: arrival.receivedBy,
      receivedByUser: arrival.user,
      status: arrival.status,
      notes: arrival.notes,
      store: arrival.store,
      items: arrival.items.map(i => ({
        id: i.id,
        productId: i.productId,
        sku: i.product?.sku,
        productName: i.product?.name,
        qtyReceived: i.qtyReceived,
        costPrice: i.costPrice,
        notes: i.notes
      })),
      createdAt: arrival.createdAt,
      updatedAt: arrival.updatedAt
    }
    res.json(mapped)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Create new arrival with items
app.post('/api/arrivals', auth, async (req, res) => {
  try {
    const { referenceNumber, supplier, arrivalDate, notes, items, store } = req.body
    if (!referenceNumber || !supplier || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid required fields' })
    }

    // Check if reference number already exists
    const existing = await prisma.arrival.findUnique({ where: { referenceNumber } }).catch(() => null)
    if (existing) return res.status(409).json({ error: 'Reference number already exists' })

    // Créer l'arrivage avec les items
    const arrival = await prisma.arrival.create({
      data: {
        referenceNumber,
        supplier,
        arrivalDate: arrivalDate ? new Date(arrivalDate) : new Date(),
        receivedBy: req.user.sub,
        notes: notes || null,
        status: 'pending',
        store: store || req.user.store,
        items: {
          create: items.map(item => ({
            productId: Number(item.productId),
            qtyReceived: Number(item.qtyReceived),
            costPrice: Number(item.costPrice),
            notes: item.notes || null
          }))
        }
      },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, username: true, displayName: true } }
      }
    })

    // Log the action
    await prisma.actionLog.create({
      data: {
        userId: req.user.sub,
        action: 'ARRIVAL_CREATED',
        description: `Arrivage créé: ${referenceNumber} de ${supplier} (${items.length} articles)`,
        store: store || req.user.store
      }
    })

    broadcastArrivals()
    broadcastLogs()

    const mapped = {
      id: arrival.id,
      referenceNumber: arrival.referenceNumber,
      supplier: arrival.supplier,
      arrivalDate: arrival.arrivalDate,
      receivedBy: arrival.receivedBy,
      receivedByUser: arrival.user,
      status: arrival.status,
      notes: arrival.notes,
      store: arrival.store,
      items: arrival.items.map(i => ({
        id: i.id,
        productId: i.productId,
        sku: i.product?.sku,
        productName: i.product?.name,
        qtyReceived: i.qtyReceived,
        costPrice: i.costPrice,
        notes: i.notes
      })),
      createdAt: arrival.createdAt,
      updatedAt: arrival.updatedAt
    }

    res.json({ ok: true, arrival: mapped })
  } catch (e) {
    console.error('Error creating arrival:', e)
    res.status(500).json({ error: e.message })
  }
})

// Confirm arrival (change status to confirmed and update stock)
app.put('/api/arrivals/:id/confirm', auth, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const arrival = await prisma.arrival.findUnique({
      where: { id },
      include: { items: true, user: { select: { id: true, username: true, displayName: true } } }
    })
    if (!arrival) return res.status(404).json({ error: 'Arrival not found' })
    if (arrival.status !== 'pending') return res.status(400).json({ error: 'Arrival is not in pending status' })

    // Update stock for each item with weighted average cost calculation
    for (const item of arrival.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      })

      const stockRow = await prisma.stock.findUnique({
        where: { productId_store: { productId: item.productId, store: arrival.store } }
      }).catch(() => null)

      // Calculate weighted average cost: (old_cost * old_qty + new_cost * new_qty) / (old_qty + new_qty)
      let newCost = item.costPrice
      if (stockRow && stockRow.cost != null && stockRow.qty > 0) {
        newCost = (Number(stockRow.cost) * stockRow.qty + Number(item.costPrice) * item.qtyReceived) / (stockRow.qty + item.qtyReceived)
      }

      // Calculate new price based on margin: price = cost * (1 + margin/100)
      let newPrice = product.price
      if (newCost != null) {
        const margin = stockRow?.margin != null ? Number(stockRow.margin) : (product.margin != null ? Number(product.margin) : 0)
        newPrice = newCost * (1 + margin / 100)
      }

      if (stockRow) {
        await prisma.stock.update({
          where: { id: stockRow.id },
          data: {
            qty: stockRow.qty + item.qtyReceived,
            cost: newCost,
            margin: stockRow.margin != null ? stockRow.margin : product.margin
          }
        })
      } else {
        // Create new stock row if it doesn't exist
        await prisma.stock.create({
          data: {
            productId: item.productId,
            store: arrival.store,
            qty: item.qtyReceived,
            cost: newCost,
            margin: product.margin
          }
        })
      }

      // Update product price (global)
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          price: newPrice,
          cost: newCost
        }
      })
    }

    // Update arrival status
    const updated = await prisma.arrival.update({
      where: { id },
      data: { status: 'confirmed' },
      include: { items: { include: { product: true } }, user: { select: { id: true, username: true, displayName: true } } }
    })

    // Log the action
    await prisma.actionLog.create({
      data: {
        userId: req.user.sub,
        action: 'ARRIVAL_CONFIRMED',
        description: `Arrivage confirmé: ${arrival.referenceNumber} - Stock augmenté`,
        store: arrival.store
      }
    })

    broadcastArrivals()
    broadcastProducts()
    broadcastLogs()

    res.json({ ok: true })
  } catch (e) {
    console.error('Error confirming arrival:', e)
    res.status(500).json({ error: e.message })
  }
})

// Cancel arrival
app.put('/api/arrivals/:id/cancel', auth, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const arrival = await prisma.arrival.findUnique({ where: { id }, include: { items: true } })
    if (!arrival) return res.status(404).json({ error: 'Arrival not found' })
    if (arrival.status === 'confirmed') return res.status(400).json({ error: 'Cannot cancel confirmed arrival' })

    const updated = await prisma.arrival.update({
      where: { id },
      data: { status: 'cancelled' }
    })

    // Log the action
    await prisma.actionLog.create({
      data: {
        userId: req.user.sub,
        action: 'ARRIVAL_CANCELLED',
        description: `Arrivage annulé: ${arrival.referenceNumber}`,
        store: arrival.store
      }
    })

    broadcastArrivals()
    broadcastLogs()

    res.json({ ok: true })
  } catch (e) {
    console.error('Error cancelling arrival:', e)
    res.status(500).json({ error: e.message })
  }
})

// ===== SOCKET.IO SETUP =====

// Middleware d'authentification Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.auth.token
  if (!token) return next(new Error('Authentication error'))
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    socket.user = payload
    next()
  } catch (e) {
    next(new Error('Authentication error'))
  }
})

// Connection handler
io.on('connection', (socket) => {
  console.log(`✓ Client connected: ${socket.id} (user: ${socket.user.sub})`)

  // Envoyer une synchronisation complète au connexion
  socket.on('sync:request', async () => {
    console.log(`📡 Sync request from ${socket.id}`)
    try {
      const users = await prisma.user.findMany({ select: { id: true, username: true, displayName: true, role: true, store: true } })
      const products = await prisma.product.findMany({ include: { stocks: true } })
      const orders = await prisma.order.findMany({
        include: {
          items: { include: { product: true } },
          user: { select: { id: true, username: true, displayName: true, store: true } }
        },
        orderBy: { createdAt: 'desc' }
      }).catch(() => [])
      const sales = await prisma.sale.findMany({ include: { product: true } })
      const logs = await prisma.actionLog.findMany({ include: { user: { select: { id: true, username: true, displayName: true, store: true } } }, orderBy: { timestamp: 'desc' }, take: 100 })
      const arrivals = await prisma.arrival.findMany({ include: { items: { include: { product: true } }, user: { select: { id: true, username: true, displayName: true } } }, orderBy: { arrivalDate: 'desc' } })

      socket.emit('sync:full', {
        users,
        products: products.map(p => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          model: p.model,
          compatibleModels: p.compatibleModels ? p.compatibleModels.split(',') : [],
          price: p.price,
          cost: p.cost,
          location: p.location,
          category: p.category,
          supplier: p.supplier,
          stockByStore: (p.stocks || []).reduce((acc, s) => { acc[s.store] = s.qty; return acc }, {})
        })),
        orders: orders.map(o => ({
          id: o.id,
          referenceNumber: o.referenceNumber,
          createdBy: o.createdBy,
          createdByUser: o.user,
          status: o.status,
          store: o.store,
          supplier: o.supplier,
          totalAmount: o.totalAmount,
          notes: o.notes,
          deliveryDate: o.deliveryDate,
          targetDate: o.targetDate,
          items: o.items.map(i => ({
            id: i.id,
            productId: i.productId,
            sku: i.product?.sku,
            productName: i.product?.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
            notes: i.notes
          })),
          createdAt: o.createdAt,
          updatedAt: o.updatedAt
        })),
        sales,
        logs,
        arrivals
      })
    } catch (e) {
      console.error('Error syncing:', e)
    }
  })

  socket.on('disconnect', () => {
    console.log(`✗ Client disconnected: ${socket.id}`)
  })
})

// Fonction pour émettre des changements à tous les clients
function broadcastUsers() {
  prisma.user.findMany({ select: { id: true, username: true, displayName: true, role: true, store: true } }).then(users => {
    io.emit('users:updated', users)
  })
}

function broadcastProducts() {
  prisma.product.findMany({ include: { stocks: true } }).then(products => {
    io.emit('products:updated', products.map(p => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      model: p.model,
      compatibleModels: p.compatibleModels ? p.compatibleModels.split(',') : [],
      price: p.price,
      cost: p.cost,
      location: p.location,
      category: p.category,
      supplier: p.supplier,
      stockByStore: (p.stocks || []).reduce((acc, s) => { acc[s.store] = s.qty; return acc }, {})
    })))
  })
}

function broadcastSales() {
  prisma.sale.findMany({ include: { product: true } }).then(sales => {
    io.emit('sales:updated', sales.map(s => ({
      id: s.id,
      productId: s.productId,
      sku: s.product ? s.product.sku : null,
      qty: s.qty,
      total: s.total,
      client: s.client,
      date: s.date,
      store: s.store
    })))
  })
}

function broadcastLogs() {
  prisma.actionLog.findMany({ include: { user: { select: { id: true, username: true, displayName: true, store: true } } }, orderBy: { timestamp: 'desc' }, take: 100 }).then(logs => {
    io.emit('logs:updated', logs)
  })
}

function broadcastArrivals() {
  prisma.arrival.findMany({ include: { items: { include: { product: true } }, user: { select: { id: true, username: true, displayName: true } } }, orderBy: { arrivalDate: 'desc' } }).then(arrivals => {
    io.emit('arrivals:updated', arrivals)
  })
}

function broadcastOrders() {
  prisma.order.findMany({
    include: {
      items: { include: { product: true } },
      user: { select: { id: true, username: true, displayName: true, store: true } }
    },
    orderBy: { createdAt: 'desc' }
  }).then(orders => {
    io.emit('orders:updated', orders.map(o => ({
      id: o.id,
      referenceNumber: o.referenceNumber,
      createdBy: o.createdBy,
      createdByUser: o.user,
      status: o.status,
      store: o.store,
      supplier: o.supplier,
      totalAmount: o.totalAmount,
      notes: o.notes,
      deliveryDate: o.deliveryDate,
      targetDate: o.targetDate,
      items: o.items.map(i => ({
        id: i.id,
        productId: i.productId,
        sku: i.product?.sku,
        productName: i.product?.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        notes: i.notes
      })),
      createdAt: o.createdAt,
      updatedAt: o.updatedAt
    })))
  })
}

// Prediction endpoint (Delegates to Python)
app.post('/api/predict', async (req, res) => {
  const { details, horizon } = req.body

  if (!details || !Array.isArray(details)) {
    return res.status(400).json({ error: 'Missing or invalid details' })
  }

  const { spawn } = require('child_process')

  // Use python3 or python depending on environment
  const pythonCommand = process.platform === 'win32' ? 'python' : 'python3'
  const scriptPath = path.join(__dirname, '../scripts/forecast.py')

  const py = spawn(pythonCommand, [scriptPath])

  let result = ''
  let errorOutput = ''

  // Send data to python stdin
  try {
    py.stdin.write(JSON.stringify({ details, horizon }))
    py.stdin.end()
  } catch (err) {
    console.error('Error writing to python stdin:', err)
    return res.status(500).json({ error: 'Failed to communicate with predictor' })
  }

  py.stdout.on('data', (data) => {
    result += data.toString()
  })

  py.stderr.on('data', (data) => {
    errorOutput += data.toString()
  })

  py.on('close', (code) => {
    if (code !== 0) {
      console.error('Python script error:', errorOutput)
      return res.status(500).json({ error: 'Prediction failed', details: errorOutput })
    }

    try {
      if (!result) return res.json({})
      const jsonResult = JSON.parse(result)
      res.json(jsonResult)
    } catch (e) {
      console.error('Failed to parse python output:', result)
      res.status(500).json({ error: 'Invalid output from predictor' })
    }
  })
})

// ===== START SERVER =====
server.listen(PORT, () => console.log(`🚀 Server listening on http://localhost:${PORT}`))
