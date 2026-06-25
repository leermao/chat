export interface Character {
  id: number;
  name: string;
  description: string;
  avatarColor: string;
  avatarUrl: string | null;
  greeting: string;
  createdAt: string;
}

export interface CharactersResponse {
  items: Character[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: number;
  characterId: number;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export async function fetchCharacters(page: number, pageSize = 24): Promise<CharactersResponse> {
  const response = await fetch(`/api/characters?page=${page}&pageSize=${pageSize}`);

  if (!response.ok) {
    throw new Error('Failed to load characters');
  }

  return response.json() as Promise<CharactersResponse>;
}

export async function ensureGreeting(characterId: number): Promise<Message[]> {
  const response = await fetch(`/api/conversations/${characterId}/ensure-greeting`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to initialize conversation');
  }

  return response.json() as Promise<Message[]>;
}

export async function fetchMessages(characterId: number): Promise<Message[]> {
  const response = await fetch(`/api/conversations/${characterId}/messages`);

  if (!response.ok) {
    throw new Error('Failed to load messages');
  }

  return response.json() as Promise<Message[]>;
}

export async function sendUserMessage(characterId: number, content: string): Promise<Message> {
  const response = await fetch(`/api/conversations/${characterId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  return response.json() as Promise<Message>;
}

export async function clearConversation(characterId: number): Promise<void> {
  const response = await fetch(`/api/conversations/${characterId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to clear conversation');
  }
}

export interface ConversationHistoryItem {
  character: Character;
  latestMessage: Message;
}

export async function fetchConversationHistory(): Promise<ConversationHistoryItem[]> {
  const response = await fetch('/api/conversations');

  if (!response.ok) {
    throw new Error('Failed to load conversation history');
  }

  return response.json() as Promise<ConversationHistoryItem[]>;
}
