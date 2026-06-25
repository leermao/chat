import { useCallback, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Character, Message } from '../api';
import { Avatar } from '../components/Avatar';
import { MessageBubble } from '../components/MessageBubble';
import { useAiStream } from '../hooks/useAiStream';
import { useConversation } from '../hooks/useConversation';

export function ChatPage({
  character,
  onBack,
  onHistory,
}: {
  character: Character;
  onBack: () => void;
  onHistory: () => void;
}) {
  const {
    messages,
    setMessages,
    isLoading,
    isClearing,
    error: conversationError,
    characterNotFound,
    reloadMessages,
    clearConversation,
  } = useConversation(character.id);

  const { isStreaming, streamingContent, streamError, runAiStream, lastSentContentRef } =
    useAiStream(character.id);

  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, []);

  const handleSend = useCallback(async () => {
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

    await runAiStream(content, scrollToBottom, reloadMessages);
  }, [
    draft,
    isSending,
    isStreaming,
    character.id,
    setMessages,
    runAiStream,
    scrollToBottom,
    reloadMessages,
    lastSentContentRef,
  ]);

  const handleRetry = useCallback(async () => {
    const content = lastSentContentRef.current;
    if (!content || isStreaming) return;
    await runAiStream(content, scrollToBottom, reloadMessages);
  }, [isStreaming, runAiStream, scrollToBottom, reloadMessages, lastSentContentRef]);

  const displayError = conversationError || streamError;

  if (characterNotFound) {
    return (
      <main className="content chat-content">
        <header className="chat-topbar">
          <button type="button" onClick={onBack}>
            ← 返回
          </button>
        </header>

        <section
          className="message-empty"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          }}
        >
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
          <button type="button" disabled={isClearing} onClick={() => void clearConversation()}>
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

      {displayError ? (
        <div className="status error">
          <span>{displayError}</span>
          {lastSentContentRef.current ? (
            <button className="retry-button" type="button" onClick={() => void handleRetry()}>
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
        <button
          disabled={!draft.trim() || isInputDisabled}
          type="button"
          onClick={() => void handleSend()}
        >
          发送
        </button>
      </footer>
    </main>
  );
}
