import { useCallback, useEffect, useRef, useState } from 'react';
import { streamAiReply } from '../api';
import { CharStreamBuffer } from '../char-stream';

export function useAiStream(characterId: number) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState('');
  const bufferRef = useRef(new CharStreamBuffer());
  const charTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSentContentRef = useRef('');

  const stopCharTimer = useCallback(() => {
    if (charTimerRef.current) {
      clearInterval(charTimerRef.current);
      charTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCharTimer();
    };
  }, [stopCharTimer]);

  const runAiStream = useCallback(
    async (userContent: string, onCharAppended: () => void, onComplete: () => Promise<void>) => {
      setError('');
      setStreamingContent('');
      setIsStreaming(true);

      const buffer = bufferRef.current;
      buffer.reset();

      // Character-by-character display timer (~40 chars/sec)
      charTimerRef.current = setInterval(() => {
        if (buffer.pending > 0) {
          const char = buffer.pop();
          if (char !== null) {
            setStreamingContent((prev) => prev + char);
            onCharAppended();
          }
        } else if (buffer.isDrained) {
          stopCharTimer();
          onComplete()
            .then(() => setStreamingContent(''))
            .finally(() => setIsStreaming(false));
        }
      }, 25);

      try {
        for await (const event of streamAiReply(characterId, userContent)) {
          if ('token' in event) {
            buffer.push(event.token);
          } else if ('error' in event) {
            setError(event.error);
            stopCharTimer();
            setIsStreaming(false);
            break;
          } else if ('done' in event) {
            buffer.markDone();
            break;
          }
        }
      } catch (streamError) {
        setError(streamError instanceof Error ? streamError.message : 'Stream failed');
        stopCharTimer();
        setIsStreaming(false);
      }
    },
    [characterId, stopCharTimer],
  );

  return {
    isStreaming,
    streamingContent,
    streamError: error,
    runAiStream,
    lastSentContentRef,
  };
}
