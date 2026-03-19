import { useState, useEffect, useRef, useCallback } from 'react';
declare global { interface Window { Telegram: any; } }

const W = 'https://square-queen-e703.shapovaliluha.workers.dev';
const ACC = '#EFBF7F';
const ACC_DIM = 'rgba(239,191,127,0.13)';
const BG = '#0e0e0e';
const BG2 = '#161616';
const BG3 = '#1e1e1e';
const TEXT_PRIMARY = '#f0f0f0';
const TEXT_SEC = '#9a9a9a';
const TEXT_MUTED = '#5a5a5a';
const NAV_H = 60;

interface Track {
  id: string; title: string; artist: string; cover: string;
  duration: string; plays: number; mp3: string | null;
  isArtist?: boolean; isAlbum?: boolean; permalink?: string;
  trackCount?: number; albumId?: string; albumTitle?: string;
}
interface Playlist { id: string; name: string; tracks: Track[]; repeat: boolean; }
interface AlbumInfo { id: string; title: string; artist: string; cover: string; tracks: Track[]; permalink: string; trackCount?: number; plays?: number; }
interface ArtistInfo {
  id: string; name: string; username: string; avatar: string; banner: string;
  followers: number; permalink: string; tracks: Track[];
  albums: AlbumInfo[]; latestRelease: Track | null;
}

const T: Record<string,Record<string,string>> = {
  uk: {
    home:'Головна',search:'Пошук',library:'Бібліотека',trending:'Тренди',profile:'Профіль',
    find:'Знайти',notFound:'Нічого не знайдено',recent:'Недавнє',recommended:'Рекомендовані',
    likedTracks:'Лайки',playlists:'Плейлисти',albums:'Альбоми',createPlaylist:'Створити плейлист',
    playlistName:'Назва',create:'Створити',cancel:'Скасувати',addToPlaylist:'До плейлиста',
    noPlaylists:'Немає плейлистів.',noLiked:'Немає лайків',loading:'Завантаження...',loadMore:'Ще',
    retry:'Повторити',nowPlaying:'Зараз грає',plays:'прослуховувань',resetData:'Скинути дані',
    language:'Мова',listenedTracks:'Прослухано',share:'Поділитися',copied:'Скопійовано!',
    queue:'Черга',sound:'Sound',remix:'Remix',artists:'Артисти',albumsTab:'Альбоми',
    shuffle:'Перемішати',repeatPl:'Повторювати',syncSaved:'Синхронізовано ✓',syncing:'Синхронізація...',
    syncBtn:'Синхронізувати між пристроями',favArtists:'Артисти',addFav:'Підписатися',
    removeFav:'Підписаний',backToSearch:'Назад',searchPlaceholder:'Пісні або артист',
    noRecommended:'Послухай кілька треків',goToAlbum:'До альбому',
    tracks:'Треки',discography:'Дискографія',popular:'Популярне',
    latestRelease:'Останній реліз',noTracks:'Треки не знайдені',showMore:'Показати більше',
    blockArtist:'Не рекомендувати',
  },
  kk: {
    home:'Басты',search:'Іздеу',library:'Медиатека',trending:'Трендтер',profile:'Профиль',
    find:'Табу',notFound:'Ештеңе табылмады',recent:'Жақында',recommended:'Ұсынылған',
    likedTracks:'Ұнатқандар',playlists:'Ойнату тізімдері',albums:'Альбомдар',createPlaylist:'Тізім жасау',
    playlistName:'Атауы',create:'Жасау',cancel:'Болдырмау',addToPlaylist:'Тізімге қосу',
    noPlaylists:'Тізім жоқ.',noLiked:'Ұнатқан жоқ',loading:'Жүктелуде...',loadMore:'Тағы',
    retry:'Қайталау',nowPlaying:'Қазір ойнатылуда',plays:'тыңдалым',resetData:'Деректерді тазалау',
    language:'Тіл',listenedTracks:'Тыңдалды',share:'Бөлісу',copied:'Көшірілді!',
    queue:'Кезек',sound:'Sound',remix:'Remix',artists:'Орындаушылар',albumsTab:'Альбомдар',
    shuffle:'Кездейсоқ',repeatPl:'Қайталау',syncSaved:'Синхронизацияланды ✓',syncing:'Синхронизация...',
    syncBtn:'Құрылғылар арасында синхрондау',favArtists:'Орындаушылар',addFav:'Жазылу',
    removeFav:'Жазылған',backToSearch:'Артқа',searchPlaceholder:'Ән немесе орындаушы',
    noRecommended:'Бірнеше трек тыңда',goToAlbum:'Альбомға өту',
    tracks:'Треки',discography:'Дискография',popular:'Танымал',
    latestRelease:'Соңғы шығарылым',noTracks:'Треки табылмады',showMore:'Көбірек',
    blockArtist:'Ұсынбау',
  },
  pl: {
    home:'Główna',search:'Szukaj',library:'Biblioteka',trending:'Trendy',profile:'Profil',
    find:'Szukaj',notFound:'Nic nie znaleziono',recent:'Ostatnie',recommended:'Polecane',
    likedTracks:'Polubione',playlists:'Playlisty',albums:'Albumy',createPlaylist:'Utwórz playlistę',
    playlistName:'Nazwa',create:'Utwórz',cancel:'Anuluj',addToPlaylist:'Do playlisty',
    noPlaylists:'Brak playlist.',noLiked:'Brak polubionych',loading:'Ładowanie...',loadMore:'Więcej',
    retry:'Ponów',nowPlaying:'Teraz gra',plays:'odtworzeń',resetData:'Resetuj dane',
    language:'Język',listenedTracks:'Odsłuchane',share:'Udostępnij',copied:'Skopiowano!',
    queue:'Kolejka',sound:'Sound',remix:'Remix',artists:'Artyści',albumsTab:'Albumy',
    shuffle:'Losowo',repeatPl:'Powtarzaj',syncSaved:'Zsynchronizowano ✓',syncing:'Synchronizacja...',
    syncBtn:'Synchronizuj między urządzeniami',favArtists:'Artyści',addFav:'Obserwuj',
    removeFav:'Obserwujesz',backToSearch:'Wróć',searchPlaceholder:'Piosenki lub artysta',
    noRecommended:'Posłuchaj kilku utworów',goToAlbum:'Do albumu',
    tracks:'Utwory',discography:'Dyskografia',popular:'Popularne',
    latestRelease:'Ostatnia premiera',noTracks:'Brak utworów',showMore:'Pokaż więcej',
    blockArtist:'Nie polecaj',
  },
  tr: {
    home:'Ana Sayfa',search:'Ara',library:'Kütüphane',trending:'Trendler',profile:'Profil',
    find:'Ara',notFound:'Hiçbir şey bulunamadı',recent:'Son Dinlenen',recommended:'Önerilen',
    likedTracks:'Beğenilenler',playlists:'Çalma Listeleri',albums:'Albümler',createPlaylist:'Liste Oluştur',
    playlistName:'İsim',create:'Oluştur',cancel:'İptal',addToPlaylist:'Listeye Ekle',
    noPlaylists:'Liste yok.',noLiked:'Beğenilen yok',loading:'Yükleniyor...',loadMore:'Daha Fazla',
    retry:'Tekrar',nowPlaying:'Şu an çalıyor',plays:'dinlenme',resetData:'Verileri Sıfırla',
    language:'Dil',listenedTracks:'Dinlendi',share:'Paylaş',copied:'Kopyalandı!',
    queue:'Sıra',sound:'Sound',remix:'Remix',artists:'Sanatçılar',albumsTab:'Albümler',
    shuffle:'Karıştır',repeatPl:'Tekrarla',syncSaved:'Senkronize edildi ✓',syncing:'Senkronizasyon...',
    syncBtn:'Cihazlar arasında senkronize et',favArtists:'Sanatçılar',addFav:'Takip Et',
    removeFav:'Takip Ediliyor',backToSearch:'Geri',searchPlaceholder:'Şarkı veya sanatçı',
    noRecommended:'Birkaç parça dinle',goToAlbum:'Albüme git',
    tracks:'Parçalar',discography:'Diskografi',popular:'Popüler',
    latestRelease:'Son çıkan',noTracks:'Parça bulunamadı',showMore:'Daha fazla göster',
    blockArtist:'Önerme',
  },
  en: {
    home:'Home',search:'Search',library:'Library',trending:'Trending',profile:'Profile',
    find:'Find',notFound:'Nothing found',recent:'Recent',recommended:'Recommended',
    likedTracks:'Liked',playlists:'Playlists',albums:'Albums',createPlaylist:'Create playlist',
    playlistName:'Playlist name',create:'Create',cancel:'Cancel',addToPlaylist:'Add to playlist',
    noPlaylists:'No playlists.',noLiked:'No liked tracks',loading:'Loading...',loadMore:'Load more',
    retry:'Try again',nowPlaying:'Now playing',plays:'plays',resetData:'Reset all data',
    language:'Language',listenedTracks:'Listened',share:'Share',copied:'Copied!',queue:'Queue',
    sound:'Sound',remix:'Remix',artists:'Artists',albumsTab:'Albums',shuffle:'Shuffle',
    repeatPl:'Repeat',syncSaved:'Synced ✓',syncing:'Syncing...',syncBtn:'Sync across devices',
    favArtists:'Artists',addFav:'Follow',removeFav:'Following',backToSearch:'Back',
    searchPlaceholder:'Songs or artist',noRecommended:'Listen to some tracks first',
    goToAlbum:'Go to album',tracks:'Tracks',discography:'Discography',popular:'Popular',
    latestRelease:'Latest release',noTracks:'No tracks found',showMore:'Show more',
    blockArtist:'Not interested',
  },
  ru: {
    home:'Главная',search:'Поиск',library:'Библиотека',trending:'Тренды',profile:'Профиль',
    find:'Найти',notFound:'Ничего не найдено',recent:'Недавнее',recommended:'Рекомендованное',
    likedTracks:'Лайки',playlists:'Плейлисты',albums:'Альбомы',createPlaylist:'Создать плейлист',
    playlistName:'Название',create:'Создать',cancel:'Отмена',addToPlaylist:'В плейлист',
    noPlaylists:'Нет плейлистов.',noLiked:'Нет лайков',loading:'Загружаем...',loadMore:'Ещё',
    retry:'Повторить',nowPlaying:'Сейчас играет',plays:'прослушиваний',resetData:'Сбросить данные',
    language:'Язык',listenedTracks:'Прослушано',share:'Поделиться',copied:'Скопировано!',
    queue:'Очередь',sound:'Sound',remix:'Remix',artists:'Артисты',albumsTab:'Альбомы',
    shuffle:'Перемешать',repeatPl:'Повторять',syncSaved:'Синхронизовано ✓',syncing:'Синхронизация...',
    syncBtn:'Синхронизировать',favArtists:'Артисты',addFav:'Подписаться',
    removeFav:'Подписан',backToSearch:'Назад',searchPlaceholder:'Песни или артист',
    noRecommended:'Послушай пару треков',goToAlbum:'Перейти в альбом',
    tracks:'Треки',discography:'Дискография',popular:'Популярное',
    latestRelease:'Последний релиз',noTracks:'Треки не найдены',showMore:'Показать ещё',
    blockArtist:'Не рекомендовать',
  },
};

function fmtP(n:number){if(n>=1e6)return(n/1e6).toFixed(1)+'M';if(n>=1000)return Math.round(n/1000)+'K';return n>0?String(n):'';}
function greeting(lang:'ru'|'en'|'uk'|'kk'|'pl'|'tr'){
  const h=new Date().getHours();
  if(lang==='ru'){if(h>=5&&h<12)return'Доброе утро';if(h>=12&&h<17)return'Добрый день';if(h>=17&&h<22)return'Добрый вечер';return'Доброй ночи';}
  if(lang==='uk'){if(h>=5&&h<12)return'Доброго ранку';if(h>=12&&h<17)return'Добрий день';if(h>=17&&h<22)return'Добрий вечір';return'На добраніч';}
  if(lang==='kk'){if(h>=5&&h<12)return'Қайырлы таң';if(h>=12&&h<17)return'Қайырлы күн';if(h>=17&&h<22)return'Қайырлы кеш';return'Түні жарық болсын';}
  if(lang==='pl'){if(h>=5&&h<12)return'Dzień dobry';if(h>=12&&h<17)return'Dzień dobry';if(h>=17&&h<22)return'Dobry wieczór';return'Dobranoc';}
  if(lang==='tr'){if(h>=5&&h<12)return'Günaydın';if(h>=12&&h<17)return'İyi günler';if(h>=17&&h<22)return'İyi akşamlar';return'İyi geceler';}
  if(h>=5&&h<12)return'Good morning';if(h>=12&&h<17)return'Good day';if(h>=17&&h<22)return'Good evening';return'Good night';
}

function calcMaxStreak(days:string[]):number{
  if(!days.length)return 0;
  const sorted=[...new Set(days)].sort();
  let mx=1,cur=1;
  for(let i=1;i<sorted.length;i++){
    const prev=new Date(sorted[i-1]),curr=new Date(sorted[i]);
    const diff=(curr.getTime()-prev.getTime())/(1000*60*60*24);
    if(diff===1){cur++;mx=Math.max(mx,cur);}else cur=1;
  }
  return mx;
}

function extractColors(src: string): Promise<{dark: string; mid: string; accent: string}> {
  return new Promise((resolve) => {
    const fallback = { dark: '#1a1208', mid: '#2a1f10', accent: '#3a2d18' };
    if (!src) { resolve(fallback); return; }
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 50; canvas.height = 50;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(fallback); return; }
          ctx.drawImage(img, 0, 0, 50, 50);
          const data = ctx.getImageData(0, 0, 50, 50).data;
          let r = 0, g = 0, b = 0, count = 0;
          for (let i = 0; i < data.length; i += 16) {
            r += data[i]; g += data[i+1]; b += data[i+2]; count++;
          }
          r = Math.floor(r / count);
          g = Math.floor(g / count);
          b = Math.floor(b / count);
          const dark = `rgb(${Math.floor(r*0.25)},${Math.floor(g*0.25)},${Math.floor(b*0.25)})`;
          const mid = `rgb(${Math.floor(r*0.45)},${Math.floor(g*0.45)},${Math.floor(b*0.45)})`;
          const accent = `rgb(${Math.floor(r*0.65)},${Math.floor(g*0.65)},${Math.floor(b*0.65)})`;
          resolve({ dark, mid, accent });
        } catch { resolve(fallback); }
      };
      img.onerror = () => resolve(fallback);
      img.src = src;
    } catch { resolve(fallback); }
  });
}

function Img({src,size,radius,fb='🎵'}:{src:string;size:number;radius:number;fb?:string}){
  const[e,sE]=useState(false);
  const s:React.CSSProperties={width:size,height:size,borderRadius:radius,flexShrink:0,display:'block'};
  if(src&&!e)return<img src={src} style={{...s,objectFit:'cover'}} onError={()=>sE(true)}/>;
  return<div style={{...s,background:BG3,display:'flex',alignItems:'center',justifyContent:'center',fontSize:Math.floor(size*.36),color:ACC}}>{fb}</div>;
}

function AlbumImg({src,radius=0}:{src:string;radius?:number}){
  const[e,sE]=useState(false);
  if(src&&!e)return<img src={src} style={{width:'100%',aspectRatio:'1/1',objectFit:'cover',display:'block',borderRadius:radius}} onError={()=>sE(true)}/>;
  return<div style={{width:'100%',aspectRatio:'1/1',background:BG3,borderRadius:radius,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,color:ACC}}>💿</div>;
}

const GENRES=[{id:'top',label:'Топ',e:'🔥'},{id:'new',label:'Новинки',e:'⚡'},{id:'ru-rap',label:'RU Рэп',e:'🎤'},{id:'hip-hop',label:'Hip-Hop',e:'🎧'},{id:'trap',label:'Trap',e:'💀'},{id:'drill',label:'Drill',e:'🔩'},{id:'electronic',label:'Electronic',e:'⚡'},{id:'rnb',label:'R&B',e:'💜'},{id:'pop',label:'Pop',e:'✨'},{id:'latin',label:'Latin',e:'🌴'}];
const REMIX_W=['speed up','sped up','slowed','reverb','slow reverb','nightcore','pitched','lofi','lo-fi','boosted','bass boost','phonk','tiktok','ultra slowed','super slowed','mashup','extended','hardstyle','core','remix','bass','спид ап','спид апп','словед','слоувед','ремикс','басс','слоу','реверб','найткор','хардстайл','мэшап','мешап','кор','фонк','лофи'];
const COVER_W=['cover','parody','кавер','пародия','cover version','кавер-версия','tribute to','в стиле','cover by','кавер на'];

function useSlider(val:number,onChange:(v:number)=>void){
  const ref=useRef<HTMLDivElement>(null);
  const dragging=useRef(false);
  const currentVal=useRef(val);
  const[displayVal,setDisplayVal]=useState(val);

  useEffect(()=>{
    if(!dragging.current){
      currentVal.current=val;
      setDisplayVal(val);
    }
  },[val]);

  const update=useCallback((cx:number)=>{
    if(!ref.current)return;
    const r=ref.current.getBoundingClientRect();
    const v=Math.max(0,Math.min(1,(cx-r.left)/r.width));
    currentVal.current=v;
    setDisplayVal(v);
    onChange(v);
  },[onChange]);

  const onDown=(e:React.PointerEvent)=>{
    dragging.current=true;
    ref.current?.setPointerCapture(e.pointerId);
    update(e.clientX);
    e.preventDefault();
  };
  const onMove=(e:React.PointerEvent)=>{
    if(dragging.current){
      update(e.clientX);
      e.preventDefault();
    }
  };
  const onUp=(e:React.PointerEvent)=>{
    dragging.current=false;
    update(e.clientX);
  };
  const onCancel=()=>{ dragging.current=false; };

  return{ref,displayVal,onPointerDown:onDown,onPointerMove:onMove,onPointerUp:onUp,onPointerCancel:onCancel};
}

