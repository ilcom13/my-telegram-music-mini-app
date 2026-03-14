import { useState, useEffect, useRef } from 'react';
declare global { interface Window { Telegram: any; } }

const WORKER_URL = 'https://square-queen-e703.shapovaliluha.workers.dev';
const ACC = '#E28EFE';
const ACC_DIM = 'rgba(226,142,254,0.12)';
const NAV_H = 64;

interface Track { id: string; title: string; artist: string; cover: string; duration: string; plays: number; mp3: string | null; isArtist?: boolean; permalink?: string; scUserId?: string; }
interface Playlist { id: string; name: string; tracks: Track[]; repeat: boolean; }
interface ArtistInfo { id: string; name: string; avatar: string; followers: number; permalink: string; tracks: Track[]; latestRelease: Track | null; }

const T: Record<string,Record<string,string>> = {
  en: { welcome:'Welcome',home:'Home',search:'Search',library:'Library',trending:'Trending',profile:'Profile',find:'Find',notFound:'Nothing found',recent:'Recent',recommended:'Recommended',liked:'Liked',playlists:'Playlists',createPlaylist:'Create playlist',playlistName:'Playlist name',create:'Create',cancel:'Cancel',addToPlaylist:'Add to playlist',noPlaylists:'No playlists yet.',noLiked:'No liked tracks',loading:'Loading...',loadMore:'Load more',retry:'Try again',nowPlaying:'Now playing',plays:'plays',resetData:'Reset all data',language:'Language',likedTracks:'Liked tracks',listenedTracks:'Listened',share:'Share',copied:'Copied!',all:'See all',noRecommended:'Listen to some tracks for recommendations',queue:'Queue',addToQueue:'Add to queue',sound:'Sound',remix:'Remix',artists:'Artists',shuffle:'Shuffle',repeatPl:'Repeat',syncSaved:'Synced ✓',syncing:'Syncing...',syncBtn:'Sync across devices',favArtists:'Favourite artists',addFav:'Follow',removeFav:'Unfollow',latestRelease:'Latest release',allTracks:'All tracks',searchPlaceholder:'Songs or artist',backToSearch:'Back',},
  ru: { welcome:'Добро пожаловать',home:'Главная',search:'Поиск',library:'Библиотека',trending:'Тренды',profile:'Профиль',find:'Найти',notFound:'Ничего не найдено',recent:'Недавнее',recommended:'Рекомендованное',liked:'Лайкнутые',playlists:'Плейлисты',createPlaylist:'Создать плейлист',playlistName:'Название плейлиста',create:'Создать',cancel:'Отмена',addToPlaylist:'В плейлист',noPlaylists:'Нет плейлистов.',noLiked:'Нет лайкнутых треков',loading:'Загружаем...',loadMore:'Загрузить ещё',retry:'Попробовать снова',nowPlaying:'Сейчас играет',plays:'прослушиваний',resetData:'Сбросить данные',language:'Язык',likedTracks:'Лайкнутых треков',listenedTracks:'Прослушано',share:'Поделиться',copied:'Скопировано!',all:'Все',noRecommended:'Послушай треки — подберём рекомендации',queue:'Очередь',addToQueue:'В очередь',sound:'Sound',remix:'Remix',artists:'Артисты',shuffle:'Перемешать',repeatPl:'Повторять',syncSaved:'Синхронизовано ✓',syncing:'Синхронизация...',syncBtn:'Синхронизировать между устройствами',favArtists:'Избранные артисты',addFav:'Подписаться',removeFav:'Отписаться',latestRelease:'Последний релиз',allTracks:'Все треки',searchPlaceholder:'Песни или артист',backToSearch:'Назад',},
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
  return <div style={{ ...base, background: '#1a1428', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.floor(size*0.36) }}>🎵</div>;
}

const GENRES = [
  {id:'top',label:'Топ',emoji:'🔥'},{id:'new',label:'Новинки',emoji:'⚡'},
  {id:'ru-rap',label:'RU Рэп',emoji:'🎤'},{id:'hip-hop',label:'Hip-Hop',emoji:'🎧'},
  {id:'trap',label:'Trap',emoji:'💀'},{id:'drill',label:'Drill',emoji:'🔩'},
  {id:'electronic',label:'Electronic',emoji:'⚡'},{id:'rnb',label:'R&B',emoji:'💜'},
  {id:'pop',label:'Pop',emoji:'✨'},{id:'latin',label:'Latin',emoji:'🌴'},
];

const REMIX_WORDS_CLIENT = ['speed up','sped up','slowed','reverb','nightcore','pitched','lofi','lo-fi','boosted','bass boost','phonk','tiktok','mashup','hardstyle'];

