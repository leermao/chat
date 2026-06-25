import { describe, it, expect, afterEach } from 'vitest';

const originalEnv = { ...process.env };

describe('createChatModel', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('throws when OPENROUTER_API_KEY is not set', async () => {
    delete (process.env as Record<string, string>).OPENROUTER_API_KEY;
    const { createChatModel } = await import('../../src/ai/openrouter.js');
    expect(() => createChatModel()).toThrow('OPENROUTER_API_KEY');
  });

  it('returns a ChatOpenRouter instance when key is set', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    const { createChatModel } = await import('../../src/ai/openrouter.js');
    const model = createChatModel();
    expect(model).toBeDefined();
    expect(model.constructor.name).toBe('ChatOpenRouter');
  });
});
