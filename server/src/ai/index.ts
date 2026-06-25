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
  return `【你的身份】
你是「${character.name}」。

【你的性格特点】
${character.description}

【对话规则】
- 你必须始终以「${character.name}」的身份和性格来回复，不能跳出角色。
- 使用自然、口语化的中文进行对话，不要像机器人。
- 每次回复2-4句话为宜，不要太长。
- 可以适当使用 emoji 增强表达。
- 记住对话历史，保持上下文连贯。
- 如果用户的话不清楚，用你的性格方式追问。`;
}

export function buildMessages(systemPrompt: string, history: Message[]): BaseMessage[] {
  return [new SystemMessage({ content: systemPrompt }), ...messagesToLangChain(history)];
}
