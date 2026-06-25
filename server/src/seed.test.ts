import { describe, it, expect } from 'vitest';
import { getAllCharacters } from './seed.js';

describe('seed characters', () => {
  const characters = getAllCharacters();

  it('generates at least 220 characters', () => {
    expect(characters.length).toBeGreaterThanOrEqual(220);
  });

  it('each character has all required fields', () => {
    for (const c of characters) {
      expect(c.id).toBeGreaterThan(0);
      expect(c.name).toBeTruthy();
      expect(c.description).toBeTruthy();
      expect(c.avatarColor).toBeTruthy();
      expect(c.greeting).toBeTruthy();
      expect(c.createdAt).toBeTruthy();
    }
  });

  it('all character names are unique', () => {
    const names = characters.map((c) => c.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('all character ids are unique and sequential from 1', () => {
    const ids = characters.map((c) => c.id);
    expect(ids[0]).toBe(1);
    expect(ids[ids.length - 1]).toBe(characters.length);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('has diverse avatar colors', () => {
    const colors = new Set(characters.map((c) => c.avatarColor));
    expect(colors.size).toBeGreaterThanOrEqual(5);
  });

  it('descriptions are not all identical', () => {
    const descriptions = characters.map((c) => c.description);
    const unique = new Set(descriptions);
    expect(unique.size).toBeGreaterThanOrEqual(20); // at least 20 unique descriptions
  });

  it('greetings are not all identical', () => {
    const greetings = characters.map((c) => c.greeting);
    const unique = new Set(greetings);
    expect(unique.size).toBeGreaterThanOrEqual(20);
  });
});
