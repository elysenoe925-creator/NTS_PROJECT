const { PrismaClient } = require('@prisma/client');
;(async ()=>{
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany();
    console.log(JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('Error:', e.message || e)
  } finally {
    await prisma.$disconnect();
  }
})();
