import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import { createApp } from './app.js';

const tempDirs: string[] = [];

function createTempDatabasePath() {
  const dir = mkdtempSync(join(tmpdir(), 'ai-chat-test-'));
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

describe('characters API', () => {
  it('returns seeded characters with pagination metadata', async () => {
    const app = await createApp({ databasePath: createTempDatabasePath() });

    const response = await request(app).get('/api/characters?page=1&pageSize=24').expect(200);

    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(24);
    expect(response.body.total).toBeGreaterThanOrEqual(220);
    expect(response.body.hasMore).toBe(true);
    expect(response.body.items).toHaveLength(24);
    expect(response.body.items[0]).toMatchObject({
      id: 1,
      name: '知心姐姐',
    });
  });

  it('returns one character by id', async () => {
    const app = await createApp({ databasePath: createTempDatabasePath() });

    const response = await request(app).get('/api/characters/31').expect(200);

    expect(response.body).toMatchObject({
      id: 31,
      name: '摄影之眼',
    });
    expect(response.body.description).toContain('镜头');
    expect(response.body.greeting).toContain('咔嚓');
  });
});