export default function App() {
  const [screen, setScreen] = useState<'home'|'search'|'library'|'trending'|'profile'|'artist'>('home');
  const [lang, setLang] = useState<'ru'|'en'>('ru');
  const t = (k: string) => T[lang][k] || k;

  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'sound'|'remix'|'artists'>('sound');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string|null>(null);

  const [artistPage, setArtistPage] = useState<ArtistInfo|null>(null);
  const [artistLoading, setArtistLoading] = useState(false);
  const [favArtists, setFavArtists] = useState<ArtistInfo[]>([]);

  const [current, setCurrent] = useState<Track|null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [volume, setVolume] = useState(1);
  const [loop, setLoop] = useState(false);
  const [fullPlayer, setFullPlayer] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [dragIdx, setDragIdx] = useState<number|null>(null);

  const [liked, setLiked] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [openPlaylistId, setOpenPlaylistId] = useState<string|null>(null);
  const [history, setHistory] = useState<Track[]>([]);
  const [recommended, setRecommended] = useState<Track[]>([]);
  const [trendTracks, setTrendTracks] = useState<Record<string,Track[]>>({});
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendGenre, setTrendGenre] = useState('top');
  const [trendOffset, setTrendOffset] = useState<Record<string,number>>({});
  const [libTab, setLibTab] = useState<'liked'|'playlists'|'artists'>('liked');
  const [showAddPlaylist, setShowAddPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showAddToPlaylist, setShowAddToPlaylist] = useState<Track|null>(null);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [syncStatus, setSyncStatus] = useState<''|'saving'|'saved'>('');

  const audioRef = useRef<HTMLAudioElement|null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const userId = String(tgUser?.id || 'anon');
  const userName = tgUser?.first_name || tgUser?.username || 'User';
  const userHandle = tgUser?.username ? `@${tgUser.username}` : '';
  const userInitial = userName.charAt(0).toUpperCase();

  // ── Sync ──────────────────────────────────────────────────────────────────
  const syncSave = async (data: object) => {
    if (userId==='anon') return;
    setSyncStatus('saving');
    try {
      await fetch(`${WORKER_URL}/sync/save?uid=${userId}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      setSyncStatus('saved'); setTimeout(()=>setSyncStatus(''),2500);
    } catch { setSyncStatus(''); }
  };

  const triggerSync = (l: Track[], p: Playlist[], h: Track[], v: number, fa: ArtistInfo[]) => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(()=>syncSave({liked:l,playlists:p,history:h,volume:v,favArtists:fa}),2000);
  };

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
    const loadLocal = () => {
      try {
        const l=localStorage.getItem('liked47'); if(l) setLiked(JSON.parse(l));
        const p=localStorage.getItem('playlists47'); if(p) setPlaylists(JSON.parse(p));
        const h=localStorage.getItem('hist47'); if(h) setHistory(JSON.parse(h));
        const fa=localStorage.getItem('favArtists47'); if(fa) setFavArtists(JSON.parse(fa));
        const v=localStorage.getItem('vol47'); if(v) setVolume(parseFloat(v));
        const q=localStorage.getItem('queue47'); if(q) setQueue(JSON.parse(q));
        const lg=localStorage.getItem('lang47'); if(lg) setLang(lg as 'ru'|'en');
      } catch {}
    };
    if (userId!=='anon') {
      fetch(`${WORKER_URL}/sync/load?uid=${userId}`)
        .then(r=>r.json()).then(d=>{
          if (d.data) {
            if(d.data.liked) setLiked(d.data.liked);
            if(d.data.playlists) setPlaylists(d.data.playlists);
            if(d.data.history) setHistory(d.data.history);
            if(d.data.favArtists) setFavArtists(d.data.favArtists);
            if(d.data.volume!==undefined) setVolume(d.data.volume);
          } else loadLocal();
        }).catch(loadLocal);
    } else loadLocal();
    try { const lg=localStorage.getItem('lang47'); if(lg) setLang(lg as 'ru'|'en'); } catch {}
  }, []);

  useEffect(() => {
    if (history.length<2) return;
    const artists=[...new Set(history.map(tr=>tr.artist).filter(a=>!REMIX_WORDS_CLIENT.some(w=>a.toLowerCase().includes(w))))].slice(0,5);
    if (!artists.length) return;
    fetch(`${WORKER_URL}/search?q=__recommend__${encodeURIComponent(artists.join(','))}`)
      .then(r=>r.json()).then(d=>{if(d.tracks?.length) setRecommended(d.tracks);}).catch(()=>{});
  }, [history.length]);

  useEffect(()=>{
    const a=audioRef.current; if(!a) return;
    const onT=()=>{if(a.duration){setProgress(a.currentTime/a.duration*100);const m=Math.floor(a.currentTime/60),s=Math.floor(a.currentTime%60);setCurrentTime(`${m}:${s.toString().padStart(2,'0')}`);}};
    const onE=()=>{if(loop){a.currentTime=0;a.play();}else if(queue.length>0){const next=queue[0];setQueue(prev=>{const n=prev.slice(1);try{localStorage.setItem('queue47',JSON.stringify(n));}catch{}return n;});playTrackDirect(next);}else setPlaying(false);};
    a.addEventListener('timeupdate',onT);a.addEventListener('ended',onE);
    return()=>{a.removeEventListener('timeupdate',onT);a.removeEventListener('ended',onE);};
  },[current,loop,queue]);

  useEffect(()=>{if(audioRef.current)audioRef.current.volume=volume;},[volume]);
  useEffect(()=>{if(screen==='trending'&&!trendTracks[trendGenre])loadTrending(trendGenre,true);},[screen,trendGenre]);

  // Auto search when switching modes
  useEffect(()=>{
    if(query.trim()&&screen==='search') doSearch(searchMode);
  },[searchMode]);

  const playTrackDirect=(track:Track)=>{
    if(!track.mp3) return;
    if(audioRef.current){audioRef.current.src=`${WORKER_URL}/stream?url=${encodeURIComponent(track.mp3)}`;audioRef.current.play();setPlaying(true);}
    setCurrent(track);setProgress(0);setCurrentTime('0:00');
    setHistory(prev=>{const n=[track,...prev.filter(x=>x.id!==track.id)].slice(0,30);try{localStorage.setItem('hist47',JSON.stringify(n));}catch{}triggerSync(liked,playlists,n,volume,favArtists);return n;});
  };

  const playTrack=(track:Track)=>{
    if(track.isArtist){openArtist(track.permalink||'',track.title,track.cover,track.plays);return;}
    if(!track.mp3) return;
    if(current?.id===track.id){togglePlay();return;}
    playTrackDirect(track);
  };

  const addToQueue=(track:Track,e:React.MouseEvent)=>{
    e.stopPropagation();
    setQueue(prev=>{const n=[...prev,track];try{localStorage.setItem('queue47',JSON.stringify(n));}catch{}return n;});
  };

  const inQueue=(id:string)=>queue.some(t=>t.id===id);

  const togglePlay=()=>{if(!audioRef.current)return;if(playing){audioRef.current.pause();setPlaying(false);}else{audioRef.current.play();setPlaying(true);}};
  const seekTo=(e:React.MouseEvent<HTMLDivElement>)=>{const a=audioRef.current;if(!a?.duration)return;const r=e.currentTarget.getBoundingClientRect();a.currentTime=((e.clientX-r.left)/r.width)*a.duration;};
  const isLiked=(id:string)=>liked.some(t=>t.id===id);

  const toggleLike=(track:Track,e?:React.MouseEvent)=>{
    e?.stopPropagation();
    setLiked(prev=>{const has=prev.some(t=>t.id===track.id);const n=has?prev.filter(t=>t.id!==track.id):[track,...prev];try{localStorage.setItem('liked47',JSON.stringify(n));}catch{}triggerSync(n,playlists,history,volume,favArtists);return n;});
  };

  const setVol=(v:number)=>{setVolume(v);try{localStorage.setItem('vol47',String(v));}catch{}};

  const loadTrending=async(genre=trendGenre,reset=false)=>{
    setTrendLoading(true);
    const off=reset?0:(trendOffset[genre]||0);
    try{const r=await fetch(`${WORKER_URL}/trending?genre=${genre}&offset=${off}`);const d=await r.json();if(d.tracks){setTrendTracks(prev=>({...prev,[genre]:reset?d.tracks:[...(prev[genre]||[]),...d.tracks]}));setTrendOffset(prev=>({...prev,[genre]:off+1}));}}catch{}
    setTrendLoading(false);
  };

  const doSearch=async(mode=searchMode)=>{
    if(!query.trim()) return;
    setLoading(true);setError('');setResults([]);
    try{
      const r=await fetch(`${WORKER_URL}/search?q=${encodeURIComponent(query)}&mode=${mode}`);
      const d=await r.json();
      if(d.error) throw new Error(d.error);
      if(!d.tracks?.length) throw new Error(t('notFound'));
      setResults(d.tracks);
    }catch(e:any){setError(e.message);}
    finally{setLoading(false);}
  };

  // ── Artist page ───────────────────────────────────────────────────────────
  const openArtist=async(permalink:string,name:string,avatar:string,followers:number)=>{
    setArtistLoading(true);setScreen('artist');
    try{
      const r=await fetch(`${WORKER_URL}/search?q=${encodeURIComponent(name)}&mode=sound`);
      const d=await r.json();
      const tracks=(d.tracks||[]).filter((tr:Track)=>tr.artist.toLowerCase()===name.toLowerCase()||tr.artist.toLowerCase().includes(name.toLowerCase().split(' ')[0]));
      setArtistPage({id:permalink,name,avatar,followers,permalink,tracks,latestRelease:tracks[0]||null});
    }catch{}
    setArtistLoading(false);
  };

  const isFavArtist=(id:string)=>favArtists.some(a=>a.id===id);
  const toggleFavArtist=(artist:ArtistInfo)=>{
    setFavArtists(prev=>{const has=prev.some(a=>a.id===artist.id);const n=has?prev.filter(a=>a.id!==artist.id):[artist,...prev];try{localStorage.setItem('favArtists47',JSON.stringify(n));}catch{}triggerSync(liked,playlists,history,volume,n);return n;});
  };

  const createPlaylist=()=>{
    if(!newPlaylistName.trim()) return;
    const pl:Playlist={id:Date.now().toString(),name:newPlaylistName.trim(),tracks:[],repeat:false};
    setPlaylists(prev=>{const n=[...prev,pl];try{localStorage.setItem('playlists47',JSON.stringify(n));}catch{}triggerSync(liked,n,history,volume,favArtists);return n;});
    setNewPlaylistName('');setShowAddPlaylist(false);
  };

  const addToPlaylist=(plId:string,track:Track)=>{
    setPlaylists(prev=>{const n=prev.map(pl=>pl.id===plId&&!pl.tracks.some(tr=>tr.id===track.id)?{...pl,tracks:[...pl.tracks,track]}:pl);try{localStorage.setItem('playlists47',JSON.stringify(n));}catch{}triggerSync(liked,n,history,volume,favArtists);return n;});
    setShowAddToPlaylist(null);
  };

  const playPlaylist=(pl:Playlist)=>{if(!pl.tracks.length)return;playTrack(pl.tracks[0]);setQueue(pl.tracks.slice(1));};
  const shufflePlaylist=(pl:Playlist)=>{const sh=[...pl.tracks].sort(()=>Math.random()-0.5);if(!sh.length)return;playTrack(sh[0]);setQueue(sh.slice(1));};

  const moveQueue=(from:number,to:number)=>{setQueue(prev=>{const n=[...prev];const[item]=n.splice(from,1);n.splice(to,0,item);try{localStorage.setItem('queue47',JSON.stringify(n));}catch{}return n;});};

  const shareTrack=(track:Track)=>{const text=`${track.artist} — ${track.title}`;navigator.clipboard?.writeText(text).then(()=>{setCopiedMsg(true);setTimeout(()=>setCopiedMsg(false),2000);});};
  const changeLang=(l:'ru'|'en')=>{setLang(l);try{localStorage.setItem('lang47',l);}catch{}};

  // ── Components ────────────────────────────────────────────────────────────
  const HeartBtn=({track,size=20}:{track:Track;size?:number})=>(
    <button onClick={e=>toggleLike(track,e)} style={{background:'none',border:'none',cursor:'pointer',padding:4,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill={isLiked(track.id)?ACC:'none'} stroke={isLiked(track.id)?ACC:'#555'} strokeWidth="2" strokeLinecap="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
      </svg>
    </button>
  );

  const PPIcon=({size,col='#fff'}:{size:'sm'|'lg';col?:string})=>{
    const h=size==='lg'?20:14,w=size==='lg'?4:3,c=size==='lg'?'#0c0c11':col;
    return playing
      ?<div style={{display:'flex',gap:size==='lg'?4:3}}><div style={{width:w,height:h,background:c,borderRadius:2}}/><div style={{width:w,height:h,background:c,borderRadius:2}}/></div>
      :<div style={{width:0,height:0,borderStyle:'solid',borderWidth:size==='lg'?'10px 0 10px 18px':'7px 0 7px 12px',borderColor:`transparent transparent transparent ${c}`,marginLeft:size==='lg'?3:2}}/>;
  };

  // Compact track row with "..." menu
  const TrackRow=({track,num}:{track:Track;num?:number})=>{
    const active=current?.id===track.id;
    const menuOpen=openMenuId===track.id;
    return(
      <div style={{position:'relative'}}>
        <div onClick={()=>{setOpenMenuId(null);playTrack(track);}} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:14,cursor:'pointer',marginBottom:1,background:active?ACC_DIM:'transparent'}}>
          {num!==undefined&&<div style={{fontSize:12,color:active?ACC:'#555',width:20,flexShrink:0,textAlign:'right'}}>{num}</div>}
          <div style={{position:'relative',flexShrink:0}}>
            <Cover cover={track.cover} size={46} radius={track.isArtist?23:10}/>
            {active&&!track.isArtist&&<div style={{position:'absolute',inset:0,borderRadius:10,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>{playing?'⏸':'▶'}</div>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:500,color:active?ACC:'#e0e0ec',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{track.title}</div>
            <div style={{display:'flex',alignItems:'center',gap:4,marginTop:1}}>
              <span style={{fontSize:12,color:track.isArtist?ACC:'#666',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:140}}>{track.artist}</span>
              {!track.isArtist&&track.plays>0&&<span style={{fontSize:11,color:'#3a3a4a',flexShrink:0}}>· {fmtPlays(track.plays)}</span>}
            </div>
          </div>
          {!track.isArtist&&(
            <div style={{display:'flex',alignItems:'center',gap:2,flexShrink:0}}>
              {/* Queue button — changes color if in queue */}
              <button onClick={e=>addToQueue(track,e)} title={t('addToQueue')} style={{background:'none',border:'none',cursor:'pointer',padding:'4px 3px',flexShrink:0}}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={inQueue(track.id)?ACC:'#555'} strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1.2" fill={inQueue(track.id)?ACC:'#555'}/><circle cx="3" cy="12" r="1.2" fill={inQueue(track.id)?ACC:'#555'}/><circle cx="3" cy="18" r="1.2" fill={inQueue(track.id)?ACC:'#555'}/></svg>
              </button>
              {/* "..." menu button */}
              <button onClick={e=>{e.stopPropagation();setOpenMenuId(menuOpen?null:track.id);}} style={{background:'none',border:'none',cursor:'pointer',padding:'4px 3px',flexShrink:0}}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </button>
              <div style={{fontSize:11,color:'#3a3a4a',flexShrink:0,minWidth:28,textAlign:'right'}}>{track.duration}</div>
            </div>
          )}
          {track.isArtist&&<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>}
        </div>
        {/* Dropdown menu */}
        {menuOpen&&!track.isArtist&&(
          <div onClick={e=>e.stopPropagation()} style={{position:'absolute',right:12,top:'100%',background:'#1e1a2e',border:`1px solid ${ACC}33`,borderRadius:12,zIndex:50,minWidth:180,boxShadow:'0 8px 24px rgba(0,0,0,0.5)'}}>
            <button onClick={e=>{toggleLike(track,e);setOpenMenuId(null);}} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'11px 14px',background:'none',border:'none',cursor:'pointer',color:isLiked(track.id)?ACC:'#ddd',fontSize:13,borderBottom:'1px solid #252535'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={isLiked(track.id)?ACC:'none'} stroke={isLiked(track.id)?ACC:'#aaa'} strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
              {isLiked(track.id)?'Убрать лайк':'Лайк'}
            </button>
            <button onClick={()=>{setShowAddToPlaylist(track);setOpenMenuId(null);}} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'11px 14px',background:'none',border:'none',cursor:'pointer',color:'#ddd',fontSize:13,borderBottom:'1px solid #252535'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              {t('addToPlaylist')}
            </button>
            <button onClick={()=>{openArtist('',track.artist,'',0);setOpenMenuId(null);}} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'11px 14px',background:'none',border:'none',cursor:'pointer',color:'#ddd',fontSize:13}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              {lang==='ru'?'Перейти к артисту':'Go to artist'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const AddToPlaylistModal=({track}:{track:Track})=>(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'flex-end',zIndex:300}} onClick={()=>setShowAddToPlaylist(null)}>
      <div style={{background:'#161622',width:'100%',borderRadius:'20px 20px 0 0',padding:'20px 16px 40px'}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:16,fontWeight:600,color:'#f0f0f8',marginBottom:16}}>{t('addToPlaylist')}</div>
        {playlists.length===0?<div style={{color:'#555',fontSize:14,textAlign:'center',padding:'20px 0'}}>{t('noPlaylists')}</div>
          :playlists.map(pl=>(
            <div key={pl.id} onClick={()=>addToPlaylist(pl.id,track)} style={{padding:'12px 14px',borderRadius:12,background:'#1e1e2e',marginBottom:8,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{color:'#e0e0ec',fontSize:14}}>{pl.name}</span>
              <span style={{color:'#555',fontSize:12}}>{pl.tracks.length}</span>
            </div>
          ))
        }
        <button onClick={()=>setShowAddToPlaylist(null)} style={{width:'100%',padding:'12px',background:'#1e1e2e',border:'none',borderRadius:12,color:'#777',fontSize:14,cursor:'pointer',marginTop:4}}>{t('cancel')}</button>
      </div>
    </div>
  );

  const NAV=[
    {id:'home',label:t('home'),icon:(a:boolean)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#555'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>},
    {id:'search',label:t('search'),icon:(a:boolean)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#555'} strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>},
    {id:'library',label:t('library'),icon:(a:boolean)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#555'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>},
    {id:'trending',label:t('trending'),icon:(a:boolean)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#555'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>},
  ];

  // ── FULL PLAYER ─────────────────────────────────────────────────────────────
  if (fullPlayer&&current) return(
    <div style={{background:'#0c0c11',minHeight:'100vh',width:'100%',display:'flex',flexDirection:'column',alignItems:'center',padding:'0 24px 40px',fontFamily:"-apple-system,'SF Pro Display',sans-serif",boxSizing:'border-box'}}>
      <audio ref={audioRef}/>
      {showQueue&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:200,display:'flex',alignItems:'flex-end'}} onClick={()=>setShowQueue(false)}>
          <div style={{background:'#161622',width:'100%',borderRadius:'20px 20px 0 0',padding:'20px 16px 40px',maxHeight:'72vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div><div style={{fontSize:16,fontWeight:600,color:'#f0f0f8'}}>{t('queue')}</div><div style={{fontSize:12,color:'#555',marginTop:2}}>{queue.length} {lang==='ru'?'треков':'tracks'}</div></div>
              <button onClick={()=>setQueue([])} style={{background:'none',border:'none',cursor:'pointer',fontSize:12,color:'#555'}}>{lang==='ru'?'Очистить':'Clear'}</button>
            </div>
            {queue.length===0?<div style={{color:'#555',fontSize:14,textAlign:'center',padding:'24px 0'}}>{lang==='ru'?'Очередь пустая':'Queue is empty'}</div>
              :queue.map((tr,i)=>(
                <div key={tr.id+i} draggable onDragStart={()=>setDragIdx(i)} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(dragIdx!==null&&dragIdx!==i)moveQueue(dragIdx,i);setDragIdx(null);}}
                  style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid #1e1e2e',cursor:'grab',background:dragIdx===i?ACC_DIM:'transparent',borderRadius:8}}>
                  <div style={{color:'#333',fontSize:18,padding:'0 4px'}}>⠿</div>
                  <Cover cover={tr.cover} size={40} radius={8}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,color:'#e0e0ec',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{tr.title}</div>
                    <div style={{fontSize:11,color:'#666',marginTop:1}}>{tr.artist}</div>
                  </div>
                  <button onClick={()=>{playTrackDirect(tr);setQueue(prev=>prev.filter((_,j)=>j!==i));setShowQueue(false);}} style={{background:'none',border:'none',cursor:'pointer',padding:4}}>
                    <div style={{width:0,height:0,borderStyle:'solid',borderWidth:'6px 0 6px 11px',borderColor:`transparent transparent transparent ${ACC}`,marginLeft:1}}/>
                  </button>
                  <button onClick={()=>setQueue(prev=>{const n=[...prev];n.splice(i,1);try{localStorage.setItem('queue47',JSON.stringify(n));}catch{}return n;})} style={{background:'none',border:'none',cursor:'pointer',color:'#555',fontSize:18,padding:'0 4px'}}>×</button>
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
        <span style={{fontSize:12,color:'#666',letterSpacing:1.5,textTransform:'uppercase'}}>{t('nowPlaying')}</span>
        <div style={{width:38}}/>
      </div>
      <div style={{width:'100%',display:'flex',justifyContent:'center'}}>
        <Cover cover={current.cover} size={Math.min(window.innerWidth-80,280)} radius={24}/>
      </div>
      <div style={{width:'100%',marginTop:22}}>
        <div style={{fontSize:22,fontWeight:600,color:'#f0f0f8',letterSpacing:-0.4,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{current.title}</div>
        <div style={{fontSize:15,color:'#777',marginTop:4}}>{current.artist}</div>
        {current.plays>0&&<div style={{fontSize:12,color:'#444',marginTop:3}}>{fmtPlays(current.plays)} {t('plays')}</div>}
      </div>
      {/* Actions */}
      <div style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:16}}>
        <div style={{display:'flex',gap:2,alignItems:'center'}}>
          <HeartBtn track={current} size={26}/>
          <button onClick={()=>setShowAddToPlaylist(current)} style={{background:'none',border:'none',cursor:'pointer',padding:6}}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
          <button onClick={()=>setShowQueue(true)} style={{background:'none',border:'none',cursor:'pointer',padding:6,position:'relative'}}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={queue.length>0?ACC:'#777'} strokeWidth="2" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            {queue.length>0&&<span style={{position:'absolute',top:2,right:2,background:ACC,color:'#0c0c11',fontSize:9,fontWeight:700,borderRadius:'50%',width:14,height:14,display:'flex',alignItems:'center',justifyContent:'center'}}>{queue.length}</span>}
          </button>
        </div>
        <div style={{display:'flex',gap:2,alignItems:'center'}}>
          <button onClick={()=>setLoop(!loop)} style={{background:'none',border:'none',cursor:'pointer',padding:6}}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={loop?ACC:'#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
          </button>
          <button onClick={()=>shareTrack(current)} style={{background:'none',border:'none',cursor:'pointer',padding:6}}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
      </div>
      {copiedMsg&&<div style={{fontSize:12,color:ACC,marginTop:4,alignSelf:'flex-start'}}>{t('copied')}</div>}
      <div style={{width:'100%',marginTop:16}}>
        <div onClick={seekTo} style={{height:24,display:'flex',alignItems:'center',cursor:'pointer'}}>
          <div style={{width:'100%',height:4,background:'#1e1228',borderRadius:2,position:'relative'}}>
            <div style={{width:`${progress}%`,height:'100%',background:ACC,borderRadius:2,transition:'width 0.3s linear'}}/>
            <div style={{position:'absolute',top:'50%',left:`${progress}%`,transform:'translate(-50%,-50%)',width:14,height:14,background:ACC,borderRadius:'50%'}}/>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#555',marginTop:2}}><span>{currentTime}</span><span>{current.duration}</span></div>
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:36,marginTop:20,width:'100%'}}>
        <button style={{background:'none',border:'none',cursor:'pointer',opacity:0.35}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg></button>
        <button onClick={togglePlay} style={{width:66,height:66,borderRadius:'50%',background:ACC,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}><PPIcon size="lg"/></button>
        <button onClick={()=>{if(queue.length>0){const next=queue[0];setQueue(prev=>prev.slice(1));playTrackDirect(next);}}} style={{background:'none',border:'none',cursor:'pointer',opacity:queue.length>0?1:0.35}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg></button>
      </div>
      <div style={{width:'100%',marginTop:24,display:'flex',alignItems:'center',gap:12}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>
        <div style={{flex:1,height:24,display:'flex',alignItems:'center',cursor:'pointer'}} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setVol(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)));}}>
          <div style={{width:'100%',height:4,background:'#1e1228',borderRadius:2,position:'relative'}}>
            <div style={{width:`${volume*100}%`,height:'100%',background:ACC,borderRadius:2}}/>
            <div style={{position:'absolute',top:'50%',left:`${volume*100}%`,transform:'translate(-50%,-50%)',width:14,height:14,background:ACC,borderRadius:'50%'}}/>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>
      </div>
      {showAddToPlaylist&&<AddToPlaylistModal track={showAddToPlaylist}/>}
    </div>
  );

  // ── MAIN ────────────────────────────────────────────────────────────────────
  return(
    <div onClick={()=>openMenuId&&setOpenMenuId(null)} style={{background:'#0c0c11',minHeight:'100vh',width:'100%',fontFamily:"-apple-system,'SF Pro Display',sans-serif",position:'relative',boxSizing:'border-box'}}>
      <audio ref={audioRef}/>
      <div style={{paddingBottom:current?NAV_H+72+8:NAV_H+8,minHeight:'100vh'}}>

        {/* ARTIST PAGE */}
        {screen==='artist'&&(
          <div>
            <div style={{padding:'48px 16px 0',display:'flex',alignItems:'center',gap:8}}>
              <button onClick={()=>{setScreen('search');setArtistPage(null);}} style={{background:'none',border:'none',cursor:'pointer',padding:'4px 8px 4px 0'}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div style={{fontSize:15,color:'#888'}}>{t('backToSearch')}</div>
            </div>
            {artistLoading?<div style={{display:'flex',alignItems:'center',justifyContent:'center',paddingTop:100}}><div style={{fontSize:14,color:'#555'}}>{t('loading')}</div></div>
              :artistPage&&(
                <div>
                  <div style={{padding:'20px 16px 24px',display:'flex',alignItems:'center',gap:16}}>
                    <Cover cover={artistPage.avatar} size={80} radius={40}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:22,fontWeight:700,color:'#f0f0f8',letterSpacing:-0.4}}>{artistPage.name}</div>
                      {artistPage.followers>0&&<div style={{fontSize:13,color:'#666',marginTop:4}}>{fmtPlays(artistPage.followers)} {lang==='ru'?'подписчиков':'followers'}</div>}
                      <button onClick={()=>artistPage&&toggleFavArtist(artistPage)}
                        style={{marginTop:10,padding:'7px 18px',borderRadius:20,border:`1px solid ${isFavArtist(artistPage.id)?ACC:'#333'}`,background:isFavArtist(artistPage.id)?ACC_DIM:'transparent',color:isFavArtist(artistPage.id)?ACC:'#888',fontSize:13,cursor:'pointer'}}>
                        {isFavArtist(artistPage.id)?t('removeFav'):t('addFav')}
                      </button>
                    </div>
                  </div>
                  {artistPage.latestRelease&&(
                    <div style={{padding:'0 16px 20px'}}>
                      <div style={{fontSize:11,fontWeight:600,color:'#888',marginBottom:10,textTransform:'uppercase' as any,letterSpacing:0.8}}>{t('latestRelease')}</div>
                      <div onClick={()=>artistPage.latestRelease&&playTrack(artistPage.latestRelease)} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:16,background:'#141420',border:`1px solid ${ACC}22`,cursor:'pointer'}}>
                        <Cover cover={artistPage.latestRelease.cover} size={56} radius={10}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:15,fontWeight:600,color:'#f0f0f8',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{artistPage.latestRelease.title}</div>
                          <div style={{fontSize:12,color:'#666',marginTop:3}}>{artistPage.latestRelease.duration} · {fmtPlays(artistPage.latestRelease.plays)} {t('plays')}</div>
                        </div>
                        <div style={{width:40,height:40,borderRadius:'50%',background:ACC,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <div style={{width:0,height:0,borderStyle:'solid',borderWidth:'7px 0 7px 12px',borderColor:'transparent transparent transparent #0c0c11',marginLeft:2}}/>
                        </div>
                      </div>
                    </div>
                  )}
                  <div style={{padding:'0 16px 10px'}}>
                    <div style={{fontSize:11,fontWeight:600,color:'#888',marginBottom:10,textTransform:'uppercase' as any,letterSpacing:0.8}}>{t('allTracks')}</div>
                  </div>
                  <div style={{padding:'0 4px'}}>
                    {artistPage.tracks.map((track,i)=><TrackRow key={track.id} track={track} num={i+1}/>)}
                  </div>
                </div>
              )
            }
          </div>
        )}

        {/* HOME */}
        {screen==='home'&&(
          <div>
            <div style={{padding:'48px 16px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:13,color:'#666'}}>{t('welcome')}</div>
                <div style={{fontSize:24,fontWeight:700,color:'#f0f0f8',marginTop:2,letterSpacing:-0.5}}>Forty7</div>
              </div>
              {/* Pill-shaped profile button */}
              <button onClick={()=>setScreen('profile')} style={{height:36,borderRadius:18,background:ACC_DIM,border:`1px solid ${ACC}44`,display:'flex',alignItems:'center',gap:8,padding:'0 14px',cursor:'pointer',flexShrink:0,maxWidth:160}}>
                <div style={{width:24,height:24,borderRadius:'50%',background:ACC,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#0c0c11',flexShrink:0}}>
                  {userInitial}
                </div>
                <span style={{fontSize:13,color:ACC,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:100}}>{userHandle||userName}</span>
              </button>
            </div>
            {history.length>0&&(
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px 12px'}}>
                  <div style={{fontSize:16,fontWeight:600,color:'#e8e8f0'}}>{t('recent')}</div>
                  <div style={{fontSize:13,color:ACC,cursor:'pointer'}} onClick={()=>setScreen('library')}>{t('all')}</div>
                </div>
                <div style={{display:'flex',gap:12,padding:'0 16px',overflowX:'auto',scrollbarWidth:'none' as any}}>
                  {history.slice(0,8).map(track=>(
                    <div key={track.id} onClick={()=>playTrack(track)} style={{width:108,borderRadius:14,background:'#141420',border:'1px solid #1e1e2e',overflow:'hidden',cursor:'pointer',flexShrink:0}}>
                      <div style={{width:108,height:108}}><Cover cover={track.cover} size={108} radius={0}/></div>
                      <div style={{padding:'7px 9px 9px',boxSizing:'border-box' as any}}>
                        <div style={{fontSize:11,fontWeight:500,color:'#ddd',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{track.artist}</div>
                        <div style={{fontSize:10,color:'#666',marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{track.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{padding:'18px 16px 12px'}}>
              <div style={{fontSize:16,fontWeight:600,color:'#e8e8f0'}}>{t('recommended')}</div>
            </div>
            {recommended.length===0&&history.length<2
              ?<div style={{padding:'0 16px 12px',fontSize:13,color:'#444'}}>{t('noRecommended')}</div>
              :<div style={{padding:'0 4px'}}>{(recommended.length>0?recommended:history).slice(0,8).map((track,i)=><TrackRow key={track.id} track={track} num={i+1}/>)}</div>
            }
          </div>
        )}

        {/* SEARCH */}
        {screen==='search'&&(
          <div>
            <div style={{padding:'48px 16px 12px'}}>
              <div style={{fontSize:24,fontWeight:700,color:'#f0f0f8',marginBottom:14,letterSpacing:-0.5}}>{t('search')}</div>
              <div style={{display:'flex',gap:10}}>
                <input type="text" placeholder={t('searchPlaceholder')} value={query}
                  onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch()}
                  style={{flex:1,padding:'12px 16px',fontSize:15,background:'#141420',border:'1px solid #252535',borderRadius:14,color:'#f0f0f8',outline:'none',width:'100%',boxSizing:'border-box' as any}}/>
                <button onClick={()=>doSearch()} disabled={loading}
                  style={{padding:'12px 16px',background:loading?'#222':ACC,color:loading?'#555':'#0c0c11',border:'none',borderRadius:14,fontSize:14,fontWeight:600,cursor:loading?'not-allowed':'pointer',flexShrink:0}}>
                  {loading?'...':t('find')}
                </button>
              </div>
              <div style={{display:'flex',gap:6,marginTop:12}}>
                {(['sound','remix','artists'] as const).map(m=>(
                  <button key={m} onClick={()=>setSearchMode(m)}
                    style={{padding:'7px 16px',borderRadius:20,border:'none',background:searchMode===m?ACC:ACC_DIM,color:searchMode===m?'#0c0c11':ACC,fontSize:13,fontWeight:searchMode===m?600:400,cursor:'pointer'}}>
                    {t(m)}
                  </button>
                ))}
              </div>
              {error&&<div style={{marginTop:10,padding:'10px 14px',background:'#1a0a0a',border:'1px solid #3a1515',borderRadius:12,color:'#ff7070',fontSize:13}}>{error}</div>}
            </div>
            <div style={{padding:'0 4px'}}>
              {loading&&<div style={{textAlign:'center',paddingTop:40,color:'#555',fontSize:14}}>{t('loading')}</div>}
              {results.map((track,i)=><TrackRow key={track.id} track={track} num={i+1}/>)}
            </div>
          </div>
        )}

        {/* LIBRARY */}
        {screen==='library'&&(
          <div>
            <div style={{padding:'48px 16px 14px'}}>
              <div style={{fontSize:24,fontWeight:700,color:'#f0f0f8',letterSpacing:-0.5}}>{t('library')}</div>
            </div>
            <div style={{display:'flex',gap:6,padding:'0 16px 16px',overflowX:'auto',scrollbarWidth:'none' as any}}>
              {(['liked','playlists','artists'] as const).map(tab=>(
                <button key={tab} onClick={()=>setLibTab(tab)} style={{padding:'7px 16px',borderRadius:20,border:'none',background:libTab===tab?ACC:ACC_DIM,color:libTab===tab?'#0c0c11':ACC,fontSize:13,fontWeight:libTab===tab?600:400,cursor:'pointer',flexShrink:0}}>
                  {tab==='liked'?t('liked'):tab==='playlists'?t('playlists'):t('favArtists')}
                </button>
              ))}
            </div>

            {libTab==='liked'&&(
              liked.length===0
                ?<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:60}}><div style={{fontSize:44,marginBottom:14}}>🎵</div><div style={{fontSize:15,color:'#555'}}>{t('noLiked')}</div></div>
                :<div style={{padding:'0 4px'}}>{liked.map((track,i)=><TrackRow key={track.id} track={track} num={i+1}/>)}</div>
            )}

            {libTab==='artists'&&(
              <div style={{padding:'0 16px'}}>
                {favArtists.length===0
                  ?<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:60}}><div style={{fontSize:44,marginBottom:14}}>🎤</div><div style={{fontSize:15,color:'#555'}}>{lang==='ru'?'Нет избранных артистов':'No favourite artists'}</div></div>
                  :favArtists.map(artist=>(
                    <div key={artist.id} onClick={()=>openArtist(artist.permalink,artist.name,artist.avatar,artist.followers)} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 0',borderBottom:'1px solid #1a1a26',cursor:'pointer'}}>
                      <Cover cover={artist.avatar} size={52} radius={26}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:15,fontWeight:500,color:'#e0e0ec'}}>{artist.name}</div>
                        {artist.followers>0&&<div style={{fontSize:12,color:'#666',marginTop:2}}>{fmtPlays(artist.followers)} {lang==='ru'?'подписчиков':'followers'}</div>}
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  ))
                }
              </div>
            )}

            {libTab==='playlists'&&(
              <div style={{padding:'0 16px'}}>
                <button onClick={()=>setShowAddPlaylist(true)} style={{width:'100%',padding:'12px',background:ACC_DIM,border:`1px dashed ${ACC}55`,borderRadius:14,color:ACC,fontSize:14,cursor:'pointer',marginBottom:12,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  {t('createPlaylist')}
                </button>
                {showAddPlaylist&&(
                  <div style={{background:'#141420',border:'1px solid #252535',borderRadius:14,padding:'14px',marginBottom:12}}>
                    <input autoFocus placeholder={t('playlistName')} value={newPlaylistName} onChange={e=>setNewPlaylistName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createPlaylist()}
                      style={{width:'100%',padding:'10px 14px',fontSize:14,background:'#0c0c11',border:'1px solid #252535',borderRadius:10,color:'#f0f0f8',outline:'none',boxSizing:'border-box' as any,marginBottom:10}}/>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={createPlaylist} style={{flex:1,padding:'10px',background:ACC,border:'none',borderRadius:10,color:'#0c0c11',fontSize:14,fontWeight:600,cursor:'pointer'}}>{t('create')}</button>
                      <button onClick={()=>{setShowAddPlaylist(false);setNewPlaylistName('');}} style={{flex:1,padding:'10px',background:'#1e1e2e',border:'none',borderRadius:10,color:'#777',fontSize:14,cursor:'pointer'}}>{t('cancel')}</button>
                    </div>
                  </div>
                )}
                {playlists.map(pl=>{
                  const isOpen=openPlaylistId===pl.id;
                  return(
                    <div key={pl.id} style={{background:'#111118',border:'1px solid #1a1a26',borderRadius:16,marginBottom:10,overflow:'hidden'}}>
                      <div onClick={()=>setOpenPlaylistId(isOpen?null:pl.id)} style={{padding:'14px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:12}}>
                        <div style={{width:52,height:52,borderRadius:10,overflow:'hidden',flexShrink:0,display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:'#1a1428'}}>
                          {pl.tracks.slice(0,4).map((tr,i)=><div key={i} style={{overflow:'hidden',width:'100%',height:'100%'}}><Cover cover={tr.cover} size={26} radius={0}/></div>)}
                          {pl.tracks.length===0&&<div style={{gridColumn:'span 2',gridRow:'span 2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🎵</div>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:15,fontWeight:600,color:'#e0e0ec'}}>{pl.name}</div>
                          <div style={{fontSize:12,color:'#555',marginTop:2}}>{pl.tracks.length} {lang==='ru'?'треков':'tracks'}</div>
                        </div>
                        <button onClick={e=>{e.stopPropagation();playPlaylist(pl);}} style={{width:38,height:38,borderRadius:'50%',background:ACC,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
                          <div style={{width:0,height:0,borderStyle:'solid',borderWidth:'7px 0 7px 12px',borderColor:'transparent transparent transparent #0c0c11',marginLeft:2}}/>
                        </button>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" style={{transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.2s',flexShrink:0}}><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                      {isOpen&&(
                        <div>
                          <div style={{display:'flex',gap:8,padding:'0 16px 12px'}}>
                            <button onClick={()=>shufflePlaylist(pl)} style={{flex:1,padding:'9px',background:ACC_DIM,border:'none',borderRadius:10,color:ACC,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
                              {t('shuffle')}
                            </button>
                            <button onClick={()=>setPlaylists(prev=>{const n=prev.map(p=>p.id===pl.id?{...p,repeat:!p.repeat}:p);try{localStorage.setItem('playlists47',JSON.stringify(n));}catch{}triggerSync(liked,n,history,volume,favArtists);return n;})}
                              style={{flex:1,padding:'9px',background:pl.repeat?ACC:ACC_DIM,border:'none',borderRadius:10,color:pl.repeat?'#0c0c11':ACC,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={pl.repeat?'#0c0c11':ACC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
                              {t('repeatPl')}
                            </button>
                          </div>
                          <div style={{borderTop:'1px solid #1a1a26'}}>
                            {pl.tracks.length===0?<div style={{padding:'20px',textAlign:'center',color:'#444',fontSize:13}}>{lang==='ru'?'Нет треков':'No tracks'}</div>
                              :pl.tracks.map((track,i)=>(
                                <div key={track.id+i} onClick={()=>{playTrack(track);setQueue(pl.tracks.slice(i+1));}} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',cursor:'pointer',background:current?.id===track.id?ACC_DIM:'transparent',borderBottom:'1px solid #1a1a26'}}>
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
        {screen==='trending'&&(()=>{
          const ct=trendTracks[trendGenre]||[];
          return(
            <div>
              <div style={{padding:'48px 16px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:24,fontWeight:700,color:'#f0f0f8',letterSpacing:-0.5}}>{t('trending')}</div>
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
              {trendLoading&&ct.length===0?<div style={{display:'flex',alignItems:'center',justifyContent:'center',paddingTop:80}}><div style={{fontSize:14,color:'#555'}}>{t('loading')}</div></div>
                :ct.length===0?<div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'60px 20px 0',textAlign:'center'}}><div style={{fontSize:44,marginBottom:14}}>📈</div><div style={{fontSize:15,color:'#555'}}>{t('notFound')}</div><button onClick={()=>loadTrending(trendGenre,true)} style={{marginTop:16,padding:'10px 24px',background:ACC_DIM,border:'none',borderRadius:12,color:ACC,fontSize:14,cursor:'pointer'}}>{t('retry')}</button></div>
                :<div><div style={{padding:'0 4px'}}>{ct.map((track,i)=><TrackRow key={track.id+i} track={track} num={i+1}/>)}</div>
                  <div style={{padding:'12px 16px 8px',display:'flex',justifyContent:'center'}}>
                    <button onClick={()=>loadTrending(trendGenre,false)} disabled={trendLoading} style={{padding:'11px 40px',background:ACC_DIM,border:`1px solid ${ACC}33`,borderRadius:14,color:ACC,fontSize:14,cursor:trendLoading?'not-allowed':'pointer',opacity:trendLoading?0.5:1}}>{trendLoading?t('loading'):t('loadMore')}</button>
                  </div>
                </div>
              }
            </div>
          );
        })()}

        {/* PROFILE */}
        {screen==='profile'&&(
          <div>
            <div style={{padding:'48px 16px 24px',display:'flex',alignItems:'center',gap:4}}>
              <button onClick={()=>setScreen('home')} style={{background:'none',border:'none',cursor:'pointer',padding:'4px 8px 4px 0'}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div style={{fontSize:20,fontWeight:600,color:'#f0f0f8'}}>{t('profile')}</div>
              {syncStatus==='saving'&&<div style={{marginLeft:'auto',fontSize:12,color:'#666'}}>{t('syncing')}</div>}
              {syncStatus==='saved'&&<div style={{marginLeft:'auto',fontSize:12,color:ACC}}>{t('syncSaved')}</div>}
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'0 16px 24px'}}>
              <div style={{width:80,height:80,borderRadius:'50%',background:ACC_DIM,border:`2px solid ${ACC}55`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,fontWeight:700,color:ACC,marginBottom:14}}>{userInitial}</div>
              <div style={{fontSize:20,fontWeight:600,color:'#f0f0f8'}}>{userName}</div>
              {userHandle&&<div style={{fontSize:14,color:'#666',marginTop:4}}>{userHandle}</div>}
            </div>
            <div style={{padding:'0 16px'}}>
              {[{label:t('likedTracks'),value:liked.length},{label:t('playlists'),value:playlists.length},{label:t('listenedTracks'),value:history.length},{label:t('favArtists'),value:favArtists.length}].map(item=>(
                <div key={item.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 0',borderBottom:'1px solid #1a1a26'}}>
                  <span style={{fontSize:15,color:'#bbb'}}>{item.label}</span>
                  <span style={{fontSize:15,fontWeight:600,color:ACC}}>{item.value}</span>
                </div>
              ))}
              <div style={{padding:'18px 0 8px'}}>
                <div style={{fontSize:13,color:'#666',marginBottom:10,textTransform:'uppercase' as any,letterSpacing:1}}>{t('language')}</div>
                <div style={{display:'flex',gap:8}}>
                  {(['ru','en'] as const).map(l=>(
                    <button key={l} onClick={()=>changeLang(l)} style={{flex:1,padding:'11px',borderRadius:12,border:'none',background:lang===l?ACC:'#141420',color:lang===l?'#0c0c11':'#888',fontSize:14,fontWeight:lang===l?600:400,cursor:'pointer'}}>
                      {l==='ru'?'🇷🇺 Русский':'🇺🇸 English'}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={()=>syncSave({liked,playlists,history,volume,favArtists})} style={{width:'100%',marginTop:12,padding:'13px',background:ACC_DIM,border:`1px solid ${ACC}33`,borderRadius:14,color:ACC,fontSize:14,cursor:'pointer'}}>
                🔄 {t('syncBtn')}
              </button>
              <button onClick={()=>{try{localStorage.clear();}catch{}setLiked([]);setPlaylists([]);setHistory([]);setRecommended([]);setQueue([]);setFavArtists([]);}}
                style={{width:'100%',marginTop:8,padding:'13px',background:'#1a0a0a',border:'1px solid #3a1515',borderRadius:14,color:'#ff7070',fontSize:14,cursor:'pointer'}}>
                {t('resetData')}
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddToPlaylist&&!fullPlayer&&<AddToPlaylistModal track={showAddToPlaylist}/>}

      {/* MINI PLAYER */}
      {current&&(
        <div onClick={()=>setFullPlayer(true)} style={{position:'fixed',bottom:NAV_H+8,left:10,right:10,background:'#18121e',border:`1px solid ${ACC}33`,borderRadius:18,padding:'10px 14px 12px',cursor:'pointer',zIndex:100}}>
          <div style={{height:2,background:'#1e1228',borderRadius:1,marginBottom:10,overflow:'hidden'}}>
            <div style={{width:`${progress}%`,height:'100%',background:ACC,borderRadius:1,transition:'width 0.3s linear'}}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <Cover cover={current.cover} size={40} radius={9}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:500,color:'#f0f0f8',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{current.title}</div>
              <div style={{display:'flex',alignItems:'center',gap:5}}>
                <span style={{fontSize:12,color:'#888'}}>{current.artist}</span>
                {current.plays>0&&<span style={{fontSize:11,color:'#444'}}>· {fmtPlays(current.plays)}</span>}
              </div>
            </div>
            <button onClick={e=>{e.stopPropagation();togglePlay();}} style={{width:36,height:36,borderRadius:'50%',background:ACC,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
              <PPIcon size="sm"/>
            </button>
          </div>
        </div>
      )}

      {/* NAV */}
      {screen!=='profile'&&screen!=='artist'&&(
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
