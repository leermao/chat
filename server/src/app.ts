import cors from 'cors';
import express from 'express';

import { getCharacter, initializeCharacters, listCharacters } from './characters.js';
import {
  clearConversation,
  createUserMessage,
  defineMessageModel,
  ensureGreeting,
  initializeConversations,
  listConversationHistory,
  listMessages,
} from './conversations.js';
import { buildMessages, buildSystemPrompt, streamReply } from './ai/index.js';
import { createSequelize, type DatabaseOptions } from './database.js';

export interface AppOptions extends DatabaseOptions {}

export async function createApp(options: AppOptions = {}) {
  const db = createSequelize(options);
  await initializeCharacters(db);
  await initializeConversations(db);

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'ai-character-chat-server',
    });
  });

  app.get('/api/characters', async (req, res) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 24);

    res.json(await listCharacters(db, page, pageSize));
  });

  app.get('/api/characters/:id', async (req, res) => {
    const id = Number(req.params.id);
    const character = await getCharacter(db, id);

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    res.json(character);
  });

  app.get('/api/conversations', async (_req, res) => {
    res.json(await listConversationHistory(db));
  });

  app.post('/api/conversations/:characterId/ensure-greeting', async (req, res) => {
    const characterId = Number(req.params.characterId);
    const character = await getCharacter(db, characterId);

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    res.json(await ensureGreeting(db, characterId));
  });

  app.get('/api/conversations/:characterId/messages', async (req, res) => {
    const characterId = Number(req.params.characterId);
    const character = await getCharacter(db, characterId);

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    res.json(await listMessages(db, characterId));
  });

  app.post('/api/conversations/:characterId/messages', async (req, res) => {
    const characterId = Number(req.params.characterId);
    const character = await getCharacter(db, characterId);
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    if (!content) {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    res.status(201).json(await createUserMessage(db, characterId, content));
  });

  app.post('/api/conversations/:characterId/stream', async (req, res) => {
    const characterId = Number(req.params.characterId);
    const character = await getCharacter(db, characterId);
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    if (!content) {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    // Save user message
    await createUserMessage(db, characterId, content);

    // Load context (last 20 messages)
    const allMessages = await listMessages(db, characterId);
    const recentMessages = allMessages.slice(-20);

    // Build system prompt with messages
    const systemPrompt = buildSystemPrompt(character);
    const lcMessages = buildMessages(systemPrompt, recentMessages);

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    let fullResponse = '';

    try {
      for await (const token of streamReply(lcMessages)) {
        fullResponse += token;
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }

      // Save assistant message after streaming completes
      if (fullResponse.trim()) {
        const MessageEntity = defineMessageModel(db);
        await MessageEntity.create({
          characterId,
          role: 'assistant',
          content: fullResponse.trim(),
          createdAt: new Date().toISOString(),
        });
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI request failed';
      // If we haven't sent any tokens yet, also save a fallback assistant message
      if (fullResponse.trim()) {
        const MessageEntity = defineMessageModel(db);
        await MessageEntity.create({
          characterId,
          role: 'assistant',
          content: fullResponse.trim(),
          createdAt: new Date().toISOString(),
        });
      }
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  });

  app.delete('/api/conversations/:characterId', async (req, res) => {
    const characterId = Number(req.params.characterId);
    const character = await getCharacter(db, characterId);

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    await clearConversation(db, characterId);
    res.status(204).send();
  });

  return app;
}
