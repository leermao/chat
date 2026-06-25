import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Grid } from 'react-window';

import {
  type Character,
  type ConversationHistoryItem,
  type Message,
  clearConversation,
  ensureGreeting,
  fetchCharacters,
  fetchConversationHistory,
  fetchMessages,
  streamAiReply,
} from './api';

const PAGE_SIZE = 24;
type ViewState = { name: 'home' } | { name: 'chat'; character: Character } | { name: 'history' };

function Avatar({ character }: { character: Character }) {
  return (
    <div className="character-avatar" style={{ background: character.avatarColor }}>
      <span />
    </div>
  );
}

function MessageBubble({ message, character }: { message: Message; character: Character }) {
  return (
    <article className={`message-row ${message.role}`} key={message.id}>
      {message.role === 'assistant' ? <Avatar character={character} /> : null}
      <div className="message-bubble">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    </article>
  );
}

function Sidebar({
  view,
  onHome,
  onHistory,
}: {
  view: ViewState['name'];
  onHome: () => void;
  onHistory: () => void;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">AI</div>
        <div>
          <strong>角色宇宙</strong>
          <span>与 220+ AI 角色对话</span>
        </div>
      </div>

      <nav className="side-nav" aria-label="主导航">
        <button
          className={`side-nav-item ${view === 'home' ? 'active' : ''}`}
          type="button"
          onClick={onHome}
        >
          <span>●</span>
          角色广场
        </button>
        <button
          className={`side-nav-item ${view === 'history' ? 'active' : ''}`}
          type="button"
          onClick={onHistory}
        >
          <span>○</span>
          聊天历史
        </button>
      </nav>

      <div className="sidebar-footer">
        <strong>体验提示</strong>
        <p>点击角色进入聊天，AI 会主动发送开场白并保存记录。</p>
        <button type="button" onClick={onHistory}>
          查看聊天历史
        </button>
      </div>
    </aside>
  );
}

