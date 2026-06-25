import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createSequelize } from '../src/database.js';

const tempDirs: string[] = [];

function createTempDatabasePath() {
  const dir = mkdtempSync(join(tmpdir(), 'ai-chat-sequelize-test-'));
  tempDirs.push(dir);
  return join(dir, 'test.sqlite');
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('database', () => {
  it('creates an authenticated Sequelize SQLite connection', async () => {
    const sequelize = createSequelize({ databasePath: createTempDatabasePath() });

    await expect(sequelize.authenticate()).resolves.toBeUndefined();
    expect(sequelize.getDialect()).toBe('sqlite');

    await sequelize.close();
  });
});
