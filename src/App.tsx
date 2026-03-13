import { useState, useEffect, useRef } from 'react';

declare global {
  interface Window { Telegram: any; }
}

const WORKER_URL = 'https://square-queen-e703.shapovaliluha.workers.dev';

interface Track {
  id: string;
  title: string;
  artist: string;
  cover: string;
  duration: string;
  plays: number;
  mp3: string | null;
}

export default function App() {
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) { tg.ready(); tg.expand(); }
    audioRef.current = new Audio();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
        const m = Math.floor(audio.currentTime / 60);
        const s = Math.floor(audio.currentTime % 60);
        setCurrentTime(`${m}:${s.toString().padStart(2, '0')}`);
      }
    };
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setTracks([]);
    try {
      const res = await fetch(`${WORKER_URL}/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.tracks?.length) throw new Error('Треки не найдены');
      setTracks(data.tracks);
    } catch (e: any) {
      setError(e.message || 'Ошибка поиска');
    } finally {
      setLoading(false);
    }
  };

  const playTrack = (track: Track) => {
    if (!track.mp3) return;
    const audio = audioRef.current!;

    if (currentTrack?.id === track.id) {
      if (isPlaying) { audio.pause(); setIsPlaying(false); }
      else { audio.play(); setIsPlaying(true); }
      return;
    }

    audio.src = `${WORKER_URL}/stream?url=${encodeURIComponent(track.mp3)}`;
    audio.play();
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
    setCurrentTime('0:00');
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
  };

  const formatPlays = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return String(n);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      paddingBottom: currentTrack ? '120px' : '24px',
    }}>
      <audio ref={audioRef as any} />

      <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ fontSize: 10, color: '#444', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 3 }}>Forty7</div>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>Без цензуры 🎵</div>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Артист или название..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          style={{
            flex: 1, padding: '12px 16px', fontSize: 15,
            background: '#161616', border: '1px solid #252525',
            borderRadius: 12, color: '#fff', outline: 'none',
          }}
        />
        <button
          onClick={search}
          disabled={loading}
          style={{
            padding: '12px 20px', fontSize: 15, fontWeight: 700,
            background: loading ? '#222' : '#ff5500',
            color: '#fff', border: 'none', borderRadius: 12,
            cursor: loading ? 'not-allowed' : 'pointer',
            minWidth: 72, transition: 'background 0.2s',
          }}
        >
          {loading ? '...' : '▶'}
        </button>
      </div>

      {error && (
        <div style={{
          margin: '0 16px 12px', padding: '10px 14px',
          background: '#1a0808', border: '1px solid #3a1010',
          borderRadius: 10, color: '#ff6b6b', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <div style={{ padding: '0 16px' }}>
        {tracks.map(track => {
          const isActive = currentTrack?.id === track.id;
          return (
            <div
              key={track.id}
              onClick={() => playTrack(track)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 8px', marginBottom: 2,
                borderRadius: 10, cursor: track.mp3 ? 'pointer' : 'default',
                background: isActive ? 'rgba(255,85,0,0.08)' : 'transparent',
                opacity: track.mp3 ? 1 : 0.35,
                transition: 'background 0.15s',
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={track.cover}
                  alt=""
                  style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', background: '#1a1a1a', display: 'block' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                {isActive && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: 8,
                    background: 'rgba(0,0,0,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20,
                  }}>
                    {isPlaying ? '⏸' : '▶'}
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600,
                  color: isActive ? '#ff5500' : '#fff',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {track.title}
                </div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{track.artist}</div>
              </div>

              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#444' }}>{track.duration}</div>
                <div style={{ fontSize: 11, color: '#333', marginTop: 2 }}>▶ {formatPlays(track.plays)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {currentTrack && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#111', borderTop: '1px solid #1e1e1e',
          padding: '8px 16px 20px',
        }}>
          <div
            onClick={seekTo}
            style={{ height: 3, background: '#222', borderRadius: 2, marginBottom: 10, cursor: 'pointer' }}
          >
            <div style={{
              width: `${progress}%`, height: '100%',
              background: '#ff5500', borderRadius: 2,
              transition: 'width 0.3s linear',
            }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src={currentTrack.cover}
              alt=""
              style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentTrack.title}
              </div>
              <div style={{ fontSize: 11, color: '#555' }}>{currentTrack.artist}</div>
            </div>
            <div style={{ fontSize: 11, color: '#444', marginRight: 4 }}>{currentTime}</div>
            <button
              onClick={() => playTrack(currentTrack)}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: '#ff5500', border: 'none',
                color: '#fff', fontSize: 20,
                cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
