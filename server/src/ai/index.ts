import { HumanMessage, AIMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages';
import type { Message } from '../conversations.js';

export { streamReply } from './graph.js';
export { createChatModel } from './openrouter.js';

export function messagesToLangChain(messages: Message[]): BaseMessage[] {
  return messages.map((msg) => {
    if (msg.role === 'user') {
      return new HumanMessage({ content: msg.content });
    }
    return new AIMessage({ content: msg.content });
  });
}

export function buildSystemPrompt(character: { name: string; description: string }): string {
  return `你是${character.name}。${character.description}

请始终以${character.name}的身份回复。使用自然、友好的中文对话风格。
回复长度适中，不要太长也不要太短。
如果用户的问题不清楚，可以友善地追问。`;
}

export function buildMessages(systemPrompt: string, history: Message[]): BaseMessage[] {
  return [new SystemMessage({ content: systemPrompt }), ...messagesToLangChain(history)];
}
