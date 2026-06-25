import React from 'react';
import { createRoot } from 'react-dom/client';

import './styles.css';

function App() {
  return (
    <main className="app-shell">
      <section className="placeholder-panel">
        <span className="app-badge">AI</span>
        <h1>AI Character Chat</h1>
        <p>Frontend scaffold is running. Pages will be implemented in the next step.</p>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
