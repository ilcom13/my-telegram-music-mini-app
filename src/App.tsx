import { useState } from 'react';
import './App.css';

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);

  const handleSearch = () => {
    // Пока просто имитируем результаты — потом заменим на запрос к боту
    const fakeResults = [
      `${query} - Explicit Version`,
      `${query} (Full Uncensored)`,
      `${query} Leak 2026`,
    ];
    setResults(fakeResults);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Мой Музыкальный Mini App</h1>

      {/* Поиск */}
      <input
        type="text"
        placeholder="Введи название трека..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
      />
      <button onClick={handleSearch} style={{ padding: '10px 20px' }}>
        Искать
      </button>

      {/* Результаты поиска */}
      <ul style={{ listStyle: 'none', padding: 0, marginTop: '20px' }}>
        {results.map((track, i) => (
          <li
            key={i}
            onClick={() => setCurrentTrack(track)}
            style={{
              padding: '10px',
              borderBottom: '1px solid #ccc',
              cursor: 'pointer',
            }}
          >
            {track}
          </li>
        ))}
      </ul>

      {/* Плеер */}
      {currentTrack && (
        <div style={{ marginTop: '30px' }}>
          <h3>Сейчас играет: {currentTrack}</h3>
          <audio controls style={{ width: '100%' }}>
            {/* Пока заглушка — потом вставим реальную ссылку */}
            <source src="https://example.com/sample.mp3" type="audio/mpeg" />
            Твой браузер не поддерживает аудио.
          </audio>
        </div>
      )}
    </div>
  );
}

export default App;
