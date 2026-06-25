import { ChatOpenRouter } from '@langchain/openrouter';

export function createChatModel(): ChatOpenRouter {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set. Check your .env file.');
  }

  const chatOptions: Record<string, unknown> = {
    model: process.env.AI_MODEL || 'deepseek/deepseek-v4-flash',
    apiKey,
    temperature: 0.7,
    maxTokens: 1024,
  };

  if (process.env.AI_BASE_URL) {
    chatOptions.baseURL = process.env.AI_BASE_URL;
  }

  return new ChatOpenRouter(chatOptions as ConstructorParameters<typeof ChatOpenRouter>[0]);
}
