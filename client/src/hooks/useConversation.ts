import { useCallback, useEffect, useState } from 'react';
import type { Message } from '../api';
import { clearConversation, ensureGreeting, fetchMessages } from '../api';

export function useConversation(characterId: number) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState('');
  const [characterNotFound, setCharacterNotFound] = useState(false);

  const reloadMessages = useCallback(async () => {
    const loaded = await fetchMessages(characterId);
    setMessages(loaded);
  }, [characterId]);

  const handleClear = useCallback(async () => {
    setIsClearing(true);
    setError('');

    try {
      await clearConversation(characterId);
      await ensureGreeting(characterId);
      await reloadMessages();
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'Failed to clear conversation');
    } finally {
      setIsClearing(false);
    }
  }, [characterId, reloadMessages]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setIsLoading(true);
      setError('');

      try {
        const loaded = await ensureGreeting(characterId);
        if (!cancelled) {
          setMessages(loaded);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error ? loadError.message : 'Failed to load conversation';
          if (message === 'Character not found') {
            setCharacterNotFound(true);
          } else {
            setError(message);
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [characterId]);

  return {
    messages,
    setMessages,
    isLoading,
    isClearing,
    error,
    setError,
    characterNotFound,
    reloadMessages,
    clearConversation: handleClear,
  };
}
