import { useState, useEffect, useRef } from 'react';

declare global { interface Window { Telegram: any; } }

const WORKER_URL = 'https://square-queen-e703.shapovaliluha.workers.dev';
const ACC = '#E28EFE';
const ACC_DIM = 'rgba(226,142,254,0.15)';

interface Track {
  id: string; title: string; artist: string;
  cover: string; duration: string; plays: number; mp3: string | null;
}

const NAV_ITEMS = [
  { id: 'home', label: 'Главная', icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? ACC : '#555'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg> },
  { id: 'search', label: 'Поиск', icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? ACC : '#555'} strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
  { id: 'library', label: 'Библиотека', icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? ACC : '#555'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg> },
  { id: 'radio', label: 'Радио', icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? ACC : '#555'} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="2"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><path d="M2 12h20"/></svg> },
];

const TRENDING: Track[] = [
  { id: 't1', title: 'Сакура', artist: '163ONMYNECK', cover: '', duration: '2:26', plays: 3034589, mp3: null },
  { id: 't2', title: 'Барыга', artist: 'madk1d', cover: '', duration: '1:32', plays: 1400000, mp3: null },
  { id: 't3', title: 'DARK SIDE', artist: 'Pharaoh', cover: '', duration: '3:12', plays: 980000, mp3: null },
  { id: 't4', title: 'Случайная', artist: 'LOBODA', cover: '', duration: '3:45', plays: 750000, mp3: null },
  { id: 't5', title: 'Горгород', artist: 'Slava KPSS', cover: '', duration: '4:20', plays: 620000, mp3: null },
];

function fmtPlays(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return Math.round(n / 1000) + 'K';
  return String(n);
}

