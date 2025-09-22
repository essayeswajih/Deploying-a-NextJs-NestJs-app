// src/config/database.config.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

export const databaseConfig = {
  type: 'mysql' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'chrono_carto',
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/src/migrations/*.js'],
  synchronize: false,
  logging: true, // Activer les logs SQL pour débugger
  dropSchema: false,
  migrationsRun: false,
};

// DataSource for TypeORM CLI
export default new DataSource({
  ...databaseConfig,
  type: 'mysql',
  synchronize: false,
  migrationsRun: false,
  migrations: ['src/migrations/*.ts'],
});