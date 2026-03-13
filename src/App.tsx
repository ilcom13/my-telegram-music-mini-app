import { useState, useEffect } from 'react';
import './App.css';

declare global {
  interface Window {
    Telegram: any;
  }
}

function App() {
  const [query, setQuery] = useState('');

  // Инициализация Telegram
  useEffect(() => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
  }, []);

  // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
  // СЮДА ВСТАВЬ USERNAME ЧУЖОГО БОТА БЕЗ @
  const botUsername = 'VoiceShazamBot';   // ← ИЗМЕНИ НА РЕАЛЬНЫЙ (например: VoiceShazamBot)
  // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←

  const handleSearch = () => {
    if (!query.trim()) {
      window.Telegram.WebApp.showAlert('Напиши название трека!');
      return;
    }

    // Переключаемся в inline-режим чужого бота
    window.Telegram.WebApp.switchInlineQuery(query);
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '400px',
      margin: '0 auto',
      background: '#121212',
      color: '#fff',
      minHeight: '100vh'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>
        Forty7 — uncensored music
      </h1>

      <div style={{ display: 'flex', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Введи название трека..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1,
            padding: '14px',
            fontSize: '16px',
            border: '1px solid #333',
            borderRadius: '8px 0 0 8px',
            background: '#1e1e1e',
            color: '#fff'
          }}
        />
        <button
          onClick={handleSearch}
          style={{
            padding: '14px 24px',
            fontSize: '16px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '0 8px 8px 0',
            cursor: 'pointer'
          }}
        >
          Искать в @{botUsername}
        </button>
      </div>

      <p style={{ textAlign: 'center', color: '#aaa', fontSize: '14px' }}>
        После нажатия выбери любой чат —<br />
        появятся результаты от бота
      </p>
    </div>
  );
}

export default App;