function Cover({ cover, size, radius }: { cover: string; size: number; radius: number }) {
  const [err, setErr] = useState(false);
  const base: React.CSSProperties = { width: size, height: size, borderRadius: radius, flexShrink: 0 };
  if (cover && !err)
    return <img src={cover} style={{ ...base, objectFit: 'cover', display: 'block' }} onError={() => setErr(true)} />;
  return (
    <div style={{ ...base, background: '#1e1630', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36 }}>
      🎵
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<'home' | 'search' | 'library' | 'radio'>('home');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [fullPlayer, setFullPlayer] = useState(false);
  const [library, setLibrary] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
    try {
      const s = localStorage.getItem('lib47'); if (s) setLibrary(JSON.parse(s));
      const h = localStorage.getItem('hist47'); if (h) setHistory(JSON.parse(h));
    } catch {}
  }, []);

  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    const onT = () => {
      if (a.duration) {
        setProgress(a.currentTime / a.duration * 100);
        const m = Math.floor(a.currentTime / 60), s = Math.floor(a.currentTime % 60);
        setCurrentTime(`${m}:${s.toString().padStart(2, '0')}`);
      }
    };
    const onE = () => setPlaying(false);
    a.addEventListener('timeupdate', onT); a.addEventListener('ended', onE);
    return () => { a.removeEventListener('timeupdate', onT); a.removeEventListener('ended', onE); };
  }, [current]);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(''); setResults([]);
    try {
      const r = await fetch(`${WORKER_URL}/search?q=${encodeURIComponent(query)}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      if (!d.tracks?.length) throw new Error('Ничего не найдено');
      setResults(d.tracks);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const playTrack = (track: Track) => {
    if (!track.mp3) return;
    if (current?.id === track.id) {
      if (playing) { audioRef.current?.pause(); setPlaying(false); }
      else { audioRef.current?.play(); setPlaying(true); }
      return;
    }
    if (audioRef.current) {
      audioRef.current.src = `${WORKER_URL}/stream?url=${encodeURIComponent(track.mp3)}`;
      audioRef.current.play(); setPlaying(true);
    }
    setCurrent(track); setProgress(0); setCurrentTime('0:00');
    setHistory(prev => {
      const n = [track, ...prev.filter(t => t.id !== track.id)].slice(0, 20);
      try { localStorage.setItem('hist47', JSON.stringify(n)); } catch {}
      return n;
    });
  };

  const toggleLib = (track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    setLibrary(prev => {
      const has = prev.some(t => t.id === track.id);
      const n = has ? prev.filter(t => t.id !== track.id) : [track, ...prev];
      try { localStorage.setItem('lib47', JSON.stringify(n)); } catch {}
      return n;
    });
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current; if (!a?.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - r.left) / r.width) * a.duration;
  };

  const inLib = (id: string) => library.some(t => t.id === id);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (playing) { audioRef.current?.pause(); setPlaying(false); }
    else { audioRef.current?.play(); setPlaying(true); }
  };

  const PlayPauseIcon = ({ size }: { size: 'sm' | 'lg' }) => {
    const h = size === 'lg' ? 20 : 14, w = size === 'lg' ? 4 : 3;
    return playing
      ? <div style={{ display: 'flex', gap: size === 'lg' ? 4 : 3 }}>
          <div style={{ width: w, height: h, background: '#fff', borderRadius: 2 }} />
          <div style={{ width: w, height: h, background: '#fff', borderRadius: 2 }} />
        </div>
      : <div style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: size === 'lg' ? '10px 0 10px 18px' : '7px 0 7px 12px', borderColor: `transparent transparent transparent #fff`, marginLeft: size === 'lg' ? 3 : 2 }} />;
  };

  const HeartBtn = ({ track }: { track: Track }) => (
    <button onClick={e => toggleLib(track, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill={inLib(track.id) ? ACC : 'none'} stroke={inLib(track.id) ? ACC : '#444'} strokeWidth="2" strokeLinecap="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    </button>
  );

  const TrackRow = ({ track, num }: { track: Track; num?: number }) => {
    const active = current?.id === track.id;
    return (
      <div onClick={() => playTrack(track)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 14, cursor: 'pointer', marginBottom: 2, background: active ? ACC_DIM : 'transparent', transition: 'background 0.15s' }}>
        {num !== undefined && <div style={{ fontSize: 13, color: active ? ACC : '#555', width: 22, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{num}</div>}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Cover cover={track.cover} size={48} radius={11} />
          {active && (
            <div style={{ position: 'absolute', inset: 0, borderRadius: 11, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
              {playing ? '⏸' : '▶'}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: active ? ACC : '#e0e0ec', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{track.artist}</div>
        </div>
        <HeartBtn track={track} />
        <div style={{ fontSize: 12, color: '#444', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{track.duration}</div>
      </div>
    );
  };

  // ── FULL PLAYER ────────────────────────────────────────────────────────────
  if (fullPlayer && current) return (
    <div style={{ background: '#0c0c11', minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 28px 40px', fontFamily: "-apple-system,'SF Pro Display',sans-serif", boxSizing: 'border-box' }}>
      <audio ref={audioRef} />
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 48, paddingBottom: 28 }}>
        <button onClick={() => setFullPlayer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span style={{ fontSize: 12, color: '#666', letterSpacing: 1.5, textTransform: 'uppercase' }}>Сейчас играет</span>
        <HeartBtn track={current} />
      </div>

      <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <Cover cover={current.cover} size={Math.min(window.innerWidth - 80, 280)} radius={24} />
      </div>

      <div style={{ width: '100%', marginTop: 32 }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: '#f0f0f8', letterSpacing: -0.4 }}>{current.title}</div>
        <div style={{ fontSize: 15, color: '#777', marginTop: 4 }}>{current.artist}</div>
      </div>

      <div style={{ width: '100%', marginTop: 28 }}>
        <div onClick={seekTo} style={{ height: 3, background: '#1e1e2a', borderRadius: 2, cursor: 'pointer', marginBottom: 10 }}>
          <div style={{ width: `${progress}%`, height: '100%', background: ACC, borderRadius: 2, transition: 'width 0.3s linear' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#555' }}>
          <span>{currentTime}</span><span>{current.duration}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, marginTop: 36, width: '100%' }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" /></svg>
        </button>
        <button onClick={togglePlay} style={{ width: 66, height: 66, borderRadius: '50%', background: ACC, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <PlayPauseIcon size="lg" />
        </button>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>
        </button>
      </div>
    </div>
  );

  // ── MAIN UI ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#0c0c11', minHeight: '100vh', width: '100%', fontFamily: "-apple-system,'SF Pro Display',sans-serif", position: 'relative', boxSizing: 'border-box' }}>
      <audio ref={audioRef} />

      <div style={{ paddingBottom: current ? 152 : 76, minHeight: '100vh' }}>

        {/* HOME */}
        {screen === 'home' && (
          <div>
            <div style={{ padding: '48px 15px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, color: '#666' }}>Добро пожаловать</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: '#f0f0f8', marginTop: 2, letterSpacing: -0.4 }}>Forty7</div>
              </div>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: ACC_DIM, border: `1px solid ${ACC}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: ACC }}>IL</div>
            </div>

            {history.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px' }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#e8e8f0' }}>Недавнее</div>
                  <div style={{ fontSize: 13, color: ACC, cursor: 'pointer' }} onClick={() => setScreen('library')}>Все</div>
                </div>
                <div style={{ display: 'flex', gap: 12, padding: '0 20px', overflowX: 'auto', scrollbarWidth: 'none' as any }}>
                  {history.slice(0, 6).map(t => (
                    <div key={t.id} onClick={() => playTrack(t)} style={{ minWidth: 120, borderRadius: 16, background: '#141420', border: '1px solid #1e1e2e', overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}>
                      <Cover cover={t.cover} size={120} radius={0} />
                      <div style={{ padding: '8px 10px 10px' }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#ddd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.artist}</div>
                        <div style={{ fontSize: 11, color: '#666', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ padding: '20px 20px 12px' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#e8e8f0' }}>В тренде</div>
            </div>
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {TRENDING.map((t, i) => (
                <div key={t.id} onClick={() => { setQuery(t.artist + ' ' + t.title); setScreen('search'); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 14, background: '#111118', border: '1px solid #1a1a26', cursor: 'pointer' }}>
                  <div style={{ fontSize: 13, color: '#555', width: 20, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</div>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: '#1e1630', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🎵</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#e0e0ec', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 1 }}>{t.artist}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#444', flexShrink: 0 }}>{fmtPlays(t.plays)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SEARCH */}
        {screen === 'search' && (
          <div>
            <div style={{ padding: '48px 20px 16px' }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#f0f0f8', marginBottom: 16, letterSpacing: -0.4 }}>Поиск</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="text" placeholder="Артист или трек..." value={query}
                  onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
                  style={{ flex: 1, padding: '12px 16px', fontSize: 15, background: '#141420', border: '1px solid #252535', borderRadius: 14, color: '#f0f0f8', outline: 'none', width: '100%', boxSizing: 'border-box' as any }} />
                <button onClick={search} disabled={loading}
                  style={{ padding: '12px 18px', background: loading ? '#222' : ACC, color: loading ? '#555' : '#0c0c11', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', flexShrink: 0, whiteSpace: 'nowrap' as any }}>
                  {loading ? '...' : 'Найти'}
                </button>
              </div>
              {error && <div style={{ marginTop: 10, padding: '10px 14px', background: '#1a0a0a', border: '1px solid #3a1515', borderRadius: 12, color: '#ff7070', fontSize: 13 }}>{error}</div>}
            </div>
            <div style={{ padding: '0 8px' }}>
              {results.map((t, i) => <TrackRow key={t.id} track={t} num={i + 1} />)}
            </div>
          </div>
        )}

        {/* LIBRARY */}
        {screen === 'library' && (
          <div>
            <div style={{ padding: '48px 20px 16px' }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#f0f0f8', letterSpacing: -0.4 }}>Библиотека</div>
            </div>
            {library.length === 0
              ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, color: '#444', textAlign: 'center' }}>
                  <div style={{ fontSize: 44, marginBottom: 14 }}>🎵</div>
                  <div style={{ fontSize: 15, color: '#555' }}>Сохранённых треков нет</div>
                  <div style={{ fontSize: 13, marginTop: 6, color: '#333' }}>Нажми ♥ рядом с треком</div>
                </div>
              : <div style={{ padding: '0 8px' }}>{library.map((t, i) => <TrackRow key={t.id} track={t} num={i + 1} />)}</div>
            }
          </div>
        )}

        {/* RADIO */}
        {screen === 'radio' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center', padding: '0 20px' }}>
            <div style={{ fontSize: 52, marginBottom: 20 }}>📻</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#e0e0ec' }}>Радио</div>
            <div style={{ fontSize: 14, marginTop: 8, color: '#555' }}>Скоро появится</div>
          </div>
        )}
      </div>

      {/* MINI PLAYER */}
      {current && (
        <div onClick={() => setFullPlayer(true)} style={{ position: 'fixed', bottom: 64, left: 10, right: 10, background: '#18121e', border: `1px solid ${ACC}33`, borderRadius: 18, padding: '10px 14px 12px', cursor: 'pointer', zIndex: 100 }}>
          <div style={{ height: 2, background: '#1e1228', borderRadius: 1, marginBottom: 10, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: ACC, borderRadius: 1, transition: 'width 0.3s linear' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Cover cover={current.cover} size={40} radius={9} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#f0f0f8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{current.title}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 1 }}>{current.artist}</div>
            </div>
            <button onClick={e => { e.stopPropagation(); togglePlay(); }}
              style={{ width: 36, height: 36, borderRadius: '50%', background: ACC, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <PlayPauseIcon size="sm" />
            </button>
          </div>
        </div>
      )}

      {/* NAV */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0c0c11', borderTop: '1px solid #1a1a22', padding: '10px 0 16px', display: 'flex', justifyContent: 'space-around', zIndex: 101 }}>
        {NAV_ITEMS.map(item => (
          <div key={item.id} onClick={() => setScreen(item.id as any)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '0 12px' }}>
            {item.icon(screen === item.id)}
            <span style={{ fontSize: 10, color: screen === item.id ? ACC : '#555' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
