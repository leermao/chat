import type { Character } from '../api';

export function Avatar({ character }: { character: Character }) {
  return (
    <div className="character-avatar" style={{ background: character.avatarColor }}>
      <span />
    </div>
  );
}
