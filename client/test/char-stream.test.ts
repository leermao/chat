import { describe, expect, it } from 'vitest';
import { CharStreamBuffer } from '../src/char-stream.js';

describe('CharStreamBuffer', () => {
  it('starts with empty buffer and not done', () => {
    const buf = new CharStreamBuffer();
    expect(buf.pending).toBe(0);
    expect(buf.isDrained).toBe(false);
    expect(buf.pop()).toBeNull();
  });

  it('pushes tokens as individual characters', () => {
    const buf = new CharStreamBuffer();
    buf.push('你好');
    expect(buf.pending).toBe(2);
    buf.push('！');
    expect(buf.pending).toBe(3);
    expect(buf.isDrained).toBe(false);
  });

  it('pops characters in FIFO order', () => {
    const buf = new CharStreamBuffer();
    buf.push('ABC');
    expect(buf.pop()).toBe('A');
    expect(buf.pop()).toBe('B');
    expect(buf.pop()).toBe('C');
    expect(buf.pop()).toBeNull();
    expect(buf.pending).toBe(0);
  });

  it('interleaves push and pop correctly', () => {
    const buf = new CharStreamBuffer();
    buf.push('ab');
    expect(buf.pop()).toBe('a');
    buf.push('cd');
    expect(buf.pop()).toBe('b');
    expect(buf.pop()).toBe('c');
    expect(buf.pop()).toBe('d');
    expect(buf.pop()).toBeNull();
  });

  it('isDrained is true only when done and buffer empty', () => {
    const buf = new CharStreamBuffer();

    // Buffer has chars but not done
    buf.push('hello');
    expect(buf.isDrained).toBe(false);

    // Done but buffer still has chars
    buf.markDone();
    expect(buf.isDrained).toBe(false);

    // Drain buffer
    while (buf.pop() !== null) { /* empty */ }
    expect(buf.isDrained).toBe(true);
  });

  it('reset clears buffer and done flag', () => {
    const buf = new CharStreamBuffer();
    buf.push('test');
    buf.markDone();
    expect(buf.pending).toBe(4);
    expect(buf.isDrained).toBe(false);

    buf.reset();
    expect(buf.pending).toBe(0);
    expect(buf.isDrained).toBe(false);
    expect(buf.pop()).toBeNull();
  });

  it('handles empty string push', () => {
    const buf = new CharStreamBuffer();
    buf.push('');
    expect(buf.pending).toBe(0);
  });

  it('handles emoji and multi-byte characters', () => {
    const buf = new CharStreamBuffer();
    // Emojis are multi-code-unit characters; '😊'.length === 2 in JS
    // We iterate by index so this is fine for display purposes
    buf.push('😊🌟');
    expect(buf.pending).toBe(4); // 2 code units each
    const chars: string[] = [];
    let c: string | null;
    while ((c = buf.pop()) !== null) {
      chars.push(c);
    }
    // JS string indexing on surrogate pairs splits them; that's acceptable
    // because the browser will recombine them in the DOM
    expect(chars.length).toBe(4);
  });
});
