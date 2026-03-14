import { useState, useEffect, useRef } from 'react';
declare global { interface Window { Telegram: any; } }

const WORKER_URL = 'https://square-queen-e703.shapovaliluha.workers.dev';
const ACC = '#E28EFE';
const ACC_DIM = 'rgba(226,142,254,0.12)';

interface Track { id: string; title: string; artist: string; cover: string; duration: string; plays: number; mp3: string | null; }
interface Playlist { id: string; name: string; tracks: Track[]; }

const T: Record<string, Record<string, string>> = {
  en: {
    welcome: 'Welcome', home: 'Home', search: 'Search', library: 'Library',
    trending: 'Trending', profile: 'Profile', searchPlaceholder: 'Artist or track...',
    find: 'Find', notFound: 'Nothing found', recent: 'Recent', recommended: 'Recommended',
    liked: 'Liked', playlists: 'Playlists', createPlaylist: 'Create playlist',
    playlistName: 'Playlist name', create: 'Create', cancel: 'Cancel',
    addToPlaylist: 'Add to playlist', noPlaylists: 'No playlists yet',
    noLiked: 'No liked tracks', noTracks: 'No tracks', loading: 'Loading...',
    loadMore: 'Load more', retry: 'Try again', nowPlaying: 'Now playing',
    plays: 'plays', resetData: 'Reset all data', language: 'Language',
    likedTracks: 'Liked tracks', listenedTracks: 'Listened tracks',
    sendTrack: 'Share', copyLink: 'Copy link', copied: 'Copied!',
    all: 'See all', top: 'Top', newTracks: 'New',
    noRecommended: 'Listen to some tracks to get recommendations',
  },
  ru: {
    welcome: 'Добро пожаловать', home: 'Главная', search: 'Поиск', library: 'Библиотека',
    trending: 'Тренды', profile: 'Профиль', searchPlaceholder: 'Артист или трек...',
    find: 'Найти', notFound: 'Ничего не найдено', recent: 'Недавнее', recommended: 'Рекомендованное',
    liked: 'Лайкнутые', playlists: 'Плейлисты', createPlaylist: 'Создать плейлист',
    playlistName: 'Название плейлиста', create: 'Создать', cancel: 'Отмена',
    addToPlaylist: 'Добавить в плейлист', noPlaylists: 'Нет плейлистов',
    noLiked: 'Нет лайкнутых треков', noTracks: 'Нет треков', loading: 'Загружаем...',
    loadMore: 'Загрузить ещё', retry: 'Попробовать снова', nowPlaying: 'Сейчас играет',
    plays: 'прослушиваний', resetData: 'Сбросить все данные', language: 'Язык',
    likedTracks: 'Лайкнутых треков', listenedTracks: 'Прослушано треков',
    sendTrack: 'Поделиться', copyLink: 'Скопировать ссылку', copied: 'Скопировано!',
    all: 'Все', top: 'Топ', newTracks: 'Новинки',
    noRecommended: 'Послушай несколько треков и мы подберём рекомендации',
  }
};

function fmtPlays(n: number) {
  if (n >= 1000000) return (n/1000000).toFixed(1)+'M';
  if (n >= 1000) return Math.round(n/1000)+'K';
  return n > 0 ? String(n) : '';
}

function Cover({ cover, size, radius }: { cover: string; size: number; radius: number }) {
  const [err, setErr] = useState(false);
  const base: React.CSSProperties = { width: size, height: size, borderRadius: radius, flexShrink: 0 };
  if (cover && !err) return <img src={cover} style={{ ...base, objectFit: 'cover', display: 'block' }} onError={() => setErr(true)} />;
  return <div style={{ ...base, background: '#1a1428', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36 }}>🎵</div>;
}

const GENRES = [
  { id: 'top',        label: 'Топ',       emoji: '🔥' },
  { id: 'new',        label: 'Новинки',   emoji: '⚡' },
  { id: 'ru-rap',     label: 'RU Рэп',    emoji: '🎤' },
  { id: 'hip-hop',    label: 'Hip-Hop',   emoji: '🎧' },
  { id: 'trap',       label: 'Trap',      emoji: '💀' },
  { id: 'drill',      label: 'Drill',     emoji: '🔩' },
  { id: 'electronic', label: 'Electronic',emoji: '⚡' },
  { id: 'rnb',        label: 'R&B',       emoji: '💜' },
  { id: 'pop',        label: 'Pop',       emoji: '✨' },
  { id: 'latin',      label: 'Latin',     emoji: '🌴' },
];

