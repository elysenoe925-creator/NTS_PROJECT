Prototype backend (Express + Prisma + SQLite)

Quick start (local):

1. From `server/` install dependencies:

```bash
cd server
npm install
```

2. Generate Prisma client, run migration and seed:

```bash
npx prisma generate
npx prisma migrate dev --name init
node prisma/seed.js
```

3. Run dev server:

```bash
npm run dev
```

Endpoints:
- POST /api/auth/login { username, password }
- GET /api/products?store=majunga
- POST /api/products (protected)
- GET /api/stock?store=majunga
- POST /api/sales (protected)

Notes:
- This is a minimal local prototype (SQLite). For production migrate to Postgres and set DATABASE_URL accordingly.
- Protect secrets (JWT_SECRET) in env vars for production.
