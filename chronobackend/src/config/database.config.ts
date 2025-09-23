// src/config/database.config.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Named export for NestJS modules
 */
export const databaseConfig = {
  type: 'mysql' as const,
  host: process.env.DB_HOST || 'db', // use Docker service name 'db' in containers
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'samih_jeridi',
  password: process.env.DB_PASSWORD || 'samih123@',
  database: process.env.DB_NAME || 'chrono_carto',
  entities: ['dist/modules/**/entities/*.js'],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
  logging: true,       // enable SQL logs
  dropSchema: false,
  migrationsRun: false,
  retryAttempts: 10,
  retryDelay: 3000, // ms
  autoLoadEntities: true,
};

/**
 * Default export for TypeORM CLI
 */
export default new DataSource({
  ...databaseConfig,
  migrations: ['src/migrations/*.ts'], // CLI uses TS source files
});
