import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIMessage, type BaseMessage } from '@langchain/core/messages';

const mockInvoke = vi.fn();

vi.mock('./openrouter.js', () => ({
  createChatModel: vi.fn(() => ({
    invoke: mockInvoke,
  })),
}));

describe('streamReply', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('yields tokens from the streaming graph', async () => {
    mockInvoke.mockResolvedValueOnce(new AIMessage({ content: '你好！很高兴认识你。' }));

    const { streamReply } = await import('./graph.js');

    const tokens: string[] = [];
    for await (const token of streamReply([])) {
      tokens.push(token);
    }

    expect(tokens.length).toBeGreaterThan(0);
    const fullText = tokens.join('');
    expect(fullText).toBe('你好！很高兴认识你。');
  });

  it('passes messages to the LLM', async () => {
    mockInvoke.mockResolvedValueOnce(new AIMessage({ content: 'OK' }));

    const { streamReply } = await import('./graph.js');

    const messages: BaseMessage[] = [
      new AIMessage({ content: 'Hello' }),
    ];

    const tokens: string[] = [];
    for await (const token of streamReply(messages)) {
      tokens.push(token);
    }

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledWith(messages);
  });

  it('skips chunks with no content', async () => {
    mockInvoke.mockResolvedValueOnce(new AIMessage({ content: '' }));

    const { streamReply } = await import('./graph.js');

    const tokens: string[] = [];
    for await (const token of streamReply([])) {
      tokens.push(token);
    }

    expect(tokens).toEqual([]);
  });
});
