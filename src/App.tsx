import { useState, useEffect, useRef } from 'react';
declare global { interface Window { Telegram: any; } }

const WORKER_URL = 'https://square-queen-e703.shapovaliluha.workers.dev';
const ACC = '#E28EFE';
const ACC_DIM = 'rgba(226,142,254,0.12)';

interface Track { id: string; title: string; artist: string; cover: string; duration: string; plays: number; mp3: string | null; }
interface Playlist { id: string; name: string; tracks: Track[]; repeat: boolean; }

const T: Record<string, Record<string, string>> = {
  en: { welcome:'Welcome',home:'Home',search:'Search',library:'Library',trending:'Trending',profile:'Profile',searchPlaceholder:'Artist or track...',find:'Find',notFound:'Nothing found',recent:'Recent',recommended:'Recommended',liked:'Liked',playlists:'Playlists',createPlaylist:'Create playlist',playlistName:'Playlist name',create:'Create',cancel:'Cancel',addToPlaylist:'Add to playlist',noPlaylists:'No playlists yet. Create one.',noLiked:'No liked tracks',loading:'Loading...',loadMore:'Load more',retry:'Try again',nowPlaying:'Now playing',plays:'plays',resetData:'Reset all data',language:'Language',likedTracks:'Liked tracks',listenedTracks:'Listened',sendTrack:'Share',copied:'Copied!',all:'See all',noRecommended:'Listen to some tracks to get recommendations',queue:'Queue',addToQueue:'Add to queue',sound:'Sound',remix:'Remix',shuffle:'Shuffle',repeatPlaylist:'Repeat',playAll:'Play all', },
  ru: { welcome:'Добро пожаловать',home:'Главная',search:'Поиск',library:'Библиотека',trending:'Тренды',profile:'Профиль',searchPlaceholder:'Артист или трек...',find:'Найти',notFound:'Ничего не найдено',recent:'Недавнее',recommended:'Рекомендованное',liked:'Лайкнутые',playlists:'Плейлисты',createPlaylist:'Создать плейлист',playlistName:'Название плейлиста',create:'Создать',cancel:'Отмена',addToPlaylist:'В плейлист',noPlaylists:'Нет плейлистов. Создай первый.',noLiked:'Нет лайкнутых треков',loading:'Загружаем...',loadMore:'Загрузить ещё',retry:'Попробовать снова',nowPlaying:'Сейчас играет',plays:'прослушиваний',resetData:'Сбросить данные',language:'Язык',likedTracks:'Лайкнутых треков',listenedTracks:'Прослушано',sendTrack:'Поделиться',copied:'Скопировано!',all:'Все',noRecommended:'Послушай пару треков — подберём рекомендации',queue:'Очередь',addToQueue:'В очередь',sound:'Sound',remix:'Remix',shuffle:'Перемешать',repeatPlaylist:'Повторять',playAll:'Играть',},
};

function fmtPlays(n: number) {
  if (n >= 1000000) return (n/1000000).toFixed(1)+'M';
  if (n >= 1000) return Math.round(n/1000)+'K';
  return n > 0 ? String(n) : '';
}

function Cover({ cover, size, radius }: { cover: string; size: number; radius: number }) {
  const [err, setErr] = useState(false);
  const base: React.CSSProperties = { width: size, height: size, borderRadius: radius, flexShrink: 0, display: 'block' };
  if (cover && !err) return <img src={cover} style={{ ...base, objectFit: 'cover' }} onError={() => setErr(true)} />;
  return <div style={{ ...base, background: '#1a1428', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.floor(size * 0.36) }}>🎵</div>;
}

const GENRES = [
  { id: 'top', label: 'Топ', emoji: '🔥' },
  { id: 'new', label: 'Новинки', emoji: '⚡' },
  { id: 'ru-rap', label: 'RU Рэп', emoji: '🎤' },
  { id: 'hip-hop', label: 'Hip-Hop', emoji: '🎧' },
  { id: 'trap', label: 'Trap', emoji: '💀' },
  { id: 'drill', label: 'Drill', emoji: '🔩' },
  { id: 'electronic', label: 'Electronic', emoji: '⚡' },
  { id: 'rnb', label: 'R&B', emoji: '💜' },
  { id: 'pop', label: 'Pop', emoji: '✨' },
  { id: 'latin', label: 'Latin', emoji: '🌴' },
];

