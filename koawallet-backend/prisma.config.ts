import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';

// Forzamos la carga del archivo .env
dotenv.config();

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    // Usamos una alternativa segura si process.env falla
    url: process.env.DATABASE_URL,
  },
});
