const prisma = require('./db');

async function check() {
    try {
        const user = await prisma.user.findUnique({ where: { email: 'admin' } });
        console.log('User status:', user ? 'exists' : 'not found');
        if (user) {
            console.log('Email:', user.email);
            console.log('Role:', user.role);
            console.log('Password length:', user.password.length);
            console.log('Is hashed:', user.password.startsWith('$2b$'));
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
