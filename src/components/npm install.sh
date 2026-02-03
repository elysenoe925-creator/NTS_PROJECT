npm install
npx prisma generate
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev