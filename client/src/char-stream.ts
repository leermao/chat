/**
 * Pure-logic character buffer for streaming display.
 * Tokens from SSE events are pushed in, and characters are popped one at a time
 * so the UI can render them with a typewriter effect.
 */
export class CharStreamBuffer {
  private buffer: string[] = [];
  private _done = false;

  /** Push a token chunk into the buffer (split into individual characters). */
  push(token: string): void {
    for (let i = 0; i < token.length; i++) {
      this.buffer.push(token[i]);
    }
  }

  /** Pop the next character from the front of the buffer. Returns null if empty. */
  pop(): string | null {
    return this.buffer.shift() ?? null;
  }

  /** Mark the upstream stream as finished (no more tokens will arrive). */
  markDone(): void {
    this._done = true;
  }

  /** Whether the buffer is fully drained and the stream has ended. */
  get isDrained(): boolean {
    return this._done && this.buffer.length === 0;
  }

  /** Number of characters still waiting in the buffer. */
  get pending(): number {
    return this.buffer.length;
  }

  /** Reset for a new stream. */
  reset(): void {
    this.buffer = [];
    this._done = false;
  }
}
