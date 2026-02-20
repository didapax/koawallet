const prisma = require('./db');

async function main() {
    const config = await prisma.systemConfig.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            buyPrice: 3.50,
            sellPrice: 4.00,
            maintenanceFee: 1.00,
            networkFee: 0.10,
        },
    });
    console.log('System configuration initialized:', config);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