function SliderTrack({sp,h=3}:{sp:ReturnType<typeof useSlider>;h?:number}){
  const val=sp.displayVal;
  return(
    <div
      ref={sp.ref}
      onPointerDown={e=>{e.stopPropagation();sp.onPointerDown(e);}}
      onPointerMove={e=>{e.stopPropagation();sp.onPointerMove(e);}}
      onPointerUp={e=>{e.stopPropagation();sp.onPointerUp(e);}}
      onPointerCancel={e=>{e.stopPropagation();sp.onPointerCancel();}}
      style={{flex:1,height:Math.max(h,22),display:'flex',alignItems:'center',cursor:'pointer',touchAction:'none',userSelect:'none'}}
    >
      <div style={{width:'100%',height:h,background:'rgba(255,255,255,0.1)',borderRadius:h,position:'relative'}}>
        <div style={{width:`${val*100}%`,height:'100%',background:ACC,borderRadius:h,transition:'width 0.1s linear'}}/>
        <div style={{position:'absolute',top:'50%',left:`${val*100}%`,transform:'translate(-50%,-50%)',width:h+10,height:h+10,background:ACC,borderRadius:'50%',pointerEvents:'none',transition:'left 0.1s linear'}}/>
      </div>
    </div>
  );
}

// ── MiniSlider: нативные DOM события, полностью обходит React event system ──
// Использует useEffect + addEventListener вместо React onPointerDown
// Это гарантирует что события НЕ всплывают через React дерево вообще
function MiniSlider({val,onChange}:{val:number;onChange:(v:number)=>void}){
  const wrapRef=useRef<HTMLDivElement>(null);
  const trackRef=useRef<HTMLDivElement>(null);
  const[disp,setDisp]=useState(val);
  const dragging=useRef(false);
  const dispRef=useRef(val);

  useEffect(()=>{
    if(!dragging.current){
      dispRef.current=val;
      setDisp(val);
    }
  },[val]);

  useEffect(()=>{
    const track=trackRef.current;
    if(!track)return;

    const calc=(cx:number)=>{
      const r=track.getBoundingClientRect();
      const v=Math.max(0,Math.min(1,(cx-r.left)/r.width));
      dispRef.current=v;
      setDisp(v);
      onChange(v);
    };

    const onDown=(e:PointerEvent)=>{
      e.stopPropagation();
      e.stopImmediatePropagation();
      e.preventDefault();
      dragging.current=true;
      track.setPointerCapture(e.pointerId);
      calc(e.clientX);
    };
    const onMove=(e:PointerEvent)=>{
      if(!dragging.current)return;
      e.stopPropagation();
      e.stopImmediatePropagation();
      calc(e.clientX);
    };
    const onUp=(e:PointerEvent)=>{
      if(!dragging.current)return;
      e.stopPropagation();
      e.stopImmediatePropagation();
      calc(e.clientX);
      dragging.current=false;
    };
    const onCancel=()=>{dragging.current=false;};

    // capture:true — перехватываем до любых React обработчиков
    track.addEventListener('pointerdown',onDown,{capture:true});
    track.addEventListener('pointermove',onMove,{capture:true});
    track.addEventListener('pointerup',onUp,{capture:true});
    track.addEventListener('pointercancel',onCancel,{capture:true});

    return()=>{
      track.removeEventListener('pointerdown',onDown,{capture:true});
      track.removeEventListener('pointermove',onMove,{capture:true});
      track.removeEventListener('pointerup',onUp,{capture:true});
      track.removeEventListener('pointercancel',onCancel,{capture:true});
    };
  },[onChange]);

  return(
    <div ref={wrapRef} style={{flex:1,display:'flex',alignItems:'center',height:18}}>
      <div
        ref={trackRef}
        style={{flex:1,height:18,display:'flex',alignItems:'center',cursor:'pointer',touchAction:'none',userSelect:'none'}}
      >
        <div style={{width:'100%',height:3,background:'rgba(255,255,255,0.1)',borderRadius:3,position:'relative'}}>
          <div style={{width:`${disp*100}%`,height:'100%',background:ACC,borderRadius:3}}/>
          <div style={{position:'absolute',top:'50%',left:`${disp*100}%`,transform:'translate(-50%,-50%)',width:12,height:12,background:ACC,borderRadius:'50%',pointerEvents:'none'}}/>
        </div>
      </div>
    </div>
  );
}

