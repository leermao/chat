import type { Character } from './api';

export type ViewState =
  | { name: 'home' }
  | { name: 'chat'; character: Character }
  | { name: 'history' };
