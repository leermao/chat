import { DataTypes, Model, type ModelStatic } from 'sequelize';

import type { AppDatabase } from './database.js';
import { getAllCharacters } from './seed.js';

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

  const characters = getAllCharacters();
  await CharacterEntity.bulkCreate(characters, { ignoreDuplicates: true });
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
