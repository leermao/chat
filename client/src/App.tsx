import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type Character,
  fetchCharacters,
} from './api';
import { CharacterGrid } from './components/CharacterGrid';
import { Sidebar } from './components/Sidebar';
import { ChatPage } from './pages/ChatPage';
import { HistoryPage } from './pages/HistoryPage';
import type { ViewState } from './types';

const PAGE_SIZE = 24;

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
        <ChatPage character={view.character} onBack={() => handleSetView({ name: 'home' })} onHistory={() => handleSetView({ name: 'history' })} />
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
          hasMore={hasMore}
          isLoading={isLoading}
          onLoadMore={() => void loadPage(page + 1)}
          onOpen={(nextCharacter) => handleSetView({ name: 'chat', character: nextCharacter })}
        />

        <div className="load-more">
          {isLoading ? <span>正在加载角色...</span> : null}
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