export default function App() {
  const [screen, setScreen] = useState<'home'|'search'|'library'|'trending'|'profile'>('home');
  const [lang, setLang] = useState<'ru'|'en'>('ru');
  const t = (k: string) => T[lang][k] || k;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState<Track|null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [volume, setVolume] = useState(1);
  const [loop, setLoop] = useState(false);
  const [fullPlayer, setFullPlayer] = useState(false);
  const [liked, setLiked] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [recommended, setRecommended] = useState<Track[]>([]);
  const [trendTracks, setTrendTracks] = useState<Record<string, Track[]>>({});
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendGenre, setTrendGenre] = useState('top');
  const [trendOffset, setTrendOffset] = useState<Record<string, number>>({});
  const [libTab, setLibTab] = useState<'liked'|'playlists'>('liked');
  const [showAddPlaylist, setShowAddPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showAddToPlaylist, setShowAddToPlaylist] = useState<Track|null>(null);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const audioRef = useRef<HTMLAudioElement|null>(null);

  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const userName = tgUser?.first_name || tgUser?.username || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
    try {
      const l = localStorage.getItem('liked47'); if (l) setLiked(JSON.parse(l));
      const p = localStorage.getItem('playlists47'); if (p) setPlaylists(JSON.parse(p));
      const h = localStorage.getItem('hist47'); if (h) setHistory(JSON.parse(h));
      const lg = localStorage.getItem('lang47'); if (lg) setLang(lg as 'ru'|'en');
    } catch {}
  }, []);

  // Загружаем рекомендации на основе истории
  useEffect(() => {
    if (history.length < 2) return;
    const artists = [...new Set(history.map(t => t.artist))].slice(0, 5);
    const artistsParam = artists.join(',');
    fetch(`${WORKER_URL}/search?q=__recommend__${encodeURIComponent(artistsParam)}`)
      .then(r => r.json())
      .then(d => { if (d.tracks?.length) setRecommended(d.tracks); })
      .catch(() => {});
  }, [history.length]);

  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    const onT = () => {
      if (a.duration) {
        setProgress(a.currentTime/a.duration*100);
        const m=Math.floor(a.currentTime/60), s=Math.floor(a.currentTime%60);
        setCurrentTime(`${m}:${s.toString().padStart(2,'0')}`);
      }
    };
    const onE = () => { if (loop) { a.currentTime=0; a.play(); } else setPlaying(false); };
    a.addEventListener('timeupdate', onT); a.addEventListener('ended', onE);
    return () => { a.removeEventListener('timeupdate', onT); a.removeEventListener('ended', onE); };
  }, [current, loop]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  const loadTrending = async (genre = trendGenre, reset = false) => {
    setTrendLoading(true);
    const currentOffset = reset ? 0 : (trendOffset[genre] || 0);
    try {
      const r = await fetch(`${WORKER_URL}/trending?genre=${genre}&offset=${currentOffset}`);
      const d = await r.json();
      if (d.tracks) {
        setTrendTracks(prev => ({
          ...prev,
          [genre]: reset ? d.tracks : [...(prev[genre] || []), ...d.tracks]
        }));
        setTrendOffset(prev => ({ ...prev, [genre]: currentOffset + 1 }));
      }
    } catch {}
    setTrendLoading(false);
  };

  useEffect(() => {
    if (screen === 'trending' && !trendTracks[trendGenre]) loadTrending(trendGenre, true);
  }, [screen, trendGenre]);

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(''); setResults([]);
    try {
      const r = await fetch(`${WORKER_URL}/search?q=${encodeURIComponent(query)}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      if (!d.tracks?.length) throw new Error(t('notFound'));
      setResults(d.tracks);
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const playTrack = (track: Track) => {
    if (!track.mp3) return;
    if (current?.id === track.id) { togglePlay(); return; }
    if (audioRef.current) {
      audioRef.current.src = `${WORKER_URL}/stream?url=${encodeURIComponent(track.mp3)}`;
      audioRef.current.play(); setPlaying(true);
    }
    setCurrent(track); setProgress(0); setCurrentTime('0:00');
    setHistory(prev => {
      const n = [track, ...prev.filter(x => x.id !== track.id)].slice(0, 30);
      try { localStorage.setItem('hist47', JSON.stringify(n)); } catch {}
      return n;
    });
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current; if (!a?.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - r.left) / r.width) * a.duration;
  };

  const isLiked = (id: string) => liked.some(t => t.id === id);

  const toggleLike = (track: Track, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLiked(prev => {
      const has = prev.some(t => t.id === track.id);
      const n = has ? prev.filter(t => t.id !== track.id) : [track, ...prev];
      try { localStorage.setItem('liked47', JSON.stringify(n)); } catch {}
      return n;
    });
  };

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const pl: Playlist = { id: Date.now().toString(), name: newPlaylistName.trim(), tracks: [] };
    setPlaylists(prev => { const n = [...prev, pl]; try { localStorage.setItem('playlists47', JSON.stringify(n)); } catch {} return n; });
    setNewPlaylistName(''); setShowAddPlaylist(false);
  };

  const addToPlaylist = (plId: string, track: Track) => {
    setPlaylists(prev => {
      const n = prev.map(pl => pl.id === plId && !pl.tracks.some(t => t.id === track.id) ? { ...pl, tracks: [...pl.tracks, track] } : pl);
      try { localStorage.setItem('playlists47', JSON.stringify(n)); } catch {}
      return n;
    });
    setShowAddToPlaylist(null);
  };

  const shareTrack = (track: Track) => {
    const text = `${track.artist} — ${track.title}`;
    if (window.Telegram?.WebApp?.switchInlineQuery) {
      window.Telegram.WebApp.switchInlineQuery(text);
    } else {
      navigator.clipboard?.writeText(text).then(() => { setCopiedMsg(true); setTimeout(() => setCopiedMsg(false), 2000); });
    }
  };

  const changeLang = (l: 'ru'|'en') => {
    setLang(l);
    try { localStorage.setItem('lang47', l); } catch {}
  };

  const PPIcon = ({ size }: { size: 'sm'|'lg' }) => {
    const h = size === 'lg' ? 20 : 14, w = size === 'lg' ? 4 : 3;
    const col = size === 'lg' ? '#0c0c11' : '#fff';
    return playing
      ? <div style={{ display: 'flex', gap: size === 'lg' ? 4 : 3 }}>
          <div style={{ width: w, height: h, background: col, borderRadius: 2 }} />
          <div style={{ width: w, height: h, background: col, borderRadius: 2 }} />
        </div>
      : <div style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: size === 'lg' ? '10px 0 10px 18px' : '7px 0 7px 12px', borderColor: `transparent transparent transparent ${col}`, marginLeft: size === 'lg' ? 3 : 2 }} />;
  };

  const HeartBtn = ({ track, size = 20 }: { track: Track; size?: number }) => (
    <button onClick={e => toggleLike(track, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill={isLiked(track.id) ? ACC : 'none'} stroke={isLiked(track.id) ? ACC : '#555'} strokeWidth="2" strokeLinecap="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    </button>
  );

  const TrackRow = ({ track, num }: { track: Track; num?: number }) => {
    const active = current?.id === track.id;
    return (
      <div onClick={() => playTrack(track)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 14, cursor: 'pointer', marginBottom: 2, background: active ? ACC_DIM : 'transparent', transition: 'background 0.15s' }}>
        {num !== undefined && <div style={{ fontSize: 13, color: active ? ACC : '#555', width: 22, flexShrink: 0 }}>{num}</div>}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Cover cover={track.cover} size={48} radius={11} />
          {active && <div style={{ position: 'absolute', inset: 0, borderRadius: 11, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{playing ? '⏸' : '▶'}</div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: active ? ACC : '#e0e0ec', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <span style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{track.artist}</span>
            {track.plays > 0 && <span style={{ fontSize: 11, color: '#444', flexShrink: 0 }}>· {fmtPlays(track.plays)}</span>}
          </div>
        </div>
        <HeartBtn track={track} />
        <button onClick={e => { e.stopPropagation(); setShowAddToPlaylist(track); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
        <div style={{ fontSize: 12, color: '#444', flexShrink: 0 }}>{track.duration}</div>
      </div>
    );
  };

  const AddToPlaylistModal = ({ track }: { track: Track }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', zIndex: 300 }} onClick={() => setShowAddToPlaylist(null)}>
      <div style={{ background: '#161622', width: '100%', borderRadius: '20px 20px 0 0', padding: '20px 16px 40px' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#f0f0f8', marginBottom: 16 }}>{t('addToPlaylist')}</div>
        {playlists.length === 0
          ? <div style={{ color: '#555', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>{t('noPlaylists')}</div>
          : playlists.map(pl => (
            <div key={pl.id} onClick={() => addToPlaylist(pl.id, track)} style={{ padding: '12px 14px', borderRadius: 12, background: '#1e1e2e', marginBottom: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#e0e0ec', fontSize: 14 }}>{pl.name}</span>
              <span style={{ color: '#555', fontSize: 12 }}>{pl.tracks.length}</span>
            </div>
          ))
        }
        <button onClick={() => setShowAddToPlaylist(null)} style={{ width: '100%', padding: '12px', background: '#1e1e2e', border: 'none', borderRadius: 12, color: '#777', fontSize: 14, cursor: 'pointer', marginTop: 4 }}>{t('cancel')}</button>
      </div>
    </div>
  );

  const NAV = [
    { id: 'home', label: t('home'), icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#555'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg> },
    { id: 'search', label: t('search'), icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#555'} strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
    { id: 'library', label: t('library'), icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#555'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg> },
    { id: 'trending', label: t('trending'), icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#555'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
  ];

  // ── FULL PLAYER ─────────────────────────────────────────────────────────────
  if (fullPlayer && current) return (
    <div style={{ background: '#0c0c11', minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 24px 40px', fontFamily: "-apple-system,'SF Pro Display',sans-serif", boxSizing: 'border-box' }}>
      <audio ref={audioRef} />
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 48, paddingBottom: 20 }}>
        <button onClick={() => setFullPlayer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span style={{ fontSize: 12, color: '#666', letterSpacing: 1.5, textTransform: 'uppercase' }}>{t('nowPlaying')}</span>
        <div style={{ width: 38 }} />
      </div>

      <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <Cover cover={current.cover} size={Math.min(window.innerWidth - 80, 280)} radius={24} />
      </div>

      {/* Info */}
      <div style={{ width: '100%', marginTop: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: '#f0f0f8', letterSpacing: -0.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{current.title}</div>
        <div style={{ fontSize: 15, color: '#777', marginTop: 4 }}>{current.artist}</div>
        {current.plays > 0 && <div style={{ fontSize: 12, color: '#444', marginTop: 4 }}>{fmtPlays(current.plays)} {t('plays')}</div>}
      </div>

      {/* Action row: like | add to playlist ……… loop | share */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <HeartBtn track={current} size={26} />
          <button onClick={() => setShowAddToPlaylist(current)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setLoop(!loop)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={loop ? ACC : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 014-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 01-4 4H3" /></svg>
          </button>
          <button onClick={() => shareTrack(current)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
          </button>
        </div>
      </div>
      {copiedMsg && <div style={{ fontSize: 12, color: ACC, marginTop: 6, alignSelf: 'flex-start' }}>{t('copied')}</div>}

      {/* Progress */}
      <div style={{ width: '100%', marginTop: 20 }}>
        <div onClick={seekTo} style={{ height: 3, background: '#1e1228', borderRadius: 2, cursor: 'pointer', marginBottom: 8 }}>
          <div style={{ width: `${progress}%`, height: '100%', background: ACC, borderRadius: 2, transition: 'width 0.3s linear' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#555' }}>
          <span>{currentTime}</span><span>{current.duration}</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, marginTop: 24, width: '100%' }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" /></svg>
        </button>
        <button onClick={togglePlay} style={{ width: 64, height: 64, borderRadius: '50%', background: ACC, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <PPIcon size="lg" />
        </button>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>
        </button>
      </div>

      {/* Volume */}
      <div style={{ width: '100%', marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /></svg>
        <div style={{ flex: 1, height: 3, background: '#1e1228', borderRadius: 2, cursor: 'pointer', position: 'relative' }}
          onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setVolume(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); }}>
          <div style={{ width: `${volume * 100}%`, height: '100%', background: ACC, borderRadius: 2 }} />
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 010 7.07" /><path d="M19.07 4.93a10 10 0 010 14.14" /></svg>
      </div>

      {showAddToPlaylist && <AddToPlaylistModal track={showAddToPlaylist} />}
    </div>
  );

  // ── MAIN ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#0c0c11', minHeight: '100vh', width: '100%', fontFamily: "-apple-system,'SF Pro Display',sans-serif", position: 'relative', boxSizing: 'border-box' }}>
      <audio ref={audioRef} />

      <div style={{ paddingBottom: current ? 152 : 76, minHeight: '100vh' }}>

        {/* HOME */}
        {screen === 'home' && (
          <div>
            <div style={{ padding: '48px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, color: '#666' }}>{t('welcome')}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#f0f0f8', marginTop: 2, letterSpacing: -0.5 }}>Forty7</div>
              </div>
              <button onClick={() => setScreen('profile')} style={{ width: 38, height: 38, borderRadius: '50%', background: ACC_DIM, border: `1px solid ${ACC}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: ACC, cursor: 'pointer', flexShrink: 0 }}>
                {userInitial}
              </button>
            </div>

            {history.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 12px' }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#e8e8f0' }}>{t('recent')}</div>
                  <div style={{ fontSize: 13, color: ACC, cursor: 'pointer' }} onClick={() => setScreen('library')}>{t('all')}</div>
                </div>
                <div style={{ display: 'flex', gap: 12, padding: '0 16px', overflowX: 'auto', scrollbarWidth: 'none' as any }}>
                  {history.slice(0, 8).map(track => (
                    <div key={track.id} onClick={() => playTrack(track)} style={{ minWidth: 108, borderRadius: 14, background: '#141420', border: '1px solid #1e1e2e', overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}>
                      <Cover cover={track.cover} size={108} radius={0} />
                      <div style={{ padding: '7px 9px 9px' }}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: '#ddd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                        <div style={{ fontSize: 10, color: '#666', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended */}
            <div style={{ padding: '18px 16px 12px' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#e8e8f0' }}>{t('recommended')}</div>
            </div>
            {recommended.length === 0 && history.length < 2
              ? <div style={{ padding: '0 16px 12px', fontSize: 13, color: '#444' }}>{t('noRecommended')}</div>
              : <div style={{ padding: '0 4px' }}>
                  {(recommended.length > 0 ? recommended : history).slice(0, 8).map((track, i) => (
                    <TrackRow key={track.id} track={track} num={i + 1} />
                  ))}
                </div>
            }
          </div>
        )}

        {/* SEARCH */}
        {screen === 'search' && (
          <div>
            <div style={{ padding: '48px 16px 16px' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#f0f0f8', marginBottom: 14, letterSpacing: -0.5 }}>{t('search')}</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="text" placeholder={t('searchPlaceholder')} value={query}
                  onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
                  style={{ flex: 1, padding: '12px 16px', fontSize: 15, background: '#141420', border: '1px solid #252535', borderRadius: 14, color: '#f0f0f8', outline: 'none', width: '100%', boxSizing: 'border-box' as any }} />
                <button onClick={doSearch} disabled={loading}
                  style={{ padding: '12px 16px', background: loading ? '#222' : ACC, color: loading ? '#555' : '#0c0c11', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
                  {loading ? '...' : t('find')}
                </button>
              </div>
              {error && <div style={{ marginTop: 10, padding: '10px 14px', background: '#1a0a0a', border: '1px solid #3a1515', borderRadius: 12, color: '#ff7070', fontSize: 13 }}>{error}</div>}
            </div>
            <div style={{ padding: '0 4px' }}>
              {results.map((track, i) => <TrackRow key={track.id} track={track} num={i + 1} />)}
            </div>
          </div>
        )}

        {/* LIBRARY */}
        {screen === 'library' && (
          <div>
            <div style={{ padding: '48px 16px 14px' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#f0f0f8', letterSpacing: -0.5 }}>{t('library')}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
              {(['liked', 'playlists'] as const).map(tab => (
                <button key={tab} onClick={() => setLibTab(tab)} style={{ padding: '7px 18px', borderRadius: 20, border: 'none', background: libTab === tab ? ACC : ACC_DIM, color: libTab === tab ? '#0c0c11' : ACC, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  {tab === 'liked' ? t('liked') : t('playlists')}
                </button>
              ))}
            </div>

            {libTab === 'liked' && (
              liked.length === 0
                ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, color: '#444' }}>
                    <div style={{ fontSize: 44, marginBottom: 14 }}>🎵</div>
                    <div style={{ fontSize: 15, color: '#555' }}>{t('noLiked')}</div>
                  </div>
                : <div style={{ padding: '0 4px' }}>{liked.map((track, i) => <TrackRow key={track.id} track={track} num={i + 1} />)}</div>
            )}

            {libTab === 'playlists' && (
              <div style={{ padding: '0 16px' }}>
                <button onClick={() => setShowAddPlaylist(true)} style={{ width: '100%', padding: '12px', background: ACC_DIM, border: `1px dashed ${ACC}55`, borderRadius: 14, color: ACC, fontSize: 14, cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  {t('createPlaylist')}
                </button>
                {showAddPlaylist && (
                  <div style={{ background: '#141420', border: '1px solid #252535', borderRadius: 14, padding: '14px', marginBottom: 12 }}>
                    <input autoFocus placeholder={t('playlistName')} value={newPlaylistName}
                      onChange={e => setNewPlaylistName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createPlaylist()}
                      style={{ width: '100%', padding: '10px 14px', fontSize: 14, background: '#0c0c11', border: '1px solid #252535', borderRadius: 10, color: '#f0f0f8', outline: 'none', boxSizing: 'border-box' as any, marginBottom: 10 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={createPlaylist} style={{ flex: 1, padding: '10px', background: ACC, border: 'none', borderRadius: 10, color: '#0c0c11', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{t('create')}</button>
                      <button onClick={() => { setShowAddPlaylist(false); setNewPlaylistName(''); }} style={{ flex: 1, padding: '10px', background: '#1e1e2e', border: 'none', borderRadius: 10, color: '#777', fontSize: 14, cursor: 'pointer' }}>{t('cancel')}</button>
                    </div>
                  </div>
                )}
                {playlists.map(pl => (
                  <div key={pl.id} style={{ background: '#111118', border: '1px solid #1a1a26', borderRadius: 14, padding: '14px', marginBottom: 8 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: '#e0e0ec', marginBottom: 6 }}>{pl.name}</div>
                    <div style={{ fontSize: 12, color: '#555', marginBottom: pl.tracks.length ? 10 : 0 }}>{pl.tracks.length} {t('noTracks').includes('No') ? 'tracks' : 'треков'}</div>
                    {pl.tracks.slice(0, 3).map(track => (
                      <div key={track.id} onClick={() => playTrack(track)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer', borderTop: '1px solid #1a1a26' }}>
                        <Cover cover={track.cover} size={36} radius={8} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: '#ddd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                          <div style={{ fontSize: 11, color: '#666' }}>{track.artist}</div>
                        </div>
                      </div>
                    ))}
                    {pl.tracks.length > 3 && <div style={{ fontSize: 12, color: '#555', marginTop: 6, paddingTop: 6, borderTop: '1px solid #1a1a26' }}>+{pl.tracks.length - 3}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TRENDING */}
        {screen === 'trending' && (() => {
          const currentTracks = trendTracks[trendGenre] || [];
          return (
            <div>
              <div style={{ padding: '48px 16px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#f0f0f8', letterSpacing: -0.5 }}>{t('trending')}</div>
                <button onClick={() => loadTrending(trendGenre, true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                </button>
              </div>

              {/* Genre pills */}
              <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px', overflowX: 'auto', scrollbarWidth: 'none' as any }}>
                {GENRES.map(g => (
                  <button key={g.id} onClick={() => setTrendGenre(g.id)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 14px', borderRadius: 16, border: trendGenre === g.id ? `1.5px solid ${ACC}` : '1.5px solid #1e1e2a', background: trendGenre === g.id ? ACC_DIM : '#111118', color: trendGenre === g.id ? ACC : '#888', cursor: 'pointer', flexShrink: 0, minWidth: 64, transition: 'all 0.15s' }}>
                    <span style={{ fontSize: 22 }}>{g.emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: trendGenre === g.id ? 600 : 400, whiteSpace: 'nowrap' }}>{g.label}</span>
                  </button>
                ))}
              </div>

              {trendLoading && currentTracks.length === 0
                ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
                    <div style={{ fontSize: 14, color: '#555' }}>{t('loading')}</div>
                  </div>
                : currentTracks.length === 0
                  ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, textAlign: 'center', padding: '60px 20px 0' }}>
                      <div style={{ fontSize: 44, marginBottom: 14 }}>📈</div>
                      <div style={{ fontSize: 15, color: '#555' }}>{t('notFound')}</div>
                      <button onClick={() => loadTrending(trendGenre, true)} style={{ marginTop: 16, padding: '10px 24px', background: ACC_DIM, border: 'none', borderRadius: 12, color: ACC, fontSize: 14, cursor: 'pointer' }}>{t('retry')}</button>
                    </div>
                  : <div>
                      <div style={{ padding: '0 4px' }}>
                        {currentTracks.map((track, i) => <TrackRow key={track.id + i} track={track} num={i + 1} />)}
                      </div>
                      <div style={{ padding: '12px 16px 8px', display: 'flex', justifyContent: 'center' }}>
                        <button onClick={() => loadTrending(trendGenre, false)} disabled={trendLoading}
                          style={{ padding: '11px 40px', background: ACC_DIM, border: `1px solid ${ACC}33`, borderRadius: 14, color: ACC, fontSize: 14, cursor: trendLoading ? 'not-allowed' : 'pointer', opacity: trendLoading ? 0.5 : 1 }}>
                          {trendLoading ? t('loading') : t('loadMore')}
                        </button>
                      </div>
                    </div>
              }
            </div>
          );
        })()}

        {/* PROFILE */}
        {screen === 'profile' && (
          <div>
            <div style={{ padding: '48px 16px 24px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => setScreen('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 0' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#f0f0f8' }}>{t('profile')}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px 24px' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: ACC_DIM, border: `2px solid ${ACC}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: ACC, marginBottom: 14 }}>{userInitial}</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#f0f0f8' }}>{userName}</div>
              {tgUser?.username && <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>@{tgUser.username}</div>}
            </div>
            <div style={{ padding: '0 16px' }}>
              {/* Stats */}
              {[
                { label: t('likedTracks'), value: liked.length },
                { label: t('playlists'), value: playlists.length },
                { label: t('listenedTracks'), value: history.length },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #1a1a26' }}>
                  <span style={{ fontSize: 15, color: '#bbb' }}>{item.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: ACC }}>{item.value}</span>
                </div>
              ))}

              {/* Language */}
              <div style={{ padding: '18px 0 8px' }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{t('language')}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['ru', 'en'] as const).map(l => (
                    <button key={l} onClick={() => changeLang(l)}
                      style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', background: lang === l ? ACC : '#141420', color: lang === l ? '#0c0c11' : '#888', fontSize: 14, fontWeight: lang === l ? 600 : 400, cursor: 'pointer' }}>
                      {l === 'ru' ? '🇷🇺 Русский' : '🇺🇸 English'}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => { try { localStorage.clear(); } catch {} setLiked([]); setPlaylists([]); setHistory([]); setRecommended([]); }}
                style={{ width: '100%', marginTop: 20, padding: '13px', background: '#1a0a0a', border: '1px solid #3a1515', borderRadius: 14, color: '#ff7070', fontSize: 14, cursor: 'pointer' }}>
                {t('resetData')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ADD TO PLAYLIST MODAL */}
      {showAddToPlaylist && !fullPlayer && <AddToPlaylistModal track={showAddToPlaylist} />}

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
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 12, color: '#888' }}>{current.artist}</span>
                {current.plays > 0 && <span style={{ fontSize: 11, color: '#444' }}>· {fmtPlays(current.plays)}</span>}
              </div>
            </div>
            <button onClick={e => { e.stopPropagation(); togglePlay(); }}
              style={{ width: 36, height: 36, borderRadius: '50%', background: ACC, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <PPIcon size="sm" />
            </button>
          </div>
        </div>
      )}

      {/* NAV */}
      {screen !== 'profile' && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0c0c11', borderTop: '1px solid #1a1a22', padding: '10px 0 16px', display: 'flex', justifyContent: 'space-around', zIndex: 101 }}>
          {NAV.map(item => (
            <div key={item.id} onClick={() => setScreen(item.id as any)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '0 10px' }}>
              {item.icon(screen === item.id)}
              <span style={{ fontSize: 10, color: screen === item.id ? ACC : '#555' }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