function Spinner(){return(<div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 0'}}><div style={{width:28,height:28,borderRadius:'50%',border:`2px solid ${ACC}`,borderTopColor:'transparent',animation:'spin 0.8s linear infinite'}}/></div>);}

function getArtistPlayCounts(history:Track[]):Record<string,number>{const c:Record<string,number>={};for(const tr of history){if(!tr.artist||REMIX_W.some(w=>tr.artist.toLowerCase().includes(w)))continue;c[tr.artist]=(c[tr.artist]||0)+1;}return c;}

function RecentCard({tr,isActive,isPlaying,inQueue,onPlay,onArtist,onQueue,queueLabel}:{
  tr:Track;isActive:boolean;isPlaying:boolean;inQueue:boolean;
  onPlay:()=>void;onArtist:()=>void;onQueue:(e:React.MouseEvent)=>void;queueLabel:string;
}){
  const pressStart=useRef<{x:number;y:number;t:number}|null>(null);
  const tap:React.CSSProperties={outline:'none',WebkitTapHighlightColor:'transparent' as any};
  return(
    <div className="recent-card" style={{width:100,borderRadius:10,background:BG2,overflow:'hidden',cursor:'pointer',flexShrink:0,border:'1px solid #1e1e1e',userSelect:'none'}}>
      <div
        onPointerDown={e=>{pressStart.current={x:e.clientX,y:e.clientY,t:Date.now()};}}
        onPointerUp={e=>{
          if(!pressStart.current)return;
          const dx=Math.abs(e.clientX-pressStart.current.x);
          const dy=Math.abs(e.clientY-pressStart.current.y);
          const dt=Date.now()-pressStart.current.t;
          pressStart.current=null;
          if(dx<8&&dy<8&&dt<400)onPlay();
        }}
        onPointerCancel={()=>{pressStart.current=null;}}
        style={{width:100,height:100,position:'relative'}}>
        <Img src={tr.cover} size={100} radius={0}/>
        {isActive&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{isPlaying?'⏸':'▶'}</div>}
      </div>
      <div style={{padding:'6px 7px 8px',boxSizing:'border-box' as const}}>
        <button onClick={e=>{e.stopPropagation();onArtist();}} style={{background:'none',border:'none',padding:0,cursor:'pointer',display:'block',width:'100%',textAlign:'left' as const,...tap}}>
          <div style={{fontSize:10,fontWeight:600,color:ACC,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{tr.artist}</div>
        </button>
        <div style={{fontSize:9,color:TEXT_MUTED,marginTop:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{tr.title}</div>
      </div>
      <button
        onPointerDown={e=>{e.stopPropagation();onQueue(e);}}
        style={{width:'100%',padding:'4px 7px',background:inQueue?ACC_DIM:'transparent',border:'none',borderTop:'1px solid #252525',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4,...tap}}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={inQueue?ACC:'#5a5a5a'} strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1.2" fill={inQueue?ACC:'#5a5a5a'}/><circle cx="3" cy="12" r="1.2" fill={inQueue?ACC:'#5a5a5a'}/><circle cx="3" cy="18" r="1.2" fill={inQueue?ACC:'#5a5a5a'}/></svg>
        <span style={{fontSize:8,color:inQueue?ACC:'#5a5a5a'}}>{queueLabel}</span>
      </button>
    </div>
  );
}

function NavItem({item,active,onSelect}:{
  item:{id:string;icon:(a:boolean)=>React.ReactNode;lbl:()=>string};
  active:boolean;onSelect:()=>void;
}){
  const pressStart=useRef<{x:number;y:number}|null>(null);
  const tap:React.CSSProperties={outline:'none',WebkitTapHighlightColor:'transparent' as any};
  return(
    <div
      className={`nav-item${active?' active-nav':''}`}
      onPointerDown={e=>{pressStart.current={x:e.clientX,y:e.clientY};}}
      onPointerUp={e=>{
        if(!pressStart.current)return;
        const dx=Math.abs(e.clientX-pressStart.current.x);
        const dy=Math.abs(e.clientY-pressStart.current.y);
        pressStart.current=null;
        if(dx<10&&dy<10)onSelect();
      }}
      onPointerCancel={()=>{pressStart.current=null;}}
      style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,cursor:'pointer',padding:'8px 4px 10px',...tap}}>
      {item.icon(active)}
      <span style={{fontSize:10,color:active?ACC:'#606060',letterSpacing:0.3,transition:'color 0.2s ease'}}>{item.lbl()}</span>
    </div>
  );
}

function makeTapHandlers(fn: ()=>void, threshold=10, maxMs=500){
  let sx=0,sy=0,st=0;
  return{
    onPointerDown:(e:React.PointerEvent)=>{sx=e.clientX;sy=e.clientY;st=Date.now();},
    onPointerUp:(e:React.PointerEvent)=>{
      const dx=Math.abs(e.clientX-sx),dy=Math.abs(e.clientY-sy),dt=Date.now()-st;
      if(dx<threshold&&dy<threshold&&dt<maxMs)fn();
    },
    onPointerCancel:()=>{},
  };
}

export default function App(){
  const[screen,setScreen]=useState<'home'|'search'|'library'|'trending'|'profile'|'artist'|'album'>('home');
  const[lang,setLang]=useState<'ru'|'en'|'uk'|'kk'|'pl'|'tr'>('ru');
  const t=(k:string)=>T[lang][k]||k;
  const[query,setQuery]=useState('');
  const[searchMode,setSearchMode]=useState<'sound'|'albums'|'covers'|'remix'|'artists'>('sound');
  const[results,setResults]=useState<Track[]>([]);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState('');
  const[menuId,setMenuId]=useState<string|null>(null);

  const[artistPage,setArtistPage]=useState<ArtistInfo|null>(null);
  const[artistLoading,setArtistLoading]=useState(false);
  const[artistTab,setArtistTab]=useState<'albums'|'tracks'>('albums');
  const[artistAlbums,setArtistAlbums]=useState<AlbumInfo[]>([]);
  const[artistAlbumsLoading,setArtistAlbumsLoading]=useState(false);
  const[artistTracks,setArtistTracks]=useState<Track[]>([]);
  const[artistTracksLoading,setArtistTracksLoading]=useState(false);
  const[artistTracksHasMore,setArtistTracksHasMore]=useState(false);
  const[artistTracksOffset,setArtistTracksOffset]=useState(0);
  const artistTracksCursor=useRef<string|null>(null);
  const artistUserId=useRef('');

  const[favArtists,setFavArtists]=useState<ArtistInfo[]>([]);
  const[blockedArtists,setBlockedArtists]=useState<string[]>([]);
  const[showSettings,setShowSettings]=useState(false);
  const[totalSec,setTotalSec]=useState(0);
  const[exploredIds,setExploredIds]=useState<string[]>([]);
  const[listenedIds,setListenedIds]=useState<string[]>([]);
  const[trackPlays,setTrackPlays]=useState<Record<string,{title:string;artist:string;cover:string;count:number}>>({});
  const[streakDays,setStreakDays]=useState<string[]>([]);
  const[maxStreak,setMaxStreak]=useState(0);
  const listenTimer=useRef<ReturnType<typeof setInterval>|null>(null);
  const listenSec=useRef(0);
  const listenTrackId=useRef('');
  const isPlayingRef=useRef(false);
  const totalSecRef=useRef(0);
  const exploredIdsRef=useRef<string[]>([]);
  const listenedIdsRef=useRef<string[]>([]);
  const trackPlaysRef=useRef<Record<string,{title:string;artist:string;cover:string;count:number}>>({});
  const streakDaysRef=useRef<string[]>([]);
  const maxStreakRef=useRef(0);
  const likedRef=useRef<Track[]>([]);
  const playlistsRef=useRef<Playlist[]>([]);
  const volumeRef=useRef(0.8);
  const favArtistsRef=useRef<ArtistInfo[]>([]);
  const favAlbumsRef=useRef<AlbumInfo[]>([]);
  const bgCoverRef=useRef('');
  const[albumPage,setAlbumPage]=useState<AlbumInfo|null>(null);
  const[albumLoading,setAlbumLoading]=useState(false);
  const[favAlbums,setFavAlbums]=useState<AlbumInfo[]>([]);
  const[current,setCurrent]=useState<Track|null>(null);
  const[bgCover,setBgCover]=useState('');
  const[fpColors,setFpColors]=useState({dark:'#1a1208',mid:'#2a1f10',accent:'#3a2d18'});
  const[playing,setPlaying]=useState(false);
  const[progress,setProgress]=useState(0);
  const[curTime,setCurTime]=useState('0:00');
  const[volume,setVolume]=useState(1);
  const[loop,setLoop]=useState(false);
  const[fullPlayer,setFullPlayer]=useState(false);
  const[showQueue,setShowQueue]=useState(false);
  const[queue,setQueue]=useState<Track[]>([]);
  const[playHistory,setPlayHistory]=useState<Track[]>([]);
  const[dragIdx,setDragIdx]=useState<number|null>(null);
  const[liked,setLiked]=useState<Track[]>([]);
  const[playlists,setPlaylists]=useState<Playlist[]>([]);
  const[openPlId,setOpenPlId]=useState<string|null>(null);
  const[history,setHistory]=useState<Track[]>([]);
  const[recs,setRecs]=useState<Track[]>([]);
  const[recsVersion,setRecsVersion]=useState(0);
  const[hotTracks,setHotTracks]=useState<Track[]>([]);
  const[risingTracks,setRisingTracks]=useState<Track[]>([]);
  const[trendLoading,setTrendLoading]=useState(false);
  const[trendSection,setTrendSection]=useState<'hot'|'rising'>('hot');
  const[trendOffset,setTrendOffset]=useState<Record<'hot'|'rising',number>>({hot:0,rising:0});
  const[trends]=useState<Record<string,Track[]>>({});
  const[trendGenre]=useState('top');
  const[trendOff]=useState<Record<string,number>>({});
  const[libTab,setLibTab]=useState<'liked'|'playlists'|'artists'|'albums'>('liked');
  const[showNewPl,setShowNewPl]=useState(false);
  const[newPlName,setNewPlName]=useState('');
  const[addToPl,setAddToPl]=useState<Track|null>(null);
  const[copied,setCopied]=useState(false);
  const prevScreen=useRef<'home'|'search'|'library'|'trending'|'profile'|'artist'|'album'>('search');
  const audio=useRef<HTMLAudioElement|null>(null);
  const syncTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const playCountRef=useRef(0);
  const tg=window.Telegram?.WebApp?.initDataUnsafe?.user;
  const uid=String(tg?.id||'anon');
  const uName=tg?.first_name||tg?.username||'User';
  const uHandle=tg?.username?`@${tg.username}`:'';
  const uInit=uName.charAt(0).toUpperCase();

  useEffect(()=>{ isPlayingRef.current=playing; },[playing]);

  const syncSave=async(data:object)=>{if(uid==='anon')return;try{await fetch(`${W}/sync/save?uid=${uid}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});}catch{}};
  const doFullSync=()=>{
    if(uid==='anon')return;
    if(syncTimer.current)clearTimeout(syncTimer.current);
    syncTimer.current=setTimeout(()=>syncSave({
      liked:likedRef.current,playlists:playlistsRef.current,
      history:historyRef.current,volume:volumeRef.current,
      favArtists:favArtistsRef.current,favAlbums:favAlbumsRef.current,
      blockedArtists:blockedRef.current,bgCover:bgCoverRef.current,
      recs:recsRef.current.slice(0,20),
      stats:{totalSec:totalSecRef.current,exploredIds:exploredIdsRef.current,
        listenedIds:listenedIdsRef.current,trackPlays:trackPlaysRef.current,
        streakDays:streakDaysRef.current,maxStreak:maxStreakRef.current}
    }),1500);
  };
  const triggerSync=(..._args:any[])=>doFullSync();

  useEffect(()=>{
    window.Telegram?.WebApp?.ready();window.Telegram?.WebApp?.expand();
    const ll=()=>{try{
      const l=localStorage.getItem('l47');if(l)setLiked(JSON.parse(l));
      const p=localStorage.getItem('p47');if(p)setPlaylists(JSON.parse(p));
      const h=localStorage.getItem('h47');if(h)setHistory(JSON.parse(h));
      const fa=localStorage.getItem('fa47');if(fa)setFavArtists(JSON.parse(fa));
      const fal=localStorage.getItem('fal47');if(fal)setFavAlbums(JSON.parse(fal));
      const v=localStorage.getItem('v47');if(v)setVolume(parseFloat(v));
      const ba_raw=localStorage.getItem('ba47');
      const blocked_on_load:string[]=ba_raw?JSON.parse(ba_raw):[];
      setBlockedArtists(blocked_on_load);
      const rc=localStorage.getItem('recs47');
      if(rc){const parsed=JSON.parse(rc);setRecs(parsed.filter((tr:Track)=>!blocked_on_load.includes(tr.artist)));}
      const bgc=localStorage.getItem('bgc47');if(bgc)setBgCover(bgc);
      const tsec=localStorage.getItem('tsec47');if(tsec)setTotalSec(parseInt(tsec)||0);
      const expIds=localStorage.getItem('exp47');if(expIds)setExploredIds(JSON.parse(expIds));
      const lstIds=localStorage.getItem('lst47');if(lstIds)setListenedIds(JSON.parse(lstIds));
      const tpl=localStorage.getItem('tpl47');if(tpl)setTrackPlays(JSON.parse(tpl));
      const sdays=localStorage.getItem('sdays47');if(sdays){const d=JSON.parse(sdays);setStreakDays(d);setMaxStreak(calcMaxStreak(d));}
    }catch{}};
    ll();
    if(uid!=='anon'){
      fetch(`${W}/sync/load?uid=${uid}`).then(r=>r.json()).then(d=>{
        if(!d.data)return;
        const sv=d.data;
        const merge=<T,>(local:T[]|null,server:T[]|null):T[]|null=>{
          if(!server?.length)return local;if(!local?.length)return server;
          return server.length>=local.length?server:local;
        };
        const localLiked=likedRef.current;const merged_liked=merge(localLiked,sv.liked)||localLiked;
        if(merged_liked!==localLiked){setLiked(merged_liked);try{localStorage.setItem('l47',JSON.stringify(merged_liked));}catch{}}
        const localPl=playlistsRef.current;const merged_pl=merge(localPl,sv.playlists)||localPl;
        if(merged_pl!==localPl){setPlaylists(merged_pl);try{localStorage.setItem('p47',JSON.stringify(merged_pl));}catch{}}
        const localH=historyRef.current;const merged_h=merge(localH,sv.history)||localH;
        if(merged_h!==localH){setHistory(merged_h);try{localStorage.setItem('h47',JSON.stringify(merged_h));}catch{}}
        const localFA=favArtistsRef.current;const merged_fa=merge(localFA,sv.favArtists)||localFA;
        if(merged_fa!==localFA){setFavArtists(merged_fa);try{localStorage.setItem('fa47',JSON.stringify(merged_fa));}catch{}}
        const localFAl=favAlbumsRef.current;const merged_fal=merge(localFAl,sv.favAlbums)||localFAl;
        if(merged_fal!==localFAl){setFavAlbums(merged_fal);try{localStorage.setItem('fal47',JSON.stringify(merged_fal));}catch{}}
        if(sv.volume!==undefined&&volumeRef.current===1&&sv.volume!==1){setVolume(sv.volume);volumeRef.current=sv.volume;try{localStorage.setItem('v47',String(sv.volume));}catch{}}
        if(sv.blockedArtists?.length){const merged_ba=[...new Set([...blockedRef.current,...sv.blockedArtists])];setBlockedArtists(merged_ba);try{localStorage.setItem('ba47',JSON.stringify(merged_ba));}catch{}}
        if(sv.bgCover&&!bgCoverRef.current){setBgCover(sv.bgCover);try{localStorage.setItem('bgc47',sv.bgCover);}catch{}}
        if(sv.recs?.length){const blocked=sv.blockedArtists||blockedRef.current||[];const freshRecs=sv.recs.filter((tr:Track)=>!blocked.includes(tr.artist));if(freshRecs.length>recsRef.current.length){setRecs(freshRecs);try{localStorage.setItem('recs47',JSON.stringify(freshRecs));}catch{}}}
        if(sv.stats){
          const s=sv.stats;
          if((s.totalSec||0)>totalSecRef.current){setTotalSec(s.totalSec);totalSecRef.current=s.totalSec;try{localStorage.setItem('tsec47',String(s.totalSec));}catch{}}
          if((s.exploredIds?.length||0)>exploredIdsRef.current.length){setExploredIds(s.exploredIds);exploredIdsRef.current=s.exploredIds;try{localStorage.setItem('exp47',JSON.stringify(s.exploredIds));}catch{}}
          if((s.listenedIds?.length||0)>listenedIdsRef.current.length){setListenedIds(s.listenedIds);listenedIdsRef.current=s.listenedIds;try{localStorage.setItem('lst47',JSON.stringify(s.listenedIds));}catch{}}
          if(s.trackPlays&&Object.keys(s.trackPlays).length>Object.keys(trackPlaysRef.current).length){setTrackPlays(s.trackPlays);trackPlaysRef.current=s.trackPlays;try{localStorage.setItem('tpl47',JSON.stringify(s.trackPlays));}catch{}}
          if((s.streakDays?.length||0)>streakDaysRef.current.length){setStreakDays(s.streakDays);streakDaysRef.current=s.streakDays;const mx=calcMaxStreak(s.streakDays);setMaxStreak(mx);maxStreakRef.current=mx;try{localStorage.setItem('sdays47',JSON.stringify(s.streakDays));}catch{}}
        }
        setTimeout(()=>doFullSync(),3000);
      }).catch(()=>{});
    }
    try{const lg=localStorage.getItem('lg47');if(lg)setLang(lg as 'ru'|'en'|'uk'|'kk'|'pl'|'tr');}catch{}
  },[]);

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if(e.code==='Space'&&e.target===document.body){
        e.preventDefault();
        if(audio.current){
          if(isPlayingRef.current){audio.current.pause();setPlaying(false);}
          else{audio.current.play();setPlaying(true);}
        }
      }
    };
    document.addEventListener('keydown',onKey);
    return()=>document.removeEventListener('keydown',onKey);
  },[]);

  const[recsLoading,setRecsLoading]=useState(false);
  const historyRef=useRef<Track[]>([]);
  const blockedRef=useRef<string[]>([]);
  const recsRef=useRef<Track[]>([]);
  useEffect(()=>{historyRef.current=history;},[history]);
  useEffect(()=>{blockedRef.current=blockedArtists;},[blockedArtists]);
  useEffect(()=>{recsRef.current=recs;},[recs]);
  useEffect(()=>{totalSecRef.current=totalSec;},[totalSec]);
  useEffect(()=>{exploredIdsRef.current=exploredIds;},[exploredIds]);
  useEffect(()=>{listenedIdsRef.current=listenedIds;},[listenedIds]);
  useEffect(()=>{trackPlaysRef.current=trackPlays;},[trackPlays]);
  useEffect(()=>{streakDaysRef.current=streakDays;},[streakDays]);
  useEffect(()=>{maxStreakRef.current=maxStreak;},[maxStreak]);
  useEffect(()=>{likedRef.current=liked;},[liked]);
  useEffect(()=>{playlistsRef.current=playlists;},[playlists]);
  useEffect(()=>{volumeRef.current=volume;},[volume]);
  useEffect(()=>{favArtistsRef.current=favArtists;},[favArtists]);
  useEffect(()=>{favAlbumsRef.current=favAlbums;},[favAlbums]);
  useEffect(()=>{bgCoverRef.current=bgCover;},[bgCover]);

  useEffect(()=>{
    if(!('mediaSession' in navigator))return;
    if(!current){
      navigator.mediaSession.metadata=null;
      navigator.mediaSession.playbackState='none';
      return;
    }
    const artworkUrl=current.cover?current.cover.replace('t300x300','t500x500'):'';
    const artwork:MediaImage[]=artworkUrl?[
      {src:artworkUrl.replace('t500x500','t120x120'),sizes:'128x128',type:'image/jpeg'},
      {src:artworkUrl.replace('t500x500','t300x300'),sizes:'300x300',type:'image/jpeg'},
      {src:artworkUrl,sizes:'512x512',type:'image/jpeg'},
    ]:[];
    navigator.mediaSession.metadata=new MediaMetadata({title:current.title||'',artist:current.artist||'',album:'',artwork});
    navigator.mediaSession.playbackState=playing?'playing':'paused';
    navigator.mediaSession.setActionHandler('play',()=>{if(audio.current){audio.current.play();setPlaying(true);}});
    navigator.mediaSession.setActionHandler('pause',()=>{if(audio.current){audio.current.pause();setPlaying(false);}});
    navigator.mediaSession.setActionHandler('previoustrack',()=>playPrev());
    navigator.mediaSession.setActionHandler('nexttrack',()=>playNext());
    navigator.mediaSession.setActionHandler('seekto',(details)=>{
      if(audio.current&&details.seekTime!=null){
        audio.current.currentTime=details.seekTime;
        setProgress(audio.current.currentTime/(audio.current.duration||1)*100);
      }
    });
    try{
      if(audio.current&&audio.current.duration&&!isNaN(audio.current.duration)){
        navigator.mediaSession.setPositionState({duration:audio.current.duration,playbackRate:1,position:audio.current.currentTime||0});
      }
    }catch{}
  },[current,playing]);

  useEffect(()=>{
    if(fullPlayer&&current?.cover){
      extractColors(current.cover).then(setFpColors);
    }
  },[fullPlayer,current?.cover]);

  const loadRecommendations=useCallback(async()=>{
    const hist=historyRef.current;
    const blocked=blockedRef.current;
    if(hist.length<1)return;
    setRecsLoading(true);
    try{
      const allCounts=getArtistPlayCounts(hist.slice(0,100));
      const recentCounts=getArtistPlayCounts(hist.slice(0,15));
      const merged:Record<string,number>={};
      for(const[a,n] of Object.entries(allCounts))merged[a]=n;
      for(const[a,n] of Object.entries(recentCounts))merged[a]=(merged[a]||0)+n*2;
      const sortedArtists=Object.entries(merged)
        .filter(([a])=>!blocked.includes(a))
        .sort((a,b)=>b[1]-a[1])
        .map(([a])=>a)
        .slice(0,8);
      if(!sortedArtists.length){setRecsLoading(false);return;}
      const recentIds=hist.slice(0,30).map(tr=>tr.id).join(',');
      const resp=await fetch(`${W}/recommend?artists=${encodeURIComponent(sortedArtists.join(','))}&exclude=${encodeURIComponent(recentIds)}&limit=10`);
      if(!resp.ok)throw new Error(`HTTP ${resp.status}`);
      const d=await resp.json();
      if(d.tracks?.length){
        const fresh=d.tracks.filter((tr:Track)=>!blocked.includes(tr.artist));
        if(fresh.length>0){
          setRecs(fresh);
          try{localStorage.setItem('recs47',JSON.stringify(fresh));}catch{}
          doFullSync();
        }
      }
    }catch(e){console.warn('recs failed:',e);}
    setRecsLoading(false);
  },[]);

  useEffect(()=>{
    if(history.length>=1)loadRecommendations();
  },[recsVersion,history.length,blockedArtists.join(',')]);

  useEffect(()=>{
    const onVisible=()=>{if(document.visibilityState==='visible')loadRecommendations();};
    document.addEventListener('visibilitychange',onVisible);
    return()=>document.removeEventListener('visibilitychange',onVisible);
  },[loadRecommendations]);

  useEffect(()=>{
    const a=audio.current;if(!a)return;
    const onT=()=>{
      if(a.duration){
        setProgress(a.currentTime/a.duration*100);
        const m=Math.floor(a.currentTime/60),s=Math.floor(a.currentTime%60);
        setCurTime(`${m}:${s.toString().padStart(2,'0')}`);
        try{
          if('mediaSession' in navigator&&!isNaN(a.duration)&&a.duration>0){
            navigator.mediaSession.setPositionState({duration:a.duration,playbackRate:a.playbackRate||1,position:a.currentTime});
          }
        }catch{}
      }
    };
    const onE=()=>{
      if(loop){a.currentTime=0;a.play();}
      else if(queue.length>0){const nxt=queue[0];setQueue(prev=>{const n=prev.slice(1);try{localStorage.setItem('q47',JSON.stringify(n));}catch{}return n;});playDirect(nxt);}
      else{
        const pool=recs.filter(tr=>tr.mp3&&!blockedArtists.includes(tr.artist));
        const fallbackPool=history.filter(tr=>tr.mp3&&!blockedArtists.includes(tr.artist));
        const available=(pool.length>0?pool:fallbackPool).filter(tr=>tr.id!==current?.id);
        if(available.length>0)playDirect(available[Math.floor(Math.random()*Math.min(available.length,10))]);
        else setPlaying(false);
      }
    };
    a.addEventListener('timeupdate',onT);a.addEventListener('ended',onE);
    return()=>{a.removeEventListener('timeupdate',onT);a.removeEventListener('ended',onE);};
  },[current,loop,queue,recs,history,blockedArtists]);

  useEffect(()=>{if(audio.current)audio.current.volume=volume;},[volume]);

  const statsTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{
    if(uid==='anon'||!Object.keys(trackPlays).length)return;
    if(statsTimer.current)clearTimeout(statsTimer.current);
    statsTimer.current=setTimeout(()=>doFullSync(),3000);
  },[trackPlays,totalSec,maxStreak]);

  useEffect(()=>{
    const a=audio.current;if(!a)return;
    const onVol=()=>{if(Math.abs(a.volume-volume)>0.02)setVol(a.volume);};
    a.addEventListener('volumechange',onVol);
    return()=>a.removeEventListener('volumechange',onVol);
  },[volume]);

  useEffect(()=>{if(screen==='trending'&&hotTracks.length===0)loadTrend('top',false);},[screen]);
  useEffect(()=>{if(query.trim()&&screen==='search')doSearch(searchMode);},[searchMode]);

  const playDirect=async(track:Track)=>{
    let freshMp3=track.mp3;
    if(track.id&&!track.isArtist&&!track.isAlbum){
      try{
        const r=await fetch(`${W}/resolve?id=${track.id}`);
        const d=await r.json();
        if(d.mp3)freshMp3=d.mp3;
        else if(d.error)return;
      }catch{}
    }
    if(!freshMp3)return;
    const a=audio.current;
    if(a){
      a.pause();
      a.src=`${W}/stream?url=${encodeURIComponent(freshMp3)}`;
      a.load();
      a.play().then(()=>setPlaying(true)).catch(err=>{
        console.warn('play failed, retry:',err);
        setTimeout(()=>{a.play().then(()=>setPlaying(true)).catch(()=>setPlaying(false));},400);
      });
    }
    if(current)setPlayHistory(prev=>[current,...prev.slice(0,29)]);
    setCurrent({...track,mp3:freshMp3});setProgress(0);setCurTime('0:00');
    if(track.cover){setBgCover(track.cover);try{localStorage.setItem('bgc47',track.cover);}catch{}}
    if(fullPlayer||true){extractColors(track.cover).then(setFpColors);}
    setExploredIds(prev=>{if(prev.includes(track.id))return prev;const n=[...prev,track.id];try{localStorage.setItem('exp47',JSON.stringify(n));}catch{}return n;});
    const today=new Date().toISOString().slice(0,10);
    setStreakDays(prev=>{if(prev.includes(today))return prev;const n=[...prev,today];try{localStorage.setItem('sdays47',JSON.stringify(n));}catch{}setMaxStreak(calcMaxStreak(n));return n;});

    if(listenTimer.current)clearInterval(listenTimer.current);
    listenSec.current=0;listenTrackId.current=track.id;
    listenTimer.current=setInterval(()=>{
      if(!isPlayingRef.current||!audio.current||audio.current.paused)return;
      listenSec.current+=1;
      setTotalSec(prev=>{const n=prev+1;try{localStorage.setItem('tsec47',String(n));}catch{}return n;});
      if(listenSec.current===40){
        const tid=listenTrackId.current;
        setListenedIds(prev=>{if(prev.includes(tid))return prev;const n=[...prev,tid];try{localStorage.setItem('lst47',JSON.stringify(n));}catch{}return n;});
        setTrackPlays(prev=>{const entry=prev[tid]||{title:track.title,artist:track.artist,cover:track.cover||'',count:0};const n={...prev,[tid]:{...entry,cover:track.cover||entry.cover||'',count:entry.count+1}};try{localStorage.setItem('tpl47',JSON.stringify(n));}catch{}return n;});
      }
    },1000);

    setHistory(prev=>{
      const n=[track,...prev.filter(x=>x.id!==track.id)].slice(0,50);
      try{localStorage.setItem('h47',JSON.stringify(n));}catch{}
      playCountRef.current+=1;
      setRecsVersion(v=>v+1);
      triggerSync(liked,playlists,n,volume,favArtists,favAlbums,blockedArtists,track.cover||bgCover);
      return n;
    });
  };

  // ── Deeplink — через воркер (CORS-safe, полные метаданные) ──
  const deepLinkHandled=useRef(false);
  useEffect(()=>{
    const startParam=window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    if(!startParam||!startParam.startsWith('track-')||deepLinkHandled.current)return;

    deepLinkHandled.current=true;
    const trackId=startParam.replace('track-','');

    const openAndPlay=async()=>{
      try{
        // Воркер теперь возвращает mp3 + все метаданные (title, artist, cover, plays)
        // Прямые запросы к SoundCloud из браузера блокируются CORS — только через воркер
        const r=await fetch(`${W}/resolve?id=${trackId}`);
        const d=await r.json();
        if(d.mp3){
          const track:Track={
            id:trackId,
            title:d.title||'',
            artist:d.artist||'',
            cover:d.cover||'',
            duration:d.duration||'',
            plays:d.plays||0,
            mp3:d.mp3,
          };
          // setCurrent сначала — показываем UI немедленно
          setCurrent(track);
          // playDirect запускает воспроизведение (mp3 уже есть, повторный resolve не нужен)
          playDirect(track);
        }
      }catch(e){console.warn('deeplink error:',e);}
    };

    setTimeout(openAndPlay,800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const playPrev=()=>{
    if(playHistory.length>0){
      const prev=playHistory[0];
      setPlayHistory(p=>p.slice(1));
      if(audio.current&&prev.mp3){
        audio.current.pause();
        audio.current.src=`${W}/stream?url=${encodeURIComponent(prev.mp3)}`;
        audio.current.load();
        audio.current.play().then(()=>setPlaying(true)).catch(()=>setPlaying(false));
      }
      setCurrent(prev);setProgress(0);setCurTime('0:00');
    } else if(current&&audio.current){
      audio.current.currentTime=0;
    }
  };

  const playNext=()=>{
    if(queue.length>0){
      const nxt=queue[0];
      setQueue(prev=>{const n=prev.slice(1);try{localStorage.setItem('q47',JSON.stringify(n));}catch{}return n;});
      playDirect(nxt);
    } else {
      const pool=recs.filter(tr=>tr.mp3&&!blockedArtists.includes(tr.artist));
      const fallbackPool=history.filter(tr=>tr.mp3&&!blockedArtists.includes(tr.artist));
      const available=(pool.length>0?pool:fallbackPool).filter(tr=>tr.id!==current?.id);
      if(available.length>0)playDirect(available[Math.floor(Math.random()*Math.min(available.length,10))]);
    }
  };

  const playTrack=(track:Track)=>{
    if(track.isArtist){openArtist('',track.title,track.cover,track.plays);return;}
    if(track.isAlbum){openAlbum(track.id,track.title,track.artist,track.cover);return;}
    if(!track.id)return;
    if(current?.id===track.id){togglePlay();return;}
    playDirect(track);
  };

  const toggleQ=(track:Track)=>{
    setQueue(prev=>{
      const already=prev.some(t=>t.id===track.id);
      const n=already?prev.filter(t=>t.id!==track.id):[...prev,track];
      try{localStorage.setItem('q47',JSON.stringify(n));}catch{}
      return n;
    });
  };
  const addQ=(track:Track,e?:React.MouseEvent)=>{if(e)e.stopPropagation();toggleQ(track);};
  const rmQ=(i:number)=>setQueue(prev=>{const n=[...prev];n.splice(i,1);try{localStorage.setItem('q47',JSON.stringify(n));}catch{}return n;});
  const inQ=(id:string)=>queue.some(t=>t.id===id);
  const togglePlay=()=>{if(!audio.current)return;if(playing){audio.current.pause();setPlaying(false);}else{audio.current.play();setPlaying(true);}};
  const setVol=(v:number)=>{setVolume(v);volumeRef.current=v;try{localStorage.setItem('v47',String(v));}catch{}};
  const isLk=(id:string)=>liked.some(t=>t.id===id);
  const toggleLike=(track:Track,e?:React.MouseEvent)=>{e?.stopPropagation();setLiked(prev=>{const has=prev.some(t=>t.id===track.id);const n=has?prev.filter(t=>t.id!==track.id):[track,...prev];try{localStorage.setItem('l47',JSON.stringify(n));}catch{}triggerSync(n,playlists,history,volume,favArtists,favAlbums,blockedArtists,bgCover);return n;});};
  const blockArtist=(artist:string)=>{
    setBlockedArtists(prev=>{
      const n=[...new Set([...prev,artist])];
      try{localStorage.setItem('ba47',JSON.stringify(n));}catch{}
      triggerSync(liked,playlists,history,volume,favArtists,favAlbums,n,bgCover);
      return n;
    });
    setRecs(prev=>{const filtered=prev.filter(tr=>tr.artist!==artist);try{localStorage.setItem('recs47',JSON.stringify(filtered));}catch{}return filtered;});
    setRecsVersion(v=>v+1);
  };

  const trendCacheRef=useRef<{hot:Track[];rising:Track[];ts:number}>({hot:[],rising:[],ts:0});
  const loadTrend=async(genre='top',reset=false)=>{
    const section=genre==='top'?'hot':'rising';
    const offset=reset?0:trendOffset[section];
    setTrendLoading(true);
    try{
      const r=await fetch(`${W}/trending?genre=${genre}&offset=${offset}`);
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const d=await r.json();
      if(reset){
        if(section==='hot')setHotTracks(d.tracks||[]);
        else setRisingTracks(d.tracks||[]);
        setTrendOffset(prev=>({...prev,[section]:0}));
      }else{
        if(section==='hot'){setHotTracks(prev=>[...prev,...(d.tracks||[])]);}
        else{setRisingTracks(prev=>[...prev,...(d.tracks||[])]);}
        if(d.hasMore){setTrendOffset(prev=>({...prev,[section]:(d.currentOffset||offset)+1}));}
      }
    }catch(e){console.error('trend load error:',e);}
    setTrendLoading(false);
  };

  useEffect(()=>{
    if(screen==='trending'&&hotTracks.length===0){
      loadTrend('top',true);
      loadTrend('new',true);
    }
  },[screen]);

  const doSearch=async(mode=searchMode)=>{
    if(!query.trim())return;
    setLoading(true);setError('');setResults([]);
    try{
      const ep=mode==='albums'?'albums':'search';
      const serverMode=mode==='covers'?'sound':mode;
      const r=await fetch(`${W}/${ep}?q=${encodeURIComponent(query)}&mode=${serverMode}`);
      const d=await r.json();
      if(d.error)throw new Error(d.error);
      let tracks:Track[]=d.tracks||[];
      if(mode==='covers'){
        tracks=tracks.filter(tr=>COVER_W.some(w=>tr.title.toLowerCase().includes(w)));
        if(tracks.length<5){
          try{
            const r2=await fetch(`${W}/search?q=${encodeURIComponent(query+' cover')}&mode=sound`);
            const d2=await r2.json();
            const extra=(d2.tracks||[]).filter((tr:Track)=>COVER_W.some(w=>tr.title.toLowerCase().includes(w))&&!tracks.some(t=>t.id===tr.id));
            tracks=[...tracks,...extra];
          }catch{}
        }
      } else {
        if(mode==='sound'||mode==='remix'){tracks=tracks.filter(tr=>!COVER_W.some(w=>tr.title.toLowerCase().includes(w)));}
      }
      if(!tracks.length)throw new Error(t('notFound'));
      setResults(tracks);
    }catch(e:unknown){setError(e instanceof Error?e.message:String(e));}
    finally{setLoading(false);}
  };

  const openArtist=async(permalink:string,name:string,avatar:string,followers:number)=>{
    setArtistLoading(true);
    prevScreen.current=screen as typeof prevScreen.current;
    setScreen('artist');setArtistPage(null);setArtistAlbums([]);setArtistTracks([]);
    setArtistTracksOffset(0);setArtistTracksHasMore(false);setArtistTab('albums');
    artistUserId.current='';artistTracksCursor.current=null;
    try{
      const r=await fetch(`${W}/artist?name=${encodeURIComponent(name)}&permalink=${encodeURIComponent(permalink)}`);
      const d=await r.json();
      const art=d.artist||{};
      const userId=art.id||'';
      const username=art.username||name;
      artistUserId.current=userId;
      const popularTracks:Track[]=d.tracks||[];
      setArtistPage({id:userId,name:art.name||name,username:username,avatar:art.avatar||avatar||'',banner:art.banner||'',followers:art.followers||followers,permalink:art.permalink||permalink,tracks:popularTracks,albums:[],latestRelease:null});
      if(userId){
        const [albumsR,latestR,tracksR]=await Promise.allSettled([
          fetch(`${W}/artist/albums?userId=${encodeURIComponent(userId)}&username=${encodeURIComponent(username)}`),
          fetch(`${W}/artist/latest?userId=${encodeURIComponent(userId)}&username=${encodeURIComponent(username)}`),
          fetch(`${W}/artist/tracks?userId=${encodeURIComponent(userId)}`),
        ]);
        if(albumsR.status==='fulfilled'&&albumsR.value.ok){
          const ad=await albumsR.value.json();
          setArtistAlbums((ad.albums||[]).map((al:any)=>({id:al.id,title:al.title,artist:al.artist,cover:al.cover,tracks:[],permalink:al.permalink||'',trackCount:al.trackCount||0,plays:al.plays||0})));
        }
        let latestRelease:Track|null=null;
        if(latestR.status==='fulfilled'&&latestR.value.ok){const ld=await latestR.value.json();latestRelease=ld.latest||null;}
        if(tracksR.status==='fulfilled'&&tracksR.value.ok){
          const td=await tracksR.value.json();
          const allTracks:Track[]=td.tracks||[];
          setArtistTracks(allTracks);
          setArtistTracksHasMore(td.hasMore||false);
          artistTracksCursor.current=td.nextCursor||null;
        }
        setArtistPage(prev=>prev?{...prev,latestRelease}:null);
      } else {
        fetch(`${W}/albums?q=${encodeURIComponent(name)}`).then(r=>r.json()).then(d=>{
          setArtistAlbums((d.tracks||[]).filter((al:Track)=>al.isAlbum).map((al:Track)=>({id:al.id,title:al.title,artist:al.artist,cover:al.cover,tracks:[],permalink:al.permalink||'',trackCount:al.trackCount||0,plays:al.plays||0})));
        }).catch(()=>{});
      }
    }catch{
      setArtistPage({id:'',name,username:'',avatar,banner:'',followers,permalink,tracks:[],albums:[],latestRelease:null});
    }
    setArtistLoading(false);
  };

  const loadArtistTracks=async(userId:string,_offset:number,reset=false)=>{
    if(!userId||artistTracksLoading)return;
    setArtistTracksLoading(true);
    try{
      const cursor=reset?null:artistTracksCursor.current;
      const params=new URLSearchParams({userId});
      if(cursor)params.set('cursor',cursor);
      const r=await fetch(`${W}/artist/tracks?${params}`);
      const d=await r.json();
      const newT:Track[]=d.tracks||[];
      artistTracksCursor.current=d.nextCursor||null;
      if(reset){setArtistTracks(newT);}
      else{setArtistTracks(prev=>{const existing=new Set(prev.map(t=>t.id));return[...prev,...newT.filter(t=>!existing.has(t.id))];});}
      setArtistTracksHasMore(d.hasMore||false);
    }catch{}
    setArtistTracksLoading(false);
  };

  const openAlbum=async(id:string,title:string,artist:string,cover:string)=>{
    setAlbumLoading(true);
    if(screen!=='artist'&&screen!=='album')prevScreen.current=screen as typeof prevScreen.current;
    setScreen('album');setAlbumPage(null);
    try{
      const r=await fetch(`${W}/album?id=${id}`);const d=await r.json();
      if(d.album){const tracks=(d.tracks||[]).map((tr:Track)=>({...tr,albumId:id,albumTitle:d.album.title||title}));setAlbumPage({id:d.album.id,title:d.album.title||title,artist:d.album.artist||artist,cover:d.album.cover||cover,tracks,permalink:d.album.permalink||''});}
      else setAlbumPage({id,title,artist,cover,tracks:[],permalink:''});
    }catch{setAlbumPage({id,title,artist,cover,tracks:[],permalink:''});}
    setAlbumLoading(false);
  };

  const isFavA=(a:ArtistInfo)=>favArtists.some(x=>x.id===a.id||x.name===a.name);
  const toggleFavA=(a:ArtistInfo)=>{setFavArtists(prev=>{const has=prev.some(x=>x.id===a.id||x.name===a.name);const n=has?prev.filter(x=>x.id!==a.id&&x.name!==a.name):[{...a,latestRelease:null,tracks:[],albums:[]},...prev];try{localStorage.setItem('fa47',JSON.stringify(n));}catch{}triggerSync(liked,playlists,history,volume,n,favAlbums,blockedArtists,bgCover);return n;});};
  const isFavAl=(id:string)=>favAlbums.some(x=>x.id===id);
  const toggleFavAl=(al:AlbumInfo)=>{setFavAlbums(prev=>{const has=prev.some(x=>x.id===al.id);const n=has?prev.filter(x=>x.id!==al.id):[{...al,tracks:[]},...prev];try{localStorage.setItem('fal47',JSON.stringify(n));}catch{}triggerSync(liked,playlists,history,volume,favArtists,n,blockedArtists,bgCover);return n;});};
  const createPl=()=>{if(!newPlName.trim())return;const pl:Playlist={id:Date.now().toString(),name:newPlName.trim(),tracks:[],repeat:false};setPlaylists(prev=>{const n=[...prev,pl];try{localStorage.setItem('p47',JSON.stringify(n));}catch{}return n;});setNewPlName('');setShowNewPl(false);};
  const addToPl2=(plId:string,track:Track)=>{setPlaylists(prev=>{const n=prev.map(pl=>pl.id===plId&&!pl.tracks.some(t=>t.id===track.id)?{...pl,tracks:[...pl.tracks,track]}:pl);try{localStorage.setItem('p47',JSON.stringify(n));}catch{}return n;});setAddToPl(null);};
  const playPl=(pl:Playlist)=>{if(!pl.tracks.length)return;playTrack(pl.tracks[0]);setQueue(pl.tracks.slice(1));};
  const shufflePl=(pl:Playlist)=>{const sh=[...pl.tracks].sort(()=>Math.random()-.5);if(!sh.length)return;playTrack(sh[0]);setQueue(sh.slice(1));};
  const moveQ=(from:number,to:number)=>setQueue(prev=>{const n=[...prev];const[item]=n.splice(from,1);n.splice(to,0,item);return n;});
  const share=(track:Track)=>{navigator.clipboard?.writeText(`${track.artist} — ${track.title}`).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});};
  const shareTrack=(track:Track)=>{
    const deepLink=`https://t.me/fortym7bot?startapp=track-${track.id}`;
    const text=`${track.title} — ${track.artist} 🎵\nСлушай в Forty7`;
    const tgApp=window.Telegram?.WebApp;
    if(tgApp){
      if(typeof tgApp.shareUrl==='function'){tgApp.shareUrl(deepLink,text);return;}
      if(typeof tgApp.openTelegramLink==='function'){tgApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(text)}`);return;}
      if(typeof tgApp.openLink==='function'){tgApp.openLink(`https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(text)}`);return;}
    }
    window.open(`https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(text)}`,'_blank');
  };
  const chgLang=(l:'ru'|'en'|'uk'|'kk'|'pl'|'tr')=>{setLang(l);try{localStorage.setItem('lg47',l);}catch{}};

  const seekSP=useSlider(progress/100,v=>{const a=audio.current;if(a?.duration)a.currentTime=v*a.duration;});
  const volSP=useSlider(volume,v=>setVol(v));

  const tap:React.CSSProperties={outline:'none',WebkitTapHighlightColor:'transparent' as any};

  const HBtn=({track,sz=19}:{track:Track;sz?:number})=>(
    <button className="like-btn" onPointerDown={e=>{e.stopPropagation();toggleLike(track);}} style={{background:'none',border:'none',cursor:'pointer',padding:4,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',...tap}}>
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill={isLk(track.id)?ACC:'none'} stroke={isLk(track.id)?ACC:'#666'} strokeWidth="2" strokeLinecap="round" style={{transition:'fill 0.2s ease,stroke 0.2s ease'}}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
    </button>
  );

  const PP=({sz,col=BG}:{sz:'sm'|'lg';col?:string})=>{
    const h=sz==='lg'?18:13,w=sz==='lg'?4:3;
    return playing?<div style={{display:'flex',gap:sz==='lg'?4:3}}><div style={{width:w,height:h,background:col,borderRadius:2}}/><div style={{width:w,height:h,background:col,borderRadius:2}}/></div>:<div style={{width:0,height:0,borderStyle:'solid',borderWidth:sz==='lg'?'9px 0 9px 16px':'6px 0 6px 10px',borderColor:`transparent transparent transparent ${col}`,marginLeft:sz==='lg'?3:2}}/>;
  };

  const SL=({text}:{text:string})=>(
    <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:'uppercase',letterSpacing:0.8,padding:'0 16px',marginBottom:8}}>{text}</div>
  );

  const BackBtn=({overlay=false}:{overlay?:boolean})=>(
    <button
      onPointerDown={e=>{e.stopPropagation();setScreen(prevScreen.current);}}
      style={{background:overlay?'rgba(0,0,0,0.5)':'none',border:'none',cursor:'pointer',padding:overlay?'7px 13px':'6px 10px 6px 0',borderRadius:overlay?20:0,display:'flex',alignItems:'center',gap:5,backdropFilter:overlay?'blur(8px)':'none',...tap,position:overlay?'absolute':'relative',top:overlay?52:undefined,left:overlay?14:undefined,zIndex:overlay?20:undefined,transition:'opacity 0.2s ease'}}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={overlay?'#ddd':'#999'} strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      <span style={{fontSize:12,color:overlay?'#ddd':'#999',fontWeight:500}}>{t('backToSearch')}</span>
    </button>
  );

  const TRow=({track,num,onArtistClick,showBlockBtn,onSwipeLeft}:{track:Track;num?:number;onArtistClick?:(n:string,c:string)=>void;showBlockBtn?:boolean;onSwipeLeft?:()=>void})=>{
    const active=current?.id===track.id;const mOpen=menuId===track.id;
    const ps=useRef({sx:0,sy:0,st:0,dx:0,captured:false,fired:false,menuWasOpen:false,pressed:false,isTouchDown:false});
    const[swipeDx,setSwipeDx]=useState(0);
    const rowRef=useRef<HTMLDivElement>(null);

    const onRowDown=(e:React.PointerEvent)=>{
      const isTouch=e.pointerType==='touch'||e.pointerType==='pen';
      ps.current={sx:e.clientX,sy:e.clientY,st:Date.now(),dx:0,captured:false,fired:false,menuWasOpen:mOpen,pressed:true,isTouchDown:isTouch};
      if(mOpen)setMenuId(null);
    };
    const onRowMove=(e:React.PointerEvent)=>{
      const s=ps.current;
      if(!s.pressed||!s.isTouchDown)return;
      const dx=e.clientX-s.sx;
      const dy=Math.abs(e.clientY-s.sy);
      if(dy>18&&Math.abs(dx)<18){setSwipeDx(0);return;}
      if(Math.abs(dx)>8&&!s.captured){
        try{rowRef.current?.setPointerCapture(e.pointerId);}catch{}
        s.captured=true;e.preventDefault();
      }
      if(s.captured){s.dx=dx;setSwipeDx(dx);e.preventDefault();}
    };
    const onRowUp=(e:React.PointerEvent)=>{
      const s=ps.current;
      const dx=s.dx;const dt=Date.now()-s.st;
      ps.current.pressed=false;ps.current.isTouchDown=false;
      setSwipeDx(0);
      if(s.captured){
        if(dx>55&&!track.isArtist&&!track.isAlbum){toggleQ(track);s.fired=true;}
        else if(dx<-55&&onSwipeLeft){onSwipeLeft();s.fired=true;}
        return;
      }
      if(!s.menuWasOpen&&!s.fired&&dt<400){playTrack(track);}
    };
    const onRowCancel=()=>{ps.current.pressed=false;ps.current.isTouchDown=false;setSwipeDx(0);};

    const swipeDir=swipeDx>8?'right':swipeDx<-8?'left':'';
    const menuItems=[
      {icon:<svg width="14" height="14" viewBox="0 0 24 24" fill={isLk(track.id)?ACC:'none'} stroke={isLk(track.id)?ACC:'#aaa'} strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,label:isLk(track.id)?(lang==='ru'?'Убрать лайк':'Unlike'):(lang==='ru'?'Лайк':'Like'),fn:(e:React.MouseEvent)=>{toggleLike(track,e);setMenuId(null);}},
      {icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,label:t('addToPlaylist'),fn:()=>{setAddToPl(track);setMenuId(null);}},
      {icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,label:lang==='ru'?'К артисту':'Go to artist',fn:()=>{openArtist('',track.artist,'',0);setMenuId(null);}},
      ...(track.albumId?[{icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,label:t('goToAlbum'),fn:()=>{openAlbum(track.albumId!,track.albumTitle||'',track.artist,track.cover);setMenuId(null);}}]:[]),
      ...(showBlockBtn?[{icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d06060" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,label:t('blockArtist'),fn:()=>{blockArtist(track.artist);setMenuId(null);}}]:[]),
    ];
    return(
      <div style={{position:'relative'}}>
        {swipeDir==='right'&&!track.isArtist&&!track.isAlbum&&(
          <div style={{position:'absolute',left:0,top:0,bottom:0,width:Math.min(Math.abs(swipeDx),80),background:inQ(track.id)?'rgba(239,191,127,0.22)':'rgba(239,191,127,0.13)',borderRadius:'12px 0 0 12px',display:'flex',alignItems:'center',paddingLeft:12,pointerEvents:'none'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2.2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1.3" fill={ACC}/><circle cx="3" cy="12" r="1.3" fill={ACC}/><circle cx="3" cy="18" r="1.3" fill={ACC}/></svg>
          </div>
        )}
        {swipeDir==='left'&&onSwipeLeft&&(
          <div style={{position:'absolute',right:0,top:0,bottom:0,width:Math.min(Math.abs(swipeDx),80),background:'rgba(200,60,60,0.15)',borderRadius:'0 12px 12px 0',display:'flex',alignItems:'center',justifyContent:'flex-end',paddingRight:12,pointerEvents:'none'}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d06060" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </div>
        )}
        <div
          ref={rowRef}
          className="track-row"
          onPointerDown={onRowDown}
          onPointerMove={onRowMove}
          onPointerUp={onRowUp}
          onPointerCancel={onRowCancel}
          style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:12,cursor:'pointer',marginBottom:1,background:active?ACC_DIM:'transparent',transform:swipeDx!==0?`translateX(${Math.max(-70,Math.min(70,swipeDx))}px)`:'none',transition:swipeDx===0?'transform 0.18s ease,background 0.15s ease':'none',touchAction:'pan-y',userSelect:'none'}}>
          {num!==undefined&&<div style={{fontSize:11,color:active?ACC:TEXT_MUTED,width:18,flexShrink:0,textAlign:'right',transition:'color 0.2s ease'}}>{num}</div>}
          <div style={{display:'flex',alignItems:'center',gap:10,flex:1,minWidth:0,...tap}}>
            <div style={{position:'relative',flexShrink:0}}>
              <Img src={track.cover} size={44} radius={track.isArtist?22:8}/>
              {active&&!track.isArtist&&!track.isAlbum&&<div style={{position:'absolute',inset:0,borderRadius:8,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>{playing?'⏸':'▶'}</div>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:500,color:active?ACC:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',transition:'color 0.2s ease'}}>{track.title}</div>
              <div style={{display:'flex',alignItems:'center',gap:4,marginTop:2}}>
                {!track.isArtist&&!track.isAlbum&&onArtistClick
                  ?<button onClick={e=>{e.stopPropagation();onArtistClick(track.artist,track.cover);}} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontSize:11,color:TEXT_SEC,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:130,textAlign:'left',...tap}}>{track.artist}</button>
                  :<span style={{fontSize:11,color:track.isArtist?ACC:TEXT_SEC,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:130}}>{track.isAlbum?`${track.trackCount||0} треков`:track.artist}</span>
                }
                {!track.isArtist&&!track.isAlbum&&track.plays>0&&<span style={{fontSize:10,color:TEXT_MUTED,flexShrink:0}}>· {fmtP(track.plays)}</span>}
              </div>
            </div>
          </div>
          {!track.isArtist&&!track.isAlbum&&(
            <div onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} style={{display:'flex',alignItems:'center',gap:1,flexShrink:0}}>
              <button onPointerDown={e=>{e.stopPropagation();addQ(track,e);}} style={{background:'none',border:'none',cursor:'pointer',padding:'6px 4px',transition:'transform 0.15s ease',...tap}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={inQ(track.id)?ACC:'#5a5a5a'} strokeWidth="2" strokeLinecap="round" style={{transition:'stroke 0.2s ease'}}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1.2" fill={inQ(track.id)?ACC:'#5a5a5a'}/><circle cx="3" cy="12" r="1.2" fill={inQ(track.id)?ACC:'#5a5a5a'}/><circle cx="3" cy="18" r="1.2" fill={inQ(track.id)?ACC:'#5a5a5a'}/></svg>
              </button>
              <button onPointerDown={e=>{e.stopPropagation();setMenuId(mOpen?null:track.id);}} style={{background:'none',border:'none',cursor:'pointer',padding:'6px 4px',...tap}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill={ACC} stroke="none"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
              </button>
              <div style={{fontSize:10,color:TEXT_SEC,flexShrink:0,minWidth:28,textAlign:'right'}}>{track.duration}</div>
            </div>
          )}
          {(track.isArtist||track.isAlbum)&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#5a5a5a" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>}
        </div>
        {mOpen&&(
          <div className="context-menu" onPointerDown={e=>e.stopPropagation()} style={{position:'absolute',right:8,top:'calc(100% + 2px)',background:'#222',border:'1px solid #2a2a2a',borderRadius:12,zIndex:50,minWidth:174,boxShadow:'0 12px 32px rgba(0,0,0,0.8)',overflow:'hidden'}}>
            {menuItems.map((item,i)=>(
              <button key={i} onPointerDown={e=>{e.stopPropagation();item.fn(e as any);}} style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'11px 12px',background:'none',border:'none',cursor:'pointer',color:i===menuItems.length-1&&showBlockBtn?'#d06060':'#ddd',fontSize:12,borderBottom:i<menuItems.length-1?'1px solid #2a2a2a':'none',textAlign:'left' as const,transition:'background 0.15s ease',...tap}}>
                {item.icon}{item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const PlModal=({track}:{track:Track})=>(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'flex-end',zIndex:300,animation:'fadeIn 0.2s ease'}} onPointerDown={()=>setAddToPl(null)}>
      <div className="modal-sheet" style={{background:'#1a1a1a',width:'100%',borderRadius:'18px 18px 0 0',padding:'18px 16px 36px'}} onPointerDown={e=>e.stopPropagation()}>
        <div style={{fontSize:14,fontWeight:600,color:TEXT_PRIMARY,marginBottom:12}}>{t('addToPlaylist')}</div>
        {playlists.length===0?<div style={{color:TEXT_MUTED,fontSize:12,textAlign:'center',padding:'16px 0'}}>{t('noPlaylists')}</div>
          :playlists.map(pl=><div key={pl.id} onPointerDown={()=>addToPl2(pl.id,track)} style={{padding:'11px 12px',borderRadius:9,background:BG3,marginBottom:5,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',transition:'background 0.15s ease'}}><span style={{color:'#d0d0d0',fontSize:13}}>{pl.name}</span><span style={{color:TEXT_MUTED,fontSize:11}}>{pl.tracks.length}</span></div>)
        }
        <button onPointerDown={()=>setAddToPl(null)} style={{width:'100%',padding:'10px',background:BG3,border:'none',borderRadius:9,color:TEXT_SEC,fontSize:12,cursor:'pointer',marginTop:4,...tap}}>{t('cancel')}</button>
      </div>
    </div>
  );

  const NAV=[
    {id:'home',icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#606060'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{transition:'stroke 0.2s ease'}}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,lbl:()=>t('home')},
    {id:'search',icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#606060'} strokeWidth="1.8" strokeLinecap="round" style={{transition:'stroke 0.2s ease'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,lbl:()=>t('search')},
    {id:'library',icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#606060'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{transition:'stroke 0.2s ease'}}><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,lbl:()=>t('library')},
    {id:'trending',icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#606060'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{transition:'stroke 0.2s ease'}}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,lbl:()=>t('trending')},
  ];

  if(fullPlayer&&current)return(
    <div style={{background:`linear-gradient(160deg, ${fpColors.dark} 0%, ${fpColors.mid} 40%, #0e0e0e 100%)`,height:'100vh',width:'100%',display:'flex',flexDirection:'column',alignItems:'center',padding:'0 22px',fontFamily:"-apple-system,'SF Pro Display',sans-serif",boxSizing:'border-box',overflow:'hidden',transition:'background 0.8s ease',animation:'fadeIn 0.3s ease'}}>
      <audio ref={audio}/>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
        @keyframes popIn{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,191,127,0.4)}50%{box-shadow:0 0 14px 4px rgba(239,191,127,0.25)}}
        button:focus{outline:none!important}
        *{-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{display:none}
        .nav-item{transition:transform 0.15s cubic-bezier(0.34,1.56,0.64,1),opacity 0.15s ease}
        .nav-item:active{transform:scale(0.82)}
        .active-nav{animation:popIn 0.2s cubic-bezier(0.34,1.56,0.64,1)}
        .track-row{transition:background 0.15s ease,transform 0.12s ease}
        .track-row:active{transform:scale(0.985)}
        .play-btn{transition:transform 0.15s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.2s ease}
        .play-btn:active{transform:scale(0.88)}
        .like-btn{transition:transform 0.15s cubic-bezier(0.34,1.56,0.64,1)}
        .like-btn:active{transform:scale(1.28)}
        .mini-cover{transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1)}
        .mini-cover:active{transform:scale(0.93)}
        .recent-card{transition:transform 0.15s cubic-bezier(0.34,1.56,0.64,1),opacity 0.15s ease}
        .recent-card:active{transform:scale(0.94);opacity:0.8}
        .album-card{transition:transform 0.18s cubic-bezier(0.34,1.56,0.64,1),opacity 0.15s ease}
        .album-card:active{transform:scale(0.93);opacity:0.85}
        .modal-sheet{animation:slideUp 0.32s cubic-bezier(0.25,0.46,0.45,0.94) both}
        .settings-sheet{animation:slideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both}
        .mini-player{animation:slideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both}
        .context-menu{animation:scaleIn 0.18s cubic-bezier(0.25,0.46,0.45,0.94) both;transform-origin:top right}
        .screen-fade{animation:fadeIn 0.22s ease both}
        .screen-slide-up{animation:slideUp 0.28s cubic-bezier(0.25,0.46,0.45,0.94) both}
        .screen-scale{animation:scaleIn 0.25s cubic-bezier(0.25,0.46,0.45,0.94) both}
        .follow-btn{transition:background 0.2s ease,color 0.2s ease,border-color 0.2s ease,transform 0.15s cubic-bezier(0.34,1.56,0.64,1)}
        .follow-btn:active{transform:scale(0.93)}
        .prev-next-btn{transition:transform 0.15s cubic-bezier(0.34,1.56,0.64,1),opacity 0.2s ease}
        .prev-next-btn:active{transform:scale(0.82)}
        .tab-btn{transition:background 0.18s ease,color 0.18s ease,transform 0.15s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.18s ease}
        .tab-btn:active{transform:scale(0.93)}
        .tab-btn.tab-active{box-shadow:0 2px 12px rgba(239,191,127,0.25)}
        .playlist-tracks{animation:slideDown 0.22s cubic-bezier(0.25,0.46,0.45,0.94) both}
        .search-input:focus{border-color:rgba(239,191,127,0.5)!important;box-shadow:0 0 0 3px rgba(239,191,127,0.08)}
        .tcard{transition:transform 0.15s ease,background 0.15s ease;}
        .tcard:active{transform:scale(0.975);}
        .tplay{transition:box-shadow 0.2s,transform 0.15s;}
        .tplay:active{transform:scale(0.88);}
      `}</style>
      {showQueue&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.82)',zIndex:200,display:'flex',alignItems:'flex-end',animation:'fadeIn 0.2s ease'}} onPointerDown={()=>setShowQueue(false)}>
          <div className="modal-sheet" style={{background:'#242424',width:'100%',borderRadius:'18px 18px 0 0',padding:'16px 16px 32px',maxHeight:'68vh',overflowY:'auto'}} onPointerDown={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div><div style={{fontSize:14,fontWeight:600,color:TEXT_PRIMARY}}>{t('queue')}</div><div style={{fontSize:10,color:TEXT_MUTED,marginTop:1}}>{queue.length} {lang==='ru'?'треков':'tracks'}</div></div>
              <button onPointerDown={()=>setQueue([])} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:TEXT_SEC,...tap}}>{lang==='ru'?'Очистить':'Clear'}</button>
            </div>
            {queue.length===0?<div style={{color:TEXT_MUTED,fontSize:12,textAlign:'center',padding:'20px 0'}}>{lang==='ru'?'Пусто':'Empty'}</div>
              :queue.map((tr,i)=>(
                <div key={tr.id+i} draggable onDragStart={()=>setDragIdx(i)} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(dragIdx!==null&&dragIdx!==i)moveQ(dragIdx,i);setDragIdx(null);}} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #2a2a2a',cursor:'grab',transition:'background 0.15s ease'}}>
                  <div style={{color:'#444',fontSize:15,padding:'0 3px'}}>⠿</div>
                  <Img src={tr.cover} size={36} radius={6}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{tr.title}</div>
                    <div style={{fontSize:10,color:TEXT_SEC,marginTop:1}}>{tr.artist}</div>
                  </div>
                  <button onPointerDown={()=>{playDirect(tr);setQueue(prev=>prev.filter((_,j)=>j!==i));setShowQueue(false);}} style={{background:'none',border:'none',cursor:'pointer',padding:3,...tap}}>
                    <div style={{width:0,height:0,borderStyle:'solid',borderWidth:'5px 0 5px 9px',borderColor:`transparent transparent transparent ${ACC}`,marginLeft:1}}/>
                  </button>
                  <button onPointerDown={()=>rmQ(i)} style={{background:'none',border:'none',cursor:'pointer',color:TEXT_SEC,fontSize:16,padding:'0 3px',lineHeight:1,...tap}}>×</button>
                </div>
              ))
            }
          </div>
        </div>
      )}
      <div style={{width:'100%',display:'grid',gridTemplateColumns:'44px 1fr 44px',alignItems:'center',paddingTop:16,paddingBottom:6,flexShrink:0}}>
        <button onPointerDown={()=>setFullPlayer(false)} style={{background:'none',border:'none',cursor:'pointer',padding:'10px 4px 10px 0',display:'flex',alignItems:'center',gap:4,transition:'opacity 0.2s ease',...tap}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:11,color:'#888'}}>{lang==='ru'?'Назад':'Back'}</span>
        </button>
        <span style={{fontSize:10,color:TEXT_MUTED,letterSpacing:1.5,textTransform:'uppercase',textAlign:'center'}}>{t('nowPlaying')}</span>
        <button onPointerDown={()=>setShowQueue(true)} style={{background:'none',border:'none',cursor:'pointer',padding:'8px 0 8px 8px',position:'relative',display:'flex',justifyContent:'flex-end',transition:'opacity 0.2s ease',...tap}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={queue.length>0?ACC:'#666'} strokeWidth="2" strokeLinecap="round" style={{transition:'stroke 0.2s ease'}}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          {queue.length>0&&<span style={{position:'absolute',top:4,right:0,background:ACC,color:BG,fontSize:8,fontWeight:700,borderRadius:'50%',width:12,height:12,display:'flex',alignItems:'center',justifyContent:'center',animation:'popIn 0.2s ease'}}>{queue.length}</span>}
        </button>
      </div>
      <div style={{width:'100%',display:'flex',justifyContent:'center',flexShrink:0,marginBottom:14}}>
        <div
          className="full-player-cover"
          style={{borderRadius:16,overflow:'hidden',boxShadow:'0 16px 48px rgba(0,0,0,0.6)',position:'relative',cursor:'pointer',transition:'transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.3s ease'}}
          onClick={e=>{
            const rect=(e.currentTarget as HTMLElement).getBoundingClientRect();
            const margin=rect.width*0.22;
            const cx=e.clientX-rect.left;const cy=e.clientY-rect.top;
            const inCenter=cx>margin&&cx<rect.width-margin&&cy>margin&&cy<rect.height-margin;
            if(inCenter)setFullPlayer(false);
          }}
        >
          <Img src={current.cover} size={Math.min(window.innerWidth-64,230)} radius={0}/>
        </div>
      </div>
      <div style={{width:'100%',flexShrink:0,marginBottom:10,animation:'slideUp 0.35s cubic-bezier(0.25,0.46,0.45,0.94) 0.05s both'}}>
        <div style={{fontSize:17,fontWeight:600,color:TEXT_PRIMARY,lineHeight:1.3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginBottom:4}}>{current.title}</div>
        <button onClick={()=>{setFullPlayer(false);openArtist(current.permalink||'',current.artist,current.cover,0);}} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'block',textAlign:'left' as const,...tap}}>
          <span style={{fontSize:13,color:ACC}}>{current.artist}</span>
        </button>
        {current.plays>0&&<div style={{fontSize:10,color:'rgba(240,240,240,0.5)',marginTop:2}}>{fmtP(current.plays)} {t('plays')}</div>}
      </div>
      <div style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0,marginBottom:8,animation:'slideUp 0.35s cubic-bezier(0.25,0.46,0.45,0.94) 0.1s both'}}>
        <div style={{display:'flex',alignItems:'center'}}>
          <HBtn track={current} sz={22}/>
          <button onPointerDown={()=>setAddToPl(current)} style={{background:'none',border:'none',cursor:'pointer',padding:5,transition:'opacity 0.2s ease',...tap}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>
        <div style={{display:'flex',alignItems:'center'}}>
          <button onPointerDown={()=>setLoop(!loop)} style={{background:'none',border:'none',cursor:'pointer',padding:5,transition:'opacity 0.2s ease',...tap}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={loop?ACC:'#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{transition:'stroke 0.2s ease'}}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
          </button>
          <button onPointerDown={()=>shareTrack(current)} style={{background:'none',border:'none',cursor:'pointer',padding:5,transition:'opacity 0.2s ease',...tap}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
      </div>
      {copied&&<div style={{fontSize:10,color:ACC,alignSelf:'flex-start',marginBottom:4,marginTop:-4,animation:'fadeIn 0.2s ease'}}>{t('copied')}</div>}
      <div style={{width:'100%',flexShrink:0,marginBottom:2,animation:'slideUp 0.35s cubic-bezier(0.25,0.46,0.45,0.94) 0.15s both'}}>
        <SliderTrack sp={seekSP} h={3}/>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'rgba(240,240,240,0.5)',marginTop:4}}><span>{curTime}</span><span>{current.duration}</span></div>
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:28,flexShrink:0,marginBottom:12,animation:'slideUp 0.35s cubic-bezier(0.25,0.46,0.45,0.94) 0.18s both'}}>
        <button className="prev-next-btn" onPointerDown={playPrev} style={{background:'none',border:'none',cursor:'pointer',padding:4,opacity:playHistory.length>0?1:0.35,...tap}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
        </button>
        <button className="play-btn" onPointerDown={togglePlay} style={{width:58,height:58,borderRadius:'50%',background:ACC,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,boxShadow:`0 4px 20px ${ACC}55`,...tap}}><PP sz="lg"/></button>
        <button className="prev-next-btn" onPointerDown={playNext} style={{background:'none',border:'none',cursor:'pointer',padding:4,opacity:(queue.length>0||recs.length>0||history.length>0)?1:0.35,...tap}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
        </button>
      </div>
      <div style={{width:'100%',display:'flex',alignItems:'center',gap:10,flexShrink:0,animation:'slideUp 0.35s cubic-bezier(0.25,0.46,0.45,0.94) 0.22s both'}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>
        <SliderTrack sp={volSP} h={3}/>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>
      </div>
      {addToPl&&<PlModal track={addToPl}/>}
    </div>
  );

  return(
    <div onPointerDown={()=>menuId&&setMenuId(null)} style={{background:BG,minHeight:'100vh',width:'100%',fontFamily:"-apple-system,'SF Pro Display',sans-serif",position:'relative',boxSizing:'border-box'}}>
      <audio ref={audio}/>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
        @keyframes popIn{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,191,127,0.4)}50%{box-shadow:0 0 14px 4px rgba(239,191,127,0.25)}}
        button:focus{outline:none!important}
        *{-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{display:none}
        .nav-item{transition:transform 0.15s cubic-bezier(0.34,1.56,0.64,1),opacity 0.15s ease}
        .nav-item:active{transform:scale(0.82)}
        .active-nav{animation:popIn 0.2s cubic-bezier(0.34,1.56,0.64,1)}
        .track-row{transition:background 0.15s ease,transform 0.12s ease}
        .track-row:active{transform:scale(0.985)}
        .play-btn{transition:transform 0.15s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.2s ease}
        .play-btn:active{transform:scale(0.88)}
        .like-btn{transition:transform 0.15s cubic-bezier(0.34,1.56,0.64,1)}
        .like-btn:active{transform:scale(1.28)}
        .mini-cover{transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1)}
        .mini-cover:active{transform:scale(0.93)}
        .recent-card{transition:transform 0.15s cubic-bezier(0.34,1.56,0.64,1),opacity 0.15s ease}
        .recent-card:active{transform:scale(0.94);opacity:0.8}
        .album-card{transition:transform 0.18s cubic-bezier(0.34,1.56,0.64,1),opacity 0.15s ease}
        .album-card:active{transform:scale(0.93);opacity:0.85}
        .modal-sheet{animation:slideUp 0.32s cubic-bezier(0.25,0.46,0.45,0.94) both}
        .settings-sheet{animation:slideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both}
        .mini-player{animation:slideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both}
        .context-menu{animation:scaleIn 0.18s cubic-bezier(0.25,0.46,0.45,0.94) both;transform-origin:top right}
        .screen-fade{animation:fadeIn 0.22s ease both}
        .screen-slide-up{animation:slideUp 0.28s cubic-bezier(0.25,0.46,0.45,0.94) both}
        .screen-scale{animation:scaleIn 0.25s cubic-bezier(0.25,0.46,0.45,0.94) both}
        .follow-btn{transition:background 0.2s ease,color 0.2s ease,border-color 0.2s ease,transform 0.15s cubic-bezier(0.34,1.56,0.64,1)}
        .follow-btn:active{transform:scale(0.93)}
        .prev-next-btn{transition:transform 0.15s cubic-bezier(0.34,1.56,0.64,1),opacity 0.2s ease}
        .prev-next-btn:active{transform:scale(0.82)}
        .tab-btn{transition:background 0.18s ease,color 0.18s ease,transform 0.15s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.18s ease}
        .tab-btn:active{transform:scale(0.93)}
        .tab-btn.tab-active{box-shadow:0 2px 12px rgba(239,191,127,0.25)}
        .playlist-tracks{animation:slideDown 0.22s cubic-bezier(0.25,0.46,0.45,0.94) both}
        .search-input{transition:border-color 0.2s ease,box-shadow 0.2s ease}
        .search-input:focus{border-color:rgba(239,191,127,0.5)!important;box-shadow:0 0 0 3px rgba(239,191,127,0.08)}
        .tcard{transition:transform 0.15s ease,background 0.15s ease;}
        .tcard:active{transform:scale(0.975);}
        .tplay{transition:box-shadow 0.2s,transform 0.15s;}
        .tplay:active{transform:scale(0.88);}
        .full-player-cover{transition:transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.3s ease}
        .full-player-cover:active{transform:scale(0.97)}
      `}</style>
      <div style={{paddingBottom:current?NAV_H+110+8:NAV_H+6,minHeight:'100vh'}}>

        {/* ── ARTIST ── */}
        {screen==='artist'&&(
          <div className="screen-scale" style={{position:'relative'}}>
            {artistLoading
              ? <>
                  <div style={{width:'100%',height:140,background:BG3}}/>
                  <div style={{position:'absolute',top:44,left:14}}><BackBtn overlay={true}/></div>
                  <Spinner/>
                </>
              : artistPage&&(
                <>
                  <div style={{width:'100%',height:140,background:BG3,position:'relative',overflow:'hidden'}}>
                    {artistPage.banner
                      ? <img src={artistPage.banner} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} onError={()=>{}}/>
                      : <div style={{width:'100%',height:'100%',background:`linear-gradient(135deg,#2a1f0e,#1a1410,${BG})`}}/>
                    }
                    <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0.05) 0%,transparent 35%,rgba(14,14,14,0.7) 75%,#0e0e0e 100%)'}}/>
                    <BackBtn overlay={true}/>
                  </div>
                  <div style={{padding:'0 16px 12px',display:'flex',alignItems:'flex-end',gap:12,marginTop:-32,position:'relative',zIndex:1,animation:'slideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both'}}>
                    <div style={{flexShrink:0,borderRadius:'50%',overflow:'hidden',border:`3px solid #0e0e0e`}}>
                      <Img src={artistPage.avatar} size={68} radius={34}/>
                    </div>
                    <div style={{flex:1,minWidth:0,paddingBottom:2}}>
                      <div style={{fontSize:18,fontWeight:700,color:TEXT_PRIMARY,letterSpacing:-0.3}}>{artistPage.name}</div>
                      {artistPage.username&&<div style={{fontSize:11,color:TEXT_SEC,marginTop:1}}>@{artistPage.username}</div>}
                      {artistPage.followers>0&&<div style={{fontSize:11,color:TEXT_SEC,marginTop:1}}>{fmtP(artistPage.followers)} {lang==='ru'?'подписчиков':'followers'}</div>}
                    </div>
                    <button className="follow-btn" onPointerDown={()=>artistPage&&toggleFavA(artistPage)}
                      style={{flexShrink:0,padding:'7px 14px',borderRadius:18,border:`1px solid ${isFavA(artistPage)?ACC:'#333'}`,background:isFavA(artistPage)?ACC_DIM:'transparent',color:isFavA(artistPage)?ACC:'#888',fontSize:12,cursor:'pointer',fontWeight:500,marginBottom:2,...tap}}>
                      {isFavA(artistPage)?t('removeFav'):t('addFav')}
                    </button>
                  </div>

                  {artistPage.latestRelease&&(
                    <div style={{padding:'0 16px 12px',animation:'slideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94) 0.05s both'}}>
                      <SL text={t('latestRelease')}/>
                      <div
                        onPointerDown={()=>{
                          const lr=artistPage.latestRelease!;
                          if(lr.isAlbum)openAlbum(lr.id,lr.title,lr.artist,lr.cover);
                          else playTrack(lr);
                        }}
                        style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:12,background:BG2,cursor:'pointer',border:`1px solid #252525`,transition:'background 0.15s ease',...tap}}>
                        <div style={{position:'relative',flexShrink:0}}>
                          <Img src={artistPage.latestRelease.cover} size={56} radius={10}/>
                          {artistPage.latestRelease.isAlbum&&<div style={{position:'absolute',bottom:3,right:3,background:'rgba(0,0,0,0.7)',borderRadius:4,padding:'1px 4px',fontSize:8,color:'#aaa'}}>LP</div>}
                          {!artistPage.latestRelease.isAlbum&&current?.id===artistPage.latestRelease.id&&<div style={{position:'absolute',inset:0,borderRadius:10,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>{playing?'⏸':'▶'}</div>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:11,color:TEXT_MUTED,marginBottom:3,textTransform:'uppercase' as const,letterSpacing:0.7}}>{artistPage.latestRelease.isAlbum?(lang==='ru'?'Альбом':'Album'):(lang==='ru'?'Трек':'Track')}</div>
                          <div style={{fontSize:14,fontWeight:600,color:current?.id===artistPage.latestRelease.id?ACC:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{artistPage.latestRelease.title}</div>
                          {artistPage.latestRelease.isAlbum
                            ?<div style={{fontSize:11,color:TEXT_SEC,marginTop:3}}>{artistPage.latestRelease.trackCount||0} {lang==='ru'?'треков':'tracks'}</div>
                            :<div style={{fontSize:11,color:TEXT_SEC,marginTop:3}}>{artistPage.latestRelease.duration}{artistPage.latestRelease.plays>0?` · ${fmtP(artistPage.latestRelease.plays)} ${t('plays')}`:''}</div>
                          }
                        </div>
                        {!artistPage.latestRelease.isAlbum&&<HBtn track={artistPage.latestRelease} sz={18}/>}
                        {artistPage.latestRelease.isAlbum&&<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5a5a5a" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>}
                      </div>
                    </div>
                  )}

                  {artistPage.tracks.length>0&&(
                    <div style={{marginBottom:12,animation:'slideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94) 0.1s both'}}>
                      <SL text={t('popular')}/>
                      <div style={{padding:'0 4px'}}>
                        {artistPage.tracks.slice(0,5).map((tr,i)=><TRow key={tr.id} track={tr} num={i+1} onArtistClick={(n,c)=>openArtist('',n,c,0)}/>)}
                      </div>
                    </div>
                  )}

                  <div style={{padding:'0 16px 16px',animation:'slideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94) 0.15s both'}}>
                    <SL text={t('discography')}/>
                    <div style={{display:'flex',gap:6,marginBottom:12}}>
                      {(['albums','tracks'] as const).map(tab=>(
                        <button key={tab} className={`tab-btn${artistTab===tab?' tab-active':''}`} onPointerDown={()=>{setArtistTab(tab);if(tab==='tracks'&&artistTracks.length===0&&artistUserId.current)loadArtistTracks(artistUserId.current,0,true);}}
                          style={{padding:'5px 16px',borderRadius:16,border:'none',background:artistTab===tab?ACC:ACC_DIM,color:artistTab===tab?BG:ACC,fontSize:12,fontWeight:artistTab===tab?600:400,cursor:'pointer',...tap}}>
                          {tab==='albums'?t('albumsTab'):t('tracks')}
                        </button>
                      ))}
                    </div>

                    {artistTab==='albums'&&(
                      artistAlbumsLoading&&artistAlbums.length===0?<Spinner/>:
                      artistAlbums.length===0?<div style={{textAlign:'center',color:TEXT_MUTED,fontSize:12,padding:'16px 0'}}>{lang==='ru'?'Альбомы не найдены':'No albums found'}</div>:
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                        {artistAlbums.map((al,i)=>(
                          <div key={al.id} className="album-card" onClick={()=>openAlbum(al.id,al.title,al.artist,al.cover)} style={{cursor:'pointer',animation:`fadeUp 0.3s ease ${i*0.05}s both`,...tap}}>
                            <div style={{borderRadius:10,overflow:'hidden',marginBottom:6,boxShadow:'0 4px 12px rgba(0,0,0,0.4)'}}><AlbumImg src={al.cover} radius={0}/></div>
                            <div style={{fontSize:12,fontWeight:500,color:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{al.title}</div>
                            <div style={{fontSize:10,color:TEXT_MUTED,marginTop:2}}>{(al.trackCount??0)>0?`${al.trackCount} треков`:lang==='ru'?'Альбом':'Album'}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {artistTab==='tracks'&&(
                      artistTracksLoading&&artistTracks.length===0?<Spinner/>:
                      <div>
                        {artistTracks.length===0
                          ? <div style={{textAlign:'center',color:TEXT_MUTED,fontSize:12,padding:'16px 0'}}>{t('noTracks')}</div>
                          : <div style={{padding:'0 4px'}}>
                              {artistTracks.map((tr,i)=><TRow key={tr.id+'t'+i} track={tr} num={i+1} onArtistClick={(n,c)=>openArtist('',n,c,0)}/>)}
                            </div>
                        }
                        {artistTracksLoading&&artistTracks.length>0&&<div style={{textAlign:'center',padding:'10px',color:TEXT_MUTED,fontSize:12}}>{t('loading')}</div>}
                        {artistTracksHasMore&&!artistTracksLoading&&(
                          <div style={{display:'flex',justifyContent:'center',padding:'10px 0'}}>
                            <button onPointerDown={()=>loadArtistTracks(artistUserId.current,0,false)}
                              style={{padding:'9px 28px',background:ACC_DIM,border:`1px solid ${ACC}22`,borderRadius:11,color:ACC,fontSize:12,cursor:'pointer',transition:'background 0.2s ease',...tap}}>{t('showMore')}</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )
            }
          </div>
        )}

        {/* ── ALBUM ── */}
        {screen==='album'&&(
          <div className="screen-scale">
            <div style={{paddingTop:14,paddingLeft:16,paddingRight:16}}><BackBtn/></div>
            {albumLoading?<Spinner/>:albumPage&&(
              <div>
                <div style={{padding:'10px 16px 0',display:'flex',gap:14,alignItems:'center',animation:'slideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both'}}>
                  <Img src={albumPage.cover} size={80} radius={10}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:16,fontWeight:700,color:TEXT_PRIMARY,lineHeight:1.3}}>{albumPage.title}</div>
                    <button onClick={()=>openArtist('',albumPage.artist,'',0)} style={{background:'none',border:'none',padding:0,cursor:'pointer',marginTop:4,display:'block',textAlign:'left' as const,...tap}}><span style={{fontSize:12,color:ACC}}>{albumPage.artist}</span></button>
                    <div style={{fontSize:11,color:TEXT_MUTED,marginTop:4}}>{albumPage.tracks.length} {lang==='ru'?'треков':'tracks'}</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:7,padding:'12px 16px',animation:'slideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94) 0.05s both'}}>
                  <button onPointerDown={()=>{if(albumPage.tracks.length){playTrack(albumPage.tracks[0]);setQueue(albumPage.tracks.slice(1));}}} style={{flex:1,padding:'10px',background:ACC,border:'none',borderRadius:10,color:BG,fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5,transition:'transform 0.15s ease,opacity 0.15s ease',...tap}}>
                    <div style={{width:0,height:0,borderStyle:'solid',borderWidth:'5px 0 5px 9px',borderColor:`transparent transparent transparent ${BG}`}}/>{lang==='ru'?'Играть':'Play'}
                  </button>
                  <button onPointerDown={()=>{const sh=[...albumPage.tracks].sort(()=>Math.random()-.5);if(sh.length){playTrack(sh[0]);setQueue(sh.slice(1));}}} style={{flex:1,padding:'10px',background:ACC_DIM,border:`1px solid ${ACC}22`,borderRadius:10,color:ACC,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5,transition:'background 0.2s ease',...tap}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>{t('shuffle')}
                  </button>
                  <button onPointerDown={()=>toggleFavAl(albumPage)} style={{padding:'10px 14px',borderRadius:10,border:`1px solid ${isFavAl(albumPage.id)?ACC:'#3a3a3a'}`,background:isFavAl(albumPage.id)?ACC_DIM:'transparent',color:isFavAl(albumPage.id)?ACC:TEXT_SEC,fontSize:15,cursor:'pointer',transition:'all 0.2s ease',...tap}}>{isFavAl(albumPage.id)?'♥':'♡'}</button>
                </div>
                {albumPage.tracks.length===0?<div style={{textAlign:'center',padding:'24px',color:TEXT_MUTED,fontSize:12}}>{lang==='ru'?'Загрузка...':'Loading...'}</div>:
                  <div style={{padding:'0 4px'}}>{albumPage.tracks.map((tr,i)=><TRow key={tr.id} track={tr} num={i+1} onArtistClick={(n,c)=>openArtist('',n,c,0)}/>)}</div>
                }
              </div>
            )}
          </div>
        )}

        {/* ── HOME ── */}
        {screen==='home'&&(
          <div className="screen-fade" style={{position:'relative'}}>
            {(bgCover||(history.length>0&&history[0]?.cover))&&(
              <div style={{position:'absolute',top:0,left:0,right:0,height:240,overflow:'hidden',zIndex:0,pointerEvents:'none'}}>
                <img
                  key={bgCover||history[0]?.cover}
                  src={bgCover||history[0]?.cover}
                  style={{width:'100%',height:'100%',objectFit:'cover',filter:'blur(3px) saturate(0.85) brightness(0.65)',transform:'scale(1.05)',transition:'opacity 0.5s ease'}}
                  onError={()=>{}}
                />
                <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(14,14,14,0.05) 0%,rgba(14,14,14,0.3) 40%,rgba(14,14,14,0.75) 68%,#0e0e0e 100%)'}}/>
              </div>
            )}
            <div style={{position:'relative',zIndex:1,paddingTop:14,paddingLeft:16,paddingRight:16,paddingBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:21,fontWeight:700,color:TEXT_PRIMARY,letterSpacing:-0.3}}>{greeting(lang)}</div>
                <div style={{fontSize:12,color:ACC,marginTop:3,letterSpacing:1.5,fontWeight:600}}>FORTY7</div>
              </div>
              <button onClick={()=>setScreen('profile')} style={{display:'flex',alignItems:'center',gap:7,padding:'5px 11px',borderRadius:18,background:BG2,border:`1px solid #2a2a2a`,cursor:'pointer',flexShrink:0,maxWidth:140,transition:'background 0.2s ease',...tap}}>
                {tg?.photo_url
                  ?<img src={tg.photo_url} style={{width:22,height:22,borderRadius:'50%',objectFit:'cover',flexShrink:0}} onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
                  :<div style={{width:22,height:22,borderRadius:'50%',background:ACC_DIM,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:ACC,flexShrink:0}}>{uInit}</div>
                }
                <span style={{fontSize:12,color:TEXT_SEC,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:88}}>{uHandle||uName}</span>
              </button>
            </div>
            <div style={{position:'relative',zIndex:1}}>
            {history.length>0&&(
              <div style={{animation:'slideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94) 0.05s both'}}>
                <SL text={t('recent')}/>
                <div style={{display:'flex',gap:10,padding:'0 16px 12px',overflowX:'auto'}}>
                  {history.slice(0,8).map(tr=>(
                    <RecentCard
                      key={tr.id}
                      tr={tr}
                      isActive={current?.id===tr.id}
                      isPlaying={playing}
                      inQueue={inQ(tr.id)}
                      onPlay={()=>playTrack(tr)}
                      onArtist={()=>openArtist('',tr.artist,tr.cover,0)}
                      onQueue={e=>addQ(tr,e)}
                      queueLabel={t('queue')}
                    />
                  ))}
                </div>
              </div>
            )}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',marginBottom:8,animation:'slideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94) 0.1s both'}}>
              <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:'uppercase' as const,letterSpacing:0.8}}>{t('recommended')}</div>
              <button onPointerDown={()=>loadRecommendations()} disabled={recsLoading} style={{background:'none',border:'none',cursor:recsLoading?'default':'pointer',padding:4,...tap,opacity:recsLoading?0.5:1}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2.2" strokeLinecap="round" style={{display:'block',animation:recsLoading?'spin 0.8s linear infinite':undefined,transition:'opacity 0.2s ease'}}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
              </button>
            </div>
            {recs.length===0&&history.length<1
              ?<div style={{padding:'0 16px',fontSize:12,color:TEXT_MUTED}}>{t('noRecommended')}</div>
              :recsLoading&&recs.length===0
                ?<div style={{padding:'0 16px 8px'}}><Spinner/></div>
                :<div style={{padding:'0 4px'}}>{(recs.length>0?recs:history.filter(tr=>tr.mp3)).slice(0,10).map((tr,i)=><TRow key={tr.id} track={tr} num={i+1} showBlockBtn={true}/>)}</div>
            }
            </div>
          </div>
        )}

        {/* ── SEARCH ── */}
        {screen==='search'&&(
          <div className="screen-slide-up">
            <div style={{paddingTop:14,paddingLeft:16,paddingRight:16,paddingBottom:12}}>
              <div style={{fontSize:22,fontWeight:700,color:TEXT_PRIMARY,marginBottom:12,letterSpacing:-0.5}}>{t('search')}</div>
              <div style={{display:'flex',gap:8}}>
                <input className="search-input" type="text" placeholder={t('searchPlaceholder')} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch()}
                  style={{flex:1,padding:'11px 14px',fontSize:14,background:BG2,border:'1px solid #2a2a2a',borderRadius:12,color:TEXT_PRIMARY,outline:'none',width:'100%',boxSizing:'border-box' as const}}/>
                <button onPointerDown={()=>doSearch()} disabled={loading} style={{padding:'11px 14px',background:loading?BG3:ACC,color:loading?TEXT_MUTED:BG,border:'none',borderRadius:12,fontSize:13,fontWeight:600,cursor:loading?'not-allowed':'pointer',flexShrink:0,transition:'background 0.2s ease,transform 0.15s ease',...tap}}>{loading?'...':t('find')}</button>
              </div>
              <div style={{display:'flex',gap:5,marginTop:9,overflowX:'auto'}}>
                {(['sound','albums','covers','remix','artists'] as const).map(m=>(
                  <button key={m} className={`tab-btn${searchMode===m?' tab-active':''}`} onPointerDown={()=>setSearchMode(m)} style={{padding:'5px 13px',borderRadius:16,border:'none',background:searchMode===m?ACC:ACC_DIM,color:searchMode===m?BG:ACC,fontSize:12,fontWeight:searchMode===m?600:400,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap' as const,...tap}}>
                    {m==='sound'?t('sound'):m==='albums'?t('albumsTab'):m==='covers'?'Covers':m==='remix'?t('remix'):t('artists')}
                  </button>
                ))}
              </div>
              {error&&<div style={{marginTop:8,padding:'8px 12px',background:'#1a0a0a',borderRadius:9,color:'#d06060',fontSize:12,animation:'fadeIn 0.2s ease'}}>{error}</div>}
            </div>
            <div style={{padding:'0 4px'}}>
              {loading&&<div style={{textAlign:'center',paddingTop:36,color:TEXT_MUTED,fontSize:12}}>{t('loading')}</div>}
              {results.map((tr,i)=><TRow key={tr.id} track={tr} num={i+1}/>)}
            </div>
          </div>
        )}

        {/* ── LIBRARY ── */}
        {screen==='library'&&(
          <div className="screen-slide-up">
            <div style={{paddingTop:14,paddingLeft:16,paddingRight:16,paddingBottom:12}}><div style={{fontSize:22,fontWeight:700,color:TEXT_PRIMARY,letterSpacing:-0.5}}>{t('library')}</div></div>
            <div style={{display:'flex',gap:5,padding:'0 16px 12px',overflowX:'auto'}}>
              {(['liked','playlists','artists','albums'] as const).map(tab=>(
                <button key={tab} className={`tab-btn${libTab===tab?' tab-active':''}`} onPointerDown={()=>setLibTab(tab)} style={{padding:'5px 13px',borderRadius:16,border:'none',background:libTab===tab?ACC:ACC_DIM,color:libTab===tab?BG:ACC,fontSize:12,fontWeight:libTab===tab?600:400,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap' as const,...tap}}>
                  {tab==='liked'?t('likedTracks'):tab==='playlists'?t('playlists'):tab==='artists'?t('favArtists'):t('albums')}
                </button>
              ))}
            </div>
            {libTab==='liked'&&(liked.length===0?<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:60,animation:'fadeIn 0.3s ease'}}><div style={{fontSize:38,marginBottom:12}}>🎵</div><div style={{fontSize:13,color:TEXT_MUTED}}>{t('noLiked')}</div></div>:<div style={{padding:'0 4px'}}>{liked.map((tr,i)=><TRow key={tr.id} track={tr} num={i+1} onSwipeLeft={()=>toggleLike(tr)}/>)}</div>)}
            {libTab==='artists'&&(<div style={{padding:'0 16px'}}>{favArtists.length===0?<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:60,animation:'fadeIn 0.3s ease'}}><div style={{fontSize:38,marginBottom:12}}>🎤</div><div style={{fontSize:13,color:TEXT_MUTED}}>{lang==='ru'?'Нет избранных артистов':'No favourite artists'}</div></div>:favArtists.map(a=>(<div key={a.id||a.name} onClick={()=>openArtist(a.permalink||'',a.name,a.avatar||'',a.followers)} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid #1e1e1e`,cursor:'pointer',transition:'opacity 0.15s ease',...tap}}><Img src={a.avatar||''} size={46} radius={23}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:500,color:TEXT_PRIMARY}}>{a.name}</div>{a.username&&<div style={{fontSize:10,color:TEXT_SEC,marginTop:1}}>@{a.username}</div>}{a.followers>0&&<div style={{fontSize:10,color:TEXT_SEC,marginTop:1}}>{fmtP(a.followers)} {lang==='ru'?'подписчиков':'followers'}</div>}</div><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4a4a4a" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg></div>))}</div>)}
            {libTab==='albums'&&(<div style={{padding:'0 16px'}}>{favAlbums.length===0?<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:60,animation:'fadeIn 0.3s ease'}}><div style={{fontSize:38,marginBottom:12}}>💿</div><div style={{fontSize:13,color:TEXT_MUTED}}>{lang==='ru'?'Нет избранных альбомов':'No favourite albums'}</div></div>:favAlbums.map(al=>(<div key={al.id} onClick={()=>openAlbum(al.id,al.title,al.artist,al.cover)} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid #1e1e1e`,cursor:'pointer',transition:'opacity 0.15s ease',...tap}}><Img src={al.cover} size={50} radius={8}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:500,color:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{al.title}</div><div style={{fontSize:11,color:TEXT_SEC,marginTop:2}}>{al.artist}</div></div><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4a4a4a" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg></div>))}</div>)}
            {libTab==='playlists'&&(
              <div style={{padding:'0 16px'}}>
                <button onPointerDown={()=>setShowNewPl(true)} style={{width:'100%',padding:'10px',background:ACC_DIM,border:`1px dashed ${ACC}44`,borderRadius:11,color:ACC,fontSize:12,cursor:'pointer',marginBottom:9,display:'flex',alignItems:'center',justifyContent:'center',gap:6,transition:'background 0.2s ease',...tap}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{t('createPlaylist')}
                </button>
                {showNewPl&&(<div style={{background:BG2,border:'1px solid #242424',borderRadius:11,padding:'11px',marginBottom:9,animation:'slideDown 0.22s cubic-bezier(0.25,0.46,0.45,0.94) both'}}><input autoFocus placeholder={t('playlistName')} value={newPlName} onChange={e=>setNewPlName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createPl()} style={{width:'100%',padding:'8px 11px',fontSize:13,background:BG,border:'1px solid #2a2a2a',borderRadius:7,color:TEXT_PRIMARY,outline:'none',boxSizing:'border-box' as const,marginBottom:4}}/><div style={{display:'flex',gap:6}}><button onPointerDown={createPl} style={{flex:1,padding:'8px',background:ACC,border:'none',borderRadius:7,color:BG,fontSize:12,fontWeight:600,cursor:'pointer',transition:'transform 0.15s ease',...tap}}>{t('create')}</button><button onPointerDown={()=>{setShowNewPl(false);setNewPlName('');}} style={{flex:1,padding:'8px',background:BG3,border:'none',borderRadius:7,color:TEXT_SEC,fontSize:12,cursor:'pointer',...tap}}>{t('cancel')}</button></div></div>)}
                {playlists.map(pl=>{const isOpen=openPlId===pl.id;return(
                  <div key={pl.id} style={{background:BG2,border:'1px solid #1e1e1e',borderRadius:12,marginBottom:7,overflow:'hidden'}}>
                    <div onPointerDown={()=>setOpenPlId(isOpen?null:pl.id)} style={{padding:'11px 13px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,transition:'background 0.15s ease',...tap}}>
                      <div style={{width:46,height:46,borderRadius:7,overflow:'hidden',flexShrink:0,display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:BG3}}>{pl.tracks.slice(0,4).map((tr,i)=><div key={i} style={{overflow:'hidden',width:'100%',height:'100%'}}><Img src={tr.cover} size={23} radius={0}/></div>)}{pl.tracks.length===0&&<div style={{gridColumn:'span 2',gridRow:'span 2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,color:ACC}}>🎵</div>}</div>
                      <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:500,color:TEXT_PRIMARY}}>{pl.name}</div><div style={{fontSize:10,color:TEXT_SEC,marginTop:2}}>{pl.tracks.length} {lang==='ru'?'треков':'tracks'}</div></div>
                      <button onPointerDown={e=>{e.stopPropagation();playPl(pl);}} style={{width:34,height:34,minWidth:34,borderRadius:'50%',background:ACC,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,padding:0,transition:'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)',...tap}}><div style={{width:0,height:0,borderStyle:'solid',borderWidth:'6px 0 6px 10px',borderColor:`transparent transparent transparent ${BG}`,marginLeft:3}}/></button>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5a5a5a" strokeWidth="2" strokeLinecap="round" style={{transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94)',flexShrink:0}}><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                    {isOpen&&(<div className="playlist-tracks"><div style={{display:'flex',gap:5,padding:'0 13px 9px'}}>
                      <button onPointerDown={()=>shufflePl(pl)} style={{flex:1,padding:'7px',background:ACC_DIM,border:'none',borderRadius:7,color:ACC,fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4,transition:'background 0.2s ease',...tap}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>{t('shuffle')}</button>
                      <button onPointerDown={()=>setPlaylists(prev=>{const n=prev.map(p=>p.id===pl.id?{...p,repeat:!p.repeat}:p);try{localStorage.setItem('p47',JSON.stringify(n));}catch{}return n;})} style={{flex:1,padding:'7px',background:pl.repeat?ACC:ACC_DIM,border:'none',borderRadius:7,color:pl.repeat?BG:ACC,fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4,transition:'background 0.2s ease,color 0.2s ease',...tap}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={pl.repeat?BG:ACC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>{t('repeatPl')}</button>
                    </div>
                    <div style={{borderTop:'1px solid #1e1e1e'}}>{pl.tracks.length===0?<div style={{padding:'14px',textAlign:'center',color:TEXT_MUTED,fontSize:11}}>{lang==='ru'?'Нет треков':'No tracks'}</div>:pl.tracks.map((tr,i)=>(<div key={tr.id+i} onClick={()=>{playTrack(tr);setQueue(pl.tracks.slice(i+1));}} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 13px',cursor:'pointer',background:current?.id===tr.id?ACC_DIM:'transparent',borderBottom:'1px solid #1a1a1a',transition:'background 0.15s ease',...tap}}><Img src={tr.cover} size={36} radius={6}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,color:current?.id===tr.id?ACC:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',transition:'color 0.2s ease'}}>{tr.title}</div><div style={{fontSize:10,color:TEXT_SEC,marginTop:1}}>{tr.artist}</div></div><div style={{fontSize:10,color:TEXT_SEC}}>{tr.duration}</div></div>))}</div></div>)}
                  </div>
                );})}
              </div>
            )}
          </div>
        )}

        {/* ── TRENDING ── */}
        {screen==='trending'&&(()=>{
          const BEI='#EFBF7F';
          const BEI_DIM='rgba(239,191,127,0.13)';
          const BEI_GLOW='rgba(239,191,127,0.35)';
          const activeTracks=hotTracks;
          return(
          <div className="screen-fade" style={{minHeight:'100vh'}}>
            {/* Заголовок */}
            <div style={{padding:'18px 16px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:24,fontWeight:800,color:TEXT_PRIMARY,letterSpacing:-0.5}}>
                  {lang==='ru'?'🔥 Тренды':lang==='uk'?'🔥 Тренди':lang==='kk'?'🔥 Трендтер':lang==='pl'?'🔥 Trendy':lang==='tr'?'🔥 Trendler':'🔥 Trending'}
                </div>
                <div style={{fontSize:11,color:'#666',marginTop:3,letterSpacing:0.3}}>
                  {lang==='ru'?'Что слушают прямо сейчас':lang==='uk'?'Що слухають прямо зараз':lang==='kk'?'Қазір тыңдалатындар':lang==='pl'?'Teraz słuchane':lang==='tr'?'Şu anda dinleniyor':'Listening now'}
                </div>
              </div>
            </div>

            {trendLoading&&activeTracks.length===0?(
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:60,gap:12}}>
                <div style={{width:36,height:36,borderRadius:'50%',border:`2px solid ${BEI}`,borderTopColor:'transparent',animation:'spin 0.8s linear infinite'}}/>
                <div style={{fontSize:12,color:'#555'}}>
                  {lang==='ru'?'Загружаем тренды...':lang==='uk'?'Завантажуємо тренди...':lang==='kk'?'Трендтерді жүктеу...':lang==='pl'?'Ładowanie trendów...':lang==='tr'?'Trendler yükleniyor...':'Loading trends...'}
                </div>
              </div>
            ):activeTracks.length===0?(
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:70,gap:12,animation:'fadeIn 0.3s ease'}}>
                <div style={{fontSize:40}}>📈</div>
                <div style={{fontSize:13,color:'#555'}}>
                  {lang==='ru'?'Нет данных':lang==='uk'?'Немає даних':lang==='kk'?'Деректер жоқ':lang==='pl'?'Brak danych':lang==='tr'?'Veri yok':'No data'}
                </div>
                <button onPointerDown={()=>loadTrend('top',true)}
                  style={{padding:'9px 24px',background:BEI_DIM,border:`1px solid ${BEI}44`,borderRadius:10,color:BEI,fontSize:12,cursor:'pointer',transition:'background 0.2s ease',...tap}}>
                  {lang==='ru'?'Обновить':lang==='uk'?'Оновити':lang==='kk'?'Жаңарту':lang==='pl'?'Odśwież':lang==='tr'?'Yenile':'Refresh'}
                </button>
              </div>
            ):(
              <div style={{padding:'0 12px 16px'}}>
                {activeTracks.map((tr,i)=>{
                  const isFirst=i===0;
                  const isActive=current?.id===tr.id;
                  return(
                    <div
                      key={tr.id+i}
                      className="tcard"
                      onPointerDown={()=>playTrack(tr)}
                      style={{
                        display:'flex',alignItems:'center',gap:12,
                        padding:isFirst?'12px 14px':'9px 12px',
                        borderRadius:isFirst?18:14,
                        marginBottom:isFirst?10:5,
                        background:isActive
                          ?`linear-gradient(135deg,rgba(239,191,127,0.18),rgba(239,191,127,0.08))`
                          :isFirst?'rgba(239,191,127,0.08)':'rgba(255,255,255,0.03)',
                        border:isFirst?`1px solid rgba(239,191,127,0.25)`:isActive?`1px solid rgba(239,191,127,0.2)`:'1px solid rgba(255,255,255,0.04)',
                        cursor:'pointer',
                        animation:`fadeUp 0.3s ease ${Math.min(i*0.04,0.5)}s both`,
                        boxShadow:isFirst?`0 4px 24px rgba(239,191,127,0.12)`:isActive?`0 2px 12px rgba(239,191,127,0.15)`:'none',
                        ...tap
                      }}>
                      <div style={{width:isFirst?24:20,flexShrink:0,textAlign:'center',fontSize:isFirst?15:12,fontWeight:700,color:i<3?BEI:'#444'}}>
                        {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                      </div>
                      <div style={{position:'relative',flexShrink:0}}>
                        <div style={{borderRadius:isFirst?14:12,overflow:'hidden',width:isFirst?58:50,height:isFirst?58:50,boxShadow:isFirst?`0 4px 16px rgba(0,0,0,0.5)`:undefined}}>
                          <Img src={tr.cover} size={isFirst?58:50} radius={isFirst?14:12}/>
                        </div>
                        {isActive&&(
                          <div style={{position:'absolute',inset:0,borderRadius:isFirst?14:12,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            {playing
                              ?<div style={{display:'flex',gap:2,alignItems:'flex-end',height:14}}>
                                {[0,1,2].map(b=><div key={b} style={{width:3,background:BEI,borderRadius:2,height:[10,14,8][b],animation:`pulse 0.8s ease ${b*0.15}s infinite`}}/>)}
                              </div>
                              :<span style={{color:'#fff',fontSize:14}}>▶</span>
                            }
                          </div>
                        )}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:isFirst?14:13,fontWeight:isFirst?700:600,color:isActive?BEI:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',letterSpacing:-0.1,transition:'color 0.2s ease'}}>{tr.title}</div>
                        <div style={{fontSize:11,color:isActive?`rgba(239,191,127,0.7)`:'#5a5a5a',marginTop:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',transition:'color 0.2s ease'}}>{tr.artist}</div>
                        {tr.plays>0&&(
                          <div style={{display:'flex',alignItems:'center',gap:4,marginTop:4}}>
                            <div style={{height:2,width:Math.min(Math.max((tr.plays/1000000)*60,8),60),background:`linear-gradient(90deg,${BEI},rgba(239,191,127,0.3))`,borderRadius:2}}/>
                            <span style={{fontSize:9,color:'#444',letterSpacing:0.3}}>{fmtP(tr.plays)}</span>
                          </div>
                        )}
                      </div>
                      <button
                        className="tplay"
                        onPointerDown={e=>{e.stopPropagation();playTrack(tr);}}
                        style={{width:44,height:44,minWidth:44,borderRadius:'50%',border:'none',background:isActive?BEI:BEI_DIM,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,boxShadow:isActive?`0 0 16px ${BEI_GLOW}`:isFirst?`0 2px 10px ${BEI_GLOW}`:'none',transition:'background 0.2s ease,box-shadow 0.2s ease',...tap}}>
                        {isActive&&playing
                          ?<div style={{display:'flex',gap:2}}><div style={{width:3,height:10,background:isActive?'#0e0e0e':'#EFBF7F',borderRadius:2}}/><div style={{width:3,height:10,background:isActive?'#0e0e0e':'#EFBF7F',borderRadius:2}}/></div>
                          :<div style={{width:0,height:0,borderStyle:'solid',borderWidth:'5px 0 5px 9px',borderColor:`transparent transparent transparent ${isActive?'#0e0e0e':'#EFBF7F'}`,marginLeft:2}}/>
                        }
                      </button>
                    </div>
                  );
                })}
                {hotTracks.length>0&&(
                  <div style={{display:'flex',justifyContent:'center',padding:'16px 0 8px'}}>
                    <button
                      onPointerDown={()=>loadTrend('top',false)}
                      disabled={trendLoading}
                      style={{padding:'11px 28px',background:trendLoading?'#2a2a2a':BEI_DIM,border:`1px solid ${BEI}33`,borderRadius:12,color:trendLoading?'#5a5a5a':BEI,fontSize:13,fontWeight:600,cursor:trendLoading?'not-allowed':'pointer',opacity:trendLoading?0.6:1,transition:'background 0.2s ease,opacity 0.2s ease',...tap}}>
                      {trendLoading?'...':(lang==='ru'?'Загрузить ещё':lang==='uk'?'Завантажити ще':lang==='kk'?'Тағы жүктеу':lang==='pl'?'Wczytaj więcej':lang==='tr'?'Daha fazla yükle':'Load more')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );})()}

        {/* ── PROFILE ── */}
        {screen==='profile'&&(
          <div className="screen-fade">
            {showSettings&&(
              <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:200,display:'flex',alignItems:'flex-end',animation:'fadeIn 0.2s ease'}} onPointerDown={()=>setShowSettings(false)}>
                <div className="settings-sheet" style={{background:'#1a1a1a',width:'100%',borderRadius:'18px 18px 0 0',padding:'18px 16px 40px'}} onPointerDown={e=>e.stopPropagation()}>
                  <div style={{fontSize:15,fontWeight:600,color:TEXT_PRIMARY,marginBottom:16}}>{lang==='ru'?'Настройки':lang==='uk'?'Налаштування':lang==='kk'?'Параметрлер':lang==='pl'?'Ustawienia':lang==='tr'?'Ayarlar':'Settings'}</div>
                  <div style={{fontSize:10,color:TEXT_MUTED,marginBottom:7,textTransform:'uppercase' as const,letterSpacing:1}}>{t('language')}</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:5,marginBottom:14}}>
                    {([['ru','🇷🇺 RU'],['en','🇺🇸 EN'],['uk','🇺🇦 UK'],['kk','🇰🇿 KK'],['pl','🇵🇱 PL'],['tr','🇹🇷 TR']] as const).map(([l,label])=>(
                      <button key={l} onPointerDown={()=>chgLang(l as any)} style={{padding:'8px 4px',borderRadius:8,border:'none',background:lang===l?ACC:BG2,color:lang===l?BG:TEXT_SEC,fontSize:11,fontWeight:lang===l?600:400,cursor:'pointer',textAlign:'center' as const,transition:'all 0.2s ease',...tap}}>{label}</button>
                    ))}
                  </div>
                  {blockedArtists.length>0&&(
                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:10,color:TEXT_MUTED,marginBottom:6,textTransform:'uppercase' as const,letterSpacing:1}}>{lang==='ru'?'Заблокированные артисты':lang==='uk'?'Заблоковані артисти':'Blocked artists'} ({blockedArtists.length})</div>
                      <button onPointerDown={()=>{setBlockedArtists([]);try{localStorage.setItem('ba47',JSON.stringify([]));}catch{}}} style={{width:'100%',padding:'9px',background:'#1a0a0a',border:'1px solid #2a1010',borderRadius:9,color:'#c05050',fontSize:12,cursor:'pointer',transition:'background 0.2s ease',...tap}}>{lang==='ru'?'Очистить':lang==='uk'?'Очистити':'Clear'}</button>
                    </div>
                  )}
                  <button onPointerDown={()=>{try{localStorage.clear();}catch{}setLiked([]);setPlaylists([]);setHistory([]);setRecs([]);setQueue([]);setFavArtists([]);setFavAlbums([]);setBlockedArtists([]);setShowSettings(false);}} style={{width:'100%',padding:'11px',background:'#1a0a0a',border:'1px solid #2a1010',borderRadius:11,color:'#c05050',fontSize:12,cursor:'pointer',transition:'background 0.2s ease',...tap}}>{t('resetData')}</button>
                </div>
              </div>
            )}
            {(()=>{
              const topTrack=Object.entries(trackPlays).sort((a,b)=>b[1].count-a[1].count)[0];
              const topCover=topTrack?trackPlays[topTrack[0]].cover||bgCover:bgCover;
              const topTrackData=topTrack?{...trackPlays[topTrack[0]],id:topTrack[0]}:null;
              const hours=Math.floor(totalSec/3600);
              const mins=Math.floor((totalSec%3600)/60);
              const fmtTime=()=>{
                if(lang==='ru'||lang==='uk'){return hours>0?`${hours} ч ${mins} мин`:`${mins} мин`;}
                if(lang==='kk'){return hours>0?`${hours} сағ ${mins} мин`:`${mins} мин`;}
                if(lang==='pl'){return hours>0?`${hours} godz ${mins} min`:`${mins} min`;}
                if(lang==='tr'){return hours>0?`${hours} sa ${mins} dk`:`${mins} dk`;}
                return hours>0?`${hours}h ${mins}m`:`${mins}m`;
              };
              return(
                <div style={{position:'relative'}}>
                  {topCover&&(
                    <div style={{position:'absolute',top:0,left:0,right:0,height:200,overflow:'hidden',zIndex:0,pointerEvents:'none'}}>
                      <img key={topCover} src={topCover} style={{width:'100%',height:'100%',objectFit:'cover',filter:'blur(3px) saturate(0.85) brightness(0.6)',transform:'scale(1.05)',transition:'opacity 0.5s ease'}} onError={()=>{}}/>
                      <div style={{position:'absolute',inset:0,background:`linear-gradient(to bottom,rgba(14,14,14,0.05) 0%,rgba(14,14,14,0.3) 40%,rgba(14,14,14,0.75) 68%,${BG} 100%)`}}/>
                    </div>
                  )}
                  <div style={{position:'relative',zIndex:1,paddingTop:14,paddingLeft:16,paddingRight:16,paddingBottom:8,display:'flex',alignItems:'center',gap:4}}>
                    <button onClick={()=>setScreen('home')} style={{background:'none',border:'none',cursor:'pointer',padding:'6px 10px 6px 0',display:'flex',alignItems:'center',transition:'opacity 0.2s ease',...tap}}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={TEXT_SEC} strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg></button>
                    <div style={{fontSize:17,fontWeight:600,color:TEXT_PRIMARY}}>{t('profile')}</div>
                    <div style={{marginLeft:'auto'}}>
                      <button onPointerDown={()=>setShowSettings(true)} style={{width:34,height:34,minWidth:34,borderRadius:'50%',background:'rgba(30,30,30,0.7)',border:'1px solid #2a2a2a',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',padding:0,flexShrink:0,transition:'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)',...tap}}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={TEXT_SEC} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                      </button>
                    </div>
                  </div>
                  <div style={{position:'relative',zIndex:1,display:'flex',flexDirection:'column',alignItems:'center',padding:'0 16px 14px',animation:'slideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94) 0.05s both'}}>
                    {tg?.photo_url
                      ?<img src={tg.photo_url} style={{width:64,height:64,borderRadius:'50%',objectFit:'cover',marginBottom:10,border:`2px solid ${ACC}33`}} onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
                      :<div style={{width:64,height:64,borderRadius:'50%',background:ACC_DIM,border:`2px solid ${ACC}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,fontWeight:700,color:ACC,marginBottom:10}}>{uInit}</div>
                    }
                    <div style={{fontSize:17,fontWeight:600,color:TEXT_PRIMARY}}>{uName}</div>
                    {uHandle&&<div style={{fontSize:11,color:TEXT_SEC,marginTop:2}}>{uHandle}</div>}
                  </div>
                  <div style={{position:'relative',zIndex:1,padding:'0 16px',animation:'slideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94) 0.1s both'}}>
                    <button onPointerDown={()=>{}} style={{width:'100%',padding:'11px 14px',background:'rgba(30,30,30,0.8)',border:'1px solid #252525',borderRadius:12,color:TEXT_SEC,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:8,marginBottom:12,transition:'background 0.2s ease',...tap}}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                      <span style={{color:TEXT_PRIMARY,fontSize:13}}>{lang==='ru'?'Статистика за месяц':lang==='uk'?'Статистика за місяць':lang==='kk'?'Ай статистикасы':lang==='pl'?'Statystyki miesiąca':lang==='tr'?'Aylık istatistikler':'Monthly stats'}</span>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth="2" strokeLinecap="round" style={{marginLeft:'auto'}}><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                      <div style={{background:'rgba(25,25,25,0.85)',border:'1px solid #222',borderRadius:12,padding:'12px',transition:'transform 0.15s ease'}}>
                        <div style={{fontSize:10,color:TEXT_MUTED,marginBottom:6,textTransform:'uppercase' as const,letterSpacing:0.7}}>{lang==='ru'?'Времени в музыке':lang==='uk'?'В музиці':lang==='kk'?'Музыкада':lang==='pl'?'W muzyce':lang==='tr'?'Müzikte':'Time in music'}</div>
                        <div style={{fontSize:18,fontWeight:700,color:ACC}}>{fmtTime()}</div>
                      </div>
                      <div style={{background:'rgba(25,25,25,0.85)',border:'1px solid #222',borderRadius:12,padding:'12px',transition:'transform 0.15s ease'}}>
                        <div style={{fontSize:10,color:TEXT_MUTED,marginBottom:6,textTransform:'uppercase' as const,letterSpacing:0.7}}>{lang==='ru'?'Макс. стрик 🔥':lang==='uk'?'Макс. стрік 🔥':lang==='kk'?'Серия 🔥':lang==='pl'?'Streak 🔥':lang==='tr'?'Seri 🔥':'Max streak 🔥'}</div>
                        <div style={{fontSize:18,fontWeight:700,color:ACC}}>{maxStreak} <span style={{fontSize:12,fontWeight:400,color:TEXT_SEC}}>{lang==='ru'?'дн':lang==='uk'?'дн':lang==='kk'?'күн':lang==='pl'?'dni':lang==='tr'?'gün':'d'}</span></div>
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                      <div style={{background:'rgba(25,25,25,0.85)',border:'1px solid #222',borderRadius:12,padding:'12px'}}>
                        <div style={{fontSize:10,color:TEXT_MUTED,marginBottom:6,textTransform:'uppercase' as const,letterSpacing:0.7}}>{lang==='ru'?'Изучено':lang==='uk'?'Вивчено':lang==='kk'?'Зерттелген':lang==='pl'?'Odkryte':lang==='tr'?'Keşfedilen':'Explored'}</div>
                        <div style={{fontSize:18,fontWeight:700,color:ACC}}>{exploredIds.length} <span style={{fontSize:12,fontWeight:400,color:TEXT_SEC}}>{lang==='ru'||lang==='uk'?'тр':'tr'}</span></div>
                      </div>
                      <div style={{background:'rgba(25,25,25,0.85)',border:'1px solid #222',borderRadius:12,padding:'12px'}}>
                        <div style={{fontSize:10,color:TEXT_MUTED,marginBottom:6,textTransform:'uppercase' as const,letterSpacing:0.7}}>{lang==='ru'?'Прослушано':lang==='uk'?'Прослухано':lang==='kk'?'Тыңдалды':lang==='pl'?'Odsłuchane':lang==='tr'?'Dinlendi':'Listened'}</div>
                        <div style={{fontSize:18,fontWeight:700,color:ACC}}>{listenedIds.length} <span style={{fontSize:12,fontWeight:400,color:TEXT_SEC}}>{lang==='ru'||lang==='uk'?'тр':'tr'}</span></div>
                      </div>
                    </div>
                    {topTrackData&&(
                      <div style={{background:'rgba(25,25,25,0.85)',border:`1px solid ${ACC}22`,borderRadius:12,padding:'12px',marginBottom:14,display:'flex',alignItems:'center',gap:12,animation:'slideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94) 0.15s both'}}>
                        <Img src={topTrackData.cover||''} size={48} radius={8}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:10,color:TEXT_MUTED,marginBottom:4,textTransform:'uppercase' as const,letterSpacing:0.7}}>{lang==='ru'?'Самый зацикленный':lang==='uk'?'Найулюбленіший':lang==='kk'?'Ең көп тыңдалған':lang==='pl'?'Najczęściej grany':lang==='tr'?'En çok çalınan':'Most played'}</div>
                          <div style={{fontSize:13,fontWeight:600,color:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{topTrackData.title}</div>
                          <div style={{fontSize:11,color:TEXT_SEC,marginTop:2}}>{topTrackData.artist}</div>
                        </div>
                        <div style={{flexShrink:0,textAlign:'center' as const}}>
                          <div style={{fontSize:20,fontWeight:700,color:ACC}}>{topTrackData.count}</div>
                          <div style={{fontSize:9,color:TEXT_MUTED}}>{lang==='ru'?'раз':lang==='uk'?'разів':lang==='kk'?'рет':lang==='pl'?'razy':lang==='tr'?'kez':'times'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {addToPl&&!fullPlayer&&<PlModal track={addToPl}/>}

      {/* ── MINI PLAYER — один div, слайдер через нативные DOM события (capture phase) ── */}
      {current && screen !== 'profile' && (
        <div
          className="mini-player"
          style={{position:'fixed',bottom:NAV_H+5,left:8,right:8,background:'rgba(18,18,18,0.98)',backdropFilter:'blur(20px)',border:'1px solid #252525',borderRadius:16,padding:'10px 12px 8px',zIndex:100}}
        >
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:6}}>
            <div
              className="mini-cover"
              onPointerDown={(e)=>{e.stopPropagation();e.preventDefault();setFullPlayer(true);}}
              style={{flexShrink:0,cursor:'pointer',borderRadius:10,overflow:'hidden',transition:'transform 0.15s ease'}}
            >
              <Img src={current.cover} size={52} radius={10}/>
            </div>
            <div
              onPointerDown={(e)=>{e.stopPropagation();e.preventDefault();setFullPlayer(true);}}
              style={{flex:1,minWidth:0,cursor:'pointer'}}
            >
              <div style={{fontSize:14,fontWeight:700,color:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{current.title}</div>
              <div style={{fontSize:11,color:TEXT_SEC,marginTop:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{current.artist}</div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:0,flexShrink:0}}>
              <button className="prev-next-btn" onPointerDown={(e)=>{e.stopPropagation();e.preventDefault();playPrev();}}
                style={{background:'none',border:'none',cursor:'pointer',padding:'8px 6px',...tap,opacity:playHistory.length>0?1:0.35}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
              </button>
              <button className="prev-next-btn" onPointerDown={(e)=>{e.stopPropagation();e.preventDefault();playNext();}}
                style={{background:'none',border:'none',cursor:'pointer',padding:'8px 6px',...tap,opacity:(queue.length>0||recs.length>0||history.length>0)?1:0.35}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
              </button>
            </div>
            <button className="play-btn" onPointerDown={(e)=>{e.stopPropagation();e.preventDefault();togglePlay();}}
              style={{width:48,height:48,minWidth:48,borderRadius:'50%',background:ACC,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,padding:0,boxShadow:`0 4px 16px ${ACC}44`,...tap}}>
              <PP sz="sm" col={BG}/>
            </button>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:10,color:'#555',minWidth:28,textAlign:'right'}}>{curTime}</span>
            <MiniSlider val={progress/100} onChange={v=>{const a=audio.current;if(a?.duration)a.currentTime=v*a.duration;}}/>
            <span style={{fontSize:10,color:'#555',minWidth:28}}>{current.duration}</span>
          </div>
        </div>
      )}

            {/* ── NAV ── */}
      {screen!=='profile'&&screen!=='artist'&&screen!=='album'&&(
        <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(10,10,10,0.97)',backdropFilter:'blur(20px)',borderTop:'1px solid #1e1e1e',display:'flex',justifyContent:'space-around',alignItems:'stretch',zIndex:101,height:NAV_H}}>
          {NAV.map(item=>(
            <NavItem
              key={item.id}
              item={item}
              active={screen===item.id}
              onSelect={()=>setScreen(item.id as 'home'|'search'|'library'|'trending')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
