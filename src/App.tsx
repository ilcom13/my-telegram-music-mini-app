import { useState, useEffect } from 'react';
import './App.css';

declare global {
  interface Window {
    Telegram: any;
  }
}

function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Инициализация Telegram Web App
  useEffect(() => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
  }, []);

  // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
  // СЮДА ВСТАВЬ USERNAME ЧУЖОГО БОТА БЕЗ @
  const botUsername = 'VoiceShazamBot';   // ← ИЗМЕНИ НА РЕАЛЬНЫЙ (например: MusicLeakBot или как называется)
  // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←

  const handleInlineSearch = () => {
    if (!query.trim()) {
      window.Telegram.WebApp.showAlert('Введите название трека');
      return;
    }

    setLoading(true);

    // Переключаемся в inline-режим чужого бота
    window.Telegram.WebApp.switchInlineQuery(query);

    // Через 2 секунды убираем лоадер (inline работает мгновенно)
    setTimeout(() => setLoading(false), 2000);
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

      {/* Поиск */}
      <div style={{ display: 'flex', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Введи название трека..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1,
            padding: '12px',
            fontSize: '16px',
            border: '1px solid #333',
            borderRadius: '8px 0 0 8px',
            background: '#1e1e1e',
            color: '#fff'
          }}
        />
        <button
          onClick={handleInlineSearch}
          disabled={loading}
          style={{
            padding: '12px 20px',
            fontSize: '16px',
            background: loading ? '#444' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '0 8px 8px 0',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Открываем...' : `Искать в @${botUsername}`}
        </button>
      </div>

      <p style={{ textAlign: 'center', color: '#aaa', fontSize: '14px' }}>
        После нажатия выбери чат и выбери трек из результатов бота
      </p>

      {/* Плейлист и плеер здесь не нужны, потому что треки будут приходить от чужого бота */}
    </div>
  );
}

export default App;