function CharacterCard({ character, onOpen }: { character: Character; onOpen: (character: Character) => void }) {
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

interface CharacterCellData {
  characters: Character[];
  columnCount: number;
  onOpen: (character: Character) => void;
}

function CharacterCell({
  columnIndex,
  rowIndex,
  style,
  characters,
  columnCount,
  onOpen,
}: {
  ariaAttributes?: Record<string, unknown>;
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
} & CharacterCellData) {
  const index = rowIndex * columnCount + columnIndex;
  if (index >= characters.length) return null;
  const character = characters[index];
  return (
    <div style={{ ...style, padding: 8, overflow: 'hidden' }}>
      <CharacterCard character={character} key={character.id} onOpen={onOpen} />
    </div>
  );
}

function CharacterGrid({
  characters,
  onOpen,
}: {
  characters: Character[];
  onOpen: (character: Character) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const minCardWidth = 260;
  const columnCount = Math.max(1, Math.min(3, Math.floor(size.width / minCardWidth)));
  const columnWidth = size.width / columnCount;
  const rowHeight = 260; // card min-height 206 + padding + gap buffer
  const rowCount = Math.ceil(characters.length / columnCount);

  if (characters.length === 0 || size.width === 0 || size.height === 0) {
    return (
      <div
        ref={containerRef}
        style={{ flex: 1, minHeight: 0 }}
        aria-label="角色列表"
      />
    );
  }

  return (
    <div ref={containerRef} style={{ flex: 1, minHeight: 0 }}>
      <Grid<CharacterCellData>
        aria-label="角色列表"
        cellComponent={CharacterCell}
        cellProps={{ characters, columnCount, onOpen }}
        columnCount={columnCount}
        columnWidth={columnWidth}
        defaultHeight={size.height}
        defaultWidth={size.width}
        overscanCount={2}
        rowCount={rowCount}
        rowHeight={rowHeight}
        style={{
          width: size.width,
          height: size.height,
          overflowX: 'hidden',
        }}
      />
    </div>
  );
}

function ChatPage({
  character,
  onBack,
}: {
  character: Character;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState('');
  const messageListRef = useRef<HTMLDivElement>(null);

  async function reloadMessages() {
    const loaded = await fetchMessages(character.id);
    setMessages(loaded);
  }

  function scrollToBottom() {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
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
          setError(loadError instanceof Error ? loadError.message : 'Failed to load conversation');
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

  async function handleSend() {
    const content = draft.trim();
    if (!content || isSending || isStreaming) {
      return;
    }

    setIsSending(true);
    setError('');
    setStreamingContent('');

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
    setIsStreaming(true);

    let accumulated = '';

    try {
      for await (const event of streamAiReply(character.id, content)) {
        if ('token' in event) {
          accumulated += event.token;
          setStreamingContent(accumulated);
          scrollToBottom();
        } else if ('error' in event) {
          setError(event.error);
          break;
        } else if ('done' in event) {
          break;
        }
      }

      // Reload messages to get persisted messages with correct IDs
      await reloadMessages();
      setStreamingContent('');
    } catch (streamError) {
      setError(streamError instanceof Error ? streamError.message : 'Stream failed');
    } finally {
      setIsStreaming(false);
    }
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
        <button type="button" disabled={isClearing} onClick={() => void handleClear()}>
          清空
        </button>
      </header>

      <section className="chat-profile">
        <Avatar character={character} />
        <div>
          <h2>{character.name}</h2>
          <p>{character.description}</p>
        </div>
      </section>

      {error ? <div className="status error">{error}</div> : null}

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

function HistoryPage({ onOpen, onHome }: { onOpen: (character: Character) => void; onHome: () => void }) {
  const [history, setHistory] = useState<ConversationHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      setIsLoading(true);
      setError('');

      try {
        const data = await fetchConversationHistory();
        if (isMounted) {
          setHistory(data);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load history');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  function formatTime(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-CN');
  }

  function summarizeContent(content: string, maxLength = 80): string {
    return content.length > maxLength ? `${content.slice(0, maxLength)}...` : content;
  }

  return (
    <main className="content">
      <header className="topbar">
        <div>
          <h1>聊天历史</h1>
          <p>你聊过的角色都会出现在这里</p>
        </div>
        <button className="history-button" type="button" onClick={onHome}>
          发现新角色
        </button>
      </header>

      {error ? <div className="status error">{error}</div> : null}

      {isLoading ? <div className="message-empty" style={{ minHeight: 200 }}>正在加载聊天历史...</div> : null}

      {!isLoading && history.length === 0 ? (
        <div className="message-empty" style={{ minHeight: 200 }}>
          <div>
            <p>还没有聊过任何角色</p>
            <button
              style={{
                marginTop: 12,
                border: '1px solid #ded7ff',
                borderRadius: 999,
                background: '#fff',
                color: '#5d45d6',
                padding: '10px 18px',
                cursor: 'pointer',
              }}
              type="button"
              onClick={onHome}
            >
              去广场发现角色 →
            </button>
          </div>
        </div>
      ) : null}

      {!isLoading && history.length > 0 ? (
        <section className="history-grid" aria-label="聊天历史列表">
          {history.map((item) => (
            <article
              className="history-card"
              key={item.character.id}
              onClick={() => onOpen(item.character)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onOpen(item.character);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`与 ${item.character.name} 继续聊天`}
            >
              <Avatar character={item.character} />
              <div className="history-card-body">
                <h3>{item.character.name}</h3>
                <p className="history-preview">{summarizeContent(item.latestMessage.content)}</p>
                <span className="history-time">{formatTime(item.latestMessage.createdAt)}</span>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}

export default function App() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<ViewState>({ name: 'home' });

  const loadedLabel = useMemo(() => {
    if (total === 0) {
      return '加载角色中';
    }

    return `已加载 ${characters.length} / ${total} 个角色`;
  }, [characters.length, total]);

  async function loadPage(nextPage: number) {
    setIsLoading(true);
    setError('');

    try {
      const result = await fetchCharacters(nextPage, PAGE_SIZE);
      setCharacters((current) => [...current, ...result.items]);
      setPage(result.page);
      setTotal(result.total);
      setHasMore(result.hasMore);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load characters');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPage(1);
  }, []);

  const handleSetView = useCallback((nextView: ViewState) => {
    setError('');
    setView(nextView);
  }, []);

  return (
    <div className="app-shell">
      <Sidebar
        view={view.name}
        onHome={() => handleSetView({ name: 'home' })}
        onHistory={() => handleSetView({ name: 'history' })}
      />

      {view.name === 'chat' ? (
        <ChatPage character={view.character} onBack={() => handleSetView({ name: 'home' })} />
      ) : view.name === 'history' ? (
        <HistoryPage
          onHome={() => handleSetView({ name: 'home' })}
          onOpen={(character) => handleSetView({ name: 'chat', character })}
        />
      ) : (
        <main className="content home-content">
        <header className="topbar">
          <div>
            <h1>角色广场</h1>
            <p>{loadedLabel}</p>
          </div>
          <button className="history-button" type="button" onClick={() => handleSetView({ name: 'history' })}>
            聊天历史
          </button>
        </header>

        <section className="hero-panel">
          <div>
            <span>AI CHARACTER UNIVERSE</span>
            <h2>发现你的专属对话伙伴</h2>
            <p>每位角色都有不同的表达方式、知识偏好和陪伴节奏，选择一个角色开始真实 AI 对话。</p>
          </div>
          <button type="button" onClick={() => handleSetView({ name: 'history' })}>
            查看聊天历史
          </button>
        </section>

        {error ? <div className="status error">{error}</div> : null}

        <CharacterGrid
          characters={characters}
          onOpen={(nextCharacter) => handleSetView({ name: 'chat', character: nextCharacter })}
        />

        <div className="load-more">
          {isLoading ? <span>正在加载角色...</span> : null}
          {!isLoading && hasMore ? (
            <button type="button" onClick={() => void loadPage(page + 1)}>
              加载更多角色
            </button>
          ) : null}
          {!isLoading && !hasMore && characters.length > 0 ? <span>全部角色已加载</span> : null}
        </div>
        </main>
      )}

      <nav className="bottom-nav" aria-label="移动端导航">
        <button
          className={view.name === 'home' ? 'active' : ''}
          type="button"
          onClick={() => handleSetView({ name: 'home' })}
        >
          角色广场
        </button>
        <button
          className={view.name === 'history' ? 'active' : ''}
          type="button"
          onClick={() => handleSetView({ name: 'history' })}
        >
          聊天历史
        </button>
      </nav>
    </div>
  );
}
