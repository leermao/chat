import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from './app.js';

vi.mock('./ai/index.js', () => ({
  buildSystemPrompt: vi.fn(() => 'You are a helpful assistant.'),
  buildMessages: vi.fn((_prompt: string, msgs: unknown[]) => msgs),
  streamReply: vi.fn(async function* () {
    yield '你好';
    yield '！';
  }),
}));

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

  it('saves a user message for a character conversation', async () => {
    const app = await createApp({ databasePath: createTempDatabasePath() });

    await request(app).post('/api/conversations/31/ensure-greeting').expect(200);
    const created = await request(app)
      .post('/api/conversations/31/messages')
      .send({ content: '你好，**很高兴**认识你' })
      .expect(201);

    expect(created.body).toMatchObject({
      characterId: 31,
      role: 'user',
      content: '你好，**很高兴**认识你',
    });

    const messages = await request(app).get('/api/conversations/31/messages').expect(200);
    expect(messages.body).toHaveLength(2);
    expect(messages.body[1]).toMatchObject({
      role: 'user',
      content: '你好，**很高兴**认识你',
    });

    const history = await request(app).get('/api/conversations').expect(200);
    expect(history.body[0].latestMessage).toMatchObject({
      role: 'user',
      content: '你好，**很高兴**认识你',
    });
  });

  describe('stream endpoint', () => {
    it('returns SSE content-type and streams tokens', async () => {
      const app = await createApp({ databasePath: createTempDatabasePath() });

      let rawBody = '';
      const res = await request(app)
        .post('/api/conversations/31/stream')
        .send({ content: '你好' })
        .buffer()
        .parse((res, callback) => {
          res.on('data', (chunk: Buffer) => {
            rawBody += chunk.toString();
          });
          res.on('end', () => {
            callback(null, rawBody);
          });
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/event-stream');
      expect(rawBody).toContain('data: ');
      expect(rawBody).toContain('你好');
      expect(rawBody).toContain('！');
      expect(rawBody).toContain('[DONE]');
    });

    it('saves assistant message after streaming', async () => {
      const app = await createApp({ databasePath: createTempDatabasePath() });

      await request(app)
        .post('/api/conversations/31/stream')
        .send({ content: '你好' })
        .buffer()
        .parse((res, callback) => {
          let body = '';
          res.on('data', (chunk: Buffer) => {
            body += chunk.toString();
          });
          res.on('end', () => {
            callback(null, body);
          });
        });

      const messages = await request(app)
        .get('/api/conversations/31/messages')
        .expect(200);

      expect(messages.body.length).toBeGreaterThanOrEqual(2);
      const assistantMsg = messages.body.find((m: { role: string }) => m.role === 'assistant');
      expect(assistantMsg).toBeDefined();
      expect(assistantMsg.content).toBe('你好！');
      const userMsg = messages.body.find((m: { role: string }) => m.role === 'user');
      expect(userMsg).toBeDefined();
      expect(userMsg.content).toBe('你好');
    });

    it('returns 404 for unknown character', async () => {
      const app = await createApp({ databasePath: createTempDatabasePath() });

      await request(app)
        .post('/api/conversations/9999/stream')
        .send({ content: 'Hello' })
        .expect(404);
    });

    it('returns 400 for empty content', async () => {
      const app = await createApp({ databasePath: createTempDatabasePath() });

      await request(app)
        .post('/api/conversations/31/stream')
        .send({ content: '' })
        .expect(400);
    });
  });
});