export default function App() {
  const [screen, setScreen] = useState<'home'|'search'|'library'|'trending'|'profile'>('home');
  const [lang, setLang] = useState<'ru'|'en'>('ru');
  const tr = (k: string) => T[lang][k] || k;

  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'sound'|'remix'>('sound');
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
  const [showQueue, setShowQueue] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);

  const [liked, setLiked] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [openPlaylistId, setOpenPlaylistId] = useState<string|null>(null);
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
      const q = localStorage.getItem('queue47'); if (q) setQueue(JSON.parse(q));
    } catch {}
  }, []);

  useEffect(() => {
    if (history.length < 2) return;
    const artists = [...new Set(history.map(t => t.artist))].slice(0, 5);
    fetch(`${WORKER_URL}/search?q=__recommend__${encodeURIComponent(artists.join(','))}`)
      .then(r => r.json()).then(d => { if (d.tracks?.length) setRecommended(d.tracks); }).catch(() => {});
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
    const onE = () => {
      if (loop) { a.currentTime=0; a.play(); }
      else if (queue.length > 0) {
        const next = queue[0];
        setQueue(prev => { const n=prev.slice(1); try{localStorage.setItem('queue47',JSON.stringify(n));}catch{} return n; });
        playTrackDirect(next);
      } else setPlaying(false);
    };
    a.addEventListener('timeupdate', onT); a.addEventListener('ended', onE);
    return () => { a.removeEventListener('timeupdate', onT); a.removeEventListener('ended', onE); };
  }, [current, loop, queue]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);
  useEffect(() => { if (screen === 'trending' && !trendTracks[trendGenre]) loadTrending(trendGenre, true); }, [screen, trendGenre]);

  const playTrackDirect = (track: Track) => {
    if (!track.mp3) return;
    if (audioRef.current) {
      audioRef.current.src = `${WORKER_URL}/stream?url=${encodeURIComponent(track.mp3)}`;
      audioRef.current.play(); setPlaying(true);
    }
    setCurrent(track); setProgress(0); setCurrentTime('0:00');
    setHistory(prev => { const n=[track,...prev.filter(x=>x.id!==track.id)].slice(0,30); try{localStorage.setItem('hist47',JSON.stringify(n));}catch{} return n; });
  };

  const playTrack = (track: Track) => {
    if (!track.mp3) return;
    if (current?.id === track.id) { togglePlay(); return; }
    playTrackDirect(track);
  };

  const addToQueue = (track: Track, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setQueue(prev => { const n=[...prev, track]; try{localStorage.setItem('queue47',JSON.stringify(n));}catch{} return n; });
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); } else { audioRef.current.play(); setPlaying(true); }
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current; if (!a?.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - r.left) / r.width) * a.duration;
  };

  const isLiked = (id: string) => liked.some(t => t.id === id);
  const toggleLike = (track: Track, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLiked(prev => { const has=prev.some(t=>t.id===track.id); const n=has?prev.filter(t=>t.id!==track.id):[track,...prev]; try{localStorage.setItem('liked47',JSON.stringify(n));}catch{} return n; });
  };

  const loadTrending = async (genre = trendGenre, reset = false) => {
    setTrendLoading(true);
    const off = reset ? 0 : (trendOffset[genre] || 0);
    try {
      const r = await fetch(`${WORKER_URL}/trending?genre=${genre}&offset=${off}`);
      const d = await r.json();
      if (d.tracks) {
        setTrendTracks(prev => ({ ...prev, [genre]: reset ? d.tracks : [...(prev[genre]||[]),...d.tracks] }));
        setTrendOffset(prev => ({ ...prev, [genre]: off+1 }));
      }
    } catch {}
    setTrendLoading(false);
  };

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(''); setResults([]);
    try {
      const r = await fetch(`${WORKER_URL}/search?q=${encodeURIComponent(query)}&mode=${searchMode}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      if (!d.tracks?.length) throw new Error(tr('notFound'));
      setResults(d.tracks);
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const pl: Playlist = { id: Date.now().toString(), name: newPlaylistName.trim(), tracks: [], repeat: false };
    setPlaylists(prev => { const n=[...prev,pl]; try{localStorage.setItem('playlists47',JSON.stringify(n));}catch{} return n; });
    setNewPlaylistName(''); setShowAddPlaylist(false);
  };

  const addToPlaylist = (plId: string, track: Track) => {
    setPlaylists(prev => { const n=prev.map(pl=>pl.id===plId&&!pl.tracks.some(t=>t.id===track.id)?{...pl,tracks:[...pl.tracks,track]}:pl); try{localStorage.setItem('playlists47',JSON.stringify(n));}catch{} return n; });
    setShowAddToPlaylist(null);
  };

  const shufflePlaylist = (pl: Playlist) => {
    const shuffled = [...pl.tracks].sort(() => Math.random() - 0.5);
    if (shuffled.length === 0) return;
    playTrack(shuffled[0]);
    setQueue(shuffled.slice(1));
  };

  const playPlaylist = (pl: Playlist) => {
    if (pl.tracks.length === 0) return;
    playTrack(pl.tracks[0]);
    setQueue(pl.tracks.slice(1));
  };

  const shareTrack = (track: Track) => {
    const text = `${track.artist} — ${track.title}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => { setCopiedMsg(true); setTimeout(() => setCopiedMsg(false), 2000); });
    } else if (window.Telegram?.WebApp?.switchInlineQuery) {
      window.Telegram.WebApp.switchInlineQuery(text);
    }
  };

  const changeLang = (l: 'ru'|'en') => { setLang(l); try{localStorage.setItem('lang47',l);}catch{} };

  const HeartBtn = ({ track, size=20 }: { track: Track; size?: number }) => (
    <button onClick={e=>toggleLike(track,e)} style={{background:'none',border:'none',cursor:'pointer',padding:4,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill={isLiked(track.id)?ACC:'none'} stroke={isLiked(track.id)?ACC:'#555'} strokeWidth="2" strokeLinecap="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
      </svg>
    </button>
  );

  const PPIcon = ({ size, col='#fff' }: { size: 'sm'|'lg'; col?: string }) => {
    const h=size==='lg'?20:14, w=size==='lg'?4:3;
    const c=size==='lg'?'#0c0c11':col;
    return playing
      ? <div style={{display:'flex',gap:size==='lg'?4:3}}><div style={{width:w,height:h,background:c,borderRadius:2}}/><div style={{width:w,height:h,background:c,borderRadius:2}}/></div>
      : <div style={{width:0,height:0,borderStyle:'solid',borderWidth:size==='lg'?'10px 0 10px 18px':'7px 0 7px 12px',borderColor:`transparent transparent transparent ${c}`,marginLeft:size==='lg'?3:2}}/>;
  };

  const TrackRow = ({ track, num, swipeable=false }: { track: Track; num?: number; swipeable?: boolean }) => {
    const active = current?.id === track.id;
    const startX = useRef(0);
    const onTouchStart = swipeable ? (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; } : undefined;
    const onTouchEnd = swipeable ? (e: React.TouchEvent) => { if (e.changedTouches[0].clientX - startX.current > 60) addToQueue(track); } : undefined;
    return (
      <div onClick={()=>playTrack(track)} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{display:'flex',alignItems:'center',gap:12,padding:'9px 12px',borderRadius:14,cursor:'pointer',marginBottom:2,background:active?ACC_DIM:'transparent',transition:'background 0.15s'}}>
        {num!==undefined && <div style={{fontSize:13,color:active?ACC:'#555',width:22,flexShrink:0,textAlign:'right'}}>{num}</div>}
        <div style={{position:'relative',flexShrink:0}}>
          <Cover cover={track.cover} size={48} radius={11}/>
          {active && <div style={{position:'absolute',inset:0,borderRadius:11,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{playing?'⏸':'▶'}</div>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:500,color:active?ACC:'#e0e0ec',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{track.title}</div>
          <div style={{display:'flex',alignItems:'center',gap:5,marginTop:2}}>
            <span style={{fontSize:12,color:'#666',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:110}}>{track.artist}</span>
            {track.plays>0 && <span style={{fontSize:11,color:'#444',flexShrink:0}}>· {fmtPlays(track.plays)}</span>}
          </div>
        </div>
        <HeartBtn track={track}/>
        <button onClick={e=>{e.stopPropagation();setShowAddToPlaylist(track);}} style={{background:'none',border:'none',cursor:'pointer',padding:4,flexShrink:0}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <div style={{fontSize:12,color:'#444',flexShrink:0}}>{track.duration}</div>
      </div>
    );
  };

  const AddToPlaylistModal = ({ track }: { track: Track }) => (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'flex-end',zIndex:300}} onClick={()=>setShowAddToPlaylist(null)}>
      <div style={{background:'#161622',width:'100%',borderRadius:'20px 20px 0 0',padding:'20px 16px 40px'}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:16,fontWeight:600,color:'#f0f0f8',marginBottom:16}}>{tr('addToPlaylist')}</div>
        {playlists.length===0
          ? <div style={{color:'#555',fontSize:14,textAlign:'center',padding:'20px 0'}}>{tr('noPlaylists')}</div>
          : playlists.map(pl=>(
            <div key={pl.id} onClick={()=>addToPlaylist(pl.id,track)} style={{padding:'12px 14px',borderRadius:12,background:'#1e1e2e',marginBottom:8,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{color:'#e0e0ec',fontSize:14}}>{pl.name}</span>
              <span style={{color:'#555',fontSize:12}}>{pl.tracks.length}</span>
            </div>
          ))
        }
        <button onClick={()=>setShowAddToPlaylist(null)} style={{width:'100%',padding:'12px',background:'#1e1e2e',border:'none',borderRadius:12,color:'#777',fontSize:14,cursor:'pointer',marginTop:4}}>{tr('cancel')}</button>
      </div>
    </div>
  );

  const NAV = [
    {id:'home',label:tr('home'),icon:(a:boolean)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#555'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>},
    {id:'search',label:tr('search'),icon:(a:boolean)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#555'} strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>},
    {id:'library',label:tr('library'),icon:(a:boolean)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#555'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>},
    {id:'trending',label:tr('trending'),icon:(a:boolean)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#555'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>},
  ];

  // ── FULL PLAYER ─────────────────────────────────────────────────────────────
  if (fullPlayer && current) return (
    <div style={{background:'#0c0c11',minHeight:'100vh',width:'100%',display:'flex',flexDirection:'column',alignItems:'center',padding:'0 24px 40px',fontFamily:"-apple-system,'SF Pro Display',sans-serif",boxSizing:'border-box'}}>
      <audio ref={audioRef}/>

      {/* Queue panel */}
      {showQueue && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:200,display:'flex',alignItems:'flex-end'}} onClick={()=>setShowQueue(false)}>
          <div style={{background:'#161622',width:'100%',borderRadius:'20px 20px 0 0',padding:'20px 16px 40px',maxHeight:'70vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:600,color:'#f0f0f8',marginBottom:4}}>{tr('queue')}</div>
            <div style={{fontSize:12,color:'#555',marginBottom:14}}>{queue.length} треков</div>
            {queue.length===0
              ? <div style={{color:'#555',fontSize:14,textAlign:'center',padding:'20px 0'}}>Очередь пустая</div>
              : queue.map((t,i)=>(
                <div key={t.id+i} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 0',borderBottom:'1px solid #1e1e2e',cursor:'pointer'}} onClick={()=>{setQueue(prev=>prev.slice(i+1));playTrackDirect(t);setShowQueue(false);}}>
                  <Cover cover={t.cover} size={40} radius={8}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,color:'#e0e0ec',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.title}</div>
                    <div style={{fontSize:11,color:'#666'}}>{t.artist}</div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();setQueue(prev=>prev.filter((_,j)=>j!==i));}} style={{background:'none',border:'none',cursor:'pointer',padding:4,color:'#555',fontSize:16}}>×</button>
                </div>
              ))
            }
          </div>
        </div>
      )}

      <div style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:48,paddingBottom:16}}>
        <button onClick={()=>setFullPlayer(false)} style={{background:'none',border:'none',cursor:'pointer',padding:8}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{fontSize:12,color:'#666',letterSpacing:1.5,textTransform:'uppercase'}}>{tr('nowPlaying')}</span>
        <button onClick={()=>setShowQueue(true)} style={{background:'none',border:'none',cursor:'pointer',padding:8,position:'relative'}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={queue.length>0?ACC:'#777'} strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          {queue.length>0 && <span style={{position:'absolute',top:4,right:4,background:ACC,color:'#0c0c11',fontSize:9,fontWeight:700,borderRadius:'50%',width:14,height:14,display:'flex',alignItems:'center',justifyContent:'center'}}>{queue.length}</span>}
        </button>
      </div>

      <div style={{width:'100%',display:'flex',justifyContent:'center'}}>
        <Cover cover={current.cover} size={Math.min(window.innerWidth-80,280)} radius={24}/>
      </div>

      <div style={{width:'100%',marginTop:24}}>
        <div style={{fontSize:22,fontWeight:600,color:'#f0f0f8',letterSpacing:-0.4,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{current.title}</div>
        <div style={{fontSize:15,color:'#777',marginTop:4}}>{current.artist}</div>
        {current.plays>0 && <div style={{fontSize:12,color:'#444',marginTop:3}}>{fmtPlays(current.plays)} {tr('plays')}</div>}
      </div>

      {/* Action row */}
      <div style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:18}}>
        <div style={{display:'flex',gap:4,alignItems:'center'}}>
          <HeartBtn track={current} size={26}/>
          <button onClick={()=>setShowAddToPlaylist(current)} style={{background:'none',border:'none',cursor:'pointer',padding:6}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>
        <div style={{display:'flex',gap:4,alignItems:'center'}}>
          <button onClick={()=>setLoop(!loop)} style={{background:'none',border:'none',cursor:'pointer',padding:6}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={loop?ACC:'#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
          </button>
          <button onClick={()=>shareTrack(current)} style={{background:'none',border:'none',cursor:'pointer',padding:6}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
      </div>
      {copiedMsg && <div style={{fontSize:12,color:ACC,marginTop:4,alignSelf:'flex-start'}}>{tr('copied')}</div>}

      {/* Progress - taller hit area */}
      <div style={{width:'100%',marginTop:18}}>
        <div onClick={seekTo} style={{height:20,display:'flex',alignItems:'center',cursor:'pointer',marginBottom:6}}>
          <div style={{width:'100%',height:4,background:'#1e1228',borderRadius:2,position:'relative'}}>
            <div style={{width:`${progress}%`,height:'100%',background:ACC,borderRadius:2,transition:'width 0.3s linear'}}/>
            <div style={{position:'absolute',top:'50%',left:`${progress}%`,transform:'translate(-50%,-50%)',width:14,height:14,background:ACC,borderRadius:'50%',boxShadow:`0 0 6px ${ACC}88`}}/>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#555'}}>
          <span>{currentTime}</span><span>{current.duration}</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:36,marginTop:20,width:'100%'}}>
        <button style={{background:'none',border:'none',cursor:'pointer',opacity:0.4}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
        </button>
        <button onClick={togglePlay} style={{width:66,height:66,borderRadius:'50%',background:ACC,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
          <PPIcon size="lg"/>
        </button>
        <button style={{background:'none',border:'none',cursor:'pointer',opacity:0.4}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
        </button>
      </div>

      {/* Volume - taller hit area */}
      <div style={{width:'100%',marginTop:24,display:'flex',alignItems:'center',gap:12}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>
        <div style={{flex:1,height:24,display:'flex',alignItems:'center',cursor:'pointer'}}
          onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setVolume(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)));}}>
          <div style={{width:'100%',height:4,background:'#1e1228',borderRadius:2,position:'relative'}}>
            <div style={{width:`${volume*100}%`,height:'100%',background:ACC,borderRadius:2}}/>
            <div style={{position:'absolute',top:'50%',left:`${volume*100}%`,transform:'translate(-50%,-50%)',width:14,height:14,background:ACC,borderRadius:'50%'}}/>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>
      </div>

      {showAddToPlaylist && <AddToPlaylistModal track={showAddToPlaylist}/>}
    </div>
  );

  // ── MAIN ────────────────────────────────────────────────────────────────────
  const MINI_H = 68; // мини-плеер высота
  const NAV_H = 64;  // навбар высота

  return (
    <div style={{background:'#0c0c11',minHeight:'100vh',width:'100%',fontFamily:"-apple-system,'SF Pro Display',sans-serif",position:'relative',boxSizing:'border-box'}}>
      <audio ref={audioRef}/>

      <div style={{paddingBottom: current ? MINI_H + NAV_H + 16 : NAV_H + 8, minHeight:'100vh'}}>

        {/* HOME */}
        {screen==='home' && (
          <div>
            <div style={{padding:'48px 16px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:13,color:'#666'}}>{tr('welcome')}</div>
                <div style={{fontSize:24,fontWeight:700,color:'#f0f0f8',marginTop:2,letterSpacing:-0.5}}>Forty7</div>
              </div>
              <button onClick={()=>setScreen('profile')} style={{width:38,height:38,borderRadius:'50%',background:ACC_DIM,border:`1px solid ${ACC}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:ACC,cursor:'pointer',flexShrink:0}}>
                {userInitial}
              </button>
            </div>

            {history.length>0 && (
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px 12px'}}>
                  <div style={{fontSize:16,fontWeight:600,color:'#e8e8f0'}}>{tr('recent')}</div>
                  <div style={{fontSize:13,color:ACC,cursor:'pointer'}} onClick={()=>setScreen('library')}>{tr('all')}</div>
                </div>
                <div style={{display:'flex',gap:12,padding:'0 16px',overflowX:'auto',scrollbarWidth:'none' as any}}>
                  {history.slice(0,8).map(track=>(
                    <div key={track.id} onClick={()=>playTrack(track)}
                      style={{width:108,borderRadius:14,background:'#141420',border:'1px solid #1e1e2e',overflow:'hidden',cursor:'pointer',flexShrink:0}}>
                      <div style={{width:108,height:108,overflow:'hidden',flexShrink:0}}>
                        <Cover cover={track.cover} size={108} radius={0}/>
                      </div>
                      <div style={{padding:'7px 9px 9px',width:'100%',boxSizing:'border-box'}}>
                        <div style={{fontSize:11,fontWeight:500,color:'#ddd',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{track.artist}</div>
                        <div style={{fontSize:10,color:'#666',marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{track.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{padding:'18px 16px 12px'}}>
              <div style={{fontSize:16,fontWeight:600,color:'#e8e8f0'}}>{tr('recommended')}</div>
            </div>
            {recommended.length===0 && history.length<2
              ? <div style={{padding:'0 16px 12px',fontSize:13,color:'#444'}}>{tr('noRecommended')}</div>
              : <div style={{padding:'0 4px'}}>
                  {(recommended.length>0?recommended:history).slice(0,8).map((track,i)=>(
                    <TrackRow key={track.id} track={track} num={i+1} swipeable/>
                  ))}
                </div>
            }
          </div>
        )}

        {/* SEARCH */}
        {screen==='search' && (
          <div>
            <div style={{padding:'48px 16px 12px'}}>
              <div style={{fontSize:24,fontWeight:700,color:'#f0f0f8',marginBottom:14,letterSpacing:-0.5}}>{tr('search')}</div>
              <div style={{display:'flex',gap:10}}>
                <input type="text" placeholder={tr('searchPlaceholder')} value={query}
                  onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch()}
                  style={{flex:1,padding:'12px 16px',fontSize:15,background:'#141420',border:'1px solid #252535',borderRadius:14,color:'#f0f0f8',outline:'none',width:'100%',boxSizing:'border-box' as any}}/>
                <button onClick={doSearch} disabled={loading}
                  style={{padding:'12px 16px',background:loading?'#222':ACC,color:loading?'#555':'#0c0c11',border:'none',borderRadius:14,fontSize:14,fontWeight:600,cursor:loading?'not-allowed':'pointer',flexShrink:0}}>
                  {loading?'...':tr('find')}
                </button>
              </div>
              {/* Sound / Remix tabs */}
              <div style={{display:'flex',gap:8,marginTop:12}}>
                {(['sound','remix'] as const).map(m=>(
                  <button key={m} onClick={()=>{setSearchMode(m);setResults([]);}}
                    style={{padding:'7px 20px',borderRadius:20,border:'none',background:searchMode===m?ACC:ACC_DIM,color:searchMode===m?'#0c0c11':ACC,fontSize:13,fontWeight:searchMode===m?600:400,cursor:'pointer'}}>
                    {m==='sound'?tr('sound'):tr('remix')}
                  </button>
                ))}
                {searchMode==='sound' && <span style={{fontSize:12,color:'#444',alignSelf:'center'}}>оригиналы</span>}
                {searchMode==='remix' && <span style={{fontSize:12,color:'#444',alignSelf:'center'}}>speed up · slowed · remix</span>}
              </div>
              {error && <div style={{marginTop:10,padding:'10px 14px',background:'#1a0a0a',border:'1px solid #3a1515',borderRadius:12,color:'#ff7070',fontSize:13}}>{error}</div>}
            </div>
            <div style={{padding:'0 4px'}}>
              {results.map((track,i)=><TrackRow key={track.id} track={track} num={i+1} swipeable/>)}
            </div>
          </div>
        )}

        {/* LIBRARY */}
        {screen==='library' && (
          <div>
            <div style={{padding:'48px 16px 14px'}}>
              <div style={{fontSize:24,fontWeight:700,color:'#f0f0f8',letterSpacing:-0.5}}>{tr('library')}</div>
            </div>
            <div style={{display:'flex',gap:8,padding:'0 16px 16px'}}>
              {(['liked','playlists'] as const).map(tab=>(
                <button key={tab} onClick={()=>setLibTab(tab)} style={{padding:'7px 18px',borderRadius:20,border:'none',background:libTab===tab?ACC:ACC_DIM,color:libTab===tab?'#0c0c11':ACC,fontSize:13,fontWeight:libTab===tab?600:400,cursor:'pointer'}}>
                  {tab==='liked'?tr('liked'):tr('playlists')}
                </button>
              ))}
            </div>

            {libTab==='liked' && (
              liked.length===0
                ? <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:60,color:'#444'}}>
                    <div style={{fontSize:44,marginBottom:14}}>🎵</div>
                    <div style={{fontSize:15,color:'#555'}}>{tr('noLiked')}</div>
                  </div>
                : <div style={{padding:'0 4px'}}>{liked.map((track,i)=><TrackRow key={track.id} track={track} num={i+1} swipeable/>)}</div>
            )}

            {libTab==='playlists' && (
              <div style={{padding:'0 16px'}}>
                <button onClick={()=>setShowAddPlaylist(true)} style={{width:'100%',padding:'12px',background:ACC_DIM,border:`1px dashed ${ACC}55`,borderRadius:14,color:ACC,fontSize:14,cursor:'pointer',marginBottom:12,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  {tr('createPlaylist')}
                </button>
                {showAddPlaylist && (
                  <div style={{background:'#141420',border:'1px solid #252535',borderRadius:14,padding:'14px',marginBottom:12}}>
                    <input autoFocus placeholder={tr('playlistName')} value={newPlaylistName}
                      onChange={e=>setNewPlaylistName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createPlaylist()}
                      style={{width:'100%',padding:'10px 14px',fontSize:14,background:'#0c0c11',border:'1px solid #252535',borderRadius:10,color:'#f0f0f8',outline:'none',boxSizing:'border-box' as any,marginBottom:10}}/>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={createPlaylist} style={{flex:1,padding:'10px',background:ACC,border:'none',borderRadius:10,color:'#0c0c11',fontSize:14,fontWeight:600,cursor:'pointer'}}>{tr('create')}</button>
                      <button onClick={()=>{setShowAddPlaylist(false);setNewPlaylistName('');}} style={{flex:1,padding:'10px',background:'#1e1e2e',border:'none',borderRadius:10,color:'#777',fontSize:14,cursor:'pointer'}}>{tr('cancel')}</button>
                    </div>
                  </div>
                )}

                {playlists.map(pl=>{
                  const isOpen = openPlaylistId === pl.id;
                  return (
                    <div key={pl.id} style={{background:'#111118',border:'1px solid #1a1a26',borderRadius:16,marginBottom:10,overflow:'hidden'}}>
                      {/* Playlist header */}
                      <div onClick={()=>setOpenPlaylistId(isOpen?null:pl.id)} style={{padding:'14px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:12}}>
                        {/* Mosaic cover */}
                        <div style={{width:52,height:52,borderRadius:10,overflow:'hidden',flexShrink:0,display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:'#1a1428'}}>
                          {pl.tracks.slice(0,4).map((t,i)=>(
                            <div key={i} style={{width:'100%',height:'100%',overflow:'hidden'}}>
                              <Cover cover={t.cover} size={26} radius={0}/>
                            </div>
                          ))}
                          {pl.tracks.length===0 && <div style={{gridColumn:'span 2',gridRow:'span 2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🎵</div>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:15,fontWeight:600,color:'#e0e0ec'}}>{pl.name}</div>
                          <div style={{fontSize:12,color:'#555',marginTop:2}}>{pl.tracks.length} треков</div>
                        </div>
                        {/* Play button */}
                        <button onClick={e=>{e.stopPropagation();playPlaylist(pl);}} style={{width:38,height:38,borderRadius:'50%',background:ACC,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
                          <div style={{width:0,height:0,borderStyle:'solid',borderWidth:'7px 0 7px 12px',borderColor:`transparent transparent transparent #0c0c11`,marginLeft:2}}/>
                        </button>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" style={{transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.2s'}}><polyline points="6 9 12 15 18 9"/></svg>
                      </div>

                      {/* Expanded */}
                      {isOpen && (
                        <div>
                          {/* Controls */}
                          <div style={{display:'flex',gap:8,padding:'0 16px 12px'}}>
                            <button onClick={()=>shufflePlaylist(pl)} style={{flex:1,padding:'9px',background:ACC_DIM,border:'none',borderRadius:10,color:ACC,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
                              {tr('shuffle')}
                            </button>
                            <button onClick={()=>setPlaylists(prev=>{const n=prev.map(p=>p.id===pl.id?{...p,repeat:!p.repeat}:p);try{localStorage.setItem('playlists47',JSON.stringify(n));}catch{}return n;})}
                              style={{flex:1,padding:'9px',background:pl.repeat?ACC:ACC_DIM,border:'none',borderRadius:10,color:pl.repeat?'#0c0c11':ACC,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={pl.repeat?'#0c0c11':ACC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
                              {tr('repeatPlaylist')}
                            </button>
                          </div>
                          {/* Tracks */}
                          <div style={{borderTop:'1px solid #1a1a26'}}>
                            {pl.tracks.length===0
                              ? <div style={{padding:'20px',textAlign:'center',color:'#444',fontSize:13}}>Нет треков</div>
                              : pl.tracks.map((track,i)=>(
                                <div key={track.id} onClick={()=>{playTrack(track);setQueue(pl.tracks.slice(i+1));}} style={{display:'flex',alignItems:'center',gap:12,padding:'9px 16px',cursor:'pointer',background:current?.id===track.id?ACC_DIM:'transparent',borderBottom:'1px solid #1a1a26'}}>
                                  <Cover cover={track.cover} size={42} radius={8}/>
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:13,color:current?.id===track.id?ACC:'#e0e0ec',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{track.title}</div>
                                    <div style={{fontSize:11,color:'#666',marginTop:1}}>{track.artist}</div>
                                  </div>
                                  <div style={{fontSize:11,color:'#444'}}>{track.duration}</div>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TRENDING */}
        {screen==='trending' && (()=>{
          const currentTracks = trendTracks[trendGenre] || [];
          return (
            <div>
              <div style={{padding:'48px 16px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:24,fontWeight:700,color:'#f0f0f8',letterSpacing:-0.5}}>{tr('trending')}</div>
                <button onClick={()=>loadTrending(trendGenre,true)} style={{background:'none',border:'none',cursor:'pointer',padding:4}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                </button>
              </div>
              <div style={{display:'flex',gap:8,padding:'0 16px 16px',overflowX:'auto',scrollbarWidth:'none' as any}}>
                {GENRES.map(g=>(
                  <button key={g.id} onClick={()=>setTrendGenre(g.id)}
                    style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'10px 14px',borderRadius:16,border:trendGenre===g.id?`1.5px solid ${ACC}`:'1.5px solid #1e1e2a',background:trendGenre===g.id?ACC_DIM:'#111118',color:trendGenre===g.id?ACC:'#888',cursor:'pointer',flexShrink:0,minWidth:64,transition:'all 0.15s'}}>
                    <span style={{fontSize:22}}>{g.emoji}</span>
                    <span style={{fontSize:11,fontWeight:trendGenre===g.id?600:400,whiteSpace:'nowrap'}}>{g.label}</span>
                  </button>
                ))}
              </div>
              {trendLoading && currentTracks.length===0
                ? <div style={{display:'flex',alignItems:'center',justifyContent:'center',paddingTop:80}}><div style={{fontSize:14,color:'#555'}}>{tr('loading')}</div></div>
                : currentTracks.length===0
                  ? <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'60px 20px 0',textAlign:'center'}}>
                      <div style={{fontSize:44,marginBottom:14}}>📈</div>
                      <div style={{fontSize:15,color:'#555'}}>{tr('notFound')}</div>
                      <button onClick={()=>loadTrending(trendGenre,true)} style={{marginTop:16,padding:'10px 24px',background:ACC_DIM,border:'none',borderRadius:12,color:ACC,fontSize:14,cursor:'pointer'}}>{tr('retry')}</button>
                    </div>
                  : <div>
                      <div style={{padding:'0 4px'}}>
                        {currentTracks.map((track,i)=><TrackRow key={track.id+i} track={track} num={i+1} swipeable/>)}
                      </div>
                      <div style={{padding:'12px 16px 8px',display:'flex',justifyContent:'center'}}>
                        <button onClick={()=>loadTrending(trendGenre,false)} disabled={trendLoading}
                          style={{padding:'11px 40px',background:ACC_DIM,border:`1px solid ${ACC}33`,borderRadius:14,color:ACC,fontSize:14,cursor:trendLoading?'not-allowed':'pointer',opacity:trendLoading?0.5:1}}>
                          {trendLoading?tr('loading'):tr('loadMore')}
                        </button>
                      </div>
                    </div>
              }
            </div>
          );
        })()}

        {/* PROFILE */}
        {screen==='profile' && (
          <div>
            <div style={{padding:'48px 16px 24px',display:'flex',alignItems:'center',gap:4}}>
              <button onClick={()=>setScreen('home')} style={{background:'none',border:'none',cursor:'pointer',padding:'4px 8px 4px 0'}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div style={{fontSize:20,fontWeight:600,color:'#f0f0f8'}}>{tr('profile')}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'0 16px 24px'}}>
              <div style={{width:80,height:80,borderRadius:'50%',background:ACC_DIM,border:`2px solid ${ACC}55`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,fontWeight:700,color:ACC,marginBottom:14}}>{userInitial}</div>
              <div style={{fontSize:20,fontWeight:600,color:'#f0f0f8'}}>{userName}</div>
              {tgUser?.username && <div style={{fontSize:14,color:'#666',marginTop:4}}>@{tgUser.username}</div>}
            </div>
            <div style={{padding:'0 16px'}}>
              {[{label:tr('likedTracks'),value:liked.length},{label:tr('playlists'),value:playlists.length},{label:tr('listenedTracks'),value:history.length}].map(item=>(
                <div key={item.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 0',borderBottom:'1px solid #1a1a26'}}>
                  <span style={{fontSize:15,color:'#bbb'}}>{item.label}</span>
                  <span style={{fontSize:15,fontWeight:600,color:ACC}}>{item.value}</span>
                </div>
              ))}
              <div style={{padding:'18px 0 8px'}}>
                <div style={{fontSize:13,color:'#666',marginBottom:10,textTransform:'uppercase' as any,letterSpacing:1}}>{tr('language')}</div>
                <div style={{display:'flex',gap:8}}>
                  {(['ru','en'] as const).map(l=>(
                    <button key={l} onClick={()=>changeLang(l)} style={{flex:1,padding:'11px',borderRadius:12,border:'none',background:lang===l?ACC:'#141420',color:lang===l?'#0c0c11':'#888',fontSize:14,fontWeight:lang===l?600:400,cursor:'pointer'}}>
                      {l==='ru'?'🇷🇺 Русский':'🇺🇸 English'}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={()=>{try{localStorage.clear();}catch{}setLiked([]);setPlaylists([]);setHistory([]);setRecommended([]);setQueue([]);}}
                style={{width:'100%',marginTop:16,padding:'13px',background:'#1a0a0a',border:'1px solid #3a1515',borderRadius:14,color:'#ff7070',fontSize:14,cursor:'pointer'}}>
                {tr('resetData')}
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddToPlaylist && !fullPlayer && <AddToPlaylistModal track={showAddToPlaylist}/>}

      {/* MINI PLAYER — sits above nav, doesn't overlap */}
      {current && (
        <div onClick={()=>setFullPlayer(true)}
          style={{position:'fixed',bottom:NAV_H+8,left:10,right:10,background:'#18121e',border:`1px solid ${ACC}33`,borderRadius:18,padding:'10px 14px 12px',cursor:'pointer',zIndex:100}}>
          <div style={{height:2,background:'#1e1228',borderRadius:1,marginBottom:10,overflow:'hidden'}}>
            <div style={{width:`${progress}%`,height:'100%',background:ACC,borderRadius:1,transition:'width 0.3s linear'}}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <Cover cover={current.cover} size={40} radius={9}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:500,color:'#f0f0f8',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{current.title}</div>
              <div style={{display:'flex',alignItems:'center',gap:5}}>
                <span style={{fontSize:12,color:'#888'}}>{current.artist}</span>
                {current.plays>0 && <span style={{fontSize:11,color:'#444'}}>· {fmtPlays(current.plays)}</span>}
              </div>
            </div>
            <button onClick={e=>{e.stopPropagation();togglePlay();}}
              style={{width:36,height:36,borderRadius:'50%',background:ACC,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
              <PPIcon size="sm"/>
            </button>
          </div>
        </div>
      )}

      {/* NAV */}
      {screen!=='profile' && (
        <div style={{position:'fixed',bottom:0,left:0,right:0,background:'#0c0c11',borderTop:'1px solid #1a1a22',padding:'10px 0 16px',display:'flex',justifyContent:'space-around',zIndex:101,height:NAV_H}}>
          {NAV.map(item=>(
            <div key={item.id} onClick={()=>setScreen(item.id as any)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:'pointer',padding:'0 10px'}}>
              {item.icon(screen===item.id)}
              <span style={{fontSize:10,color:screen===item.id?ACC:'#555'}}>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
