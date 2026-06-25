import type { ViewState } from '../types';

export function Sidebar({
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
