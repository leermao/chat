import { DataTypes, Model, type ModelStatic } from 'sequelize';

import { getCharacter, type Character } from './characters.js';
import type { AppDatabase } from './database.js';

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: number;
  characterId: number;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface ConversationHistoryItem {
  character: Character;
  latestMessage: Message;
}

type MessageCreationAttributes = Omit<Message, 'id'> & {
  id?: number;
};

class MessageModel extends Model<Message, MessageCreationAttributes> implements Message {
  declare id: number;
  declare characterId: number;
  declare role: MessageRole;
  declare content: string;
  declare createdAt: string;
}

export function defineMessageModel(sequelize: AppDatabase): ModelStatic<MessageModel> {
  return sequelize.define<MessageModel>(
    'Message',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      characterId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      role: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          isIn: [['user', 'assistant']],
        },
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      tableName: 'messages',
      timestamps: false,
    },
  );
}

function serializeMessage(model: MessageModel): Message {
  const value = model.get({ plain: true });
  return {
    id: value.id,
    characterId: value.characterId,
    role: value.role,
    content: value.content,
    createdAt: value.createdAt,
  };
}

export async function initializeConversations(db: AppDatabase) {
  defineMessageModel(db);
  await db.sync();
}

export async function listMessages(db: AppDatabase, characterId: number): Promise<Message[]> {
  const MessageEntity = defineMessageModel(db);
  const messages = await MessageEntity.findAll({
    where: { characterId },
    order: [['id', 'ASC']],
  });

  return messages.map(serializeMessage);
}

export async function ensureGreeting(db: AppDatabase, characterId: number): Promise<Message[]> {
  const character = await getCharacter(db, characterId);
  if (!character) {
    return [];
  }

  const MessageEntity = defineMessageModel(db);

  // Use findOrCreate to handle concurrent requests gracefully.
  // SQLite doesn't support concurrent writes, so if two requests race
  // the second one may fail — catch the error and fall through to listMessages
  // (the other request already created the greeting).
  try {
    await MessageEntity.findOrCreate({
      where: { characterId },
      defaults: {
        characterId,
        role: 'assistant' as const,
        content: character.greeting,
        createdAt: new Date().toISOString(),
      },
    });
  } catch {
    // Another concurrent request likely created the greeting already.
    // Fall through to listMessages below.
  }

  return listMessages(db, characterId);
}

export async function createUserMessage(db: AppDatabase, characterId: number, content: string): Promise<Message> {
  const MessageEntity = defineMessageModel(db);
  const message = await MessageEntity.create({
    characterId,
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
  });

  return serializeMessage(message);
}

export async function clearConversation(db: AppDatabase, characterId: number) {
  const MessageEntity = defineMessageModel(db);
  await MessageEntity.destroy({ where: { characterId } });
}

export async function listConversationHistory(db: AppDatabase): Promise<ConversationHistoryItem[]> {
  const MessageEntity = defineMessageModel(db);
  const messages = await MessageEntity.findAll({
    order: [
      ['id', 'DESC'],
    ],
  });

  const seenCharacterIds = new Set<number>();
  const history: ConversationHistoryItem[] = [];

  for (const messageModel of messages) {
    const message = serializeMessage(messageModel);
    if (seenCharacterIds.has(message.characterId)) {
      continue;
    }

    const character = await getCharacter(db, message.characterId);
    if (!character) {
      continue;
    }

    seenCharacterIds.add(message.characterId);
    history.push({
      character,
      latestMessage: message,
    });
  }

  return history;
}
