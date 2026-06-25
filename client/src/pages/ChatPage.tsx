import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Character, Message } from '../api';
import {
  clearConversation,
  ensureGreeting,
  fetchMessages,
  streamAiReply,
} from '../api';
import { CharStreamBuffer } from '../char-stream';
import { Avatar } from '../components/Avatar';
import { MessageBubble } from '../components/MessageBubble';

export function ChatPage({
  character,
  onBack,
  onHistory,
}: {
  character: Character;
  onBack: () => void;
  onHistory: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState('');
  const [characterNotFound, setCharacterNotFound] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const bufferRef = useRef(new CharStreamBuffer());
  const charTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSentContentRef = useRef('');

  async function reloadMessages() {
    const loaded = await fetchMessages(character.id);
    setMessages(loaded);
  }

  function scrollToBottom() {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }

  function stopCharTimer() {
    if (charTimerRef.current) {
      clearInterval(charTimerRef.current);
      charTimerRef.current = null;
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setIsLoading(true);
      setError('');

      try {
        const loaded = await ensureGreeting(character.id);
        if (!cancelled) {
          setMessages(loaded);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message = loadError instanceof Error ? loadError.message : 'Failed to load conversation';
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
  }, [character.id]);

  useEffect(() => {
    return () => {
      if (charTimerRef.current) {
        clearInterval(charTimerRef.current);
      }
    };
  }, []);

  /** Shared AI streaming runner — used by both handleSend and handleRetry. */
  async function runAiStream(userContent: string) {
    setError('');
    setStreamingContent('');
    setIsStreaming(true);

    const buffer = bufferRef.current;
    buffer.reset();

    // Start character-by-character display timer (~40 chars/sec)
    charTimerRef.current = setInterval(() => {
      if (buffer.pending > 0) {
        const char = buffer.pop();
        if (char !== null) {
          setStreamingContent((prev) => prev + char);
          scrollToBottom();
        }
      } else if (buffer.isDrained) {
        // Buffer fully drained and stream complete — persist and clean up
        if (charTimerRef.current) {
          clearInterval(charTimerRef.current);
          charTimerRef.current = null;
        }
        reloadMessages()
          .then(() => setStreamingContent(''))
          .finally(() => setIsStreaming(false));
      }
    }, 25);

    try {
      for await (const event of streamAiReply(character.id, userContent)) {
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
  }

  async function handleSend() {
    const content = draft.trim();
    if (!content || isSending || isStreaming) {
      return;
    }

    lastSentContentRef.current = content;
    setIsSending(true);

    // Optimistically add user message to local state
    const optimisticUserMsg: Message = {
      id: Date.now(),
      characterId: character.id,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);
    setDraft('');
    setIsSending(false);

    await runAiStream(content);
  }

  async function handleRetry() {
    const content = lastSentContentRef.current;
    if (!content || isStreaming) return;
    await runAiStream(content);
  }

  async function handleClear() {
    setIsClearing(true);
    setError('');

    try {
      await clearConversation(character.id);
      await ensureGreeting(character.id);
      await reloadMessages();
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'Failed to clear conversation');
    } finally {
      setIsClearing(false);
    }
  }

  if (characterNotFound) {
    return (
      <main className="content chat-content">
        <header className="chat-topbar">
          <button type="button" onClick={onBack}>
            ← 返回
          </button>
        </header>

        <section className="message-empty" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <p style={{ fontSize: 48, margin: 0 }}>😕</p>
          <h2 style={{ margin: 0 }}>角色不存在</h2>
          <p style={{ color: '#999', fontSize: 14, margin: 0 }}>该角色可能已被删除或从未存在</p>
          <button
            className="history-button"
            type="button"
            onClick={onBack}
            style={{ marginTop: 8 }}
          >
            返回广场
          </button>
        </section>
      </main>
    );
  }

  const isInputDisabled = isSending || isStreaming;

  return (
    <main className="content chat-content">
      <header className="chat-topbar">
        <button type="button" onClick={onBack}>
          ← 返回
        </button>
        <div>
          <h1>{character.name}</h1>
          <p>{character.description}</p>
        </div>
        <nav className="chat-topbar-actions">
          <button type="button" onClick={onHistory}>
            历史
          </button>
          <button type="button" disabled={isClearing} onClick={() => void handleClear()}>
            清空
          </button>
        </nav>
      </header>

      <section className="chat-profile">
        <Avatar character={character} />
        <div>
          <h2>{character.name}</h2>
          <p>{character.description}</p>
        </div>
      </section>

      {error ? (
          <div className="status error">
            <span>{error}</span>
            {lastSentContentRef.current ? (
              <button
                className="retry-button"
                type="button"
                onClick={() => void handleRetry()}
              >
                重试
              </button>
            ) : null}
          </div>
        ) : null}

      <section className="message-list" aria-label="聊天消息" ref={messageListRef}>
        {isLoading ? <div className="message-empty">正在载入聊天记录...</div> : null}
        {!isLoading && messages.length === 0 && !isStreaming ? (
          <div className="message-empty">暂无消息</div>
        ) : null}
        {messages.map((message) => (
          <MessageBubble character={character} key={message.id} message={message} />
        ))}
        {isStreaming && streamingContent ? (
          <article className="message-row assistant streaming">
            <Avatar character={character} />
            <div className="message-bubble">
              <ReactMarkdown>{streamingContent}</ReactMarkdown>
              <span className="typing-cursor" />
            </div>
          </article>
        ) : null}
        {isStreaming && !streamingContent ? (
          <article className="message-row assistant streaming">
            <Avatar character={character} />
            <div className="message-bubble">
              <span className="typing-cursor">...</span>
            </div>
          </article>
        ) : null}
      </section>

      <footer className="composer">
        <input
          aria-label="输入消息"
          disabled={isInputDisabled}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !isInputDisabled) {
              void handleSend();
            }
          }}
          placeholder="输入消息，支持 **粗体** 和 *斜体*"
          value={draft}
        />
        <button disabled={!draft.trim() || isInputDisabled} type="button" onClick={() => void handleSend()}>
          发送
        </button>
      </footer>
    </main>
  );
}
