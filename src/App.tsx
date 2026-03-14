import { useState, useEffect, useRef, useCallback } from 'react';
declare global { interface Window { Telegram: any; } }

const W = 'https://square-queen-e703.shapovaliluha.workers.dev';
const ACC = '#F0E2C8';
const ACC_DIM = 'rgba(240,226,200,0.10)';
const BG = '#141414';
const BG2 = '#1c1c1c';
const BG3 = '#242424';
const NAV_H = 60;

interface Track { id: string; title: string; artist: string; cover: string; duration: string; plays: number; mp3: string | null; isArtist?: boolean; isAlbum?: boolean; permalink?: string; trackCount?: number; }
interface Playlist { id: string; name: string; tracks: Track[]; repeat: boolean; }
interface AlbumInfo { id: string; title: string; artist: string; cover: string; tracks: Track[]; permalink: string; }
interface ArtistInfo { id: string; name: string; username: string; avatar: string; banner: string; followers: number; permalink: string; tracks: Track[]; latestRelease: Track | null; }

const T: Record<string,Record<string,string>> = {
  en: { home:'Home',search:'Search',library:'Library',trending:'Trending',profile:'Profile',find:'Find',notFound:'Nothing found',recent:'Recent',recommended:'Recommended',likedTracks:'Liked',playlists:'Playlists',albums:'Albums',createPlaylist:'Create playlist',playlistName:'Playlist name',create:'Create',cancel:'Cancel',addToPlaylist:'Add to playlist',noPlaylists:'No playlists.',noLiked:'No liked tracks',loading:'Loading...',loadMore:'Load more',retry:'Try again',nowPlaying:'Now playing',plays:'plays',resetData:'Reset all data',language:'Language',listenedTracks:'Listened',share:'Share',copied:'Copied!',queue:'Queue',sound:'Sound',remix:'Remix',artists:'Artists',albumsTab:'Albums',shuffle:'Shuffle',repeatPl:'Repeat',syncSaved:'Synced ✓',syncing:'Syncing...',syncBtn:'Sync across devices',favArtists:'Artists',addFav:'Follow',removeFav:'Following',backToSearch:'Back',searchPlaceholder:'Songs or artist',noRecommended:'Listen to some tracks first',},
  ru: { home:'Главная',search:'Поиск',library:'Библиотека',trending:'Тренды',profile:'Профиль',find:'Найти',notFound:'Ничего не найдено',recent:'Недавнее',recommended:'Рекомендованное',likedTracks:'Лайки',playlists:'Плейлисты',albums:'Альбомы',createPlaylist:'Создать плейлист',playlistName:'Название',create:'Создать',cancel:'Отмена',addToPlaylist:'В плейлист',noPlaylists:'Нет плейлистов.',noLiked:'Нет лайков',loading:'Загружаем...',loadMore:'Ещё',retry:'Повторить',nowPlaying:'Сейчас играет',plays:'прослушиваний',resetData:'Сбросить данные',language:'Язык',listenedTracks:'Прослушано',share:'Поделиться',copied:'Скопировано!',queue:'Очередь',sound:'Sound',remix:'Remix',artists:'Артисты',albumsTab:'Альбомы',shuffle:'Перемешать',repeatPl:'Повторять',syncSaved:'Синхронизовано ✓',syncing:'Синхронизация...',syncBtn:'Синхронизировать между устройствами',favArtists:'Артисты',addFav:'Подписаться',removeFav:'Подписан',backToSearch:'Назад',searchPlaceholder:'Песни или артист',noRecommended:'Послушай пару треков',},
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
  return<div style={{...s,background:BG3,display:'flex',alignItems:'center',justifyContent:'center',fontSize:Math.floor(size*.36)}}>{fb}</div>;
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

function SliderTrack({val,sp,h=3}:{val:number;sp:any;h?:number}){
  return(
    <div {...sp} ref={sp.ref} style={{flex:1,height:Math.max(h,20),display:'flex',alignItems:'center',cursor:'pointer',touchAction:'none'}}>
      <div style={{width:'100%',height:h,background:BG3,borderRadius:h,position:'relative'}}>
        <div style={{width:`${val*100}%`,height:'100%',background:ACC,borderRadius:h,transition:'width 0.05s'}}/>
        <div style={{position:'absolute',top:'50%',left:`${val*100}%`,transform:'translate(-50%,-50%)',width:h+8,height:h+8,background:ACC,borderRadius:'50%'}}/>
      </div>
    </div>
  );
}

export default function App(){
  const[screen,setScreen]=useState<'home'|'search'|'library'|'trending'|'profile'|'artist'|'album'>('home');
  const[lang,setLang]=useState<'ru'|'en'>('ru');
  const t=(k:string)=>T[lang][k]||k;
  const[query,setQuery]=useState('');
  const[searchMode,setSearchMode]=useState<'sound'|'remix'|'artists'|'albums'>('sound');
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

  useEffect(()=>{const a=audio.current;if(!a)return;const onT=()=>{if(a.duration){setProgress(a.currentTime/a.duration*100);const m=Math.floor(a.currentTime/60),s=Math.floor(a.currentTime%60);setCurTime(`${m}:${s.toString().padStart(2,'0')}`);}}; const onE=()=>{if(loop){a.currentTime=0;a.play();}else if(queue.length>0){const nxt=queue[0];setQueue(prev=>{const n=prev.slice(1);try{localStorage.setItem('q47',JSON.stringify(n));}catch{}return n;});playDirect(nxt);}else setPlaying(false);};a.addEventListener('timeupdate',onT);a.addEventListener('ended',onE);return()=>{a.removeEventListener('timeupdate',onT);a.removeEventListener('ended',onE);};},[current,loop,queue]);
  useEffect(()=>{if(audio.current)audio.current.volume=volume;},[volume]);
  useEffect(()=>{if(screen==='trending'&&!trends[trendGenre])loadTrend(trendGenre,true);},[screen,trendGenre]);
  useEffect(()=>{if(query.trim()&&screen==='search')doSearch(searchMode);},[searchMode]);

  const playDirect=(track:Track)=>{if(!track.mp3)return;if(audio.current){audio.current.src=`${W}/stream?url=${encodeURIComponent(track.mp3)}`;audio.current.play();setPlaying(true);}setCurrent(track);setProgress(0);setCurTime('0:00');setHistory(prev=>{const n=[track,...prev.filter(x=>x.id!==track.id)].slice(0,30);try{localStorage.setItem('h47',JSON.stringify(n));}catch{}return n;});};
  const playTrack=(track:Track)=>{if(track.isArtist){openArtist('',track.title,track.cover,track.plays);return;}if(track.isAlbum){openAlbum(track.id,track.title,track.artist,track.cover);return;}if(!track.mp3)return;if(current?.id===track.id){togglePlay();return;}playDirect(track);};
  const addQ=(track:Track,e:React.MouseEvent)=>{e.stopPropagation();setQueue(prev=>{const n=[...prev,track];try{localStorage.setItem('q47',JSON.stringify(n));}catch{}return n;});};
  const rmQ=(i:number)=>setQueue(prev=>{const n=[...prev];n.splice(i,1);try{localStorage.setItem('q47',JSON.stringify(n));}catch{}return n;});
  const inQ=(id:string)=>queue.some(t=>t.id===id);
  const togglePlay=()=>{if(!audio.current)return;if(playing){audio.current.pause();setPlaying(false);}else{audio.current.play();setPlaying(true);}};
  const setVol=(v:number)=>{setVolume(v);try{localStorage.setItem('v47',String(v));}catch{}};
  const isLk=(id:string)=>liked.some(t=>t.id===id);
  const toggleLike=(track:Track,e?:React.MouseEvent)=>{e?.stopPropagation();setLiked(prev=>{const has=prev.some(t=>t.id===track.id);const n=has?prev.filter(t=>t.id!==track.id):[track,...prev];try{localStorage.setItem('l47',JSON.stringify(n));}catch{}triggerSync(n,playlists,history,volume,favArtists,favAlbums);return n;});};
  const loadTrend=async(genre=trendGenre,reset=false)=>{setTrendLoading(true);const off=reset?0:(trendOff[genre]||0);try{const r=await fetch(`${W}/trending?genre=${genre}&offset=${off}`);const d=await r.json();if(d.tracks){setTrends(prev=>({...prev,[genre]:reset?d.tracks:[...(prev[genre]||[]),...d.tracks]}));setTrendOff(prev=>({...prev,[genre]:off+1}));}}catch{}setTrendLoading(false);};
  const doSearch=async(mode=searchMode)=>{if(!query.trim())return;setLoading(true);setError('');setResults([]);try{const ep=mode==='albums'?'albums':'search';const r=await fetch(`${W}/${ep}?q=${encodeURIComponent(query)}&mode=${mode}`);const d=await r.json();if(d.error)throw new Error(d.error);if(!d.tracks?.length)throw new Error(t('notFound'));setResults(d.tracks);}catch(e:any){setError(e.message);}finally{setLoading(false);};};
  const openArtist=async(permalink:string,name:string,avatar:string,followers:number)=>{setArtistLoading(true);prevScreen.current=screen as any;setScreen('artist');try{const r=await fetch(`${W}/artist?name=${encodeURIComponent(name)}&permalink=${encodeURIComponent(permalink)}`);const d=await r.json();const art=d.artist||{};const trks=d.tracks||[];setArtistPage({id:art.id||name,name:art.name||name,username:art.username||'',avatar:art.avatar||avatar||'',banner:art.banner||'',followers:art.followers||followers,permalink:art.permalink||permalink,tracks:trks,latestRelease:trks[0]||null});}catch{}setArtistLoading(false);};
  const openAlbum=async(id:string,title:string,artist:string,cover:string)=>{setAlbumLoading(true);prevScreen.current=screen as any;setScreen('album');try{const r=await fetch(`${W}/album?id=${id}`);const d=await r.json();if(d.album)setAlbumPage({id:d.album.id,title:d.album.title||title,artist:d.album.artist||artist,cover:d.album.cover||cover,tracks:d.tracks||[],permalink:d.album.permalink||''});}catch{setAlbumPage({id,title,artist,cover,tracks:[],permalink:''});}setAlbumLoading(false);};
  const isFavA=(a:ArtistInfo)=>favArtists.some(x=>x.id===a.id||x.name===a.name);
  const toggleFavA=(a:ArtistInfo)=>{setFavArtists(prev=>{const has=prev.some(x=>x.id===a.id||x.name===a.name);const n=has?prev.filter(x=>x.id!==a.id&&x.name!==a.name):[{...a,latestRelease:null,tracks:[]},...prev];try{localStorage.setItem('fa47',JSON.stringify(n));}catch{}triggerSync(liked,playlists,history,volume,n,favAlbums);return n;});};
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
  const volSP=useSlider(volume,v=>setVol(v));

  const HBtn=({track,sz=19}:{track:Track;sz?:number})=>(
    <button onClick={e=>toggleLike(track,e)} style={{background:'none',border:'none',cursor:'pointer',padding:4,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill={isLk(track.id)?ACC:'none'} stroke={isLk(track.id)?ACC:'#555'} strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
    </button>
  );

  const PP=({sz,col=BG}:{sz:'sm'|'lg';col?:string})=>{
    const h=sz==='lg'?18:13,w=sz==='lg'?4:3;
    return playing?<div style={{display:'flex',gap:sz==='lg'?4:3}}><div style={{width:w,height:h,background:col,borderRadius:2}}/><div style={{width:w,height:h,background:col,borderRadius:2}}/></div>:<div style={{width:0,height:0,borderStyle:'solid',borderWidth:sz==='lg'?'9px 0 9px 16px':'6px 0 6px 10px',borderColor:`transparent transparent transparent ${col}`,marginLeft:2}}/>;
  };

  const TRow=({track,num}:{track:Track;num?:number})=>{
    const active=current?.id===track.id;
    const mOpen=menuId===track.id;
    return(
      <div style={{position:'relative'}}>
        <div onClick={e=>{e.stopPropagation();if(mOpen){setMenuId(null);return;}setMenuId(null);playTrack(track);}} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:12,cursor:'pointer',marginBottom:1,background:active?ACC_DIM:'transparent'}}>
          {num!==undefined&&<div style={{fontSize:11,color:active?ACC:'#444',width:18,flexShrink:0,textAlign:'right'}}>{num}</div>}
          <div style={{position:'relative',flexShrink:0}}>
            <Img src={track.cover} size={44} radius={track.isArtist?22:8}/>
            {active&&!track.isArtist&&!track.isAlbum&&<div style={{position:'absolute',inset:0,borderRadius:8,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>{playing?'⏸':'▶'}</div>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:500,color:active?ACC:'#e0e0e0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{track.title}</div>
            <div style={{display:'flex',alignItems:'center',gap:4,marginTop:1}}>
              <span style={{fontSize:11,color:track.isArtist?ACC:'#555',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:130}}>{track.isAlbum?`${track.trackCount||0} треков`:track.artist}</span>
              {!track.isArtist&&!track.isAlbum&&track.plays>0&&<span style={{fontSize:10,color:'#383838',flexShrink:0}}>· {fmtP(track.plays)}</span>}
            </div>
          </div>
          {!track.isArtist&&!track.isAlbum&&(
            <div style={{display:'flex',alignItems:'center',gap:1,flexShrink:0}}>
              <button onClick={e=>addQ(track,e)} style={{background:'none',border:'none',cursor:'pointer',padding:'3px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={inQ(track.id)?ACC:'#484848'} strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1.2" fill={inQ(track.id)?ACC:'#484848'}/><circle cx="3" cy="12" r="1.2" fill={inQ(track.id)?ACC:'#484848'}/><circle cx="3" cy="18" r="1.2" fill={inQ(track.id)?ACC:'#484848'}/></svg>
              </button>
              <button onClick={e=>{e.stopPropagation();setMenuId(mOpen?null:track.id);}} style={{background:'none',border:'none',cursor:'pointer',padding:'3px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill={ACC} stroke="none"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
              </button>
              <div style={{fontSize:10,color:'#383838',flexShrink:0,minWidth:24,textAlign:'right'}}>{track.duration}</div>
            </div>
          )}
          {(track.isArtist||track.isAlbum)&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>}
        </div>
        {mOpen&&(
          <div onClick={e=>e.stopPropagation()} style={{position:'absolute',right:8,top:'calc(100% + 2px)',background:'#1e1e1e',border:'1px solid #2a2a2a',borderRadius:12,zIndex:50,minWidth:164,boxShadow:'0 12px 32px rgba(0,0,0,0.7)',overflow:'hidden'}}>
            {[
              {icon:<svg width="14" height="14" viewBox="0 0 24 24" fill={isLk(track.id)?ACC:'none'} stroke={isLk(track.id)?ACC:'#aaa'} strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,label:isLk(track.id)?(lang==='ru'?'Убрать лайк':'Unlike'):(lang==='ru'?'Лайк':'Like'),fn:(e:React.MouseEvent)=>{toggleLike(track,e);setMenuId(null);}},
              {icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,label:t('addToPlaylist'),fn:()=>{setAddToPl(track);setMenuId(null);}},
              {icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,label:lang==='ru'?'К артисту':'Go to artist',fn:()=>{openArtist('',track.artist,'',0);setMenuId(null);}},
            ].map((item,i)=>(
              <button key={i} onClick={item.fn} style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'10px 12px',background:'none',border:'none',cursor:'pointer',color:'#ddd',fontSize:12,borderBottom:i<2?'1px solid #252525':'none',textAlign:'left' as any}}>
                {item.icon}{item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const PlModal=({track}:{track:Track})=>(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'flex-end',zIndex:300}} onClick={()=>setAddToPl(null)}>
      <div style={{background:'#1a1a1a',width:'100%',borderRadius:'18px 18px 0 0',padding:'18px 16px 36px'}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:14,fontWeight:600,color:'#e0e0e0',marginBottom:12}}>{t('addToPlaylist')}</div>
        {playlists.length===0?<div style={{color:'#484848',fontSize:12,textAlign:'center',padding:'16px 0'}}>{t('noPlaylists')}</div>
          :playlists.map(pl=><div key={pl.id} onClick={()=>addToPl2(pl.id,track)} style={{padding:'11px 12px',borderRadius:9,background:BG3,marginBottom:5,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{color:'#d0d0d0',fontSize:13}}>{pl.name}</span><span style={{color:'#484848',fontSize:11}}>{pl.tracks.length}</span></div>)
        }
        <button onClick={()=>setAddToPl(null)} style={{width:'100%',padding:'10px',background:BG3,border:'none',borderRadius:9,color:'#555',fontSize:12,cursor:'pointer',marginTop:4}}>{t('cancel')}</button>
      </div>
    </div>
  );

  const NAV=[
    {id:'home',icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#484848'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,lbl:(a:boolean)=>t('home')},
    {id:'search',icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#484848'} strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,lbl:(a:boolean)=>t('search')},
    {id:'library',icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#484848'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,lbl:(a:boolean)=>t('library')},
    {id:'trending',icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#484848'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,lbl:(a:boolean)=>t('trending')},
  ];

  // ── FULL PLAYER ─────────────────────────────────────────────────────────────
  if(fullPlayer&&current)return(
    <div style={{background:BG,height:'100vh',width:'100%',display:'flex',flexDirection:'column',alignItems:'center',padding:'0 22px',fontFamily:"-apple-system,'SF Pro Display',sans-serif",boxSizing:'border-box',overflow:'hidden'}}>
      <audio ref={audio}/>
      {showQueue&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.78)',zIndex:200,display:'flex',alignItems:'flex-end'}} onClick={()=>setShowQueue(false)}>
          <div style={{background:'#1a1a1a',width:'100%',borderRadius:'18px 18px 0 0',padding:'16px 16px 32px',maxHeight:'68vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div><div style={{fontSize:14,fontWeight:600,color:'#e0e0e0'}}>{t('queue')}</div><div style={{fontSize:10,color:'#484848',marginTop:1}}>{queue.length} {lang==='ru'?'треков':'tracks'}</div></div>
              <button onClick={()=>setQueue([])} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:'#484848'}}>{lang==='ru'?'Очистить':'Clear'}</button>
            </div>
            {queue.length===0?<div style={{color:'#484848',fontSize:12,textAlign:'center',padding:'20px 0'}}>{lang==='ru'?'Пусто':'Empty'}</div>
              :queue.map((tr,i)=>(
                <div key={tr.id+i} draggable onDragStart={()=>setDragIdx(i)} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(dragIdx!==null&&dragIdx!==i)moveQ(dragIdx,i);setDragIdx(null);}}
                  style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #222',cursor:'grab',background:dragIdx===i?ACC_DIM:'transparent',borderRadius:6}}>
                  <div style={{color:'#333',fontSize:15,padding:'0 3px'}}>⠿</div>
                  <Img src={tr.cover} size={36} radius={6}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:'#e0e0e0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{tr.title}</div>
                    <div style={{fontSize:10,color:'#555',marginTop:1}}>{tr.artist}</div>
                  </div>
                  <button onClick={()=>{playDirect(tr);setQueue(prev=>prev.filter((_,j)=>j!==i));setShowQueue(false);}} style={{background:'none',border:'none',cursor:'pointer',padding:3}}>
                    <div style={{width:0,height:0,borderStyle:'solid',borderWidth:'5px 0 5px 9px',borderColor:`transparent transparent transparent ${ACC}`,marginLeft:1}}/>
                  </button>
                  <button onClick={()=>rmQ(i)} style={{background:'none',border:'none',cursor:'pointer',color:'#484848',fontSize:16,padding:'0 3px',lineHeight:1}}>×</button>
                </div>
              ))
            }
          </div>
        </div>
      )}
      <div style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:40,paddingBottom:10,flexShrink:0}}>
        <button onClick={()=>setFullPlayer(false)} style={{background:'none',border:'none',cursor:'pointer',padding:6,margin:-6}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{fontSize:10,color:'#484848',letterSpacing:1.5,textTransform:'uppercase'}}>{t('nowPlaying')}</span>
        <button onClick={()=>setShowQueue(true)} style={{background:'none',border:'none',cursor:'pointer',padding:6,margin:-6,position:'relative'}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={queue.length>0?ACC:'#555'} strokeWidth="2" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          {queue.length>0&&<span style={{position:'absolute',top:3,right:3,background:ACC,color:BG,fontSize:8,fontWeight:700,borderRadius:'50%',width:12,height:12,display:'flex',alignItems:'center',justifyContent:'center'}}>{queue.length}</span>}
        </button>
      </div>
      <div style={{width:'100%',display:'flex',justifyContent:'center',flexShrink:0,marginBottom:14}}>
        <div style={{borderRadius:16,overflow:'hidden',boxShadow:'0 16px 48px rgba(0,0,0,0.5)'}}>
          <Img src={current.cover} size={Math.min(window.innerWidth-64,230)} radius={0}/>
        </div>
      </div>
      <div style={{width:'100%',flexShrink:0,marginBottom:10}}>
        <div style={{fontSize:17,fontWeight:600,color:'#f0f0f0',lineHeight:1.3,wordBreak:'break-word' as any}}>{current.title}</div>
        <button onClick={()=>{setFullPlayer(false);openArtist(current.permalink||'',current.artist,current.cover,0);}} style={{background:'none',border:'none',cursor:'pointer',padding:0,marginTop:4,display:'block',textAlign:'left' as any}}>
          <span style={{fontSize:13,color:ACC,opacity:0.65}}>{current.artist}</span>
        </button>
        {current.plays>0&&<div style={{fontSize:10,color:'#383838',marginTop:2}}>{fmtP(current.plays)} {t('plays')}</div>}
      </div>
      <div style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0,marginBottom:10}}>
        <div style={{display:'flex',gap:0,alignItems:'center'}}>
          <HBtn track={current} sz={22}/>
          <button onClick={()=>setAddToPl(current)} style={{background:'none',border:'none',cursor:'pointer',padding:5}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>
        <div style={{display:'flex',gap:0,alignItems:'center'}}>
          <button onClick={()=>setLoop(!loop)} style={{background:'none',border:'none',cursor:'pointer',padding:5}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={loop?ACC:'#484848'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
          </button>
          <button onClick={()=>share(current)} style={{background:'none',border:'none',cursor:'pointer',padding:5}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
      </div>
      {copied&&<div style={{fontSize:10,color:ACC,alignSelf:'flex-start',marginBottom:6,marginTop:-6}}>{t('copied')}</div>}
      <div style={{width:'100%',flexShrink:0,marginBottom:2}}>
        <SliderTrack val={progress/100} sp={seekSP} h={3}/>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#3a3a3a',marginTop:4}}><span>{curTime}</span><span>{current.duration}</span></div>
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:32,flexShrink:0,marginBottom:12}}>
        <button style={{background:'none',border:'none',cursor:'pointer',opacity:0.3}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg></button>
        <button onClick={togglePlay} style={{width:56,height:56,borderRadius:'50%',background:ACC,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}><PP sz="lg"/></button>
        <button onClick={()=>{if(queue.length>0){const nxt=queue[0];setQueue(prev=>prev.slice(1));playDirect(nxt);}}} style={{background:'none',border:'none',cursor:'pointer',opacity:queue.length>0?1:0.3}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg></button>
      </div>
      <div style={{width:'100%',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#484848" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>
        <SliderTrack val={volume} sp={volSP} h={3}/>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#484848" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>
      </div>
      {addToPl&&<PlModal track={addToPl}/>}
    </div>
  );

  // ── MAIN ────────────────────────────────────────────────────────────────────
  return(
    <div onClick={()=>menuId&&setMenuId(null)} style={{background:BG,minHeight:'100vh',width:'100%',fontFamily:"-apple-system,'SF Pro Display',sans-serif",position:'relative',boxSizing:'border-box'}}>
      <audio ref={audio}/>
      <div style={{paddingBottom:current?NAV_H+64+8:NAV_H+6,minHeight:'100vh'}}>

        {/* ARTIST */}
        {screen==='artist'&&(
          <div>
            <div style={{padding:'44px 16px 0',display:'flex',alignItems:'center',gap:6}}>
              <button onClick={()=>setScreen(prevScreen.current)} style={{background:'none',border:'none',cursor:'pointer',padding:'4px 8px 4px 0',display:'flex',alignItems:'center',gap:5}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                <span style={{fontSize:12,color:'#555'}}>{t('backToSearch')}</span>
              </button>
            </div>
            {artistLoading?<div style={{display:'flex',alignItems:'center',justifyContent:'center',paddingTop:100}}><div style={{fontSize:12,color:'#484848'}}>{t('loading')}</div></div>
              :artistPage&&(
                <div>
                  <div style={{width:'100%',height:100,background:BG3,position:'relative',overflow:'hidden',marginBottom:-24}}>
                    {artistPage.banner?<img src={artistPage.banner} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} onError={()=>{}}/>:<div style={{width:'100%',height:'100%',background:`linear-gradient(135deg,#2a2018,${BG})`}}/>}
                    <div style={{position:'absolute',inset:0,background:`linear-gradient(to bottom,transparent 30%,${BG})`}}/>
                  </div>
                  <div style={{padding:'0 16px 14px',display:'flex',alignItems:'flex-end',gap:12,position:'relative',zIndex:1}}>
                    <div style={{flexShrink:0,borderRadius:'50%',overflow:'hidden',border:`2px solid ${BG}`}}><Img src={artistPage.avatar} size={62} radius={31}/></div>
                    <div style={{flex:1,minWidth:0,paddingBottom:2}}>
                      <div style={{fontSize:17,fontWeight:700,color:'#f0f0f0',letterSpacing:-0.3}}>{artistPage.name}</div>
                      {artistPage.username&&<div style={{fontSize:11,color:'#484848',marginTop:1}}>@{artistPage.username}</div>}
                      {artistPage.followers>0&&<div style={{fontSize:11,color:'#484848',marginTop:1}}>{fmtP(artistPage.followers)} {lang==='ru'?'подписчиков':'followers'}</div>}
                    </div>
                    <button onClick={()=>artistPage&&toggleFavA(artistPage)} style={{flexShrink:0,padding:'6px 12px',borderRadius:16,border:`1px solid ${isFavA(artistPage)?ACC:'#2a2a2a'}`,background:isFavA(artistPage)?ACC_DIM:'transparent',color:isFavA(artistPage)?ACC:'#666',fontSize:12,cursor:'pointer',marginBottom:2}}>
                      {isFavA(artistPage)?t('removeFav'):t('addFav')}
                    </button>
                  </div>
                  {artistPage.tracks.length===0&&<div style={{padding:'20px',textAlign:'center',color:'#3a3a3a',fontSize:12}}>{t('loading')}</div>}
                  <div style={{padding:'0 4px'}}>{artistPage.tracks.map((tr,i)=><TRow key={tr.id} track={tr} num={i+1}/>)}</div>
                </div>
              )
            }
          </div>
        )}

        {/* ALBUM */}
        {screen==='album'&&(
          <div>
            <div style={{padding:'44px 16px 0',display:'flex',alignItems:'center',gap:6}}>
              <button onClick={()=>setScreen(prevScreen.current)} style={{background:'none',border:'none',cursor:'pointer',padding:'4px 8px 4px 0',display:'flex',alignItems:'center',gap:5}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                <span style={{fontSize:12,color:'#555'}}>{t('backToSearch')}</span>
              </button>
            </div>
            {albumLoading?<div style={{display:'flex',alignItems:'center',justifyContent:'center',paddingTop:100}}><div style={{fontSize:12,color:'#484848'}}>{t('loading')}</div></div>
              :albumPage&&(
                <div>
                  <div style={{padding:'14px 16px 0',display:'flex',gap:14,alignItems:'center'}}>
                    <Img src={albumPage.cover} size={76} radius={10}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:16,fontWeight:700,color:'#f0f0f0',lineHeight:1.3}}>{albumPage.title}</div>
                      <div style={{fontSize:12,color:'#555',marginTop:4}}>{albumPage.artist}</div>
                      <div style={{fontSize:11,color:'#3a3a3a',marginTop:2}}>{albumPage.tracks.length} {lang==='ru'?'треков':'tracks'}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:7,padding:'12px 16px'}}>
                    <button onClick={()=>{if(albumPage.tracks.length){playTrack(albumPage.tracks[0]);setQueue(albumPage.tracks.slice(1));}}} style={{flex:1,padding:'9px',background:ACC,border:'none',borderRadius:10,color:BG,fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
                      <div style={{width:0,height:0,borderStyle:'solid',borderWidth:'5px 0 5px 9px',borderColor:`transparent transparent transparent ${BG}`}}/>
                      {lang==='ru'?'Играть':'Play'}
                    </button>
                    <button onClick={()=>{const sh=[...albumPage.tracks].sort(()=>Math.random()-.5);if(sh.length){playTrack(sh[0]);setQueue(sh.slice(1));}}} style={{flex:1,padding:'9px',background:ACC_DIM,border:`1px solid ${ACC}22`,borderRadius:10,color:ACC,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
                      {t('shuffle')}
                    </button>
                    <button onClick={()=>toggleFavAl(albumPage)} style={{padding:'9px 12px',borderRadius:10,border:`1px solid ${isFavAl(albumPage.id)?ACC:'#2a2a2a'}`,background:isFavAl(albumPage.id)?ACC_DIM:'transparent',color:isFavAl(albumPage.id)?ACC:'#555',fontSize:14,cursor:'pointer'}}>
                      {isFavAl(albumPage.id)?'♥':'♡'}
                    </button>
                  </div>
                  <div style={{padding:'0 4px'}}>{albumPage.tracks.map((tr,i)=><TRow key={tr.id} track={tr} num={i+1}/>)}</div>
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
                <div style={{fontSize:20,fontWeight:700,color:'#e8e8e8',letterSpacing:-0.3}}>{greeting(lang)}</div>
                <div style={{fontSize:11,color:'#3a3a3a',marginTop:2,letterSpacing:0.5}}>Forty7</div>
              </div>
              <button onClick={()=>setScreen('profile')} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:18,background:'transparent',border:'1px solid #242424',cursor:'pointer',flexShrink:0,maxWidth:130}}>
                <div style={{width:20,height:20,borderRadius:'50%',background:ACC_DIM,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:ACC,flexShrink:0}}>{uInit}</div>
                <span style={{fontSize:11,color:'#555',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:84}}>{uHandle||uName}</span>
              </button>
            </div>
            {history.length>0&&(
              <div>
                <div style={{padding:'10px 16px 8px'}}><div style={{fontSize:12,fontWeight:600,color:'#555',textTransform:'uppercase' as any,letterSpacing:0.5}}>{t('recent')}</div></div>
                <div style={{display:'flex',gap:10,padding:'0 16px',overflowX:'auto',scrollbarWidth:'none' as any}}>
                  {history.slice(0,8).map(tr=>(
                    <div key={tr.id} onClick={()=>playTrack(tr)} style={{width:96,borderRadius:10,background:BG2,overflow:'hidden',cursor:'pointer',flexShrink:0}}>
                      <div style={{width:96,height:96}}><Img src={tr.cover} size={96} radius={0}/></div>
                      <div style={{padding:'5px 7px 7px',boxSizing:'border-box' as any}}>
                        <div style={{fontSize:10,fontWeight:500,color:'#bbb',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{tr.artist}</div>
                        <div style={{fontSize:9,color:'#484848',marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{tr.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{padding:'14px 16px 8px'}}><div style={{fontSize:12,fontWeight:600,color:'#555',textTransform:'uppercase' as any,letterSpacing:0.5}}>{t('recommended')}</div></div>
            {recs.length===0&&history.length<2?<div style={{padding:'0 16px',fontSize:12,color:'#3a3a3a'}}>{t('noRecommended')}</div>
              :<div style={{padding:'0 4px'}}>{(recs.length>0?recs:history).slice(0,8).map((tr,i)=><TRow key={tr.id} track={tr} num={i+1}/>)}</div>
            }
          </div>
        )}

        {/* SEARCH */}
        {screen==='search'&&(
          <div>
            <div style={{padding:'44px 16px 12px'}}>
              <div style={{fontSize:22,fontWeight:700,color:'#f0f0f0',marginBottom:12,letterSpacing:-0.5}}>{t('search')}</div>
              <div style={{display:'flex',gap:8}}>
                <input type="text" placeholder={t('searchPlaceholder')} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch()}
                  style={{flex:1,padding:'11px 14px',fontSize:14,background:BG2,border:'1px solid #252525',borderRadius:12,color:'#e0e0e0',outline:'none',width:'100%',boxSizing:'border-box' as any}}/>
                <button onClick={()=>doSearch()} disabled={loading} style={{padding:'11px 14px',background:loading?BG3:ACC,color:loading?'#484848':BG,border:'none',borderRadius:12,fontSize:13,fontWeight:600,cursor:loading?'not-allowed':'pointer',flexShrink:0}}>{loading?'...':t('find')}</button>
              </div>
              <div style={{display:'flex',gap:5,marginTop:9,overflowX:'auto',scrollbarWidth:'none' as any}}>
                {(['sound','remix','artists','albums'] as const).map(m=>(
                  <button key={m} onClick={()=>setSearchMode(m)} style={{padding:'5px 13px',borderRadius:16,border:'none',background:searchMode===m?ACC:ACC_DIM,color:searchMode===m?BG:ACC,fontSize:12,fontWeight:searchMode===m?600:400,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap' as any}}>
                    {t(m==='albums'?'albumsTab':m)}
                  </button>
                ))}
              </div>
              {error&&<div style={{marginTop:8,padding:'8px 12px',background:'#1a0a0a',borderRadius:9,color:'#d06060',fontSize:12}}>{error}</div>}
            </div>
            <div style={{padding:'0 4px'}}>
              {loading&&<div style={{textAlign:'center',paddingTop:36,color:'#3a3a3a',fontSize:12}}>{t('loading')}</div>}
              {results.map((tr,i)=><TRow key={tr.id} track={tr} num={i+1}/>)}
            </div>
          </div>
        )}

        {/* LIBRARY */}
        {screen==='library'&&(
          <div>
            <div style={{padding:'44px 16px 12px'}}><div style={{fontSize:22,fontWeight:700,color:'#f0f0f0',letterSpacing:-0.5}}>{t('library')}</div></div>
            <div style={{display:'flex',gap:5,padding:'0 16px 12px',overflowX:'auto',scrollbarWidth:'none' as any}}>
              {(['liked','playlists','artists','albums'] as const).map(tab=>(
                <button key={tab} onClick={()=>setLibTab(tab)} style={{padding:'5px 13px',borderRadius:16,border:'none',background:libTab===tab?ACC:ACC_DIM,color:libTab===tab?BG:ACC,fontSize:12,fontWeight:libTab===tab?600:400,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap' as any}}>
                  {tab==='liked'?t('likedTracks'):tab==='playlists'?t('playlists'):tab==='artists'?t('favArtists'):t('albums')}
                </button>
              ))}
            </div>
            {libTab==='liked'&&(liked.length===0?<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:60}}><div style={{fontSize:38,marginBottom:12}}>🎵</div><div style={{fontSize:13,color:'#3a3a3a'}}>{t('noLiked')}</div></div>:<div style={{padding:'0 4px'}}>{liked.map((tr,i)=><TRow key={tr.id} track={tr} num={i+1}/>)}</div>)}
            {libTab==='artists'&&(
              <div style={{padding:'0 16px'}}>
                {favArtists.length===0?<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:60}}><div style={{fontSize:38,marginBottom:12}}>🎤</div><div style={{fontSize:13,color:'#3a3a3a'}}>{lang==='ru'?'Нет избранных артистов':'No favourite artists'}</div></div>
                  :favArtists.map(a=>(
                    <div key={a.id||a.name} onClick={()=>openArtist(a.permalink||'',a.name,a.avatar||'',a.followers)} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid #1e1e1e',cursor:'pointer'}}>
                      <Img src={a.avatar||''} size={46} radius={23}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:500,color:'#e0e0e0'}}>{a.name}</div>
                        {a.username&&<div style={{fontSize:10,color:'#484848',marginTop:1}}>@{a.username}</div>}
                        {a.followers>0&&<div style={{fontSize:10,color:'#484848',marginTop:1}}>{fmtP(a.followers)} {lang==='ru'?'подписчиков':'followers'}</div>}
                      </div>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3a3a3a" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  ))
                }
              </div>
            )}
            {libTab==='albums'&&(
              <div style={{padding:'0 16px'}}>
                {favAlbums.length===0?<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:60}}><div style={{fontSize:38,marginBottom:12}}>💿</div><div style={{fontSize:13,color:'#3a3a3a'}}>{lang==='ru'?'Нет избранных альбомов':'No favourite albums'}</div></div>
                  :favAlbums.map(al=>(
                    <div key={al.id} onClick={()=>openAlbum(al.id,al.title,al.artist,al.cover)} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid #1e1e1e',cursor:'pointer'}}>
                      <Img src={al.cover} size={50} radius={8}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:500,color:'#e0e0e0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{al.title}</div>
                        <div style={{fontSize:11,color:'#484848',marginTop:2}}>{al.artist}</div>
                      </div>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3a3a3a" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  ))
                }
              </div>
            )}
            {libTab==='playlists'&&(
              <div style={{padding:'0 16px'}}>
                <button onClick={()=>setShowNewPl(true)} style={{width:'100%',padding:'10px',background:ACC_DIM,border:`1px dashed ${ACC}33`,borderRadius:11,color:ACC,fontSize:12,cursor:'pointer',marginBottom:9,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  {t('createPlaylist')}
                </button>
                {showNewPl&&(
                  <div style={{background:BG2,border:'1px solid #242424',borderRadius:11,padding:'11px',marginBottom:9}}>
                    <input autoFocus placeholder={t('playlistName')} value={newPlName} onChange={e=>setNewPlName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createPl()}
                      style={{width:'100%',padding:'8px 11px',fontSize:13,background:BG,border:'1px solid #242424',borderRadius:7,color:'#e0e0e0',outline:'none',boxSizing:'border-box' as any,marginBottom:7}}/>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={createPl} style={{flex:1,padding:'8px',background:ACC,border:'none',borderRadius:7,color:BG,fontSize:12,fontWeight:600,cursor:'pointer'}}>{t('create')}</button>
                      <button onClick={()=>{setShowNewPl(false);setNewPlName('');}} style={{flex:1,padding:'8px',background:BG3,border:'none',borderRadius:7,color:'#555',fontSize:12,cursor:'pointer'}}>{t('cancel')}</button>
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
                          {pl.tracks.length===0&&<div style={{gridColumn:'span 2',gridRow:'span 2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🎵</div>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:500,color:'#e0e0e0'}}>{pl.name}</div>
                          <div style={{fontSize:10,color:'#484848',marginTop:2}}>{pl.tracks.length} {lang==='ru'?'треков':'tracks'}</div>
                        </div>
                        <button onClick={e=>{e.stopPropagation();playPl(pl);}} style={{width:32,height:32,borderRadius:'50%',background:ACC,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
                          <div style={{width:0,height:0,borderStyle:'solid',borderWidth:'5px 0 5px 9px',borderColor:`transparent transparent transparent ${BG}`,marginLeft:2}}/>
                        </button>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#484848" strokeWidth="2" strokeLinecap="round" style={{transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.2s',flexShrink:0}}><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                      {isOpen&&(
                        <div>
                          <div style={{display:'flex',gap:5,padding:'0 13px 9px'}}>
                            <button onClick={()=>shufflePl(pl)} style={{flex:1,padding:'7px',background:ACC_DIM,border:'none',borderRadius:7,color:ACC,fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>{t('shuffle')}</button>
                            <button onClick={()=>setPlaylists(prev=>{const n=prev.map(p=>p.id===pl.id?{...p,repeat:!p.repeat}:p);try{localStorage.setItem('p47',JSON.stringify(n));}catch{}return n;})} style={{flex:1,padding:'7px',background:pl.repeat?ACC:ACC_DIM,border:'none',borderRadius:7,color:pl.repeat?BG:ACC,fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={pl.repeat?BG:ACC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>{t('repeatPl')}</button>
                          </div>
                          <div style={{borderTop:'1px solid #1e1e1e'}}>
                            {pl.tracks.length===0?<div style={{padding:'14px',textAlign:'center',color:'#3a3a3a',fontSize:11}}>{lang==='ru'?'Нет треков':'No tracks'}</div>
                              :pl.tracks.map((tr,i)=>(
                                <div key={tr.id+i} onClick={()=>{playTrack(tr);setQueue(pl.tracks.slice(i+1));}} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 13px',cursor:'pointer',background:current?.id===tr.id?ACC_DIM:'transparent',borderBottom:'1px solid #1a1a1a'}}>
                                  <Img src={tr.cover} size={36} radius={6}/>
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:12,color:current?.id===tr.id?ACC:'#e0e0e0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{tr.title}</div>
                                    <div style={{fontSize:10,color:'#484848',marginTop:1}}>{tr.artist}</div>
                                  </div>
                                  <div style={{fontSize:10,color:'#383838'}}>{tr.duration}</div>
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
                <div style={{fontSize:22,fontWeight:700,color:'#f0f0f0',letterSpacing:-0.5}}>{t('trending')}</div>
                <button onClick={()=>loadTrend(trendGenre,true)} style={{background:'none',border:'none',cursor:'pointer',padding:4}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#484848" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg></button>
              </div>
              <div style={{display:'flex',gap:6,padding:'0 16px 12px',overflowX:'auto',scrollbarWidth:'none' as any}}>
                {GENRES.map(g=>(
                  <button key={g.id} onClick={()=>setTrendGenre(g.id)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'8px 11px',borderRadius:12,border:trendGenre===g.id?`1px solid ${ACC}33`:'1px solid #1e1e1e',background:trendGenre===g.id?ACC_DIM:BG2,color:trendGenre===g.id?ACC:'#555',cursor:'pointer',flexShrink:0,minWidth:54,transition:'all 0.15s'}}>
                    <span style={{fontSize:19}}>{g.e}</span>
                    <span style={{fontSize:9,fontWeight:trendGenre===g.id?600:400,whiteSpace:'nowrap'}}>{g.label}</span>
                  </button>
                ))}
              </div>
              {trendLoading&&ct.length===0?<div style={{display:'flex',alignItems:'center',justifyContent:'center',paddingTop:80}}><div style={{fontSize:12,color:'#484848'}}>{t('loading')}</div></div>
                :ct.length===0?<div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'60px 20px 0',textAlign:'center'}}><div style={{fontSize:38,marginBottom:12}}>📈</div><div style={{fontSize:13,color:'#3a3a3a'}}>{t('notFound')}</div><button onClick={()=>loadTrend(trendGenre,true)} style={{marginTop:12,padding:'8px 20px',background:ACC_DIM,border:'none',borderRadius:9,color:ACC,fontSize:12,cursor:'pointer'}}>{t('retry')}</button></div>
                :<div><div style={{padding:'0 4px'}}>{ct.map((tr,i)=><TRow key={tr.id+i} track={tr} num={i+1}/>)}</div>
                  <div style={{padding:'10px 16px 6px',display:'flex',justifyContent:'center'}}><button onClick={()=>loadTrend(trendGenre,false)} disabled={trendLoading} style={{padding:'9px 32px',background:ACC_DIM,border:`1px solid ${ACC}18`,borderRadius:11,color:ACC,fontSize:12,cursor:trendLoading?'not-allowed':'pointer',opacity:trendLoading?.5:1}}>{trendLoading?t('loading'):t('loadMore')}</button></div>
                </div>
              }
            </div>
          );
        })()}

        {/* PROFILE */}
        {screen==='profile'&&(
          <div>
            <div style={{padding:'44px 16px 18px',display:'flex',alignItems:'center',gap:4}}>
              <button onClick={()=>setScreen('home')} style={{background:'none',border:'none',cursor:'pointer',padding:'4px 8px 4px 0',display:'flex',alignItems:'center'}}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg></button>
              <div style={{fontSize:17,fontWeight:600,color:'#f0f0f0'}}>{t('profile')}</div>
              {syncSt==='saving'&&<div style={{marginLeft:'auto',fontSize:10,color:'#484848'}}>{t('syncing')}</div>}
              {syncSt==='saved'&&<div style={{marginLeft:'auto',fontSize:10,color:ACC}}>{t('syncSaved')}</div>}
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'0 16px 18px'}}>
              <div style={{width:64,height:64,borderRadius:'50%',background:ACC_DIM,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,fontWeight:700,color:ACC,marginBottom:10}}>{uInit}</div>
              <div style={{fontSize:17,fontWeight:600,color:'#f0f0f0'}}>{uName}</div>
              {uHandle&&<div style={{fontSize:11,color:'#484848',marginTop:2}}>{uHandle}</div>}
            </div>
            <div style={{padding:'0 16px'}}>
              {[{l:t('likedTracks'),v:liked.length},{l:t('playlists'),v:playlists.length},{l:t('listenedTracks'),v:history.length},{l:t('favArtists'),v:favArtists.length},{l:t('albums'),v:favAlbums.length}].map(item=>(
                <div key={item.l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid #1e1e1e'}}>
                  <span style={{fontSize:13,color:'#777'}}>{item.l}</span>
                  <span style={{fontSize:13,fontWeight:600,color:ACC}}>{item.v}</span>
                </div>
              ))}
              <div style={{padding:'14px 0 8px'}}>
                <div style={{fontSize:10,color:'#484848',marginBottom:7,textTransform:'uppercase' as any,letterSpacing:1}}>{t('language')}</div>
                <div style={{display:'flex',gap:6}}>
                  {(['ru','en'] as const).map(l=>(
                    <button key={l} onClick={()=>chgLang(l)} style={{flex:1,padding:'9px',borderRadius:9,border:'none',background:lang===l?ACC:BG2,color:lang===l?BG:'#555',fontSize:13,fontWeight:lang===l?600:400,cursor:'pointer'}}>
                      {l==='ru'?'🇷🇺 Русский':'🇺🇸 English'}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={()=>syncSave({liked,playlists,history,volume,favArtists,favAlbums})} style={{width:'100%',marginTop:9,padding:'11px',background:ACC_DIM,border:`1px solid ${ACC}18`,borderRadius:11,color:ACC,fontSize:12,cursor:'pointer'}}>🔄 {t('syncBtn')}</button>
              <button onClick={()=>{try{localStorage.clear();}catch{}setLiked([]);setPlaylists([]);setHistory([]);setRecs([]);setQueue([]);setFavArtists([]);setFavAlbums([]);}} style={{width:'100%',marginTop:6,padding:'11px',background:'#1a0a0a',border:'1px solid #280f0f',borderRadius:11,color:'#c05050',fontSize:12,cursor:'pointer'}}>{t('resetData')}</button>
            </div>
          </div>
        )}
      </div>

      {addToPl&&!fullPlayer&&<PlModal track={addToPl}/>}

      {/* MINI PLAYER */}
      {current&&(
        <div style={{position:'fixed',bottom:NAV_H+5,left:8,right:8,background:'rgba(20,18,16,0.96)',backdropFilter:'blur(20px)',border:'1px solid #252320',borderRadius:14,padding:'7px 12px 9px',zIndex:100}}>
          <div style={{height:1.5,background:'#222',borderRadius:1,marginBottom:8,overflow:'hidden'}}>
            <div style={{width:`${progress}%`,height:'100%',background:ACC,borderRadius:1,transition:'width 0.3s linear'}}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:9}}>
            <div onClick={()=>setFullPlayer(true)} style={{cursor:'pointer',flexShrink:0}}><Img src={current.cover} size={36} radius={6}/></div>
            <div onClick={()=>setFullPlayer(true)} style={{flex:1,minWidth:0,cursor:'pointer'}}>
              <div style={{fontSize:12,fontWeight:500,color:'#e0e0e0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{current.title}</div>
              <div style={{fontSize:10,color:'#484848',marginTop:1}}>{current.artist}</div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:7,flexShrink:0}}>
              <div style={{width:44,height:14,display:'flex',alignItems:'center',cursor:'pointer',touchAction:'none'}} {...volSP} ref={volSP.ref}>
                <div style={{width:'100%',height:2,background:'#252525',borderRadius:1,position:'relative'}}>
                  <div style={{width:`${volume*100}%`,height:'100%',background:'#555',borderRadius:1}}/>
                </div>
              </div>
              <button onClick={e=>{e.stopPropagation();togglePlay();}} style={{width:32,height:32,borderRadius:'50%',background:ACC,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
                <PP sz="sm" col={BG}/>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      {screen!=='profile'&&screen!=='artist'&&screen!=='album'&&(
        <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(12,12,12,0.97)',backdropFilter:'blur(20px)',borderTop:'1px solid #1e1e1e',padding:'7px 0 13px',display:'flex',justifyContent:'space-around',zIndex:101,height:NAV_H}}>
          {NAV.map(item=>(
            <div key={item.id} onClick={()=>setScreen(item.id as any)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,cursor:'pointer',padding:'0 8px'}}>
              {item.icon(screen===item.id)}
              <span style={{fontSize:9,color:screen===item.id?ACC:'#484848',letterSpacing:0.3}}>{item.lbl(screen===item.id)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
