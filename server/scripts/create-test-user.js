const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createTestUser() {
    try {
        const passwordHash = await bcrypt.hash('test123', 10);
        const user = await prisma.user.upsert({
            where: { username: 'test_admin' },
            update: { passwordHash },
            create: {
                username: 'test_admin',
                displayName: 'Test Admin',
                passwordHash: passwordHash,
                role: 'admin',
                store: 'all'
            }
        });
        console.log('Test user created/updated successfully:', user.username);
    } catch (err) {
        console.error('Error creating test user:', err);
    } finally {
        await prisma.$disconnect();
    }
}

createTestUser();
