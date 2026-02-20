const prisma = require('./db');
const bcrypt = require('bcrypt');

async function main() {
    console.log('🌱 Iniciando seed de KoaWallet...');

    // Métodos de pago
    await prisma.paymentMethod.upsert({
        where: { code: 'BANK' },
        update: {},
        create: {
            code: 'BANK',
            label: 'Transferencia Bancaria',
            description: 'Realiza una transferencia desde tu banco al banco de KoaWallet'
        }
    });

    await prisma.paymentMethod.upsert({
        where: { code: 'OFFICE' },
        update: {},
        create: {
            code: 'OFFICE',
            label: 'Visita a Oficina',
            description: 'Entrega o retira tus fondos personalmente en nuestra oficina'
        }
    });

    console.log('✅ Métodos de pago creados');

    // Bancos en Venezuela
    const banks = [
        {
            country: 'Venezuela',
            bankName: 'Banesco',
            accountHolder: 'KoaWallet C.A.',
            accountNumber: '0134-0123-45-1234567890',
            accountType: 'Corriente',
            notes: 'Solo transferencias nacionales. Incluir número de cédula en el concepto.'
        },
        {
            country: 'Venezuela',
            bankName: 'Banco de Venezuela',
            accountHolder: 'KoaWallet C.A.',
            accountNumber: '0102-0456-78-9012345678',
            accountType: 'Corriente',
            notes: 'Transferencias desde Banco de Venezuela. Indicar cédula y monto en el concepto.'
        },
        {
            country: 'Venezuela',
            bankName: 'Mercantil',
            accountHolder: 'KoaWallet C.A.',
            accountNumber: '0105-0789-01-2345678901',
            accountType: 'Corriente',
            notes: 'Transferencias Mercantil. Enviar comprobante por WhatsApp.'
        },
        {
            country: 'Venezuela',
            bankName: 'Provincial (BBVA)',
            accountHolder: 'KoaWallet C.A.',
            accountNumber: '0108-0111-22-3456789012',
            accountType: 'Corriente',
            notes: 'Transferencias BBVA Provincial. Indicar nombre y cédula.'
        },
        {
            country: 'Venezuela',
            bankName: 'BOD (Banco Occidental)',
            accountHolder: 'KoaWallet C.A.',
            accountNumber: '0116-0222-33-4567890123',
            accountType: 'Corriente',
            notes: 'Banco Occidental de Descuento. Incluir concepto: KOA + cédula.'
        },
        // Colombia
        {
            country: 'Colombia',
            bankName: 'Bancolombia',
            accountHolder: 'KoaWallet SAS',
            accountNumber: '12345678901',
            accountType: 'Corriente',
            notes: 'Transferencia local Colombia. Indicar nombre y documento.'
        },
        {
            country: 'Colombia',
            bankName: 'Davivienda',
            accountHolder: 'KoaWallet SAS',
            accountNumber: '98765432109',
            accountType: 'Ahorros',
            notes: 'Ahorros Davivienda. Enviar comprobante por email.'
        },
        // USDT
        {
            country: 'Internacional',
            bankName: 'USDT (Tron TRC-20)',
            accountHolder: 'KoaWallet',
            accountNumber: 'TKoa1234Wallet5678USDT90ABC',
            accountType: 'Crypto',
            notes: 'RED TRC-20 únicamente. No enviar por otras redes. Monto mínimo: $10 USDT.'
        },
    ];

    for (const bank of banks) {
        await prisma.bankOption.create({ data: bank });
    }

    console.log(`✅ ${banks.length} bancos creados`);

    // Usuario Admin por defecto
    const hashedPassword = await bcrypt.hash('admin', 10);
    await prisma.user.upsert({
        where: { email: 'admin' },
        update: {
            password: hashedPassword
        },
        create: {
            email: 'admin',
            password: hashedPassword,
            name: 'Administrador',
            role: 'admin',
            status: 'active'
        }
    });

    console.log('✅ Usuario admin creado (admin/admin)');
    console.log('🎉 Seed completado exitosamente!');
}

main()
    .catch((e) => { console.error('❌ Error en seed:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
