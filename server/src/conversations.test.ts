import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import { createApp } from './app.js';

const tempDirs: string[] = [];

function createTempDatabasePath() {
  const dir = mkdtempSync(join(tmpdir(), 'ai-chat-conversation-test-'));
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

describe('conversation messages API', () => {
  it('creates one persistent greeting for a new character conversation', async () => {
    const app = await createApp({ databasePath: createTempDatabasePath() });

    const first = await request(app).post('/api/conversations/31/ensure-greeting').expect(200);
    const second = await request(app).post('/api/conversations/31/ensure-greeting').expect(200);
    const messages = await request(app).get('/api/conversations/31/messages').expect(200);

    expect(first.body).toHaveLength(1);
    expect(first.body[0]).toMatchObject({
      characterId: 31,
      role: 'assistant',
      content: '嗨！我是角色_031。今天想聊点什么？',
    });
    expect(second.body).toHaveLength(1);
    expect(messages.body).toHaveLength(1);
  });

  it('clears one character conversation and recreates greeting on next entry', async () => {
    const app = await createApp({ databasePath: createTempDatabasePath() });

    await request(app).post('/api/conversations/31/ensure-greeting').expect(200);
    await request(app).delete('/api/conversations/31').expect(204);

    const afterClear = await request(app).get('/api/conversations/31/messages').expect(200);
    const recreated = await request(app).post('/api/conversations/31/ensure-greeting').expect(200);

    expect(afterClear.body).toEqual([]);
    expect(recreated.body).toHaveLength(1);
    expect(recreated.body[0].content).toBe('嗨！我是角色_031。今天想聊点什么？');
  });

  it('lists chatted characters with their latest message', async () => {
    const app = await createApp({ databasePath: createTempDatabasePath() });

    await request(app).post('/api/conversations/31/ensure-greeting').expect(200);
    await request(app).post('/api/conversations/42/ensure-greeting').expect(200);

    const history = await request(app).get('/api/conversations').expect(200);

    expect(history.body).toHaveLength(2);
    expect(history.body[0]).toMatchObject({
      character: {
        id: 42,
        name: '角色_042',
      },
      latestMessage: {
        characterId: 42,
        role: 'assistant',
        content: '嗨！我是角色_042。今天想聊点什么？',
      },
    });
    expect(history.body[1].character.id).toBe(31);

    await request(app).delete('/api/conversations/42').expect(204);

    const afterClear = await request(app).get('/api/conversations').expect(200);

    expect(afterClear.body).toHaveLength(1);
    expect(afterClear.body[0].character.id).toBe(31);
  });
});
