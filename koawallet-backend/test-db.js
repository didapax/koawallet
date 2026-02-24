const prisma = require('./db');

async function main() {
    console.log('Testing connection with project prisma instance...');
    try {
        const users = await prisma.user.count();
        console.log('Connection successful. User count:', users);

        console.log('Checking TreasuryWithdrawal table...');
        const list = await prisma.treasuryWithdrawal.findMany();
        console.log('TreasuryWithdrawal table exists. Count:', list.length);

        const treasury = await prisma.treasury.findUnique({ where: { id: 1 } });
        console.log('Treasury record:', treasury);
    } catch (err) {
        console.error('❌ DATABASE ERROR:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
