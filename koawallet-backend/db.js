// Importamos las herramientas necesarias
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Cargamos las variables de entorno (como la URL de la base de datos)
require('dotenv').config();

// 1. Configuramos el "Pool" de conexiones de PostgreSQL
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// 2. Creamos el adaptador específico para Prisma 7
const adapter = new PrismaPg(pool);

// 3. Inicializamos el cliente de Prisma usando ese adaptador
const prisma = new PrismaClient({ adapter });

// Exportamos 'prisma' para usarlo en otros archivos (como tus rutas)
module.exports = prisma;