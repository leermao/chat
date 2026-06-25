import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildMessages, messagesToLangChain } from './index.js';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

describe('buildSystemPrompt', () => {
  it('includes character name in the prompt', () => {
    const prompt = buildSystemPrompt({ name: '李白', description: '唐代浪漫主义诗人' });
    expect(prompt).toContain('李白');
    expect(prompt).toContain('唐代浪漫主义诗人');
  });

  it('generates different prompts for different characters', () => {
    const promptA = buildSystemPrompt({ name: '知心_001', description: '温暖、耐心' });
    const promptB = buildSystemPrompt({ name: '智言_002', description: '逻辑清晰' });

    expect(promptA).not.toBe(promptB);
    expect(promptA).toContain('知心_001');
    expect(promptA).toContain('温暖、耐心');
    expect(promptB).toContain('智言_002');
    expect(promptB).toContain('逻辑清晰');
  });

  it('instructs AI to stay in character', () => {
    const prompt = buildSystemPrompt({ name: '测试角色', description: '测试' });
    expect(prompt).toContain('测试角色');
    expect(prompt).toContain('不能跳出角色');
    expect(prompt).toContain('中文');
  });
});

describe('messagesToLangChain', () => {
  it('converts user messages to HumanMessage', () => {
    const result = messagesToLangChain([
      { id: 1, characterId: 1, role: 'user', content: '你好', createdAt: '' },
    ]);
    expect(result[0]).toBeInstanceOf(HumanMessage);
    expect(result[0].content).toBe('你好');
  });

  it('converts assistant messages to AIMessage', () => {
    const result = messagesToLangChain([
      { id: 2, characterId: 1, role: 'assistant', content: '你好！', createdAt: '' },
    ]);
    expect(result[0]).toBeInstanceOf(AIMessage);
    expect(result[0].content).toBe('你好！');
  });
});

describe('buildMessages', () => {
  it('prepends system message to history', () => {
    const history = [
      { id: 1, characterId: 1, role: 'user', content: '你好', createdAt: '' },
      { id: 2, characterId: 1, role: 'assistant', content: '你好！', createdAt: '' },
    ];
    const result = buildMessages('SYSTEM PROMPT', history);

    expect(result).toHaveLength(3);
    expect(result[0]).toBeInstanceOf(SystemMessage);
    expect(result[0].content).toBe('SYSTEM PROMPT');
    expect(result[1]).toBeInstanceOf(HumanMessage);
    expect(result[2]).toBeInstanceOf(AIMessage);
  });
});
