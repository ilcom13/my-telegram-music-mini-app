import { useState, useEffect, useRef, useCallback } from 'react';
declare global { interface Window { Telegram: any; } }

const W = 'https://square-queen-e703.shapovaliluha.workers.dev';
const ACC = '#E8C98A';
const ACC_DIM = 'rgba(232,201,138,0.13)';
const BG = '#0e0e0e';
const BG2 = '#161616';
const BG3 = '#1e1e1e';
const MINI_BG = 'rgba(38,34,28,0.97)';
const FULL_BG = '#181510';
const TEXT_PRIMARY = '#f0f0f0';
const TEXT_SEC = '#9a9a9a';
const TEXT_MUTED = '#5a5a5a';
const NAV_H = 60;

interface Track { id: string; title: string; artist: string; cover: string; duration: string; plays: number; mp3: string | null; isArtist?: boolean; isAlbum?: boolean; permalink?: string; trackCount?: number; albumId?: string; albumTitle?: string; }
interface Playlist { id: string; name: string; tracks: Track[]; repeat: boolean; }
interface AlbumInfo { id: string; title: string; artist: string; cover: string; tracks: Track[]; permalink: string; }
interface ArtistInfo { id: string; name: string; username: string; avatar: string; banner: string; followers: number; permalink: string; tracks: Track[]; albums: AlbumInfo[]; latestRelease: Track | null; }

const T: Record<string,Record<string,string>> = {
  en: { home:'Home',search:'Search',library:'Library',trending:'Trending',profile:'Profile',find:'Find',notFound:'Nothing found',recent:'Recent',recommended:'Recommended',likedTracks:'Liked',playlists:'Playlists',albums:'Albums',createPlaylist:'Create playlist',playlistName:'Playlist name',create:'Create',cancel:'Cancel',addToPlaylist:'Add to playlist',noPlaylists:'No playlists.',noLiked:'No liked tracks',loading:'Loading...',loadMore:'Load more',retry:'Try again',nowPlaying:'Now playing',plays:'plays',resetData:'Reset all data',language:'Language',listenedTracks:'Listened',share:'Share',copied:'Copied!',queue:'Queue',sound:'Sound',remix:'Remix',artists:'Artists',albumsTab:'Albums',shuffle:'Shuffle',repeatPl:'Repeat',syncSaved:'Synced ✓',syncing:'Syncing...',syncBtn:'Sync across devices',favArtists:'Artists',addFav:'Follow',removeFav:'Following',backToSearch:'Back',searchPlaceholder:'Songs or artist',noRecommended:'Listen to some tracks first',goToAlbum:'Go to album',},
  ru: { home:'Главная',search:'Поиск',library:'Библиотека',trending:'Тренды',profile:'Профиль',find:'Найти',notFound:'Ничего не найдено',recent:'Недавнее',recommended:'Рекомендованное',likedTracks:'Лайки',playlists:'Плейлисты',albums:'Альбомы',createPlaylist:'Создать плейлист',playlistName:'Название',create:'Создать',cancel:'Отмена',addToPlaylist:'В плейлист',noPlaylists:'Нет плейлистов.',noLiked:'Нет лайков',loading:'Загружаем...',loadMore:'Ещё',retry:'Повторить',nowPlaying:'Сейчас играет',plays:'прослушиваний',resetData:'Сбросить данные',language:'Язык',listenedTracks:'Прослушано',share:'Поделиться',copied:'Скопировано!',queue:'Очередь',sound:'Sound',remix:'Remix',artists:'Артисты',albumsTab:'Альбомы',shuffle:'Перемешать',repeatPl:'Повторять',syncSaved:'Синхронизовано ✓',syncing:'Синхронизация...',syncBtn:'Синхронизировать между устройствами',favArtists:'Артисты',addFav:'Подписаться',removeFav:'Подписан',backToSearch:'Назад',searchPlaceholder:'Песни или артист',noRecommended:'Послушай пару треков',goToAlbum:'Перейти в альбом',},
};

function fmtP(n: number) { if(n>=1e6)return(n/1e6).toFixed(1)+'M';if(n>=1000)return Math.round(n/1000)+'K';return n>0?String(n):''; }

function greeting(lang: 'ru'|'en') {
  const h=new Date().getHours();
  if(lang==='ru'){if(h>=5&&h<12)return'Доброе утро';if(h>=12&&h<17)return'Добрый день';if(h>=17&&h<22)return'Добрый вечер';return'Доброй ночи';}
  if(h>=5&&h<12)return'Good morning';if(h>=12&&h<17)return'Good day';if(h>=17&&h<22)return'Good evening';return'Good night';
}

function Img({src,size,radius,fb='🎵'}:{src:string;size:number;radius:number;fb?:string}) {
  const[e,sE]=useState(false);
  const s:React.CSSProperties={width:size,height:size,borderRadius:radius,flexShrink:0,display:'block'};
  if(src&&!e)return<img src={src} style={{...s,objectFit:'cover'}} onError={()=>sE(true)}/>;
  return<div style={{...s,background:BG3,display:'flex',alignItems:'center',justifyContent:'center',fontSize:Math.floor(size*.36),color:ACC}}>{fb}</div>;
}

const GENRES=[{id:'top',label:'Топ',e:'🔥'},{id:'new',label:'Новинки',e:'⚡'},{id:'ru-rap',label:'RU Рэп',e:'🎤'},{id:'hip-hop',label:'Hip-Hop',e:'🎧'},{id:'trap',label:'Trap',e:'💀'},{id:'drill',label:'Drill',e:'🔩'},{id:'electronic',label:'Electronic',e:'⚡'},{id:'rnb',label:'R&B',e:'💜'},{id:'pop',label:'Pop',e:'✨'},{id:'latin',label:'Latin',e:'🌴'}];
const REMIX_W=['speed up','sped up','slowed','reverb','slow reverb','nightcore','pitched','lofi','lo-fi','boosted','bass boost','phonk','tiktok','ultra slowed','super slowed','mashup','extended','hardstyle','core','remix','bass','спид ап','спид апп','словед','слоувед','ремикс','басс','слоу','реверб','найткор','хардстайл','мэшап','мешап','кор','фонк','лофи'];

function useSlider(val:number,onChange:(v:number)=>void){
  const ref=useRef<HTMLDivElement>(null);
  const dragging=useRef(false);
  const update=useCallback((cx:number)=>{if(!ref.current)return;const r=ref.current.getBoundingClientRect();onChange(Math.max(0,Math.min(1,(cx-r.left)/r.width)));},[onChange]);
  const onDown=(e:React.PointerEvent)=>{dragging.current=true;ref.current?.setPointerCapture(e.pointerId);update(e.clientX);};
  const onMove=(e:React.PointerEvent)=>{if(dragging.current)update(e.clientX);};
  const onUp=()=>{dragging.current=false;};
  return{ref,onPointerDown:onDown,onPointerMove:onMove,onPointerUp:onUp};
}

function SliderTrack({val,sp,h=3}:{val:number;sp:ReturnType<typeof useSlider>;h?:number}){
  return(
    <div {...sp} ref={sp.ref} style={{flex:1,height:Math.max(h,22),display:'flex',alignItems:'center',cursor:'pointer',touchAction:'none'}}>
      <div style={{width:'100%',height:h,background:'rgba(255,255,255,0.1)',borderRadius:h,position:'relative'}}>
        <div style={{width:`${val*100}%`,height:'100%',background:ACC,borderRadius:h,transition:'width 0.05s'}}/>
        <div style={{position:'absolute',top:'50%',left:`${val*100}%`,transform:'translate(-50%,-50%)',width:h+10,height:h+10,background:ACC,borderRadius:'50%'}}/>
      </div>
    </div>
  );
}

