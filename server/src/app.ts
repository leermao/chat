import cors from 'cors';
import express from 'express';

import { getCharacter, initializeCharacters, listCharacters } from './characters.js';
import {
  clearConversation,
  ensureGreeting,
  initializeConversations,
  listConversationHistory,
  listMessages,
} from './conversations.js';
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
