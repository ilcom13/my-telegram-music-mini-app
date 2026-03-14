import { useState, useEffect, useRef } from 'react';

declare global { interface Window { Telegram: any; } }

const WORKER_URL = 'https://square-queen-e703.shapovaliluha.workers.dev';

interface Track {
  id: string; title: string; artist: string;
  cover: string; duration: string; plays: number; mp3: string | null;
}

const NAV_ITEMS = [
  { id: 'home', label: 'Главная', icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?'#C54CFD':'#4a4a5a'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg> },
  { id: 'search', label: 'Поиск', icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?'#C54CFD':'#4a4a5a'} strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
  { id: 'library', label: 'Библиотека', icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?'#C54CFD':'#4a4a5a'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg> },
  { id: 'radio', label: 'Радио', icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?'#C54CFD':'#4a4a5a'} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="2"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><path d="M2 12h20"/></svg> },
];

const TRENDING: Track[] = [
  { id: 't1', title: 'Сакура', artist: '163ONMYNECK', cover: '', duration: '2:26', plays: 3034589, mp3: null },
  { id: 't2', title: 'Барыга', artist: 'madk1d', cover: '', duration: '1:32', plays: 1400000, mp3: null },
  { id: 't3', title: 'DARK SIDE', artist: 'Pharaoh', cover: '', duration: '3:12', plays: 980000, mp3: null },
  { id: 't4', title: 'Случайная', artist: 'LOBODA', cover: '', duration: '3:45', plays: 750000, mp3: null },
  { id: 't5', title: 'Горгород', artist: 'Slava KPSS', cover: '', duration: '4:20', plays: 620000, mp3: null },
];

function fmtPlays(n: number) {
  if (n >= 1000000) return (n/1000000).toFixed(1)+'M';
  if (n >= 1000) return Math.round(n/1000)+'K';
  return String(n);
}

function Cover({ cover, size, radius }: { cover: string, size: number, radius: number }) {
  const [err, setErr] = useState(false);
  const st: React.CSSProperties = { width: size, height: size, borderRadius: radius, flexShrink: 0, display: 'block' };
  if (cover && !err) return <img src={cover} style={{ ...st, objectFit: 'cover' }} onError={() => setErr(true)} />;
  return <div style={{ ...st, background: '#2a1228', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35 }}>🎵</div>;
}

