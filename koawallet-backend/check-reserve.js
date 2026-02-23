const prisma = require('./db');

async function check() {
    try {
        const reserve = await prisma.globalReserve.findFirst({ where: { id: 1 } });
        const config = await prisma.systemConfig.findFirst({ where: { id: 1 } });
        console.log('--- DB CHECK ---');
        console.log('Reserve:', JSON.stringify(reserve, null, 2));
        console.log('Config:', JSON.stringify(config, null, 2));
        console.log('--- END CHECK ---');
    } catch (e) {
        console.error('Error checking DB:', e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
