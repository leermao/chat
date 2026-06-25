import { useEffect, useState } from 'react';
import type { Character, ConversationHistoryItem } from '../api';
import { fetchConversationHistory } from '../api';
import { Avatar } from '../components/Avatar';

export function HistoryPage({
  onOpen,
  onHome,
}: {
  onOpen: (character: Character) => void;
  onHome: () => void;
}) {
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

      {isLoading ? (
        <div className="message-empty" style={{ minHeight: 200 }}>
          正在加载聊天历史...
        </div>
      ) : null}

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