export default function App(){
  const[screen,setScreen]=useState<'home'|'search'|'library'|'trending'|'profile'|'artist'|'album'>('home');
  const[lang,setLang]=useState<'ru'|'en'>('ru');
  const t=(k:string)=>T[lang][k]||k;
  const[query,setQuery]=useState('');
  const[searchMode,setSearchMode]=useState<'sound'|'albums'|'remix'|'artists'>('sound');
  const[results,setResults]=useState<Track[]>([]);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState('');
  const[menuId,setMenuId]=useState<string|null>(null);
  const[artistPage,setArtistPage]=useState<ArtistInfo|null>(null);
  const[artistLoading,setArtistLoading]=useState(false);
  const[favArtists,setFavArtists]=useState<ArtistInfo[]>([]);
  const[albumPage,setAlbumPage]=useState<AlbumInfo|null>(null);
  const[albumLoading,setAlbumLoading]=useState(false);
  const[favAlbums,setFavAlbums]=useState<AlbumInfo[]>([]);
  const[current,setCurrent]=useState<Track|null>(null);
  const[playing,setPlaying]=useState(false);
  const[progress,setProgress]=useState(0);
  const[curTime,setCurTime]=useState('0:00');
  const[volume,setVolume]=useState(1);
  const[loop,setLoop]=useState(false);
  const[fullPlayer,setFullPlayer]=useState(false);
  const[showQueue,setShowQueue]=useState(false);
  const[queue,setQueue]=useState<Track[]>([]);
  const[dragIdx,setDragIdx]=useState<number|null>(null);
  const[liked,setLiked]=useState<Track[]>([]);
  const[playlists,setPlaylists]=useState<Playlist[]>([]);
  const[openPlId,setOpenPlId]=useState<string|null>(null);
  const[history,setHistory]=useState<Track[]>([]);
  const[recs,setRecs]=useState<Track[]>([]);
  const[trends,setTrends]=useState<Record<string,Track[]>>({});
  const[trendLoading,setTrendLoading]=useState(false);
  const[trendGenre,setTrendGenre]=useState('top');
  const[trendOff,setTrendOff]=useState<Record<string,number>>({});
  const[libTab,setLibTab]=useState<'liked'|'playlists'|'artists'|'albums'>('liked');
  const[showNewPl,setShowNewPl]=useState(false);
  const[newPlName,setNewPlName]=useState('');
  const[addToPl,setAddToPl]=useState<Track|null>(null);
  const[copied,setCopied]=useState(false);
  const[syncSt,setSyncSt]=useState<''|'saving'|'saved'>('');
  const prevScreen=useRef<'home'|'search'|'library'|'trending'|'profile'|'artist'|'album'>('search');
  const audio=useRef<HTMLAudioElement|null>(null);
  const syncTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const tg=window.Telegram?.WebApp?.initDataUnsafe?.user;
  const uid=String(tg?.id||'anon');
  const uName=tg?.first_name||tg?.username||'User';
  const uHandle=tg?.username?`@${tg.username}`:'';
  const uInit=uName.charAt(0).toUpperCase();

  const syncSave=async(data:object)=>{if(uid==='anon')return;setSyncSt('saving');try{await fetch(`${W}/sync/save?uid=${uid}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});setSyncSt('saved');setTimeout(()=>setSyncSt(''),2500);}catch{setSyncSt('');}};
  const triggerSync=(l:Track[],p:Playlist[],h:Track[],v:number,fa:ArtistInfo[],fal:AlbumInfo[])=>{if(syncTimer.current)clearTimeout(syncTimer.current);syncTimer.current=setTimeout(()=>syncSave({liked:l,playlists:p,history:h,volume:v,favArtists:fa,favAlbums:fal}),2000);};

  useEffect(()=>{
    window.Telegram?.WebApp?.ready();window.Telegram?.WebApp?.expand();
    const ll=()=>{try{const l=localStorage.getItem('l47');if(l)setLiked(JSON.parse(l));const p=localStorage.getItem('p47');if(p)setPlaylists(JSON.parse(p));const h=localStorage.getItem('h47');if(h)setHistory(JSON.parse(h));const fa=localStorage.getItem('fa47');if(fa)setFavArtists(JSON.parse(fa));const fal=localStorage.getItem('fal47');if(fal)setFavAlbums(JSON.parse(fal));const v=localStorage.getItem('v47');if(v)setVolume(parseFloat(v));const q=localStorage.getItem('q47');if(q)setQueue(JSON.parse(q));}catch{}};
    if(uid!=='anon'){fetch(`${W}/sync/load?uid=${uid}`).then(r=>r.json()).then(d=>{if(d.data){if(d.data.liked)setLiked(d.data.liked);if(d.data.playlists)setPlaylists(d.data.playlists);if(d.data.history)setHistory(d.data.history);if(d.data.favArtists)setFavArtists(d.data.favArtists);if(d.data.favAlbums)setFavAlbums(d.data.favAlbums);if(d.data.volume!==undefined)setVolume(d.data.volume);}else ll();}).catch(ll);}else ll();
    try{const lg=localStorage.getItem('lg47');if(lg)setLang(lg as 'ru'|'en');}catch{}
  },[]);

  useEffect(()=>{if(history.length<2)return;const artists=[...new Set(history.map(tr=>tr.artist).filter(a=>!REMIX_W.some(w=>a.toLowerCase().includes(w))))].slice(0,5);if(!artists.length)return;fetch(`${W}/search?q=__recommend__${encodeURIComponent(artists.join(','))}`).then(r=>r.json()).then(d=>{if(d.tracks?.length)setRecs(d.tracks);}).catch(()=>{});},[history.length]);

  useEffect(()=>{
    const a=audio.current;if(!a)return;
    const onT=()=>{if(a.duration){setProgress(a.currentTime/a.duration*100);const m=Math.floor(a.currentTime/60),s=Math.floor(a.currentTime%60);setCurTime(`${m}:${s.toString().padStart(2,'0')}`);}}; 
    const onE=()=>{
      if(loop){a.currentTime=0;a.play();}
      else if(queue.length>0){
        const nxt=queue[0];
        setQueue(prev=>{const n=prev.slice(1);try{localStorage.setItem('q47',JSON.stringify(n));}catch{}return n;});
        playDirect(nxt);
      } else {
        const pool=recs.length>0?recs:(history.length>0?history:[]);
        const available=pool.filter(tr=>tr.mp3&&tr.id!==current?.id);
        if(available.length>0){
          const next=available[Math.floor(Math.random()*Math.min(available.length,10))];
          playDirect(next);
        } else {
          setPlaying(false);
        }
      }
    };
    a.addEventListener('timeupdate',onT);a.addEventListener('ended',onE);
    return()=>{a.removeEventListener('timeupdate',onT);a.removeEventListener('ended',onE);};
  },[current,loop,queue,recs,history]);

  useEffect(()=>{if(audio.current)audio.current.volume=volume;},[volume]);
  useEffect(()=>{if(screen==='trending'&&!trends[trendGenre])loadTrend(trendGenre,true);},[screen,trendGenre]);
  useEffect(()=>{if(query.trim()&&screen==='search')doSearch(searchMode);},[searchMode]);

  const playDirect=(track:Track)=>{
    if(!track.mp3)return;
    if(audio.current){audio.current.src=`${W}/stream?url=${encodeURIComponent(track.mp3)}`;audio.current.play();setPlaying(true);}
    setCurrent(track);setProgress(0);setCurTime('0:00');
    setHistory(prev=>{const n=[track,...prev.filter(x=>x.id!==track.id)].slice(0,30);try{localStorage.setItem('h47',JSON.stringify(n));}catch{}return n;});
  };
  const playTrack=(track:Track)=>{
    if(track.isArtist){openArtist('',track.title,track.cover,track.plays);return;}
    if(track.isAlbum){openAlbum(track.id,track.title,track.artist,track.cover);return;}
    if(!track.mp3)return;
    if(current?.id===track.id){togglePlay();return;}
    playDirect(track);
  };
  const addQ=(track:Track,e:React.MouseEvent)=>{e.stopPropagation();setQueue(prev=>{const n=[...prev,track];try{localStorage.setItem('q47',JSON.stringify(n));}catch{}return n;});};
  const rmQ=(i:number)=>setQueue(prev=>{const n=[...prev];n.splice(i,1);try{localStorage.setItem('q47',JSON.stringify(n));}catch{}return n;});
  const inQ=(id:string)=>queue.some(t=>t.id===id);
  const togglePlay=()=>{if(!audio.current)return;if(playing){audio.current.pause();setPlaying(false);}else{audio.current.play();setPlaying(true);}};
  const setVol=(v:number)=>{setVolume(v);try{localStorage.setItem('v47',String(v));}catch{}};
  const isLk=(id:string)=>liked.some(t=>t.id===id);
  const toggleLike=(track:Track,e?:React.MouseEvent)=>{e?.stopPropagation();setLiked(prev=>{const has=prev.some(t=>t.id===track.id);const n=has?prev.filter(t=>t.id!==track.id):[track,...prev];try{localStorage.setItem('l47',JSON.stringify(n));}catch{}triggerSync(n,playlists,history,volume,favArtists,favAlbums);return n;});};
  const loadTrend=async(genre=trendGenre,reset=false)=>{setTrendLoading(true);const off=reset?0:(trendOff[genre]||0);try{const r=await fetch(`${W}/trending?genre=${genre}&offset=${off}`);const d=await r.json();if(d.tracks){setTrends(prev=>({...prev,[genre]:reset?d.tracks:[...(prev[genre]||[]),...d.tracks]}));setTrendOff(prev=>({...prev,[genre]:off+1}));}}catch{}setTrendLoading(false);};
  const doSearch=async(mode=searchMode)=>{if(!query.trim())return;setLoading(true);setError('');setResults([]);try{const ep=mode==='albums'?'albums':'search';const r=await fetch(`${W}/${ep}?q=${encodeURIComponent(query)}&mode=${mode}`);const d=await r.json();if(d.error)throw new Error(d.error);if(!d.tracks?.length)throw new Error(t('notFound'));setResults(d.tracks);}catch(e:unknown){setError(e instanceof Error?e.message:String(e));}finally{setLoading(false);};};

  const openArtist=async(permalink:string,name:string,avatar:string,followers:number)=>{
    setArtistLoading(true);
    prevScreen.current=screen as 'home'|'search'|'library'|'trending'|'profile'|'artist'|'album';
    setScreen('artist');
    setArtistPage(null);
    try{
      const [artistRes,albumsRes]=await Promise.allSettled([
        fetch(`${W}/artist?name=${encodeURIComponent(name)}&permalink=${encodeURIComponent(permalink)}`),
        fetch(`${W}/albums?q=${encodeURIComponent(name)}`)
      ]);
      const d=artistRes.status==='fulfilled'?await artistRes.value.json():{};
      const albumsD=albumsRes.status==='fulfilled'?await albumsRes.value.json():{};
      const art=d.artist||{};
      let trks:Track[]=d.tracks||[];
      if(!trks.length){
        const sr=await fetch(`${W}/search?q=${encodeURIComponent(name)}&mode=sound`);
        const sd=await sr.json();
        trks=sd.tracks||[];
      }
      const sorted=[...trks].sort((a,b)=>b.plays-a.plays);
      const latest=sorted[0]||null;
      const albums:AlbumInfo[]=(albumsD.tracks||[])
        .filter((al:Track)=>al.isAlbum)
        .map((al:Track)=>({id:al.id,title:al.title,artist:al.artist,cover:al.cover,tracks:[],permalink:al.permalink||''}))
        .slice(0,10);
      setArtistPage({id:art.id||name,name:art.name||name,username:art.username||'',avatar:art.avatar||avatar||'',banner:art.banner||'',followers:art.followers||followers,permalink:art.permalink||permalink,tracks:sorted,albums,latestRelease:latest});
    }catch{
      setArtistPage({id:name,name,username:'',avatar,banner:'',followers,permalink,tracks:[],albums:[],latestRelease:null});
    }
    setArtistLoading(false);
  };

  const openAlbum=async(id:string,title:string,artist:string,cover:string)=>{
    setAlbumLoading(true);
    prevScreen.current=screen as 'home'|'search'|'library'|'trending'|'profile'|'artist'|'album';
    setScreen('album');
    try{const r=await fetch(`${W}/album?id=${id}`);const d=await r.json();if(d.album)setAlbumPage({id:d.album.id,title:d.album.title||title,artist:d.album.artist||artist,cover:d.album.cover||cover,tracks:d.tracks||[],permalink:d.album.permalink||''});}
    catch{setAlbumPage({id,title,artist,cover,tracks:[],permalink:''});}
    setAlbumLoading(false);
  };
  const isFavA=(a:ArtistInfo)=>favArtists.some(x=>x.id===a.id||x.name===a.name);
  const toggleFavA=(a:ArtistInfo)=>{setFavArtists(prev=>{const has=prev.some(x=>x.id===a.id||x.name===a.name);const n=has?prev.filter(x=>x.id!==a.id&&x.name!==a.name):[{...a,latestRelease:null,tracks:[],albums:[]},...prev];try{localStorage.setItem('fa47',JSON.stringify(n));}catch{}triggerSync(liked,playlists,history,volume,n,favAlbums);return n;});};
  const isFavAl=(id:string)=>favAlbums.some(x=>x.id===id);
  const toggleFavAl=(al:AlbumInfo)=>{setFavAlbums(prev=>{const has=prev.some(x=>x.id===al.id);const n=has?prev.filter(x=>x.id!==al.id):[{...al,tracks:[]},...prev];try{localStorage.setItem('fal47',JSON.stringify(n));}catch{}triggerSync(liked,playlists,history,volume,favArtists,n);return n;});};
  const createPl=()=>{if(!newPlName.trim())return;const pl:Playlist={id:Date.now().toString(),name:newPlName.trim(),tracks:[],repeat:false};setPlaylists(prev=>{const n=[...prev,pl];try{localStorage.setItem('p47',JSON.stringify(n));}catch{}return n;});setNewPlName('');setShowNewPl(false);};
  const addToPl2=(plId:string,track:Track)=>{setPlaylists(prev=>{const n=prev.map(pl=>pl.id===plId&&!pl.tracks.some(t=>t.id===track.id)?{...pl,tracks:[...pl.tracks,track]}:pl);try{localStorage.setItem('p47',JSON.stringify(n));}catch{}return n;});setAddToPl(null);};
  const playPl=(pl:Playlist)=>{if(!pl.tracks.length)return;playTrack(pl.tracks[0]);setQueue(pl.tracks.slice(1));};
  const shufflePl=(pl:Playlist)=>{const sh=[...pl.tracks].sort(()=>Math.random()-.5);if(!sh.length)return;playTrack(sh[0]);setQueue(sh.slice(1));};
  const moveQ=(from:number,to:number)=>setQueue(prev=>{const n=[...prev];const[item]=n.splice(from,1);n.splice(to,0,item);return n;});
  const share=(track:Track)=>{navigator.clipboard?.writeText(`${track.artist} — ${track.title}`).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});};
  const chgLang=(l:'ru'|'en')=>{setLang(l);try{localStorage.setItem('lg47',l);}catch{}};

  const seekSP=useSlider(progress/100,v=>{const a=audio.current;if(a?.duration)a.currentTime=v*a.duration;});
  const miniSeekSP=useSlider(progress/100,v=>{const a=audio.current;if(a?.duration)a.currentTime=v*a.duration;});
  const volSP=useSlider(volume,v=>setVol(v));

  const HBtn=({track,sz=19}:{track:Track;sz?:number})=>(
    <button onClick={e=>toggleLike(track,e)} style={{background:'none',border:'none',cursor:'pointer',padding:4,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill={isLk(track.id)?ACC:'none'} stroke={isLk(track.id)?ACC:'#666'} strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
    </button>
  );

  const PP=({sz,col=BG}:{sz:'sm'|'lg';col?:string})=>{
    const h=sz==='lg'?18:13,w=sz==='lg'?4:3;
    return playing
      ?<div style={{display:'flex',gap:sz==='lg'?4:3}}><div style={{width:w,height:h,background:col,borderRadius:2}}/><div style={{width:w,height:h,background:col,borderRadius:2}}/></div>
      :<div style={{width:0,height:0,borderStyle:'solid',borderWidth:sz==='lg'?'9px 0 9px 16px':'6px 0 6px 10px',borderColor:`transparent transparent transparent ${col}`,marginLeft:sz==='lg'?3:2}}/>;
  };

  const TRow=({track,num,onArtistClick}:{track:Track;num?:number;onArtistClick?:(name:string,cover:string)=>void})=>{
    const active=current?.id===track.id;
    const mOpen=menuId===track.id;
    const menuItems=[
      {icon:<svg width="14" height="14" viewBox="0 0 24 24" fill={isLk(track.id)?ACC:'none'} stroke={isLk(track.id)?ACC:'#aaa'} strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,label:isLk(track.id)?(lang==='ru'?'Убрать лайк':'Unlike'):(lang==='ru'?'Лайк':'Like'),fn:(e:React.MouseEvent)=>{toggleLike(track,e);setMenuId(null);}},
      {icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,label:t('addToPlaylist'),fn:()=>{setAddToPl(track);setMenuId(null);}},
      {icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,label:lang==='ru'?'К артисту':'Go to artist',fn:()=>{openArtist('',track.artist,'',0);setMenuId(null);}},
      ...(track.albumId?[{icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>,label:t('goToAlbum'),fn:()=>{openAlbum(track.albumId!,track.albumTitle||'Album',track.artist,track.cover);setMenuId(null);}}]:[]),
    ];
    return(
      <div style={{position:'relative'}}>
        <div onClick={e=>{e.stopPropagation();if(mOpen){setMenuId(null);return;}setMenuId(null);playTrack(track);}} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:12,cursor:'pointer',marginBottom:1,background:active?ACC_DIM:'transparent'}}>
          {num!==undefined&&<div style={{fontSize:11,color:active?ACC:TEXT_MUTED,width:18,flexShrink:0,textAlign:'right'}}>{num}</div>}
          <div style={{position:'relative',flexShrink:0}}>
            <Img src={track.cover} size={44} radius={track.isArtist?22:8}/>
            {active&&!track.isArtist&&!track.isAlbum&&<div style={{position:'absolute',inset:0,borderRadius:8,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>{playing?'⏸':'▶'}</div>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:500,color:active?ACC:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{track.title}</div>
            <div style={{display:'flex',alignItems:'center',gap:4,marginTop:2}}>
              {!track.isArtist&&!track.isAlbum&&onArtistClick
                ?<button onClick={e=>{e.stopPropagation();onArtistClick(track.artist,track.cover);}} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontSize:11,color:TEXT_SEC,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:130,textAlign:'left'}}>{track.artist}</button>
                :<span style={{fontSize:11,color:track.isArtist?ACC:TEXT_SEC,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:130}}>{track.isAlbum?`${track.trackCount||0} треков`:track.artist}</span>
              }
              {!track.isArtist&&!track.isAlbum&&track.plays>0&&<span style={{fontSize:10,color:TEXT_MUTED,flexShrink:0}}>· {fmtP(track.plays)}</span>}
            </div>
          </div>
          {!track.isArtist&&!track.isAlbum&&(
            <div style={{display:'flex',alignItems:'center',gap:1,flexShrink:0}}>
              <button onClick={e=>addQ(track,e)} style={{background:'none',border:'none',cursor:'pointer',padding:'3px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={inQ(track.id)?ACC:'#5a5a5a'} strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1.2" fill={inQ(track.id)?ACC:'#5a5a5a'}/><circle cx="3" cy="12" r="1.2" fill={inQ(track.id)?ACC:'#5a5a5a'}/><circle cx="3" cy="18" r="1.2" fill={inQ(track.id)?ACC:'#5a5a5a'}/></svg>
              </button>
              <button onClick={e=>{e.stopPropagation();setMenuId(mOpen?null:track.id);}} style={{background:'none',border:'none',cursor:'pointer',padding:'3px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill={ACC} stroke="none"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
              </button>
              <div style={{fontSize:10,color:TEXT_SEC,flexShrink:0,minWidth:28,textAlign:'right'}}>{track.duration}</div>
            </div>
          )}
          {(track.isArtist||track.isAlbum)&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#5a5a5a" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>}
        </div>
        {mOpen&&(
          <div onClick={e=>e.stopPropagation()} style={{position:'absolute',right:8,top:'calc(100% + 2px)',background:'#222',border:'1px solid #2a2a2a',borderRadius:12,zIndex:50,minWidth:170,boxShadow:'0 12px 32px rgba(0,0,0,0.8)',overflow:'hidden'}}>
            {menuItems.map((item,i)=>(
              <button key={i} onClick={item.fn} style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'10px 12px',background:'none',border:'none',cursor:'pointer',color:'#ddd',fontSize:12,borderBottom:i<menuItems.length-1?'1px solid #2a2a2a':'none',textAlign:'left' as const}}>
                {item.icon}{item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const PlModal=({track}:{track:Track})=>(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'flex-end',zIndex:300}} onClick={()=>setAddToPl(null)}>
      <div style={{background:'#1a1a1a',width:'100%',borderRadius:'18px 18px 0 0',padding:'18px 16px 36px'}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:14,fontWeight:600,color:TEXT_PRIMARY,marginBottom:12}}>{t('addToPlaylist')}</div>
        {playlists.length===0?<div style={{color:TEXT_MUTED,fontSize:12,textAlign:'center',padding:'16px 0'}}>{t('noPlaylists')}</div>
          :playlists.map(pl=><div key={pl.id} onClick={()=>addToPl2(pl.id,track)} style={{padding:'11px 12px',borderRadius:9,background:BG3,marginBottom:5,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{color:'#d0d0d0',fontSize:13}}>{pl.name}</span><span style={{color:TEXT_MUTED,fontSize:11}}>{pl.tracks.length}</span></div>)
        }
        <button onClick={()=>setAddToPl(null)} style={{width:'100%',padding:'10px',background:BG3,border:'none',borderRadius:9,color:TEXT_SEC,fontSize:12,cursor:'pointer',marginTop:4}}>{t('cancel')}</button>
      </div>
    </div>
  );

  const NAV=[
    {id:'home',icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#606060'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,lbl:(a:boolean)=>t('home')},
    {id:'search',icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#606060'} strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,lbl:(a:boolean)=>t('search')},
    {id:'library',icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#606060'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,lbl:(a:boolean)=>t('library')},
    {id:'trending',icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#606060'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,lbl:(a:boolean)=>t('trending')},
  ];

  // ── FULL PLAYER ─────────────────────────────────────────────────────────────
  if(fullPlayer&&current)return(
    <div style={{background:FULL_BG,height:'100vh',width:'100%',display:'flex',flexDirection:'column',alignItems:'center',padding:'0 22px',fontFamily:"-apple-system,'SF Pro Display',sans-serif",boxSizing:'border-box',overflow:'hidden'}}>
      <audio ref={audio}/>
      {showQueue&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.82)',zIndex:200,display:'flex',alignItems:'flex-end'}} onClick={()=>setShowQueue(false)}>
          <div style={{background:'#242424',width:'100%',borderRadius:'18px 18px 0 0',padding:'16px 16px 32px',maxHeight:'68vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div><div style={{fontSize:14,fontWeight:600,color:TEXT_PRIMARY}}>{t('queue')}</div><div style={{fontSize:10,color:TEXT_MUTED,marginTop:1}}>{queue.length} {lang==='ru'?'треков':'tracks'}</div></div>
              <button onClick={()=>setQueue([])} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:TEXT_SEC}}>{lang==='ru'?'Очистить':'Clear'}</button>
            </div>
            {queue.length===0?<div style={{color:TEXT_MUTED,fontSize:12,textAlign:'center',padding:'20px 0'}}>{lang==='ru'?'Пусто':'Empty'}</div>
              :queue.map((tr,i)=>(
                <div key={tr.id+i} draggable onDragStart={()=>setDragIdx(i)} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(dragIdx!==null&&dragIdx!==i)moveQ(dragIdx,i);setDragIdx(null);}}
                  style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #2a2a2a',cursor:'grab',background:dragIdx===i?ACC_DIM:'transparent',borderRadius:6}}>
                  <div style={{color:'#444',fontSize:15,padding:'0 3px'}}>⠿</div>
                  <Img src={tr.cover} size={36} radius={6}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{tr.title}</div>
                    <div style={{fontSize:10,color:TEXT_SEC,marginTop:1}}>{tr.artist}</div>
                  </div>
                  <button onClick={()=>{playDirect(tr);setQueue(prev=>prev.filter((_,j)=>j!==i));setShowQueue(false);}} style={{background:'none',border:'none',cursor:'pointer',padding:3}}>
                    <div style={{width:0,height:0,borderStyle:'solid',borderWidth:'5px 0 5px 9px',borderColor:`transparent transparent transparent ${ACC}`,marginLeft:1}}/>
                  </button>
                  <button onClick={()=>rmQ(i)} style={{background:'none',border:'none',cursor:'pointer',color:TEXT_SEC,fontSize:16,padding:'0 3px',lineHeight:1}}>×</button>
                </div>
              ))
            }
          </div>
        </div>
      )}
      <div style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:40,paddingBottom:10,flexShrink:0}}>
        <button onClick={()=>setFullPlayer(false)} style={{background:'none',border:'none',cursor:'pointer',padding:6,margin:-6}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{fontSize:10,color:TEXT_MUTED,letterSpacing:1.5,textTransform:'uppercase'}}>{t('nowPlaying')}</span>
        <button onClick={()=>setShowQueue(true)} style={{background:'none',border:'none',cursor:'pointer',padding:6,margin:-6,position:'relative'}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={queue.length>0?ACC:'#666'} strokeWidth="2" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          {queue.length>0&&<span style={{position:'absolute',top:3,right:3,background:ACC,color:BG,fontSize:8,fontWeight:700,borderRadius:'50%',width:12,height:12,display:'flex',alignItems:'center',justifyContent:'center'}}>{queue.length}</span>}
        </button>
      </div>
      <div style={{width:'100%',display:'flex',justifyContent:'center',flexShrink:0,marginBottom:14}}>
        <div style={{borderRadius:16,overflow:'hidden',boxShadow:'0 16px 48px rgba(0,0,0,0.6)'}}>
          <Img src={current.cover} size={Math.min(window.innerWidth-64,230)} radius={0}/>
        </div>
      </div>
      <div style={{width:'100%',flexShrink:0,marginBottom:10}}>
        {/* #8 клик по названию → альбом */}
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <button onClick={()=>{if(current.albumId){setFullPlayer(false);openAlbum(current.albumId,current.albumTitle||'Album',current.artist,current.cover);}}} style={{background:'none',border:'none',padding:0,cursor:current.albumId?'pointer':'default',flex:1,minWidth:0,textAlign:'left' as const}}>
            <div style={{fontSize:17,fontWeight:600,color:TEXT_PRIMARY,lineHeight:1.3,wordBreak:'break-word' as const,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',textDecoration:current.albumId?`underline ${ACC}44`:'none',textUnderlineOffset:3}}>{current.title}</div>
          </button>
          {current.albumId&&<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round" style={{flexShrink:0,opacity:0.6}}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>}
        </div>
        <button onClick={()=>{setFullPlayer(false);openArtist(current.permalink||'',current.artist,current.cover,0);}} style={{background:'none',border:'none',cursor:'pointer',padding:0,marginTop:5,display:'block',textAlign:'left' as const}}>
          <span style={{fontSize:13,color:ACC}}>{current.artist}</span>
        </button>
        {current.plays>0&&<div style={{fontSize:10,color:TEXT_MUTED,marginTop:2}}>{fmtP(current.plays)} {t('plays')}</div>}
      </div>
      <div style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0,marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center'}}>
          <HBtn track={current} sz={22}/>
          <button onClick={()=>setAddToPl(current)} style={{background:'none',border:'none',cursor:'pointer',padding:5}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>
        <div style={{display:'flex',alignItems:'center'}}>
          <button onClick={()=>setLoop(!loop)} style={{background:'none',border:'none',cursor:'pointer',padding:5}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={loop?ACC:'#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
          </button>
          <button onClick={()=>share(current)} style={{background:'none',border:'none',cursor:'pointer',padding:5}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
      </div>
      {copied&&<div style={{fontSize:10,color:ACC,alignSelf:'flex-start',marginBottom:6,marginTop:-6}}>{t('copied')}</div>}
      <div style={{width:'100%',flexShrink:0,marginBottom:2}}>
        <SliderTrack val={progress/100} sp={seekSP} h={3}/>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:TEXT_SEC,marginTop:5}}><span>{curTime}</span><span>{current.duration}</span></div>
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:32,flexShrink:0,marginBottom:12}}>
        <button style={{background:'none',border:'none',cursor:'pointer',opacity:0.35}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg></button>
        <button onClick={togglePlay} style={{width:58,height:58,borderRadius:'50%',background:ACC,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}><PP sz="lg"/></button>
        <button onClick={()=>{if(queue.length>0){const nxt=queue[0];setQueue(prev=>prev.slice(1));playDirect(nxt);}}} style={{background:'none',border:'none',cursor:'pointer',opacity:queue.length>0?1:0.35}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg></button>
      </div>
      <div style={{width:'100%',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5a5a5a" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>
        <SliderTrack val={volume} sp={volSP} h={3}/>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5a5a5a" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>
      </div>
      {addToPl&&<PlModal track={addToPl}/>}
    </div>
  );

  // ── MAIN ────────────────────────────────────────────────────────────────────
  return(
    <div onClick={()=>menuId&&setMenuId(null)} style={{background:BG,minHeight:'100vh',width:'100%',fontFamily:"-apple-system,'SF Pro Display',sans-serif",position:'relative',boxSizing:'border-box'}}>
      <audio ref={audio}/>
      <div style={{paddingBottom:current?NAV_H+72+8:NAV_H+6,minHeight:'100vh'}}>

        {/* ARTIST — Spotify layout */}
        {screen==='artist'&&(
          <div>
            <div style={{padding:'44px 16px 0',display:'flex',alignItems:'center',gap:6}}>
              <button onClick={()=>setScreen(prevScreen.current)} style={{background:'none',border:'none',cursor:'pointer',padding:'6px 10px 6px 0',display:'flex',alignItems:'center',gap:6}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEXT_SEC} strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                <span style={{fontSize:13,color:TEXT_SEC,fontWeight:500}}>{t('backToSearch')}</span>
              </button>
            </div>
            {artistLoading
              ?<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',paddingTop:100,gap:12}}>
                <div style={{width:36,height:36,borderRadius:'50%',border:`2px solid ${ACC}`,borderTopColor:'transparent',animation:'spin 0.8s linear infinite'}}/>
                <div style={{fontSize:12,color:TEXT_MUTED}}>{t('loading')}</div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
              :artistPage&&(
                <div>
                  <div style={{width:'100%',height:120,background:BG3,position:'relative',overflow:'hidden',marginBottom:-34}}>
                    {artistPage.banner?<img src={artistPage.banner} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} onError={()=>{}}/>:<div style={{width:'100%',height:'100%',background:`linear-gradient(135deg,#2a1f0e,${BG})`}}/>}
                    <div style={{position:'absolute',inset:0,background:`linear-gradient(to bottom,transparent 20%,${BG})`}}/>
                  </div>
                  <div style={{padding:'0 16px 16px',display:'flex',alignItems:'flex-end',gap:12,position:'relative',zIndex:1}}>
                    <div style={{flexShrink:0,borderRadius:'50%',overflow:'hidden',border:`2px solid ${BG}`}}><Img src={artistPage.avatar} size={70} radius={35}/></div>
                    <div style={{flex:1,minWidth:0,paddingBottom:2}}>
                      <div style={{fontSize:19,fontWeight:700,color:TEXT_PRIMARY,letterSpacing:-0.3}}>{artistPage.name}</div>
                      {artistPage.username&&<div style={{fontSize:11,color:TEXT_SEC,marginTop:1}}>@{artistPage.username}</div>}
                      {artistPage.followers>0&&<div style={{fontSize:11,color:TEXT_SEC,marginTop:1}}>{fmtP(artistPage.followers)} {lang==='ru'?'подписчиков':'followers'}</div>}
                    </div>
                    <button onClick={()=>artistPage&&toggleFavA(artistPage)} style={{flexShrink:0,padding:'6px 14px',borderRadius:16,border:`1px solid ${isFavA(artistPage)?ACC:'#3a3a3a'}`,background:isFavA(artistPage)?ACC_DIM:'transparent',color:isFavA(artistPage)?ACC:TEXT_SEC,fontSize:12,cursor:'pointer',marginBottom:2,fontWeight:500}}>
                      {isFavA(artistPage)?t('removeFav'):t('addFav')}
                    </button>
                  </div>

                  {artistPage.tracks.length===0
                    ?<div style={{padding:'24px',textAlign:'center',color:TEXT_SEC,fontSize:13}}>{lang==='ru'?'Треки не найдены':'No tracks found'}</div>
                    :<div>
                      {/* Последний релиз */}
                      {artistPage.latestRelease&&(
                        <div style={{padding:'4px 16px 16px'}}>
                          <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:'uppercase',letterSpacing:0.8,marginBottom:9}}>{lang==='ru'?'Последний релиз':'Latest release'}</div>
                          <div onClick={()=>artistPage.latestRelease&&playTrack(artistPage.latestRelease)} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:12,background:BG2,cursor:'pointer',border:`1px solid #252525`}}>
                            <div style={{position:'relative',flexShrink:0}}>
                              <Img src={artistPage.latestRelease.cover} size={54} radius={8}/>
                              {current?.id===artistPage.latestRelease.id&&<div style={{position:'absolute',inset:0,borderRadius:8,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>{playing?'⏸':'▶'}</div>}
                            </div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:14,fontWeight:600,color:current?.id===artistPage.latestRelease.id?ACC:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{artistPage.latestRelease.title}</div>
                              <div style={{fontSize:11,color:TEXT_SEC,marginTop:3}}>{artistPage.latestRelease.duration}{artistPage.latestRelease.plays>0?` · ${fmtP(artistPage.latestRelease.plays)} ${t('plays')}`:''}</div>
                            </div>
                            <HBtn track={artistPage.latestRelease} sz={18}/>
                          </div>
                        </div>
                      )}

                      {/* Топ 5 */}
                      <div style={{padding:'0 16px 8px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:'uppercase',letterSpacing:0.8}}>{lang==='ru'?'Популярное':'Popular'}</div>
                      </div>
                      <div style={{padding:'0 4px'}}>
                        {artistPage.tracks.slice(0,5).map((tr,i)=><TRow key={tr.id} track={tr} num={i+1} onArtistClick={(name,cover)=>openArtist('',name,cover,0)}/>)}
                      </div>

                      {/* Дискография */}
                      {artistPage.albums.length>0&&(
                        <div style={{padding:'16px 0 4px'}}>
                          <div style={{padding:'0 16px 10px',fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:'uppercase',letterSpacing:0.8}}>{lang==='ru'?'Дискография':'Discography'}</div>
                          <div style={{display:'flex',gap:12,padding:'0 16px',overflowX:'auto',scrollbarWidth:'none' as const}}>
                            {artistPage.albums.map(al=>(
                              <div key={al.id} onClick={()=>openAlbum(al.id,al.title,al.artist,al.cover)} style={{width:108,flexShrink:0,cursor:'pointer'}}>
                                <div style={{borderRadius:8,overflow:'hidden',marginBottom:7,boxShadow:'0 4px 12px rgba(0,0,0,0.4)'}}><Img src={al.cover} size={108} radius={0}/></div>
                                <div style={{fontSize:11,fontWeight:500,color:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{al.title}</div>
                                <div style={{fontSize:10,color:TEXT_MUTED,marginTop:2}}>{lang==='ru'?'Альбом':'Album'}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Все треки */}
                      <div style={{padding:'16px 0 4px'}}>
                        <div style={{padding:'0 16px 8px',fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:'uppercase',letterSpacing:0.8}}>{lang==='ru'?'Все треки':'All tracks'} · {artistPage.tracks.length}</div>
                        <div style={{padding:'0 4px'}}>
                          {artistPage.tracks.map((tr,i)=><TRow key={tr.id+'all'} track={tr} num={i+1} onArtistClick={(name,cover)=>openArtist('',name,cover,0)}/>)}
                        </div>
                      </div>
                    </div>
                  }
                </div>
              )
            }
          </div>
        )}

        {/* ALBUM — все треки */}
        {screen==='album'&&(
          <div>
            <div style={{padding:'44px 16px 0',display:'flex',alignItems:'center',gap:6}}>
              <button onClick={()=>setScreen(prevScreen.current)} style={{background:'none',border:'none',cursor:'pointer',padding:'6px 10px 6px 0',display:'flex',alignItems:'center',gap:6}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEXT_SEC} strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                <span style={{fontSize:13,color:TEXT_SEC,fontWeight:500}}>{t('backToSearch')}</span>
              </button>
            </div>
            {albumLoading?<div style={{display:'flex',alignItems:'center',justifyContent:'center',paddingTop:100}}><div style={{fontSize:12,color:TEXT_MUTED}}>{t('loading')}</div></div>
              :albumPage&&(
                <div>
                  <div style={{padding:'14px 16px 0',display:'flex',gap:14,alignItems:'center'}}>
                    <Img src={albumPage.cover} size={80} radius={10}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:16,fontWeight:700,color:TEXT_PRIMARY,lineHeight:1.3}}>{albumPage.title}</div>
                      <button onClick={()=>openArtist('',albumPage.artist,'',0)} style={{background:'none',border:'none',padding:0,cursor:'pointer',marginTop:4,display:'block',textAlign:'left' as const}}>
                        <span style={{fontSize:12,color:ACC}}>{albumPage.artist}</span>
                      </button>
                      <div style={{fontSize:11,color:TEXT_MUTED,marginTop:4}}>{albumPage.tracks.length} {lang==='ru'?'треков':'tracks'}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:7,padding:'12px 16px'}}>
                    <button onClick={()=>{if(albumPage.tracks.length){playTrack(albumPage.tracks[0]);setQueue(albumPage.tracks.slice(1));}}} style={{flex:1,padding:'10px',background:ACC,border:'none',borderRadius:10,color:BG,fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
                      <div style={{width:0,height:0,borderStyle:'solid',borderWidth:'5px 0 5px 9px',borderColor:`transparent transparent transparent ${BG}`}}/>
                      {lang==='ru'?'Играть':'Play'}
                    </button>
                    <button onClick={()=>{const sh=[...albumPage.tracks].sort(()=>Math.random()-.5);if(sh.length){playTrack(sh[0]);setQueue(sh.slice(1));}}} style={{flex:1,padding:'10px',background:ACC_DIM,border:`1px solid ${ACC}22`,borderRadius:10,color:ACC,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
                      {t('shuffle')}
                    </button>
                    <button onClick={()=>toggleFavAl(albumPage)} style={{padding:'10px 14px',borderRadius:10,border:`1px solid ${isFavAl(albumPage.id)?ACC:'#3a3a3a'}`,background:isFavAl(albumPage.id)?ACC_DIM:'transparent',color:isFavAl(albumPage.id)?ACC:TEXT_SEC,fontSize:15,cursor:'pointer'}}>
                      {isFavAl(albumPage.id)?'♥':'♡'}
                    </button>
                  </div>
                  {/* Все треки альбома без ограничений */}
                  <div style={{padding:'0 4px'}}>
                    {albumPage.tracks.map((tr,i)=><TRow key={tr.id} track={tr} num={i+1} onArtistClick={(name,cover)=>openArtist('',name,cover,0)}/>)}
                  </div>
                </div>
              )
            }
          </div>
        )}

        {/* HOME */}
        {screen==='home'&&(
          <div>
            <div style={{padding:'44px 16px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:21,fontWeight:700,color:TEXT_PRIMARY,letterSpacing:-0.3}}>{greeting(lang)}</div>
                <div style={{fontSize:12,color:ACC,marginTop:3,letterSpacing:1.5,fontWeight:600,opacity:0.8}}>FORTY7</div>
              </div>
              <button onClick={()=>setScreen('profile')} style={{display:'flex',alignItems:'center',gap:7,padding:'6px 11px',borderRadius:18,background:BG2,border:`1px solid #2e2e2e`,cursor:'pointer',flexShrink:0,maxWidth:140}}>
                <div style={{width:22,height:22,borderRadius:'50%',background:ACC_DIM,border:`1px solid ${ACC}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:ACC,flexShrink:0}}>{uInit}</div>
                <span style={{fontSize:12,color:TEXT_SEC,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:88}}>{uHandle||uName}</span>
              </button>
            </div>
            {history.length>0&&(
              <div>
                <div style={{padding:'10px 16px 8px'}}><div style={{fontSize:11,fontWeight:600,color:TEXT_SEC,textTransform:'uppercase' as const,letterSpacing:0.8}}>{t('recent')}</div></div>
                <div style={{display:'flex',gap:10,padding:'0 16px',overflowX:'auto',scrollbarWidth:'none' as const}}>
                  {history.slice(0,8).map(tr=>(
                    <div key={tr.id} style={{width:100,borderRadius:10,background:BG2,overflow:'hidden',cursor:'pointer',flexShrink:0,border:'1px solid #1e1e1e'}}>
                      <div onClick={()=>playTrack(tr)} style={{width:100,height:100}}><Img src={tr.cover} size={100} radius={0}/></div>
                      <div style={{padding:'6px 7px 8px',boxSizing:'border-box' as const}}>
                        <button onClick={()=>openArtist('',tr.artist,tr.cover,0)} style={{background:'none',border:'none',padding:0,cursor:'pointer',display:'block',width:'100%',textAlign:'left' as const}}>
                          <div style={{fontSize:10,fontWeight:600,color:ACC,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',opacity:0.9}}>{tr.artist}</div>
                        </button>
                        <div onClick={()=>playTrack(tr)} style={{fontSize:9,color:TEXT_MUTED,marginTop:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',cursor:'pointer'}}>{tr.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{padding:'14px 16px 8px'}}><div style={{fontSize:11,fontWeight:600,color:TEXT_SEC,textTransform:'uppercase' as const,letterSpacing:0.8}}>{t('recommended')}</div></div>
            {recs.length===0&&history.length<2
              ?<div style={{padding:'0 16px',fontSize:12,color:TEXT_MUTED}}>{t('noRecommended')}</div>
              :<div style={{padding:'0 4px'}}>{(recs.length>0?recs:history).slice(0,8).map((tr,i)=><TRow key={tr.id} track={tr} num={i+1} onArtistClick={(name,cover)=>openArtist('',name,cover,0)}/>)}</div>
            }
          </div>
        )}

        {/* SEARCH — порядок: Sound, Albums, Remix, Artists */}
        {screen==='search'&&(
          <div>
            <div style={{padding:'44px 16px 12px'}}>
              <div style={{fontSize:22,fontWeight:700,color:TEXT_PRIMARY,marginBottom:12,letterSpacing:-0.5}}>{t('search')}</div>
              <div style={{display:'flex',gap:8}}>
                <input type="text" placeholder={t('searchPlaceholder')} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch()}
                  style={{flex:1,padding:'11px 14px',fontSize:14,background:BG2,border:'1px solid #2a2a2a',borderRadius:12,color:TEXT_PRIMARY,outline:'none',width:'100%',boxSizing:'border-box' as const}}/>
                <button onClick={()=>doSearch()} disabled={loading} style={{padding:'11px 14px',background:loading?BG3:ACC,color:loading?TEXT_MUTED:BG,border:'none',borderRadius:12,fontSize:13,fontWeight:600,cursor:loading?'not-allowed':'pointer',flexShrink:0}}>{loading?'...':t('find')}</button>
              </div>
              <div style={{display:'flex',gap:5,marginTop:9,overflowX:'auto',scrollbarWidth:'none' as const}}>
                {(['sound','albums','remix','artists'] as const).map(m=>(
                  <button key={m} onClick={()=>setSearchMode(m)} style={{padding:'5px 13px',borderRadius:16,border:'none',background:searchMode===m?ACC:ACC_DIM,color:searchMode===m?BG:ACC,fontSize:12,fontWeight:searchMode===m?600:400,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap' as const}}>
                    {m==='sound'?t('sound'):m==='albums'?t('albumsTab'):m==='remix'?t('remix'):t('artists')}
                  </button>
                ))}
              </div>
              {error&&<div style={{marginTop:8,padding:'8px 12px',background:'#1a0a0a',borderRadius:9,color:'#d06060',fontSize:12}}>{error}</div>}
            </div>
            <div style={{padding:'0 4px'}}>
              {loading&&<div style={{textAlign:'center',paddingTop:36,color:TEXT_MUTED,fontSize:12}}>{t('loading')}</div>}
              {results.map((tr,i)=><TRow key={tr.id} track={tr} num={i+1} onArtistClick={(name,cover)=>openArtist('',name,cover,0)}/>)}
            </div>
          </div>
        )}

        {/* LIBRARY */}
        {screen==='library'&&(
          <div>
            <div style={{padding:'44px 16px 12px'}}><div style={{fontSize:22,fontWeight:700,color:TEXT_PRIMARY,letterSpacing:-0.5}}>{t('library')}</div></div>
            <div style={{display:'flex',gap:5,padding:'0 16px 12px',overflowX:'auto',scrollbarWidth:'none' as const}}>
              {(['liked','playlists','artists','albums'] as const).map(tab=>(
                <button key={tab} onClick={()=>setLibTab(tab)} style={{padding:'5px 13px',borderRadius:16,border:'none',background:libTab===tab?ACC:ACC_DIM,color:libTab===tab?BG:ACC,fontSize:12,fontWeight:libTab===tab?600:400,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap' as const}}>
                  {tab==='liked'?t('likedTracks'):tab==='playlists'?t('playlists'):tab==='artists'?t('favArtists'):t('albums')}
                </button>
              ))}
            </div>
            {libTab==='liked'&&(liked.length===0
              ?<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:60}}><div style={{fontSize:38,marginBottom:12,filter:'sepia(1) saturate(3) hue-rotate(10deg)'}}>🎵</div><div style={{fontSize:13,color:TEXT_MUTED}}>{t('noLiked')}</div></div>
              :<div style={{padding:'0 4px'}}>{liked.map((tr,i)=><TRow key={tr.id} track={tr} num={i+1} onArtistClick={(name,cover)=>openArtist('',name,cover,0)}/>)}</div>
            )}
            {libTab==='artists'&&(
              <div style={{padding:'0 16px'}}>
                {favArtists.length===0
                  ?<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:60}}><div style={{fontSize:38,marginBottom:12,filter:'sepia(1) saturate(3) hue-rotate(10deg)'}}>🎤</div><div style={{fontSize:13,color:TEXT_MUTED}}>{lang==='ru'?'Нет избранных артистов':'No favourite artists'}</div></div>
                  :favArtists.map(a=>(
                    <div key={a.id||a.name} onClick={()=>openArtist(a.permalink||'',a.name,a.avatar||'',a.followers)} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid #1e1e1e`,cursor:'pointer'}}>
                      <Img src={a.avatar||''} size={46} radius={23}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:500,color:TEXT_PRIMARY}}>{a.name}</div>
                        {a.username&&<div style={{fontSize:10,color:TEXT_SEC,marginTop:1}}>@{a.username}</div>}
                        {a.followers>0&&<div style={{fontSize:10,color:TEXT_SEC,marginTop:1}}>{fmtP(a.followers)} {lang==='ru'?'подписчиков':'followers'}</div>}
                      </div>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4a4a4a" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  ))
                }
              </div>
            )}
            {libTab==='albums'&&(
              <div style={{padding:'0 16px'}}>
                {favAlbums.length===0
                  ?<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:60}}><div style={{fontSize:38,marginBottom:12,filter:'sepia(1) saturate(3) hue-rotate(10deg)'}}>💿</div><div style={{fontSize:13,color:TEXT_MUTED}}>{lang==='ru'?'Нет избранных альбомов':'No favourite albums'}</div></div>
                  :favAlbums.map(al=>(
                    <div key={al.id} onClick={()=>openAlbum(al.id,al.title,al.artist,al.cover)} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid #1e1e1e`,cursor:'pointer'}}>
                      <Img src={al.cover} size={50} radius={8}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:500,color:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{al.title}</div>
                        <div style={{fontSize:11,color:TEXT_SEC,marginTop:2}}>{al.artist}</div>
                      </div>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4a4a4a" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  ))
                }
              </div>
            )}
            {libTab==='playlists'&&(
              <div style={{padding:'0 16px'}}>
                <button onClick={()=>setShowNewPl(true)} style={{width:'100%',padding:'10px',background:ACC_DIM,border:`1px dashed ${ACC}44`,borderRadius:11,color:ACC,fontSize:12,cursor:'pointer',marginBottom:9,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  {t('createPlaylist')}
                </button>
                {showNewPl&&(
                  <div style={{background:BG2,border:'1px solid #242424',borderRadius:11,padding:'11px',marginBottom:9}}>
                    <input autoFocus placeholder={t('playlistName')} value={newPlName} onChange={e=>setNewPlName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createPl()}
                      style={{width:'100%',padding:'8px 11px',fontSize:13,background:BG,border:'1px solid #2a2a2a',borderRadius:7,color:TEXT_PRIMARY,outline:'none',boxSizing:'border-box' as const,marginBottom:7}}/>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={createPl} style={{flex:1,padding:'8px',background:ACC,border:'none',borderRadius:7,color:BG,fontSize:12,fontWeight:600,cursor:'pointer'}}>{t('create')}</button>
                      <button onClick={()=>{setShowNewPl(false);setNewPlName('');}} style={{flex:1,padding:'8px',background:BG3,border:'none',borderRadius:7,color:TEXT_SEC,fontSize:12,cursor:'pointer'}}>{t('cancel')}</button>
                    </div>
                  </div>
                )}
                {playlists.map(pl=>{
                  const isOpen=openPlId===pl.id;
                  return(
                    <div key={pl.id} style={{background:BG2,border:'1px solid #1e1e1e',borderRadius:12,marginBottom:7,overflow:'hidden'}}>
                      <div onClick={()=>setOpenPlId(isOpen?null:pl.id)} style={{padding:'11px 13px',cursor:'pointer',display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:46,height:46,borderRadius:7,overflow:'hidden',flexShrink:0,display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:BG3}}>
                          {pl.tracks.slice(0,4).map((tr,i)=><div key={i} style={{overflow:'hidden',width:'100%',height:'100%'}}><Img src={tr.cover} size={23} radius={0}/></div>)}
                          {pl.tracks.length===0&&<div style={{gridColumn:'span 2',gridRow:'span 2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,color:ACC}}>🎵</div>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:500,color:TEXT_PRIMARY}}>{pl.name}</div>
                          <div style={{fontSize:10,color:TEXT_SEC,marginTop:2}}>{pl.tracks.length} {lang==='ru'?'треков':'tracks'}</div>
                        </div>
                        {/* #6 круглая кнопка плей */}
                        <button onClick={e=>{e.stopPropagation();playPl(pl);}} style={{width:34,height:34,minWidth:34,borderRadius:'50%',background:ACC,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,padding:0}}>
                          <div style={{width:0,height:0,borderStyle:'solid',borderWidth:'6px 0 6px 10px',borderColor:`transparent transparent transparent ${BG}`,marginLeft:3}}/>
                        </button>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5a5a5a" strokeWidth="2" strokeLinecap="round" style={{transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.2s',flexShrink:0}}><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                      {isOpen&&(
                        <div>
                          <div style={{display:'flex',gap:5,padding:'0 13px 9px'}}>
                            <button onClick={()=>shufflePl(pl)} style={{flex:1,padding:'7px',background:ACC_DIM,border:'none',borderRadius:7,color:ACC,fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>{t('shuffle')}</button>
                            <button onClick={()=>setPlaylists(prev=>{const n=prev.map(p=>p.id===pl.id?{...p,repeat:!p.repeat}:p);try{localStorage.setItem('p47',JSON.stringify(n));}catch{}return n;})} style={{flex:1,padding:'7px',background:pl.repeat?ACC:ACC_DIM,border:'none',borderRadius:7,color:pl.repeat?BG:ACC,fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={pl.repeat?BG:ACC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>{t('repeatPl')}</button>
                          </div>
                          <div style={{borderTop:'1px solid #1e1e1e'}}>
                            {pl.tracks.length===0
                              ?<div style={{padding:'14px',textAlign:'center',color:TEXT_MUTED,fontSize:11}}>{lang==='ru'?'Нет треков':'No tracks'}</div>
                              :pl.tracks.map((tr,i)=>(
                                <div key={tr.id+i} onClick={()=>{playTrack(tr);setQueue(pl.tracks.slice(i+1));}} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 13px',cursor:'pointer',background:current?.id===tr.id?ACC_DIM:'transparent',borderBottom:'1px solid #1a1a1a'}}>
                                  <Img src={tr.cover} size={36} radius={6}/>
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:12,color:current?.id===tr.id?ACC:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{tr.title}</div>
                                    <div style={{fontSize:10,color:TEXT_SEC,marginTop:1}}>{tr.artist}</div>
                                  </div>
                                  <div style={{fontSize:10,color:TEXT_SEC}}>{tr.duration}</div>
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
          const ct=trends[trendGenre]||[];
          return(
            <div>
              <div style={{padding:'44px 16px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:22,fontWeight:700,color:TEXT_PRIMARY,letterSpacing:-0.5}}>{t('trending')}</div>
                <button onClick={()=>loadTrend(trendGenre,true)} style={{background:'none',border:'none',cursor:'pointer',padding:4}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5a5a5a" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg></button>
              </div>
              <div style={{display:'flex',gap:6,padding:'0 16px 12px',overflowX:'auto',scrollbarWidth:'none' as const}}>
                {GENRES.map(g=>(
                  <button key={g.id} onClick={()=>setTrendGenre(g.id)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'8px 11px',borderRadius:12,border:trendGenre===g.id?`1px solid ${ACC}44`:'1px solid #222',background:trendGenre===g.id?ACC_DIM:BG2,color:trendGenre===g.id?ACC:TEXT_SEC,cursor:'pointer',flexShrink:0,minWidth:54,transition:'all 0.15s'}}>
                    <span style={{fontSize:19}}>{g.e}</span>
                    <span style={{fontSize:9,fontWeight:trendGenre===g.id?600:400,whiteSpace:'nowrap'}}>{g.label}</span>
                  </button>
                ))}
              </div>
              {trendLoading&&ct.length===0
                ?<div style={{display:'flex',alignItems:'center',justifyContent:'center',paddingTop:80}}><div style={{fontSize:12,color:TEXT_MUTED}}>{t('loading')}</div></div>
                :ct.length===0
                  ?<div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'60px 20px 0',textAlign:'center'}}><div style={{fontSize:38,marginBottom:12}}>📈</div><div style={{fontSize:13,color:TEXT_MUTED}}>{t('notFound')}</div><button onClick={()=>loadTrend(trendGenre,true)} style={{marginTop:12,padding:'8px 20px',background:ACC_DIM,border:'none',borderRadius:9,color:ACC,fontSize:12,cursor:'pointer'}}>{t('retry')}</button></div>
                  :<div>
                    <div style={{padding:'0 4px'}}>{ct.map((tr,i)=><TRow key={tr.id+i} track={tr} num={i+1} onArtistClick={(name,cover)=>openArtist('',name,cover,0)}/>)}</div>
                    <div style={{padding:'10px 16px 6px',display:'flex',justifyContent:'center'}}><button onClick={()=>loadTrend(trendGenre,false)} disabled={trendLoading} style={{padding:'9px 32px',background:ACC_DIM,border:`1px solid ${ACC}22`,borderRadius:11,color:ACC,fontSize:12,cursor:trendLoading?'not-allowed':'pointer',opacity:trendLoading?.5:1}}>{trendLoading?t('loading'):t('loadMore')}</button></div>
                  </div>
              }
            </div>
          );
        })()}

        {/* PROFILE */}
        {screen==='profile'&&(
          <div>
            <div style={{padding:'44px 16px 18px',display:'flex',alignItems:'center',gap:4}}>
              <button onClick={()=>setScreen('home')} style={{background:'none',border:'none',cursor:'pointer',padding:'4px 8px 4px 0',display:'flex',alignItems:'center',gap:5}}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={TEXT_SEC} strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div style={{fontSize:17,fontWeight:600,color:TEXT_PRIMARY}}>{t('profile')}</div>
              {syncSt==='saving'&&<div style={{marginLeft:'auto',fontSize:10,color:TEXT_MUTED}}>{t('syncing')}</div>}
              {syncSt==='saved'&&<div style={{marginLeft:'auto',fontSize:10,color:ACC}}>{t('syncSaved')}</div>}
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'0 16px 18px'}}>
              <div style={{width:64,height:64,borderRadius:'50%',background:ACC_DIM,border:`2px solid ${ACC}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,fontWeight:700,color:ACC,marginBottom:10}}>{uInit}</div>
              <div style={{fontSize:17,fontWeight:600,color:TEXT_PRIMARY}}>{uName}</div>
              {uHandle&&<div style={{fontSize:11,color:TEXT_SEC,marginTop:2}}>{uHandle}</div>}
            </div>
            <div style={{padding:'0 16px'}}>
              {[{l:t('likedTracks'),v:liked.length},{l:t('playlists'),v:playlists.length},{l:t('listenedTracks'),v:history.length},{l:t('favArtists'),v:favArtists.length},{l:t('albums'),v:favAlbums.length}].map(item=>(
                <div key={item.l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid #1e1e1e'}}>
                  <span style={{fontSize:13,color:TEXT_SEC}}>{item.l}</span>
                  <span style={{fontSize:13,fontWeight:600,color:ACC}}>{item.v}</span>
                </div>
              ))}
              <div style={{padding:'14px 0 8px'}}>
                <div style={{fontSize:10,color:TEXT_MUTED,marginBottom:7,textTransform:'uppercase' as const,letterSpacing:1}}>{t('language')}</div>
                <div style={{display:'flex',gap:6}}>
                  {(['ru','en'] as const).map(l=>(
                    <button key={l} onClick={()=>chgLang(l)} style={{flex:1,padding:'9px',borderRadius:9,border:'none',background:lang===l?ACC:BG2,color:lang===l?BG:TEXT_SEC,fontSize:13,fontWeight:lang===l?600:400,cursor:'pointer'}}>
                      {l==='ru'?'🇷🇺 Русский':'🇺🇸 English'}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={()=>syncSave({liked,playlists,history,volume,favArtists,favAlbums})} style={{width:'100%',marginTop:9,padding:'11px',background:ACC_DIM,border:`1px solid ${ACC}22`,borderRadius:11,color:ACC,fontSize:12,cursor:'pointer'}}>🔄 {t('syncBtn')}</button>
              <button onClick={()=>{try{localStorage.clear();}catch{}setLiked([]);setPlaylists([]);setHistory([]);setRecs([]);setQueue([]);setFavArtists([]);setFavAlbums([]);}} style={{width:'100%',marginTop:6,padding:'11px',background:'#1a0a0a',border:'1px solid #2a1010',borderRadius:11,color:'#c05050',fontSize:12,cursor:'pointer'}}>{t('resetData')}</button>
            </div>
          </div>
        )}
      </div>

      {addToPl&&!fullPlayer&&<PlModal track={addToPl}/>}

      {/* MINI PLAYER */}
      {current&&(
        <div style={{position:'fixed',bottom:NAV_H+5,left:8,right:8,background:MINI_BG,backdropFilter:'blur(20px)',border:'1px solid #3a3228',borderRadius:14,padding:'9px 12px 8px',zIndex:100}}>
          <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:7}}>
            <div onClick={()=>setFullPlayer(true)} style={{cursor:'pointer',flexShrink:0}}><Img src={current.cover} size={38} radius={7}/></div>
            <div onClick={()=>setFullPlayer(true)} style={{flex:1,minWidth:0,cursor:'pointer'}}>
              <div style={{fontSize:12,fontWeight:500,color:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{current.title}</div>
              <div style={{fontSize:10,color:TEXT_SEC,marginTop:1}}>{current.artist}</div>
            </div>
            <button onClick={e=>{e.stopPropagation();togglePlay();}} style={{width:38,height:38,minWidth:38,borderRadius:'50%',background:ACC,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,padding:0}}>
              <PP sz="sm" col={BG}/>
            </button>
          </div>
          {/* #3 перематываемый прогресс снизу */}
          <div style={{display:'flex',alignItems:'center',gap:7}}>
            <span style={{fontSize:9,color:TEXT_MUTED,minWidth:26,textAlign:'right'}}>{curTime}</span>
            <div {...miniSeekSP} ref={miniSeekSP.ref} style={{flex:1,height:16,display:'flex',alignItems:'center',cursor:'pointer',touchAction:'none'}}>
              <div style={{width:'100%',height:2.5,background:'rgba(255,255,255,0.08)',borderRadius:2,position:'relative'}}>
                <div style={{width:`${progress}%`,height:'100%',background:ACC,borderRadius:2,transition:'width 0.3s linear'}}/>
                <div style={{position:'absolute',top:'50%',left:`${progress}%`,transform:'translate(-50%,-50%)',width:10,height:10,background:ACC,borderRadius:'50%'}}/>
              </div>
            </div>
            <span style={{fontSize:9,color:TEXT_MUTED,minWidth:26}}>{current.duration}</span>
          </div>
        </div>
      )}

      {/* NAV */}
      {screen!=='profile'&&screen!=='artist'&&screen!=='album'&&(
        <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(10,10,10,0.97)',backdropFilter:'blur(20px)',borderTop:'1px solid #1e1e1e',padding:'7px 0 13px',display:'flex',justifyContent:'space-around',zIndex:101,height:NAV_H}}>
          {NAV.map(item=>(
            <div key={item.id} onClick={()=>setScreen(item.id as 'home'|'search'|'library'|'trending')} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,cursor:'pointer',padding:'0 8px'}}>
              {item.icon(screen===item.id)}
              <span style={{fontSize:9,color:screen===item.id?ACC:'#606060',letterSpacing:0.3}}>{item.lbl(screen===item.id)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