export default function App() {
  const [screen, setScreen] = useState<'home'|'search'|'library'|'radio'>('home');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState<Track|null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [fullPlayer, setFullPlayer] = useState(false);
  const [library, setLibrary] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const audioRef = useRef<HTMLAudioElement|null>(null);

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
    const t = () => { if (a.duration) { setProgress(a.currentTime/a.duration*100); const m=Math.floor(a.currentTime/60),s=Math.floor(a.currentTime%60); setCurrentTime(`${m}:${s.toString().padStart(2,'0')}`); } };
    const e = () => setPlaying(false);
    a.addEventListener('timeupdate', t); a.addEventListener('ended', e);
    return () => { a.removeEventListener('timeupdate', t); a.removeEventListener('ended', e); };
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
    } catch(e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const playTrack = (track: Track) => {
    if (!track.mp3) return;
    if (current?.id === track.id) {
      if (playing) { audioRef.current?.pause(); setPlaying(false); }
      else { audioRef.current?.play(); setPlaying(true); }
      return;
    }
    if (audioRef.current) { audioRef.current.src = `${WORKER_URL}/stream?url=${encodeURIComponent(track.mp3)}`; audioRef.current.play(); setPlaying(true); }
    setCurrent(track); setProgress(0); setCurrentTime('0:00');
    setHistory(prev => { const n=[track,...prev.filter(t=>t.id!==track.id)].slice(0,20); try{localStorage.setItem('hist47',JSON.stringify(n));}catch{} return n; });
  };

  const toggleLib = (track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    setLibrary(prev => { const h=prev.some(t=>t.id===track.id); const n=h?prev.filter(t=>t.id!==track.id):[track,...prev]; try{localStorage.setItem('lib47',JSON.stringify(n));}catch{} return n; });
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const a=audioRef.current; if(!a?.duration) return;
    const r=e.currentTarget.getBoundingClientRect(); a.currentTime=((e.clientX-r.left)/r.width)*a.duration;
  };

  const inLib = (id: string) => library.some(t=>t.id===id);

  const PlayBtn = ({ size, style }: { size: number, style?: React.CSSProperties }) => (
    <button onClick={e=>{e.stopPropagation();if(playing){audioRef.current?.pause();setPlaying(false);}else{audioRef.current?.play();setPlaying(true);}}}
      style={{ width:size, height:size, borderRadius:'50%', background:'linear-gradient(135deg,#C54CFD,#9b2ee8)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, ...style }}>
      {playing
        ? <div style={{display:'flex',gap:size>50?4:3}}><div style={{width:size>50?4:3,height:size>50?20:14,background:'#fff',borderRadius:2}}/><div style={{width:size>50?4:3,height:size>50?20:14,background:'#fff',borderRadius:2}}/></div>
        : <div style={{width:0,height:0,borderStyle:'solid',borderWidth:`${size>50?10:7}px 0 ${size>50?10:7}px ${size>50?18:13}px`,borderColor:'transparent transparent transparent #fff',marginLeft:size>50?4:3}}/>
      }
    </button>
  );

  const HeartBtn = ({ track }: { track: Track }) => (
    <button onClick={e=>toggleLib(track,e)} style={{background:'none',border:'none',cursor:'pointer',padding:4,flexShrink:0}}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill={inLib(track.id)?'#C54CFD':'none'} stroke={inLib(track.id)?'#C54CFD':'#444'} strokeWidth="2" strokeLinecap="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
      </svg>
    </button>
  );

  const TrackRow = ({ track, num }: { track: Track, num?: number }) => {
    const active = current?.id === track.id;
    return (
      <div onClick={()=>playTrack(track)} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 10px', borderRadius:16, cursor:'pointer', marginBottom:2, background:active?'rgba(197,76,253,0.08)':'transparent' }}>
        {num !== undefined && <div style={{fontSize:13,fontWeight:600,color:'#C54CFD',width:22,flexShrink:0}}>{num}</div>}
        <div style={{position:'relative',flexShrink:0}}>
          <Cover cover={track.cover} size={50} radius={12}/>
          {active && <div style={{position:'absolute',inset:0,borderRadius:12,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{playing?'⏸':'▶'}</div>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:500,color:active?'#C54CFD':'#e0e0f0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{track.title}</div>
          <div style={{fontSize:12,color:'#6b6b80',marginTop:2}}>{track.artist}</div>
        </div>
        <HeartBtn track={track}/>
        <div style={{fontSize:12,color:'#444',flexShrink:0}}>{track.duration}</div>
      </div>
    );
  };

  // FULL PLAYER
  if (fullPlayer && current) return (
    <div style={{background:'#0b0b0f',minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',padding:'0 32px 40px',fontFamily:"-apple-system,'SF Pro Display',sans-serif"}}>
      <audio ref={audioRef}/>
      <div style={{width:'100%',display:'flex',alignItems:'center',padding:'52px 0 28px'}}>
        <button onClick={()=>setFullPlayer(false)} style={{background:'none',border:'none',cursor:'pointer',padding:8}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b6b80" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{flex:1,textAlign:'center',fontSize:12,color:'#6b6b80',letterSpacing:2,textTransform:'uppercase'}}>Воспроизведение</div>
        <HeartBtn track={current}/>
      </div>

      <Cover cover={current.cover} size={Math.min(window.innerWidth-64, 300)} radius={28}/>

      <div style={{width:'100%',marginTop:32}}>
        <div style={{fontSize:22,fontWeight:700,color:'#f0f0f8',letterSpacing:-0.5,marginBottom:4}}>{current.title}</div>
        <div style={{fontSize:15,color:'#6b6b80'}}>{current.artist}</div>
      </div>

      <div style={{width:'100%',marginTop:28}}>
        <div onClick={seekTo} style={{height:4,background:'#1e1228',borderRadius:2,cursor:'pointer',marginBottom:8}}>
          <div style={{width:`${progress}%`,height:'100%',background:'#C54CFD',borderRadius:2,transition:'width 0.3s linear'}}/>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#4a4a5a'}}>
          <span>{currentTime}</span><span>{current.duration}</span>
        </div>
      </div>

      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:44,marginTop:32}}>
        <button style={{background:'none',border:'none',cursor:'pointer'}}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6b6b80" strokeWidth="2" strokeLinecap="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
        </button>
        <PlayBtn size={68}/>
        <button style={{background:'none',border:'none',cursor:'pointer'}}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6b6b80" strokeWidth="2" strokeLinecap="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
        </button>
      </div>
    </div>
  );

  return (
    <div style={{background:'#0b0b0f',minHeight:'100vh',fontFamily:"-apple-system,'SF Pro Display',sans-serif",position:'relative'}}>
      <audio ref={audioRef}/>
      <div style={{paddingBottom: current ? 160 : 80, minHeight:'100vh', overflowY:'auto'}}>

        {/* HOME */}
        {screen==='home' && <>
          <div style={{padding:'52px 24px 8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:13,color:'#6b6b80',letterSpacing:0.5}}>Добро пожаловать</div>
              <div style={{fontSize:26,fontWeight:600,color:'#f0f0f8',marginTop:2,letterSpacing:-0.5}}>Forty7</div>
            </div>
            <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,#C54CFD,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:600,color:'#fff'}}>IL</div>
          </div>

          {history.length>0 && <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 24px 14px'}}>
              <div style={{fontSize:18,fontWeight:600,color:'#e8e8f5'}}>Недавнее</div>
              <div style={{fontSize:13,color:'#C54CFD',cursor:'pointer'}} onClick={()=>setScreen('library')}>Все</div>
            </div>
            <div style={{display:'flex',gap:14,padding:'0 24px',overflowX:'auto',scrollbarWidth:'none' as any}}>
              {history.slice(0,6).map(t=>(
                <div key={t.id} onClick={()=>playTrack(t)} style={{minWidth:130,borderRadius:20,background:'#13131a',border:'1px solid #1e1e2e',overflow:'hidden',cursor:'pointer',flexShrink:0}}>
                  <Cover cover={t.cover} size={130} radius={0}/>
                  <div style={{padding:'10px 12px 12px'}}>
                    <div style={{fontSize:13,fontWeight:500,color:'#e0e0f0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.artist}</div>
                    <div style={{fontSize:11,color:'#6b6b80',marginTop:2}}>{t.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </>}

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 24px 14px'}}>
            <div style={{fontSize:18,fontWeight:600,color:'#e8e8f5'}}>В тренде</div>
          </div>
          <div style={{padding:'0 24px',display:'flex',flexDirection:'column',gap:4}}>
            {TRENDING.map((t,i)=>(
              <div key={t.id} onClick={()=>{setQuery(t.artist+' '+t.title);setScreen('search');}} style={{display:'flex',alignItems:'center',gap:14,padding:'10px 14px',borderRadius:16,background:'#13131a',border:'1px solid #1a1a24',cursor:'pointer'}}>
                <div style={{fontSize:13,fontWeight:600,color:'#C54CFD',width:20,flexShrink:0}}>{i+1}</div>
                <div style={{width:44,height:44,borderRadius:10,background:'#2a1228',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>🎵</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:500,color:'#e0e0f0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.title}</div>
                  <div style={{fontSize:12,color:'#6b6b80',marginTop:1}}>{t.artist}</div>
                </div>
                <div style={{fontSize:11,color:'#4a4a5a',flexShrink:0}}>{fmtPlays(t.plays)}</div>
              </div>
            ))}
          </div>
        </>}

        {/* SEARCH */}
        {screen==='search' && <>
          <div style={{padding:'52px 24px 16px'}}>
            <div style={{fontSize:26,fontWeight:600,color:'#f0f0f8',marginBottom:16,letterSpacing:-0.5}}>Поиск</div>
            <div style={{display:'flex',gap:10}}>
              <input type="text" placeholder="Артист или трек..." value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()}
                style={{flex:1,padding:'13px 18px',fontSize:15,background:'#161620',border:'1px solid #252535',borderRadius:16,color:'#fff',outline:'none'}}/>
              <button onClick={search} disabled={loading} style={{padding:'13px 20px',background:loading?'#333':'#C54CFD',color:'#fff',border:'none',borderRadius:16,fontSize:15,fontWeight:600,cursor:'pointer'}}>
                {loading?'...':'Найти'}
              </button>
            </div>
            {error && <div style={{marginTop:12,padding:'10px 14px',background:'#1a0a0a',border:'1px solid #3a1a1a',borderRadius:12,color:'#ff6b6b',fontSize:14}}>{error}</div>}
          </div>
          <div style={{padding:'0 16px'}}>
            {results.map((t,i)=><TrackRow key={t.id} track={t} num={i+1}/>)}
          </div>
        </>}

        {/* LIBRARY */}
        {screen==='library' && <>
          <div style={{padding:'52px 24px 16px'}}>
            <div style={{fontSize:26,fontWeight:600,color:'#f0f0f8',letterSpacing:-0.5}}>Библиотека</div>
          </div>
          {library.length===0
            ? <div style={{textAlign:'center',color:'#4a4a5a',fontSize:15,marginTop:60}}>
                <div style={{fontSize:48,marginBottom:16}}>🎵</div>
                <div>Сохранённых треков нет</div>
                <div style={{fontSize:13,marginTop:8,color:'#333'}}>Нажми ♥ у любого трека</div>
              </div>
            : <div style={{padding:'0 16px'}}>{library.map((t,i)=><TrackRow key={t.id} track={t} num={i+1}/>)}</div>
          }
        </>}

        {/* RADIO */}
        {screen==='radio' &&
          <div style={{textAlign:'center',paddingTop:120,color:'#4a4a5a'}}>
            <div style={{fontSize:48,marginBottom:16}}>📻</div>
            <div style={{fontSize:18,color:'#6b6b80'}}>Радио</div>
            <div style={{fontSize:14,marginTop:8}}>Скоро</div>
          </div>
        }
      </div>

      {/* MINI PLAYER */}
      {current && (
        <div onClick={()=>setFullPlayer(true)} style={{position:'fixed',bottom:68,left:12,right:12,background:'rgba(28,18,42,0.96)',border:'1px solid rgba(197,76,253,0.3)',borderRadius:20,padding:'10px 14px 14px',cursor:'pointer',zIndex:100}}>
          <div style={{height:2,background:'#1e1228',borderRadius:1,marginBottom:10,overflow:'hidden'}}>
            <div style={{width:`${progress}%`,height:'100%',background:'#C54CFD',borderRadius:1,transition:'width 0.3s linear'}}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <Cover cover={current.cover} size={42} radius={10}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:500,color:'#f0f0f8',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{current.title}</div>
              <div style={{fontSize:12,color:'#9999b0',marginTop:1}}>{current.artist}</div>
            </div>
            <PlayBtn size={38}/>
          </div>
        </div>
      )}

      {/* NAV */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(11,11,15,0.97)',borderTop:'1px solid #1e1e2a',padding:'10px 0 18px',display:'flex',justifyContent:'space-around',zIndex:101}}>
        {NAV_ITEMS.map(item=>(
          <div key={item.id} onClick={()=>setScreen(item.id as any)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:'pointer'}}>
            {item.icon(screen===item.id)}
            <span style={{fontSize:10,color:screen===item.id?'#C54CFD':'#4a4a5a'}}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
