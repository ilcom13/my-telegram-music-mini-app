import { useState, useEffect, useRef } from 'react';
declare global { interface Window { Telegram: any; } }

const WORKER_URL = 'https://square-queen-e703.shapovaliluha.workers.dev';
const ACC = '#E28EFE';
const ACC_DIM = 'rgba(226,142,254,0.12)';

interface Track { id: string; title: string; artist: string; cover: string; duration: string; plays: number; mp3: string | null; }
interface Playlist { id: string; name: string; tracks: Track[]; }

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

const NAV = [
  { id: 'home', label: 'Главная', icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#555'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg> },
  { id: 'search', label: 'Поиск', icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#555'} strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
  { id: 'library', label: 'Библиотека', icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#555'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg> },
  { id: 'trending', label: 'Тренды', icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#555'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
];

export default function App() {
  const [screen, setScreen] = useState<'home'|'search'|'library'|'trending'|'profile'>('home');
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
  const [trending, setTrending] = useState<Track[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [libTab, setLibTab] = useState<'liked'|'playlists'>('liked');
  const [showAddPlaylist, setShowAddPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showAddToPlaylist, setShowAddToPlaylist] = useState<Track|null>(null);
  const audioRef = useRef<HTMLAudioElement|null>(null);

  // Telegram user
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
    } catch {}
  }, []);

  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    const onT = () => {
      if (a.duration) { setProgress(a.currentTime/a.duration*100); const m=Math.floor(a.currentTime/60),s=Math.floor(a.currentTime%60); setCurrentTime(`${m}:${s.toString().padStart(2,'0')}`); }
    };
    const onE = () => { if (loop) { a.currentTime=0; a.play(); } else setPlaying(false); };
    a.addEventListener('timeupdate', onT); a.addEventListener('ended', onE);
    return () => { a.removeEventListener('timeupdate', onT); a.removeEventListener('ended', onE); };
  }, [current, loop]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  const loadTrending = async () => {
    setTrendLoading(true);
    try {
      const r = await fetch(`${WORKER_URL}/trending`);
      const d = await r.json();
      if (d.tracks) setTrending(d.tracks);
    } catch {}
    setTrendLoading(false);
  };

  useEffect(() => { if (screen === 'trending' && trending.length === 0) loadTrending(); }, [screen]);

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
    if (current?.id === track.id) { togglePlay(); return; }
    if (audioRef.current) { audioRef.current.src = `${WORKER_URL}/stream?url=${encodeURIComponent(track.mp3)}`; audioRef.current.play(); setPlaying(true); }
    setCurrent(track); setProgress(0); setCurrentTime('0:00');
    setHistory(prev => { const n=[track,...prev.filter(t=>t.id!==track.id)].slice(0,20); try{localStorage.setItem('hist47',JSON.stringify(n));}catch{} return n; });
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); } else { audioRef.current.play(); setPlaying(true); }
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current; if (!a?.duration) return;
    const r = e.currentTarget.getBoundingClientRect(); a.currentTime = ((e.clientX-r.left)/r.width)*a.duration;
  };

  const isLiked = (id: string) => liked.some(t=>t.id===id);

  const toggleLike = (track: Track, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLiked(prev => { const has=prev.some(t=>t.id===track.id); const n=has?prev.filter(t=>t.id!==track.id):[track,...prev]; try{localStorage.setItem('liked47',JSON.stringify(n));}catch{} return n; });
  };

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const pl: Playlist = { id: Date.now().toString(), name: newPlaylistName.trim(), tracks: [] };
    setPlaylists(prev => { const n=[...prev,pl]; try{localStorage.setItem('playlists47',JSON.stringify(n));}catch{} return n; });
    setNewPlaylistName(''); setShowAddPlaylist(false);
  };

  const addToPlaylist = (plId: string, track: Track) => {
    setPlaylists(prev => {
      const n = prev.map(pl => pl.id===plId && !pl.tracks.some(t=>t.id===track.id) ? {...pl,tracks:[...pl.tracks,track]} : pl);
      try{localStorage.setItem('playlists47',JSON.stringify(n));}catch{} return n;
    });
    setShowAddToPlaylist(null);
  };

  const PPIcon = ({ size }: { size: 'sm'|'lg' }) => {
    const h=size==='lg'?20:14, w=size==='lg'?4:3;
    return playing
      ? <div style={{display:'flex',gap:size==='lg'?4:3}}><div style={{width:w,height:h,background:'#0c0c11',borderRadius:2}}/><div style={{width:w,height:h,background:'#0c0c11',borderRadius:2}}/></div>
      : <div style={{width:0,height:0,borderStyle:'solid',borderWidth:size==='lg'?'10px 0 10px 18px':'7px 0 7px 12px',borderColor:`transparent transparent transparent ${size==='lg'?'#0c0c11':'#fff'}`,marginLeft:size==='lg'?3:2}}/>;
  };

  const HeartBtn = ({ track, size=20 }: { track: Track; size?: number }) => (
    <button onClick={e=>toggleLike(track,e)} style={{background:'none',border:'none',cursor:'pointer',padding:4,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill={isLiked(track.id)?ACC:'none'} stroke={isLiked(track.id)?ACC:'#555'} strokeWidth="2" strokeLinecap="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
      </svg>
    </button>
  );

  const TrackRow = ({ track, num, showPlays=true }: { track: Track; num?: number; showPlays?: boolean }) => {
    const active = current?.id === track.id;
    return (
      <div onClick={()=>playTrack(track)} style={{display:'flex',alignItems:'center',gap:12,padding:'9px 12px',borderRadius:14,cursor:'pointer',marginBottom:2,background:active?ACC_DIM:'transparent'}}>
        {num!==undefined && <div style={{fontSize:13,color:active?ACC:'#555',width:22,flexShrink:0}}>{num}</div>}
        <div style={{position:'relative',flexShrink:0}}>
          <Cover cover={track.cover} size={48} radius={11}/>
          {active && <div style={{position:'absolute',inset:0,borderRadius:11,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{playing?'⏸':'▶'}</div>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:500,color:active?ACC:'#e0e0ec',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{track.title}</div>
          <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2}}>
            <span style={{fontSize:12,color:'#666'}}>{track.artist}</span>
            {showPlays && track.plays>0 && <span style={{fontSize:11,color:'#444'}}>· {fmtPlays(track.plays)}</span>}
          </div>
        </div>
        <HeartBtn track={track}/>
        <button onClick={e=>{e.stopPropagation();setShowAddToPlaylist(track);}} style={{background:'none',border:'none',cursor:'pointer',padding:4,flexShrink:0}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <div style={{fontSize:12,color:'#444',flexShrink:0}}>{track.duration}</div>
      </div>
    );
  };

  // ── FULL PLAYER ─────────────────────────────────────────────────────────────
  if (fullPlayer && current) return (
    <div style={{background:'#0c0c11',minHeight:'100vh',width:'100%',display:'flex',flexDirection:'column',alignItems:'center',padding:'0 24px 40px',fontFamily:"-apple-system,'SF Pro Display',sans-serif",boxSizing:'border-box'}}>
      <audio ref={audioRef}/>
      {/* Header */}
      <div style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:48,paddingBottom:24}}>
        <button onClick={()=>setFullPlayer(false)} style={{background:'none',border:'none',cursor:'pointer',padding:8}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{fontSize:12,color:'#666',letterSpacing:1.5,textTransform:'uppercase'}}>Сейчас играет</span>
        <button onClick={()=>setShowAddToPlaylist(current)} style={{background:'none',border:'none',cursor:'pointer',padding:8}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        </button>
      </div>

      {/* Cover */}
      <div style={{width:'100%',display:'flex',justifyContent:'center'}}>
        <Cover cover={current.cover} size={Math.min(window.innerWidth-80,280)} radius={24}/>
      </div>

      {/* Info + Like */}
      <div style={{width:'100%',marginTop:28,display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
        <div style={{flex:1,minWidth:0,paddingRight:12}}>
          <div style={{fontSize:22,fontWeight:600,color:'#f0f0f8',letterSpacing:-0.4,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{current.title}</div>
          <div style={{fontSize:15,color:'#777',marginTop:4}}>{current.artist}</div>
          {current.plays>0 && <div style={{fontSize:12,color:'#555',marginTop:4}}>{fmtPlays(current.plays)} прослушиваний</div>}
        </div>
        <HeartBtn track={current} size={28}/>
      </div>

      {/* Progress */}
      <div style={{width:'100%',marginTop:24}}>
        <div onClick={seekTo} style={{height:3,background:'#1e1228',borderRadius:2,cursor:'pointer',marginBottom:8}}>
          <div style={{width:`${progress}%`,height:'100%',background:ACC,borderRadius:2,transition:'width 0.3s linear'}}/>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#555'}}>
          <span>{currentTime}</span><span>{current.duration}</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:36,marginTop:28,width:'100%'}}>
        <button style={{background:'none',border:'none',cursor:'pointer',opacity:0.4}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
        </button>
        <button onClick={togglePlay} style={{width:64,height:64,borderRadius:'50%',background:ACC,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
          <PPIcon size="lg"/>
        </button>
        <button style={{background:'none',border:'none',cursor:'pointer',opacity:0.4}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
        </button>
        <button onClick={()=>setLoop(!loop)} style={{background:'none',border:'none',cursor:'pointer',padding:4}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={loop?ACC:'#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
        </button>
      </div>

      {/* Volume */}
      <div style={{width:'100%',marginTop:28,display:'flex',alignItems:'center',gap:12}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>
        <div style={{flex:1,position:'relative',height:3,background:'#1e1228',borderRadius:2,cursor:'pointer'}} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setVolume(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)));}}>
          <div style={{width:`${volume*100}%`,height:'100%',background:ACC,borderRadius:2}}/>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>
      </div>

      {/* Add to playlist modal */}
      {showAddToPlaylist && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'flex-end',zIndex:300}} onClick={()=>setShowAddToPlaylist(null)}>
          <div style={{background:'#161622',width:'100%',borderRadius:'20px 20px 0 0',padding:'20px 20px 40px'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:600,color:'#f0f0f8',marginBottom:16}}>Добавить в плейлист</div>
            {playlists.length===0
              ? <div style={{color:'#555',fontSize:14,marginBottom:16}}>Нет плейлистов. Создай в Библиотеке.</div>
              : playlists.map(pl=>(
                <div key={pl.id} onClick={()=>addToPlaylist(pl.id,showAddToPlaylist)} style={{padding:'12px 14px',borderRadius:12,background:'#1e1e2e',marginBottom:8,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{color:'#e0e0ec',fontSize:14}}>{pl.name}</span>
                  <span style={{color:'#555',fontSize:12}}>{pl.tracks.length} треков</span>
                </div>
              ))
            }
            <button onClick={()=>setShowAddToPlaylist(null)} style={{width:'100%',padding:'12px',background:'#1e1e2e',border:'none',borderRadius:12,color:'#777',fontSize:14,cursor:'pointer',marginTop:4}}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  );

  // ── MAIN ────────────────────────────────────────────────────────────────────
  return (
    <div style={{background:'#0c0c11',minHeight:'100vh',width:'100%',fontFamily:"-apple-system,'SF Pro Display',sans-serif",position:'relative',boxSizing:'border-box'}}>
      <audio ref={audioRef}/>

      <div style={{paddingBottom:current?152:76,minHeight:'100vh'}}>

        {/* HOME */}
        {screen==='home' && (
          <div>
            <div style={{padding:'48px 16px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:13,color:'#666'}}>Добро пожаловать</div>
                <div style={{fontSize:24,fontWeight:600,color:'#f0f0f8',marginTop:2,letterSpacing:-0.4}}>Forty7</div>
              </div>
              <button onClick={()=>setScreen('profile')} style={{width:38,height:38,borderRadius:'50%',background:ACC_DIM,border:`1px solid ${ACC}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:600,color:ACC,cursor:'pointer',flexShrink:0}}>
                {userInitial}
              </button>
            </div>

            {history.length>0 && (
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px 12px'}}>
                  <div style={{fontSize:16,fontWeight:600,color:'#e8e8f0'}}>Недавнее</div>
                  <div style={{fontSize:13,color:ACC,cursor:'pointer'}} onClick={()=>setScreen('library')}>Все</div>
                </div>
                <div style={{display:'flex',gap:12,padding:'0 16px',overflowX:'auto',scrollbarWidth:'none' as any}}>
                  {history.slice(0,6).map(t=>(
                    <div key={t.id} onClick={()=>playTrack(t)} style={{minWidth:112,borderRadius:14,background:'#141420',border:'1px solid #1e1e2e',overflow:'hidden',cursor:'pointer',flexShrink:0}}>
                      <Cover cover={t.cover} size={112} radius={0}/>
                      <div style={{padding:'8px 10px 10px'}}>
                        <div style={{fontSize:12,fontWeight:500,color:'#ddd',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.artist}</div>
                        <div style={{fontSize:11,color:'#666',marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{padding:'18px 16px 12px'}}>
              <div style={{fontSize:16,fontWeight:600,color:'#e8e8f0'}}>В тренде</div>
            </div>
            <div style={{padding:'0 8px',display:'flex',flexDirection:'column',gap:3}}>
              {[{id:'t1',title:'Сакура',artist:'163ONMYNECK',plays:3034589},{id:'t2',title:'Барыга',artist:'madk1d',plays:1400000},{id:'t3',title:'DARK SIDE',artist:'Pharaoh',plays:980000},{id:'t4',title:'Случайная',artist:'LOBODA',plays:750000},{id:'t5',title:'Горгород',artist:'Slava KPSS',plays:620000}].map((t,i)=>(
                <div key={t.id} onClick={()=>{setQuery(t.artist+' '+t.title);setScreen('search');setTimeout(()=>{},100);}} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:14,background:'#111118',border:'1px solid #1a1a26',cursor:'pointer'}}>
                  <div style={{fontSize:13,color:'#555',width:20,flexShrink:0}}>{i+1}</div>
                  <div style={{width:42,height:42,borderRadius:10,background:'#1a1428',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>🎵</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:500,color:'#e0e0ec',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.title}</div>
                    <div style={{fontSize:12,color:'#666',marginTop:1}}>{t.artist}</div>
                  </div>
                  <div style={{fontSize:12,color:'#444',flexShrink:0}}>{fmtPlays(t.plays)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SEARCH */}
        {screen==='search' && (
          <div>
            <div style={{padding:'48px 16px 16px'}}>
              <div style={{fontSize:24,fontWeight:600,color:'#f0f0f8',marginBottom:14,letterSpacing:-0.4}}>Поиск</div>
              <div style={{display:'flex',gap:10}}>
                <input type="text" placeholder="Артист или трек..." value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()}
                  style={{flex:1,padding:'12px 16px',fontSize:15,background:'#141420',border:'1px solid #252535',borderRadius:14,color:'#f0f0f8',outline:'none',width:'100%',boxSizing:'border-box' as any}}/>
                <button onClick={search} disabled={loading} style={{padding:'12px 16px',background:loading?'#222':ACC,color:loading?'#555':'#0c0c11',border:'none',borderRadius:14,fontSize:14,fontWeight:600,cursor:loading?'not-allowed':'pointer',flexShrink:0}}>
                  {loading?'...':'Найти'}
                </button>
              </div>
              {error && <div style={{marginTop:10,padding:'10px 14px',background:'#1a0a0a',border:'1px solid #3a1515',borderRadius:12,color:'#ff7070',fontSize:13}}>{error}</div>}
            </div>
            <div style={{padding:'0 4px'}}>
              {results.map((t,i)=><TrackRow key={t.id} track={t} num={i+1}/>)}
            </div>
          </div>
        )}

        {/* LIBRARY */}
        {screen==='library' && (
          <div>
            <div style={{padding:'48px 16px 14px'}}>
              <div style={{fontSize:24,fontWeight:600,color:'#f0f0f8',letterSpacing:-0.4}}>Библиотека</div>
            </div>
            {/* Tabs */}
            <div style={{display:'flex',gap:8,padding:'0 16px 16px'}}>
              {(['liked','playlists'] as const).map(tab=>(
                <button key={tab} onClick={()=>setLibTab(tab)} style={{padding:'7px 18px',borderRadius:20,border:'none',background:libTab===tab?ACC:ACC_DIM,color:libTab===tab?'#0c0c11':ACC,fontSize:13,fontWeight:500,cursor:'pointer'}}>
                  {tab==='liked'?'Лайкнутые':'Плейлисты'}
                </button>
              ))}
            </div>

            {libTab==='liked' && (
              liked.length===0
                ? <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:60,color:'#444'}}>
                    <div style={{fontSize:44,marginBottom:14}}>🎵</div>
                    <div style={{fontSize:15,color:'#555'}}>Нет лайкнутых треков</div>
                  </div>
                : <div style={{padding:'0 4px'}}>{liked.map((t,i)=><TrackRow key={t.id} track={t} num={i+1}/>)}</div>
            )}

            {libTab==='playlists' && (
              <div style={{padding:'0 16px'}}>
                <button onClick={()=>setShowAddPlaylist(true)} style={{width:'100%',padding:'12px',background:ACC_DIM,border:`1px dashed ${ACC}55`,borderRadius:14,color:ACC,fontSize:14,cursor:'pointer',marginBottom:12,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Создать плейлист
                </button>
                {showAddPlaylist && (
                  <div style={{background:'#141420',border:'1px solid #252535',borderRadius:14,padding:'14px',marginBottom:12}}>
                    <input autoFocus placeholder="Название плейлиста" value={newPlaylistName} onChange={e=>setNewPlaylistName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createPlaylist()}
                      style={{width:'100%',padding:'10px 14px',fontSize:14,background:'#0c0c11',border:'1px solid #252535',borderRadius:10,color:'#f0f0f8',outline:'none',boxSizing:'border-box' as any,marginBottom:10}}/>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={createPlaylist} style={{flex:1,padding:'10px',background:ACC,border:'none',borderRadius:10,color:'#0c0c11',fontSize:14,fontWeight:600,cursor:'pointer'}}>Создать</button>
                      <button onClick={()=>{setShowAddPlaylist(false);setNewPlaylistName('');}} style={{flex:1,padding:'10px',background:'#1e1e2e',border:'none',borderRadius:10,color:'#777',fontSize:14,cursor:'pointer'}}>Отмена</button>
                    </div>
                  </div>
                )}
                {playlists.map(pl=>(
                  <div key={pl.id} style={{background:'#111118',border:'1px solid #1a1a26',borderRadius:14,padding:'14px',marginBottom:8}}>
                    <div style={{fontSize:15,fontWeight:500,color:'#e0e0ec',marginBottom:6}}>{pl.name}</div>
                    <div style={{fontSize:12,color:'#555',marginBottom:pl.tracks.length?10:0}}>{pl.tracks.length} треков</div>
                    {pl.tracks.slice(0,3).map(t=>(
                      <div key={t.id} onClick={()=>playTrack(t)} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0',cursor:'pointer',borderTop:'1px solid #1a1a26'}}>
                        <Cover cover={t.cover} size={36} radius={8}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,color:'#ddd',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.title}</div>
                          <div style={{fontSize:11,color:'#666'}}>{t.artist}</div>
                        </div>
                      </div>
                    ))}
                    {pl.tracks.length>3 && <div style={{fontSize:12,color:'#555',marginTop:6,paddingTop:6,borderTop:'1px solid #1a1a26'}}>+{pl.tracks.length-3} ещё</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TRENDING */}
        {screen==='trending' && (
          <div>
            <div style={{padding:'48px 16px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:24,fontWeight:600,color:'#f0f0f8',letterSpacing:-0.4}}>В тренде</div>
              <button onClick={loadTrending} style={{background:'none',border:'none',cursor:'pointer',padding:4}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
              </button>
            </div>
            {trendLoading
              ? <div style={{display:'flex',alignItems:'center',justifyContent:'center',paddingTop:80}}>
                  <div style={{fontSize:14,color:'#555'}}>Загружаем тренды...</div>
                </div>
              : trending.length===0
                ? <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:60,color:'#444',textAlign:'center',padding:'60px 20px 0'}}>
                    <div style={{fontSize:44,marginBottom:14}}>📈</div>
                    <div style={{fontSize:15,color:'#555'}}>Не удалось загрузить</div>
                    <button onClick={loadTrending} style={{marginTop:16,padding:'10px 24px',background:ACC_DIM,border:'none',borderRadius:12,color:ACC,fontSize:14,cursor:'pointer'}}>Попробовать снова</button>
                  </div>
                : <div style={{padding:'0 4px'}}>{trending.map((t,i)=><TrackRow key={t.id} track={t} num={i+1}/>)}</div>
            }
          </div>
        )}

        {/* PROFILE */}
        {screen==='profile' && (
          <div>
            <div style={{padding:'48px 16px 24px',display:'flex',alignItems:'center',gap:4}}>
              <button onClick={()=>setScreen('home')} style={{background:'none',border:'none',cursor:'pointer',padding:'4px 8px 4px 0'}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div style={{fontSize:20,fontWeight:600,color:'#f0f0f8'}}>Профиль</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'10px 16px 30px'}}>
              <div style={{width:80,height:80,borderRadius:'50%',background:ACC_DIM,border:`2px solid ${ACC}55`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,fontWeight:600,color:ACC,marginBottom:14}}>
                {userInitial}
              </div>
              <div style={{fontSize:20,fontWeight:600,color:'#f0f0f8'}}>{userName}</div>
              {tgUser?.username && <div style={{fontSize:14,color:'#666',marginTop:4}}>@{tgUser.username}</div>}
            </div>
            <div style={{padding:'0 16px'}}>
              {[
                {label:'Лайкнутых треков', value: liked.length},
                {label:'Плейлистов', value: playlists.length},
                {label:'Прослушано треков', value: history.length},
              ].map(item=>(
                <div key={item.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 0',borderBottom:'1px solid #1a1a26'}}>
                  <span style={{fontSize:15,color:'#bbb'}}>{item.label}</span>
                  <span style={{fontSize:15,fontWeight:600,color:ACC}}>{item.value}</span>
                </div>
              ))}
              <button onClick={()=>{try{localStorage.clear();}catch{}setLiked([]);setPlaylists([]);setHistory([]);}} style={{width:'100%',marginTop:24,padding:'13px',background:'#1a0a0a',border:'1px solid #3a1515',borderRadius:14,color:'#ff7070',fontSize:14,cursor:'pointer'}}>
                Сбросить все данные
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ADD TO PLAYLIST MODAL */}
      {showAddToPlaylist && !fullPlayer && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'flex-end',zIndex:300}} onClick={()=>setShowAddToPlaylist(null)}>
          <div style={{background:'#161622',width:'100%',borderRadius:'20px 20px 0 0',padding:'20px 16px 40px'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:600,color:'#f0f0f8',marginBottom:16}}>Добавить в плейлист</div>
            {playlists.length===0
              ? <div style={{color:'#555',fontSize:14,marginBottom:16,textAlign:'center',padding:'20px 0'}}>Нет плейлистов. Создай во вкладке Библиотека.</div>
              : playlists.map(pl=>(
                <div key={pl.id} onClick={()=>addToPlaylist(pl.id,showAddToPlaylist)} style={{padding:'12px 14px',borderRadius:12,background:'#1e1e2e',marginBottom:8,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{color:'#e0e0ec',fontSize:14}}>{pl.name}</span>
                  <span style={{color:'#555',fontSize:12}}>{pl.tracks.length} треков</span>
                </div>
              ))
            }
            <button onClick={()=>setShowAddToPlaylist(null)} style={{width:'100%',padding:'12px',background:'#1e1e2e',border:'none',borderRadius:12,color:'#777',fontSize:14,cursor:'pointer',marginTop:4}}>Отмена</button>
          </div>
        </div>
      )}

      {/* MINI PLAYER */}
      {current && (
        <div onClick={()=>setFullPlayer(true)} style={{position:'fixed',bottom:64,left:10,right:10,background:'#18121e',border:`1px solid ${ACC}33`,borderRadius:18,padding:'10px 14px 12px',cursor:'pointer',zIndex:100}}>
          <div style={{height:2,background:'#1e1228',borderRadius:1,marginBottom:10,overflow:'hidden'}}>
            <div style={{width:`${progress}%`,height:'100%',background:ACC,borderRadius:1,transition:'width 0.3s linear'}}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <Cover cover={current.cover} size={40} radius={9}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:500,color:'#f0f0f8',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{current.title}</div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:12,color:'#888'}}>{current.artist}</span>
                {current.plays>0 && <span style={{fontSize:11,color:'#444'}}>· {fmtPlays(current.plays)}</span>}
              </div>
            </div>
            <button onClick={e=>{e.stopPropagation();togglePlay();}} style={{width:36,height:36,borderRadius:'50%',background:ACC,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
              <PPIcon size="sm"/>
            </button>
          </div>
        </div>
      )}

      {/* NAV */}
      {screen!=='profile' && (
        <div style={{position:'fixed',bottom:0,left:0,right:0,background:'#0c0c11',borderTop:'1px solid #1a1a22',padding:'10px 0 16px',display:'flex',justifyContent:'space-around',zIndex:101}}>
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
