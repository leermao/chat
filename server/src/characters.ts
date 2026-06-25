import { DataTypes, Model, type ModelStatic } from 'sequelize';

import type { AppDatabase } from './database.js';

export interface Character {
  id: number;
  name: string;
  description: string;
  avatarColor: string;
  avatarUrl: string | null;
  greeting: string;
  createdAt: string;
}

type CharacterCreationAttributes = Omit<Character, 'avatarUrl'> & {
  avatarUrl?: string | null;
};

class CharacterModel extends Model<Character, CharacterCreationAttributes> implements Character {
  declare id: number;
  declare name: string;
  declare description: string;
  declare avatarColor: string;
  declare avatarUrl: string | null;
  declare greeting: string;
  declare createdAt: string;
}

export interface PaginatedCharacters {
  items: Character[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

const avatarColors = ['#7257ff', '#1da1f2', '#ff8a34', '#20b486', '#8b5cf6'];

const archetypes = [
  '擅长生活陪伴，也喜欢分享轻松的小建议。',
  '偏理性分析，适合讨论学习、工作和计划。',
  '热爱艺术、历史和故事，会用温和的方式回应。',
  '表达直接，喜欢帮助用户把复杂问题拆简单。',
  '好奇心很强，适合进行开放式创意聊天。',
];

export function defineCharacterModel(sequelize: AppDatabase): ModelStatic<CharacterModel> {
  return sequelize.define<CharacterModel>(
    'Character',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      avatarColor: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      avatarUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      greeting: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      tableName: 'characters',
      timestamps: false,
    },
  );
}

function serializeCharacter(model: CharacterModel): Character {
  const value = model.get({ plain: true });
  return {
    id: value.id,
    name: value.name,
    description: value.description,
    avatarColor: value.avatarColor,
    avatarUrl: value.avatarUrl ?? null,
    greeting: value.greeting,
    createdAt: value.createdAt,
  };
}

export async function initializeCharacters(db: AppDatabase) {
  const CharacterEntity = defineCharacterModel(db);
  await db.sync();

  const existing = await CharacterEntity.count();
  if (existing >= 220) {
    return;
  }

  const rows: Character[] = [];
  for (let id = 1; id <= 220; id += 1) {
    const name = `角色_${String(id).padStart(3, '0')}`;
    const archetype = archetypes[(id - 1) % archetypes.length];
    rows.push({
      id,
      name,
      description: `你好，我是${name}，${archetype}（编号 ${id}）`,
      avatarColor: avatarColors[(id - 1) % avatarColors.length],
      avatarUrl: null,
      greeting: `嗨！我是${name}。今天想聊点什么？`,
      createdAt: new Date(0).toISOString(),
    });
  }

  await CharacterEntity.bulkCreate(rows, { ignoreDuplicates: true });
}

export async function listCharacters(db: AppDatabase, page: number, pageSize: number): Promise<PaginatedCharacters> {
  const CharacterEntity = defineCharacterModel(db);
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safePageSize = Math.min(60, Math.max(1, Math.floor(pageSize) || 24));
  const offset = (safePage - 1) * safePageSize;

  const total = await CharacterEntity.count();
  const items = await CharacterEntity.findAll({
    order: [['id', 'ASC']],
    limit: safePageSize,
    offset,
  });

  return {
    items: items.map(serializeCharacter),
    page: safePage,
    pageSize: safePageSize,
    total,
    hasMore: offset + items.length < total,
  };
}

export async function getCharacter(db: AppDatabase, id: number) {
  const CharacterEntity = defineCharacterModel(db);
  const character = await CharacterEntity.findByPk(id);
  return character ? serializeCharacter(character) : undefined;
}
