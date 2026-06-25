import type { Character } from '../api';
import { Avatar } from './Avatar';

export function CharacterCard({
  character,
  onOpen,
}: {
  character: Character;
  onOpen: (character: Character) => void;
}) {
  return (
    <article className="character-card">
      <div className="card-code">#{String(character.id).padStart(3, '0')}</div>
      <Avatar character={character} />
      <h2>{character.name}</h2>
      <p>{character.description}</p>
      <button type="button" onClick={() => onOpen(character)}>
        开始聊天 →
      </button>
    </article>
  );
}
