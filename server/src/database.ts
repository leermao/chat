import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { Sequelize } from 'sequelize';

export type AppDatabase = Sequelize;

export interface DatabaseOptions {
  databasePath?: string;
}

export function createSequelize(options: DatabaseOptions = {}) {
  const databasePath = options.databasePath ?? resolve(process.cwd(), 'data', 'app.sqlite');
  mkdirSync(dirname(databasePath), { recursive: true });

  return new Sequelize({
    dialect: 'sqlite',
    storage: databasePath,
    logging: false,
  });
}
