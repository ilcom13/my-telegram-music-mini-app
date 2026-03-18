import { useState, useEffect, useRef, useCallback } from 'react';
declare global { interface Window { Telegram: any; } }

const W = 'https://square-queen-e703.shapovaliluha.workers.dev';
const ACC = '#D4A843';           // \u043d\u0430\u0441\u044b\u0449\u0435\u043d\u043d\u0435\u0435 \u0431\u0435\u0436\u0435\u0432\u044b\u0439/\u0437\u043e\u043b\u043e\u0442\u043e\u0439
const ACC_DIM = 'rgba(212,168,67,0.14)';
const BG = '#0e0e0e';
const BG2 = '#161616';
const BG3 = '#1e1e1e';
const MINI_BG = 'rgba(38,34,28,0.97)';
const FULL_BG = '#181510';
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
  en: {
    home:'Home',search:'Search',library:'Library',trending:'Trending',profile:'Profile',
    find:'Find',notFound:'Nothing found',recent:'Recent',recommended:'Recommended',
    likedTracks:'Liked',playlists:'Playlists',albums:'Albums',createPlaylist:'Create playlist',
    playlistName:'Playlist name',create:'Create',cancel:'Cancel',addToPlaylist:'Add to playlist',
    noPlaylists:'No playlists.',noLiked:'No liked tracks',loading:'Loading...',loadMore:'Load more',
    retry:'Try again',nowPlaying:'Now playing',plays:'plays',resetData:'Reset all data',
    language:'Language',listenedTracks:'Listened',share:'Share',copied:'Copied!',queue:'Queue',
    sound:'Sound',remix:'Remix',artists:'Artists',albumsTab:'Albums',shuffle:'Shuffle',
    repeatPl:'Repeat',syncSaved:'Synced \u2713',syncing:'Syncing...',syncBtn:'Sync across devices',
    favArtists:'Artists',addFav:'Follow',removeFav:'Following',backToSearch:'Back',
    searchPlaceholder:'Songs or artist',noRecommended:'Listen to some tracks first',
    goToAlbum:'Go to album',tracks:'Tracks',discography:'Discography',popular:'Popular',
    latestRelease:'Latest release',noTracks:'No tracks found',showMore:'Show more',
  },
  ru: {
    home:'\u0413\u043b\u0430\u0432\u043d\u0430\u044f',search:'\u041f\u043e\u0438\u0441\u043a',library:'\u0411\u0438\u0431\u043b\u0438\u043e\u0442\u0435\u043a\u0430',trending:'\u0422\u0440\u0435\u043d\u0434\u044b',profile:'\u041f\u0440\u043e\u0444\u0438\u043b\u044c',
    find:'\u041d\u0430\u0439\u0442\u0438',notFound:'\u041d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e',recent:'\u041d\u0435\u0434\u0430\u0432\u043d\u0435\u0435',recommended:'\u0420\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u043e\u0432\u0430\u043d\u043d\u043e\u0435',
    likedTracks:'\u041b\u0430\u0439\u043a\u0438',playlists:'\u041f\u043b\u0435\u0439\u043b\u0438\u0441\u0442\u044b',albums:'\u0410\u043b\u044c\u0431\u043e\u043c\u044b',createPlaylist:'\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043f\u043b\u0435\u0439\u043b\u0438\u0441\u0442',
    playlistName:'\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435',create:'\u0421\u043e\u0437\u0434\u0430\u0442\u044c',cancel:'\u041e\u0442\u043c\u0435\u043d\u0430',addToPlaylist:'\u0412 \u043f\u043b\u0435\u0439\u043b\u0438\u0441\u0442',
    noPlaylists:'\u041d\u0435\u0442 \u043f\u043b\u0435\u0439\u043b\u0438\u0441\u0442\u043e\u0432.',noLiked:'\u041d\u0435\u0442 \u043b\u0430\u0439\u043a\u043e\u0432',loading:'\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c...',loadMore:'\u0415\u0449\u0451',
    retry:'\u041f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c',nowPlaying:'\u0421\u0435\u0439\u0447\u0430\u0441 \u0438\u0433\u0440\u0430\u0435\u0442',plays:'\u043f\u0440\u043e\u0441\u043b\u0443\u0448\u0438\u0432\u0430\u043d\u0438\u0439',resetData:'\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435',
    language:'\u042f\u0437\u044b\u043a',listenedTracks:'\u041f\u0440\u043e\u0441\u043b\u0443\u0448\u0430\u043d\u043e',share:'\u041f\u043e\u0434\u0435\u043b\u0438\u0442\u044c\u0441\u044f',copied:'\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u043e!',
    queue:'\u041e\u0447\u0435\u0440\u0435\u0434\u044c',sound:'Sound',remix:'Remix',artists:'\u0410\u0440\u0442\u0438\u0441\u0442\u044b',albumsTab:'\u0410\u043b\u044c\u0431\u043e\u043c\u044b',
    shuffle:'\u041f\u0435\u0440\u0435\u043c\u0435\u0448\u0430\u0442\u044c',repeatPl:'\u041f\u043e\u0432\u0442\u043e\u0440\u044f\u0442\u044c',syncSaved:'\u0421\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u043e\u0432\u0430\u043d\u043e \u2713',syncing:'\u0421\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0430\u0446\u0438\u044f...',
    syncBtn:'\u0421\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043c\u0435\u0436\u0434\u0443 \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u0430\u043c\u0438',favArtists:'\u0410\u0440\u0442\u0438\u0441\u0442\u044b',addFav:'\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f',
    removeFav:'\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u043d',backToSearch:'\u041d\u0430\u0437\u0430\u0434',searchPlaceholder:'\u041f\u0435\u0441\u043d\u0438 \u0438\u043b\u0438 \u0430\u0440\u0442\u0438\u0441\u0442',
    noRecommended:'\u041f\u043e\u0441\u043b\u0443\u0448\u0430\u0439 \u043f\u0430\u0440\u0443 \u0442\u0440\u0435\u043a\u043e\u0432',goToAlbum:'\u041f\u0435\u0440\u0435\u0439\u0442\u0438 \u0432 \u0430\u043b\u044c\u0431\u043e\u043c',
    tracks:'\u0422\u0440\u0435\u043a\u0438',discography:'\u0414\u0438\u0441\u043a\u043e\u0433\u0440\u0430\u0444\u0438\u044f',popular:'\u041f\u043e\u043f\u0443\u043b\u044f\u0440\u043d\u043e\u0435',
    latestRelease:'\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0439 \u0440\u0435\u043b\u0438\u0437',noTracks:'\u0422\u0440\u0435\u043a\u0438 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b',showMore:'\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0435\u0449\u0451',
  },
};

function fmtP(n: number) { if(n>=1e6)return(n/1e6).toFixed(1)+'M';if(n>=1000)return Math.round(n/1000)+'K';return n>0?String(n):''; }

function calcMaxStreak(days:string[]):number{
  if(!days.length)return 0;const sorted=[...new Set(days)].sort();let mx=1,cur=1;
  for(let i=1;i<sorted.length;i++){const diff=(new Date(sorted[i]).getTime()-new Date(sorted[i-1]).getTime())/86400000;if(diff===1){cur++;mx=Math.max(mx,cur);}else cur=1;}return mx;
}

function extractCoverColors(imgSrc:string,cb:(c1:string,c2:string,c3:string)=>void){
  if(!imgSrc)return;
  try{
    const img=new Image();img.crossOrigin='anonymous';
    img.onload=()=>{
      try{
        const sz=40;const c=document.createElement('canvas');c.width=c.height=sz;
        const ctx=c.getContext('2d');if(!ctx)return;
        ctx.drawImage(img,0,0,sz,sz);const d=ctx.getImageData(0,0,sz,sz).data;
        const gP=(x:number,y:number)=>{const i=(y*sz+x)*4;return[d[i],d[i+1],d[i+2]];};
        const p1=gP(4,4);const p2=gP(sz/2,sz/2);const p3=gP(sz-5,sz-5);
        const dk=(r:number,g:number,b:number)=>`rgb(${Math.floor(r*0.55)},${Math.floor(g*0.55)},${Math.floor(b*0.55)})`;
        cb(dk(...p1 as [number,number,number]),dk(...p2 as [number,number,number]),dk(...p3 as [number,number,number]));
      }catch{}
    };img.onerror=()=>{};img.src=imgSrc;
  }catch{}
}

function greeting(lang: 'ru'|'en') {
  const h=new Date().getHours();
  if(lang==='ru'){if(h>=5&&h<12)return'\u0414\u043e\u0431\u0440\u043e\u0435 \u0443\u0442\u0440\u043e';if(h>=12&&h<17)return'\u0414\u043e\u0431\u0440\u044b\u0439 \u0434\u0435\u043d\u044c';if(h>=17&&h<22)return'\u0414\u043e\u0431\u0440\u044b\u0439 \u0432\u0435\u0447\u0435\u0440';return'\u0414\u043e\u0431\u0440\u043e\u0439 \u043d\u043e\u0447\u0438';}
  if(h>=5&&h<12)return'Good morning';if(h>=12&&h<17)return'Good day';if(h>=17&&h<22)return'Good evening';return'Good night';
}

function Img({src,size,radius,fb='\ud83c\udfb5'}:{src:string;size:number;radius:number;fb?:string}) {
  const[e,sE]=useState(false);
  const s:React.CSSProperties={width:size,height:size,borderRadius:radius,flexShrink:0,display:'block'};
  if(src&&!e)return<img src={src} style={{...s,objectFit:'cover'}} onError={()=>sE(true)}/>;
  return<div style={{...s,background:BG3,display:'flex',alignItems:'center',justifyContent:'center',fontSize:Math.floor(size*.36),color:ACC}}>{fb}</div>;
}

// \u041a\u0432\u0430\u0434\u0440\u0430\u0442\u043d\u043e\u0435 \u0438\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u0435 \u0434\u043b\u044f \u0430\u043b\u044c\u0431\u043e\u043c\u043e\u0432 \u2014 \u0432\u0441\u0435\u0433\u0434\u0430 1:1
function AlbumImg({src,radius=10}:{src:string;radius?:number}) {
  const[e,sE]=useState(false);
  if(src&&!e)return<img src={src} style={{width:'100%',aspectRatio:'1',objectFit:'cover',display:'block',borderRadius:radius}} onError={()=>sE(true)}/>;
  return<div style={{width:'100%',aspectRatio:'1',background:BG3,borderRadius:radius,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,color:ACC}}>\ud83d\udcbf</div>;
}

const GENRES=[{id:'top',label:'\u0422\u043e\u043f',e:'\ud83d\udd25'},{id:'new',label:'\u041d\u043e\u0432\u0438\u043d\u043a\u0438',e:'\u26a1'},{id:'ru-rap',label:'RU \u0420\u044d\u043f',e:'\ud83c\udfa4'},{id:'hip-hop',label:'Hip-Hop',e:'\ud83c\udfa7'},{id:'trap',label:'Trap',e:'\ud83d\udc80'},{id:'drill',label:'Drill',e:'\ud83d\udd29'},{id:'electronic',label:'Electronic',e:'\u26a1'},{id:'rnb',label:'R&B',e:'\ud83d\udc9c'},{id:'pop',label:'Pop',e:'\u2728'},{id:'latin',label:'Latin',e:'\ud83c\udf34'}];
const REMIX_W=['speed up','sped up','slowed','reverb','slow reverb','nightcore','pitched','lofi','lo-fi','boosted','bass boost','phonk','tiktok','ultra slowed','super slowed','mashup','extended','hardstyle','core','remix','bass','\u0441\u043f\u0438\u0434 \u0430\u043f','\u0441\u043f\u0438\u0434 \u0430\u043f\u043f','\u0441\u043b\u043e\u0432\u0435\u0434','\u0441\u043b\u043e\u0443\u0432\u0435\u0434','\u0440\u0435\u043c\u0438\u043a\u0441','\u0431\u0430\u0441\u0441','\u0441\u043b\u043e\u0443','\u0440\u0435\u0432\u0435\u0440\u0431','\u043d\u0430\u0439\u0442\u043a\u043e\u0440','\u0445\u0430\u0440\u0434\u0441\u0442\u0430\u0439\u043b','\u043c\u044d\u0448\u0430\u043f','\u043c\u0435\u0448\u0430\u043f','\u043a\u043e\u0440','\u0444\u043e\u043d\u043a','\u043b\u043e\u0444\u0438'];

function useSlider(val:number,onChange:(v:number)=>void){
  const ref=useRef<HTMLDivElement>(null);
  const dragging=useRef(false);
  const update=useCallback((cx:number)=>{if(!ref.current)return;const r=ref.current.getBoundingClientRect();onChange(Math.max(0,Math.min(1,(cx-r.left)/r.width)));},[onChange]);
  const onDown=(e:React.PointerEvent)=>{dragging.current=true;ref.current?.setPointerCapture(e.pointerId);update(e.clientX);};
  const onMove=(e:React.PointerEvent)=>{if(dragging.current)update(e.clientX);};
  const onUp=()=>{dragging.current=false;};
  return{ref,onPointerDown:onDown,onPointerMove:onMove,onPointerUp:onUp};
}

function SliderTrack({val,sp,h=3,noAnim=false}:{val:number;sp:ReturnType<typeof useSlider>;h?:number;noAnim?:boolean}){
  return(
    <div {...sp} ref={sp.ref} style={{flex:1,height:Math.max(h,22),display:'flex',alignItems:'center',cursor:'pointer',touchAction:'none'}}>
      <div style={{width:'100%',height:h,background:'rgba(255,255,255,0.1)',borderRadius:h,position:'relative'}}>
        <div style={{width:`${val*100}%`,height:'100%',background:ACC,borderRadius:h,transition:noAnim?'none':'width 0.05s'}}/>
        <div style={{position:'absolute',top:'50%',left:`${val*100}%`,transform:'translate(-50%,-50%)',width:h+10,height:h+10,background:ACC,borderRadius:'50%',transition:noAnim?'none':'left 0.05s'}}/>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',paddingTop:60,gap:12}}>
      <div style={{width:30,height:30,borderRadius:'50%',border:`2px solid ${ACC}`,borderTopColor:'transparent',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// \u2500\u2500 SMART RECOMMENDATIONS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// \u0421\u0447\u0438\u0442\u0430\u0435\u043c \u0441\u043a\u043e\u043b\u044c\u043a\u043e \u0440\u0430\u0437 \u0441\u043b\u0443\u0448\u0430\u043b\u0438 \u043a\u0430\u0436\u0434\u043e\u0433\u043e \u0430\u0440\u0442\u0438\u0441\u0442\u0430
function getArtistPlayCounts(history: Track[]): Record<string,number> {
  const counts: Record<string,number> = {};
  for (const tr of history) {
    if (!tr.artist || REMIX_W.some(w => tr.artist.toLowerCase().includes(w))) continue;
    counts[tr.artist] = (counts[tr.artist] || 0) + 1;
  }
  return counts;
}

// \u0412\u044b\u0431\u0438\u0440\u0430\u0435\u043c \u0442\u043e\u043f \u0430\u0440\u0442\u0438\u0441\u0442\u043e\u0432 \u043f\u043e \u043f\u0440\u043e\u0441\u043b\u0443\u0448\u0438\u0432\u0430\u043d\u0438\u044f\u043c, \u043e\u0442\u0441\u0435\u043a\u0430\u0435\u043c \u0442\u0435\u0445 \u043a\u043e\u0433\u043e \u0441\u043b\u0443\u0448\u0430\u043b\u0438 \u043c\u0430\u043b\u043e
function getTopArtists(history: Track[], minPlays = 2, limit = 5): string[] {
  const counts = getArtistPlayCounts(history);
  return Object.entries(counts)
    .filter(([,c]) => c >= minPlays)
    .sort((a,b) => b[1] - a[1])
    .slice(0, limit)
    .map(([a]) => a);
}

// FIX Recent: tap-vs-scroll detection for recent cards
function RecentCard({track,isActive,isPlaying,onPlay,onQueue,inQueue,onArtist,acc}:{
  track:Track;isActive:boolean;isPlaying:boolean;
  onPlay:()=>void;onQueue:()=>void;inQueue:boolean;onArtist:()=>void;acc:string;
}){
  const sRef=useRef<{x:number,y:number,t:number}|null>(null);
  const mv=useRef(false);
  const BG3C='#1e1e1e';
  return(
    <div style={{width:100,borderRadius:10,background:'#161616',overflow:'hidden',flexShrink:0,border:'1px solid '+BG3C,userSelect:'none' as const}}>
      <div style={{position:'relative',width:100,height:100}}
        onPointerDown={e=>{sRef.current={x:e.clientX,y:e.clientY,t:Date.now()};mv.current=false;}}
        onPointerMove={e=>{if(sRef.current){const dx=Math.abs(e.clientX-sRef.current.x);const dy=Math.abs(e.clientY-sRef.current.y);if(dx>6||dy>6)mv.current=true;}}}
        onPointerUp={()=>{if(!mv.current&&sRef.current&&Date.now()-sRef.current.t<400)onPlay();sRef.current=null;}}>
        <img src={track.cover} style={{width:100,height:100,objectFit:'cover' as const,display:'block'}} onError={()=>{}}/>
        {isActive&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{isPlaying?'⏸':'▶'}</div>}
      </div>
      <div style={{padding:'6px 7px 7px',boxSizing:'border-box' as const}}>
        <button onPointerDown={e=>{e.stopPropagation();onArtist();}} style={{background:'none',border:'none',padding:0,cursor:'pointer',display:'block',width:'100%',textAlign:'left' as const,outline:'none'}}>
          <div style={{fontSize:10,fontWeight:600,color:acc,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{track.artist}</div>
        </button>
        <div style={{fontSize:9,color:'#5a5a5a',marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{track.title}</div>
        <button onPointerDown={e=>{e.stopPropagation();onQueue();}}
          style={{marginTop:5,width:'100%',padding:'4px 0',background:inQueue?'rgba(239,191,127,0.15)':'rgba(255,255,255,0.06)',border:`1px solid ${inQueue?acc+'44':'rgba(255,255,255,0.08)'}`,borderRadius:6,color:inQueue?acc:'#666',fontSize:9,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:3,outline:'none'}}>
          + Queue
        </button>
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

  // Artist page
  const[artistPage,setArtistPage]=useState<ArtistInfo|null>(null);
  const[artistLoading,setArtistLoading]=useState(false);
  const[artistTab,setArtistTab]=useState<'albums'|'tracks'>('albums');
  const[artistAlbums,setArtistAlbums]=useState<AlbumInfo[]>([]);
  const[artistAlbumsLoading,setArtistAlbumsLoading]=useState(false);
  const[artistTracks,setArtistTracks]=useState<Track[]>([]);
  const[artistTracksLoading,setArtistTracksLoading]=useState(false);
  const[artistTracksHasMore,setArtistTracksHasMore]=useState(false);
  const[artistTracksOffset,setArtistTracksOffset]=useState(0);
  const artistUserId=useRef<string>('');
  const artistTracksCursor=useRef<string|null>(null);

  const[favArtists,setFavArtists]=useState<ArtistInfo[]>([]);
  const[albumPage,setAlbumPage]=useState<AlbumInfo|null>(null);
  const[albumLoading,setAlbumLoading]=useState(false);
  const[favAlbums,setFavAlbums]=useState<AlbumInfo[]>([]);
  const[blockedArtists,setBlockedArtists]=useState<string[]>([]);
  const[bgCover,setBgCover]=useState('');
  const[playHistory,setPlayHistory]=useState<Track[]>([]);
  const[totalSec,setTotalSec]=useState(0);
  const[exploredIds,setExploredIds]=useState<string[]>([]);
  const[listenedIds,setListenedIds]=useState<string[]>([]);
  const[trackPlays,setTrackPlays]=useState<Record<string,{title:string;artist:string;cover:string;count:number}>>({});
  const[streakDays,setStreakDays]=useState<string[]>([]);
  const[maxStreak,setMaxStreak]=useState(0);
  const[coverGrad,setCoverGrad]=useState({c1:'#1a1510',c2:'#0e0e12',c3:'#0e0e0e'});
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
  const[recsVersion,setRecsVersion]=useState(0); // \u0442\u0440\u0438\u0433\u0433\u0435\u0440 \u0434\u043b\u044f \u043f\u0435\u0440\u0435\u0441\u0447\u0451\u0442\u0430 \u0440\u0435\u043a
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
  const playCountSinceRec=useRef(0); // \u0441\u0447\u0451\u0442\u0447\u0438\u043a \u043f\u0440\u043e\u0441\u043b\u0443\u0448\u0438\u0432\u0430\u043d\u0438\u0439 \u0434\u043b\u044f \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u044f \u0440\u0435\u043a
  const listenTimer=useRef<ReturnType<typeof setInterval>|null>(null);
  const listenSec=useRef(0);
  const listenTrackId=useRef('');
  const tg=window.Telegram?.WebApp?.initDataUnsafe?.user;
  const uid=String(tg?.id||'anon');
  const uName=tg?.first_name||tg?.username||'User';
  const uHandle=tg?.username?`@${tg.username}`:'';
  const uInit=uName.charAt(0).toUpperCase();

  const syncSave=async(data:object)=>{if(uid==='anon')return;setSyncSt('saving');try{await fetch(`${W}/sync/save?uid=${uid}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});setSyncSt('saved');setTimeout(()=>setSyncSt(''),2500);}catch{setSyncSt('');}};
  const triggerSync=(l:Track[],p:Playlist[],h:Track[],v:number,fa:ArtistInfo[],fal:AlbumInfo[])=>{if(syncTimer.current)clearTimeout(syncTimer.current);syncTimer.current=setTimeout(()=>syncSave({liked:l,playlists:p,history:h,volume:v,favArtists:fa,favAlbums:fal}),2000);};

  useEffect(()=>{
    window.Telegram?.WebApp?.ready();window.Telegram?.WebApp?.expand();
    const ll=()=>{try{
      const l=localStorage.getItem('l47');if(l)setLiked(JSON.parse(l));
      const p=localStorage.getItem('p47');if(p)setPlaylists(JSON.parse(p));
      const h=localStorage.getItem('h47');if(h)setHistory(JSON.parse(h));
      const fa=localStorage.getItem('fa47');if(fa)setFavArtists(JSON.parse(fa));
      const fal=localStorage.getItem('fal47');if(fal)setFavAlbums(JSON.parse(fal));
      const v=localStorage.getItem('v47');if(v)setVolume(parseFloat(v));
      const q=localStorage.getItem('q47');if(q)setQueue(JSON.parse(q));
      const ba=localStorage.getItem('ba47');if(ba)setBlockedArtists(JSON.parse(ba));
      const bgc=localStorage.getItem('bgc47');if(bgc)setBgCover(bgc);
      const tsec=localStorage.getItem('tsec47');if(tsec)setTotalSec(parseInt(tsec)||0);
      const expIds=localStorage.getItem('exp47');if(expIds)setExploredIds(JSON.parse(expIds));
      const lstIds=localStorage.getItem('lst47');if(lstIds)setListenedIds(JSON.parse(lstIds));
      const tpl=localStorage.getItem('tpl47');if(tpl)setTrackPlays(JSON.parse(tpl));
      const sdays=localStorage.getItem('sdays47');if(sdays){const d=JSON.parse(sdays);setStreakDays(d);setMaxStreak(calcMaxStreak(d));}
    }catch{}};

    if(uid!=='anon'){fetch(`${W}/sync/load?uid=${uid}`).then(r=>r.json()).then(d=>{if(d.data){if(d.data.liked)setLiked(d.data.liked);if(d.data.playlists)setPlaylists(d.data.playlists);if(d.data.history)setHistory(d.data.history);if(d.data.favArtists)setFavArtists(d.data.favArtists);if(d.data.favAlbums)setFavAlbums(d.data.favAlbums);if(d.data.volume!==undefined)setVolume(d.data.volume);}else ll();}).catch(ll);}else ll();
    try{const lg=localStorage.getItem('lg47');if(lg)setLang(lg as 'ru'|'en');}catch{}
  },[]);

  // \u2500\u2500 \u0423\u041c\u041d\u042b\u0415 \u0420\u0415\u041a\u041e\u041c\u0415\u041d\u0414\u0410\u0426\u0418\u0418 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // \u041e\u0431\u043d\u043e\u0432\u043b\u044f\u0435\u043c \u0440\u0435\u043a \u043f\u0440\u0438 \u043a\u0430\u0436\u0434\u043e\u043c recsVersion \u0438\u043b\u0438 \u043a\u043e\u0433\u0434\u0430 \u0438\u0441\u0442\u043e\u0440\u0438\u044f \u0434\u043e\u0441\u0442\u0438\u0433\u0430\u0435\u0442 \u043f\u043e\u0440\u043e\u0433\u0430
  useEffect(()=>{
  // FIX: Space key = play/pause on PC
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{if(e.code==='Space'&&e.target===document.body){e.preventDefault();if(audio.current){if(audio.current.paused){audio.current.play();setPlaying(true);}else{audio.current.pause();setPlaying(false);}}}}; 
    document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey);
  },[]);

    if(history.length<2) return;
    // \u0411\u0435\u0440\u0451\u043c \u0442\u043e\u043b\u044c\u043a\u043e \u0430\u0440\u0442\u0438\u0441\u0442\u043e\u0432 \u043a\u043e\u0442\u043e\u0440\u044b\u0445 \u0441\u043b\u0443\u0448\u0430\u043b\u0438 >= 2 \u0440\u0430\u0437
    const topArtists = getTopArtists(history, 2, 5);
    // \u0415\u0441\u043b\u0438 \u043d\u0435\u0442 \u0442\u0430\u043a\u0438\u0445 \u2014 \u0431\u0435\u0440\u0451\u043c \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0445 \u0443\u043d\u0438\u043a\u0430\u043b\u044c\u043d\u044b\u0445 \u0430\u0440\u0442\u0438\u0441\u0442\u043e\u0432 (\u0445\u043e\u0442\u044f \u0431\u044b 1 \u043f\u0440\u043e\u0441\u043b\u0443\u0448\u0438\u0432\u0430\u043d\u0438\u0435)
    const fallbackArtists = getTopArtists(history, 1, 3);
    const artists = topArtists.length >= 1 ? topArtists : fallbackArtists;
    if(!artists.length) return;

    // \u0424\u043e\u0440\u043c\u0438\u0440\u0443\u0435\u043c \u0437\u0430\u043f\u0440\u043e\u0441: \u0442\u043e\u043f \u0430\u0440\u0442\u0438\u0441\u0442\u044b \u0441 \u0432\u0435\u0441\u043e\u0432\u044b\u043c \u043a\u043e\u044d\u0444\u0444\u0438\u0446\u0438\u0435\u043d\u0442\u043e\u043c
    const counts = getArtistPlayCounts(history);
    // \u0421\u043e\u0440\u0442\u0438\u0440\u0443\u0435\u043c \u043f\u043e \u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u0443 \u043f\u0440\u043e\u0441\u043b\u0443\u0448\u0438\u0432\u0430\u043d\u0438\u0439, \u0431\u0435\u0440\u0451\u043c \u0443\u043d\u0438\u043a\u0430\u043b\u044c\u043d\u044b\u0445
    const weighted = artists.sort((a,b) => (counts[b]||0) - (counts[a]||0));

    fetch(`${W}/search?q=__recommend__${encodeURIComponent(weighted.join(','))}`)
      .then(r=>r.json())
      .then(d=>{
        if(d.tracks?.length){
          // \u0424\u0438\u043b\u044c\u0442\u0440\u0443\u0435\u043c: \u0443\u0431\u0438\u0440\u0430\u0435\u043c \u0442\u0440\u0435\u043a\u0438 \u043a\u043e\u0442\u043e\u0440\u044b\u0435 \u0443\u0436\u0435 \u0435\u0441\u0442\u044c \u0432 \u0438\u0441\u0442\u043e\u0440\u0438\u0438
          const historyIds = new Set(history.map(h=>h.id));
          const fresh = d.tracks.filter((tr:Track) => !historyIds.has(tr.id));
          setRecs(fresh.length > 0 ? fresh : d.tracks);
        }
      })
      .catch(()=>{});
  },[recsVersion, history.length]);

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
        } else setPlaying(false);
      }
    };
    a.addEventListener('timeupdate',onT);a.addEventListener('ended',onE);
    return()=>{a.removeEventListener('timeupdate',onT);a.removeEventListener('ended',onE);};
  },[current,loop,queue,recs,history]);

  useEffect(()=>{if(audio.current)audio.current.volume=volume;},[volume]);
  useEffect(()=>{if(screen==='trending'&&!trends[trendGenre])loadTrend(trendGenre,true);},[screen,trendGenre]);
  useEffect(()=>{if(query.trim()&&screen==='search')doSearch(searchMode);},[searchMode]);

  const playDirect=async(track:Track)=>{
    let freshMp3=track.mp3;
    if(track.id&&!track.isArtist&&!track.isAlbum){try{const r=await fetch(`${W}/resolve?id=${track.id}`);const d=await r.json();if(d.mp3)freshMp3=d.mp3;}catch{}}
    if(!freshMp3)return;
    const a=audio.current;
    if(a){a.pause();a.src=`${W}/stream?url=${encodeURIComponent(freshMp3)}`;a.load();a.play().then(()=>setPlaying(true)).catch(()=>{setTimeout(()=>{a.play().then(()=>setPlaying(true)).catch(()=>setPlaying(false));},400);});}
    if(current)setPlayHistory(prev=>[current,...prev.slice(0,29)]);
    const newTrack={...track,mp3:freshMp3};setCurrent(newTrack);setProgress(0);setCurTime('0:00');
    if(track.cover){extractCoverColors(track.cover,(c1,c2,c3)=>setCoverGrad({c1,c2,c3}));setBgCover(track.cover);try{localStorage.setItem('bgc47',track.cover);}catch{}}
    setExploredIds(prev=>{if(prev.includes(track.id))return prev;const n=[...prev,track.id];try{localStorage.setItem('exp47',JSON.stringify(n));}catch{}return n;});
    const today=new Date().toISOString().slice(0,10);
    setStreakDays(prev=>{if(prev.includes(today))return prev;const n=[...prev,today];try{localStorage.setItem('sdays47',JSON.stringify(n));}catch{}setMaxStreak(calcMaxStreak(n));return n;});
    if(listenTimer.current)clearInterval(listenTimer.current);
    listenSec.current=0;listenTrackId.current=track.id;
    listenTimer.current=setInterval(()=>{
      const a=audio.current;if(!a||a.paused||a.readyState<2)return;
      listenSec.current+=1;
      setTotalSec(prev=>{const n=prev+1;try{localStorage.setItem('tsec47',String(n));}catch{}return n;});
      if(listenSec.current===40){const tid=listenTrackId.current;
        setListenedIds(prev=>{if(prev.includes(tid))return prev;const n=[...prev,tid];try{localStorage.setItem('lst47',JSON.stringify(n));}catch{}return n;});
        setTrackPlays(prev=>{const entry=prev[tid]||{title:track.title,artist:track.artist,cover:track.cover||'',count:0};const n={...prev,[tid]:{...entry,cover:track.cover||entry.cover||'',count:entry.count+1}};try{localStorage.setItem('tpl47',JSON.stringify(n));}catch{}return n;});}
    },1000);
    setHistory(prev=>{const n=[track,...prev.filter(x=>x.id!==track.id)].slice(0,50);try{localStorage.setItem('h47',JSON.stringify(n));}catch{}playCountSinceRec.current+=1;if(playCountSinceRec.current>=3){playCountSinceRec.current=0;setRecsVersion(v=>v+1);}return n;});
  }
  const playTrack=(track:Track)=>{
    if(track.isArtist){openArtist('',track.title,track.cover,track.plays);return;}
    if(track.isAlbum){openAlbum(track.id,track.title,track.artist,track.cover);return;}
    if(!track.mp3)return;
    if(current?.id===track.id){togglePlay();return;}
    playDirect(track);
  };
  const addQ=(track:Track,e?:React.MouseEvent)=>{e?.stopPropagation();setQueue(prev=>{const n=[...prev,track];try{localStorage.setItem('q47',JSON.stringify(n));}catch{}return n;});};
  const rmQ=(i:number)=>setQueue(prev=>{const n=[...prev];n.splice(i,1);try{localStorage.setItem('q47',JSON.stringify(n));}catch{}return n;});
  const inQ=(id:string)=>queue.some(t=>t.id===id);
  const togglePlay=()=>{if(!audio.current)return;if(playing){audio.current.pause();setPlaying(false);}else{audio.current.play();setPlaying(true);}};
  const setVol=(v:number)=>{setVolume(v);try{localStorage.setItem('v47',String(v));}catch{}};
  const isLk=(id:string)=>liked.some(t=>t.id===id);
  const toggleLike=(track:Track,e?:React.MouseEvent)=>{e?.stopPropagation();setLiked(prev=>{const has=prev.some(t=>t.id===track.id);const n=has?prev.filter(t=>t.id!==track.id):[track,...prev];try{localStorage.setItem('l47',JSON.stringify(n));}catch{}triggerSync(n,playlists,history,volume,favArtists,favAlbums);return n;});};
  const blockArtist=(artist:string)=>{setBlockedArtists(prev=>{const n=[...new Set([...prev,artist])];try{localStorage.setItem('ba47',JSON.stringify(n));}catch{}return n;});setRecs(prev=>prev.filter(tr=>tr.artist!==artist));setRecsVersion(v=>v+1);};

  const loadTrend=async(genre=trendGenre,reset=false)=>{setTrendLoading(true);const off=reset?0:(trendOff[genre]||0);try{const r=await fetch(`${W}/trending?genre=${genre}&offset=${off}`);const d=await r.json();if(d.tracks){setTrends(prev=>({...prev,[genre]:reset?d.tracks:[...(prev[genre]||[]),...d.tracks]}));setTrendOff(prev=>({...prev,[genre]:off+1}));}}catch{}setTrendLoading(false);};
  const doSearch=async(mode=searchMode)=>{if(!query.trim())return;setLoading(true);setError('');setResults([]);try{const ep=mode==='albums'?'albums':'search';const r=await fetch(`${W}/${ep}?q=${encodeURIComponent(query)}&mode=${mode}`);const d=await r.json();if(d.error)throw new Error(d.error);if(!d.tracks?.length)throw new Error(t('notFound'));setResults(d.tracks);}catch(e:unknown){setError(e instanceof Error?e.message:String(e));}finally{setLoading(false);};};

  // \u2500\u2500 OPEN ARTIST \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const openArtist=async(permalink:string,name:string,avatar:string,followers:number)=>{
    setArtistLoading(true);
    prevScreen.current=screen as 'home'|'search'|'library'|'trending'|'profile'|'artist'|'album';
    setScreen('artist');
    setArtistPage(null);
    setArtistAlbums([]);
    setArtistTracks([]);
    setArtistTracksOffset(0);
    setArtistTracksHasMore(false);
    setArtistTab('albums');
    artistUserId.current='';

    try{
      const r=await fetch(`${W}/artist?name=${encodeURIComponent(name)}&permalink=${encodeURIComponent(permalink)}`);
      const d=await r.json();
      const art=d.artist||{};
      const trks:Track[]=d.tracks||[];
      const sorted=[...trks].sort((a,b)=>b.plays-a.plays);
      const latest=sorted[0]||null;
      const userId=art.id||'';
      artistUserId.current=userId;

      setArtistPage({
        id:userId,name:art.name||name,username:art.username||'',
        avatar:art.avatar||avatar||'',banner:art.banner||'',
        followers:art.followers||followers,permalink:art.permalink||permalink,
        tracks:sorted,albums:[],latestRelease:latest
      });

      if(userId){
        loadArtistAlbums(userId);
        loadArtistTracks(userId, 0, true);
      } else {
        // userId \u043d\u0435 \u0438\u0437\u0432\u0435\u0441\u0442\u0435\u043d \u2014 \u043f\u0440\u043e\u0431\u0443\u0435\u043c \u0447\u0435\u0440\u0435\u0437 \u0438\u043c\u044f
        loadArtistAlbumsByName(name);
        // \u0422\u0440\u0435\u043a\u0438 \u0443\u0436\u0435 \u0435\u0441\u0442\u044c \u0432 sorted, \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u043c \u0438\u0445
        setArtistTracks(sorted);
        setArtistTracksHasMore(false);
        setArtistTracksLoading(false);
      }
    }catch{
      setArtistPage({id:'',name,username:'',avatar,banner:'',followers,permalink,tracks:[],albums:[],latestRelease:null});
    }
    setArtistLoading(false);
  };

  const loadArtistAlbums=async(userId:string)=>{
    setArtistAlbumsLoading(true);
    try{
      const r=await fetch(`${W}/artist/albums?userId=${userId}`);
      const d=await r.json();
      setArtistAlbums(d.albums||[]);
    }catch{}
    setArtistAlbumsLoading(false);
  };

  const loadArtistAlbumsByName=async(name:string)=>{
    setArtistAlbumsLoading(true);
    try{
      const r=await fetch(`${W}/albums?q=${encodeURIComponent(name)}`);
      const d=await r.json();
      const albums:AlbumInfo[]=(d.tracks||[])
        .filter((al:Track)=>al.isAlbum)
        .map((al:Track)=>({id:al.id,title:al.title,artist:al.artist,cover:al.cover,tracks:[],permalink:al.permalink||'',trackCount:al.trackCount||0,plays:al.plays||0}));
      setArtistAlbums(albums);
    }catch{}
    setArtistAlbumsLoading(false);
  };

  // \u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c \u0412\u0421\u0415 \u0442\u0440\u0435\u043a\u0438 \u0430\u0440\u0442\u0438\u0441\u0442\u0430 \u2014 \u0441\u043d\u0430\u0447\u0430\u043b\u0430 \u0438\u0437 artist API, \u043f\u043e\u0442\u043e\u043c \u0434\u043e\u043f\u043e\u043b\u043d\u044f\u0435\u043c \u0447\u0435\u0440\u0435\u0437 /artist/tracks
  const loadArtistTracks=async(userId:string,offset:number,reset=false)=>{
    setArtistTracksLoading(true);
    try{
      const r=await fetch(`${W}/artist/tracks?userId=${userId}&offset=${offset}`);
      const d=await r.json();
      const newTracks:Track[]=d.tracks||[];
      setArtistTracks(prev=>{
        if(reset){
          // \u0415\u0441\u043b\u0438 \u0435\u0441\u0442\u044c \u0442\u0440\u0435\u043a\u0438 \u0438\u0437 artist API (sorted) \u2014 \u043e\u0431\u044a\u0435\u0434\u0438\u043d\u044f\u0435\u043c, \u0443\u0431\u0438\u0440\u0430\u044f \u0434\u0443\u0431\u043b\u0438
          return newTracks;
        }
        const existing=new Set(prev.map(t=>t.id));
        const fresh=newTracks.filter(t=>!existing.has(t.id));
        return [...prev,...fresh];
      });
      setArtistTracksHasMore(d.hasMore||false);
      setArtistTracksOffset(d.nextOffset||offset+20);
    }catch{}
    setArtistTracksLoading(false);
  };

  // \u2500\u2500 OPEN ALBUM \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const openAlbum=async(id:string,title:string,artist:string,cover:string)=>{
    setAlbumLoading(true);
    prevScreen.current=screen as 'home'|'search'|'library'|'trending'|'profile'|'artist'|'album';
    setScreen('album');
    setAlbumPage(null);
    try{
      const r=await fetch(`${W}/album?id=${id}`);
      const d=await r.json();
      if(d.album){
        const tracks=(d.tracks||[]).map((tr:Track)=>({...tr,albumId:id,albumTitle:d.album.title||title}));
        setAlbumPage({id:d.album.id,title:d.album.title||title,artist:d.album.artist||artist,cover:d.album.cover||cover,tracks,permalink:d.album.permalink||''});
      } else {
        setAlbumPage({id,title,artist,cover,tracks:[],permalink:''});
      }
    }catch{setAlbumPage({id,title,artist,cover,tracks:[],permalink:''});}
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
  const share=(track:Track)=>{navigator.clipboard?.writeText(`${track.artist} \u2014 ${track.title}`).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});};
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
    const hasAlbum=!!(track.albumId);
    const menuItems=[
      {icon:<svg width="14" height="14" viewBox="0 0 24 24" fill={isLk(track.id)?ACC:'none'} stroke={isLk(track.id)?ACC:'#aaa'} strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,label:isLk(track.id)?(lang==='ru'?'\u0423\u0431\u0440\u0430\u0442\u044c \u043b\u0430\u0439\u043a':'Unlike'):(lang==='ru'?'\u041b\u0430\u0439\u043a':'Like'),fn:(e:React.MouseEvent)=>{toggleLike(track,e);setMenuId(null);}},
      {icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,label:t('addToPlaylist'),fn:()=>{setAddToPl(track);setMenuId(null);}},
      {icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,label:lang==='ru'?'\u041a \u0430\u0440\u0442\u0438\u0441\u0442\u0443':'Go to artist',fn:()=>{openArtist('',track.artist,'',0);setMenuId(null);}},
      ...(hasAlbum?[{icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,label:t('goToAlbum'),fn:()=>{openAlbum(track.albumId!,track.albumTitle||'',track.artist,track.cover);setMenuId(null);}}]:[]),
    ];
    return(
      <div style={{position:'relative'}}>
        <div onClick={e=>{e.stopPropagation();if(mOpen){setMenuId(null);return;}setMenuId(null);playTrack(track);}} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:12,cursor:'pointer',marginBottom:1,background:active?ACC_DIM:'transparent'}}>
          {num!==undefined&&<div style={{fontSize:11,color:active?ACC:TEXT_MUTED,width:18,flexShrink:0,textAlign:'right'}}>{num}</div>}
          <div style={{position:'relative',flexShrink:0}}>
            <Img src={track.cover} size={44} radius={track.isArtist?22:8}/>
            {active&&!track.isArtist&&!track.isAlbum&&<div style={{position:'absolute',inset:0,borderRadius:8,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>{playing?'\u23f8':'\u25b6'}</div>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:500,color:active?ACC:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{track.title}</div>
            <div style={{display:'flex',alignItems:'center',gap:4,marginTop:2}}>
              {!track.isArtist&&!track.isAlbum&&onArtistClick
                ?<button onClick={e=>{e.stopPropagation();onArtistClick(track.artist,track.cover);}} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontSize:11,color:TEXT_SEC,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:130,textAlign:'left'}}>{track.artist}</button>
                :<span style={{fontSize:11,color:track.isArtist?ACC:TEXT_SEC,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:130}}>{track.isAlbum?`${track.trackCount||0} \u0442\u0440\u0435\u043a\u043e\u0432`:track.artist}</span>
              }
              {!track.isArtist&&!track.isAlbum&&track.plays>0&&<span style={{fontSize:10,color:TEXT_MUTED,flexShrink:0}}>\u00b7 {fmtP(track.plays)}</span>}
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
          <div onClick={e=>e.stopPropagation()} style={{position:'absolute',right:8,top:'calc(100% + 2px)',background:'#222',border:'1px solid #2a2a2a',borderRadius:12,zIndex:50,minWidth:174,boxShadow:'0 12px 32px rgba(0,0,0,0.8)',overflow:'hidden'}}>
            {menuItems.map((item,i)=>(
              <button key={i} onClick={item.fn} style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'10px 12px',background:'none',border:'none',cursor:'pointer',color:'#ddd',fontSize:12,borderBottom:i<menuItems.length-1?'1px solid #2a2a2a':'none',textAlign:'left' as const,outline:'none'}}>
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
        <button onClick={()=>setAddToPl(null)} style={{width:'100%',padding:'10px',background:BG3,border:'none',borderRadius:9,color:TEXT_SEC,fontSize:12,cursor:'pointer',marginTop:4,outline:'none'}}>{t('cancel')}</button>
      </div>
    </div>
  );

  const SectionLabel=({text,right}:{text:string;right?:React.ReactNode})=>(
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',marginBottom:8}}>
      <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:'uppercase',letterSpacing:0.8}}>{text}</div>
      {right}
    </div>
  );

  // \u041a\u043d\u043e\u043f\u043a\u0430 \u043d\u0430\u0437\u0430\u0434 \u2014 \u0431\u0435\u0437 outline \u043f\u0440\u0438 \u043d\u0430\u0436\u0430\u0442\u0438\u0438
  const BackBtn=()=>(
    <button
      onClick={()=>setScreen(prevScreen.current)}
      style={{background:'none',border:'none',cursor:'pointer',padding:'6px 10px 6px 0',display:'flex',alignItems:'center',gap:6,outline:'none',WebkitTapHighlightColor:'transparent'}}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEXT_SEC} strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      <span style={{fontSize:13,color:TEXT_SEC,fontWeight:500}}>{t('backToSearch')}</span>
    </button>
  );

  const NAV=[
    {id:'home',icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#606060'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,lbl:()=>t('home')},
    {id:'search',icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#606060'} strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,lbl:()=>t('search')},
    {id:'library',icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#606060'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,lbl:()=>t('library')},
    {id:'trending',icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#606060'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,lbl:()=>t('trending')},
  ];

  // \u2500\u2500 FULL PLAYER \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  if(fullPlayer&&current)return(
    <div style={{background:`linear-gradient(155deg,${coverGrad.c1} 0%,${coverGrad.c2} 45%,${coverGrad.c3} 100%)`,height:'100vh',width:'100%',display:'flex',flexDirection:'column',alignItems:'center',padding:'0 22px',fontFamily:"-apple-system,'SF Pro Display',sans-serif",boxSizing:'border-box',overflow:'hidden'}}>
      <audio ref={audio}/>
      {showQueue&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.82)',zIndex:200,display:'flex',alignItems:'flex-end'}} onClick={()=>setShowQueue(false)}>
          <div style={{background:'#242424',width:'100%',borderRadius:'18px 18px 0 0',padding:'16px 16px 32px',maxHeight:'68vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div><div style={{fontSize:14,fontWeight:600,color:TEXT_PRIMARY}}>{t('queue')}</div><div style={{fontSize:10,color:TEXT_MUTED,marginTop:1}}>{queue.length} {lang==='ru'?'\u0442\u0440\u0435\u043a\u043e\u0432':'tracks'}</div></div>
              <button onClick={()=>setQueue([])} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:TEXT_SEC,outline:'none'}}>{lang==='ru'?'\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u044c':'Clear'}</button>
            </div>
            {queue.length===0?<div style={{color:TEXT_MUTED,fontSize:12,textAlign:'center',padding:'20px 0'}}>{lang==='ru'?'\u041f\u0443\u0441\u0442\u043e':'Empty'}</div>
              :queue.map((tr,i)=>(
                <div key={tr.id+i} draggable onDragStart={()=>setDragIdx(i)} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(dragIdx!==null&&dragIdx!==i)moveQ(dragIdx,i);setDragIdx(null);}}
                  style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #2a2a2a',cursor:'grab'}}>
                  <div style={{color:'#444',fontSize:15,padding:'0 3px'}}>\u283f</div>
                  <Img src={tr.cover} size={36} radius={6}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{tr.title}</div>
                    <div style={{fontSize:10,color:TEXT_SEC,marginTop:1}}>{tr.artist}</div>
                  </div>
                  <button onClick={()=>{playDirect(tr);setQueue(prev=>prev.filter((_,j)=>j!==i));setShowQueue(false);}} style={{background:'none',border:'none',cursor:'pointer',padding:3,outline:'none'}}>
                    <div style={{width:0,height:0,borderStyle:'solid',borderWidth:'5px 0 5px 9px',borderColor:`transparent transparent transparent ${ACC}`,marginLeft:1}}/>
                  </button>
                  <button onClick={()=>rmQ(i)} style={{background:'none',border:'none',cursor:'pointer',color:TEXT_SEC,fontSize:16,padding:'0 3px',lineHeight:1,outline:'none'}}>\u00d7</button>
                </div>
              ))
            }
          </div>
        </div>
      )}
      <div style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:40,paddingBottom:10,flexShrink:0}}>
        <button onClick={()=>setFullPlayer(false)} style={{background:'none',border:'none',cursor:'pointer',padding:6,margin:-6,outline:'none',WebkitTapHighlightColor:'transparent'}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{fontSize:10,color:TEXT_MUTED,letterSpacing:1.5,textTransform:'uppercase'}}>{t('nowPlaying')}</span>
        <button onClick={()=>setShowQueue(true)} style={{background:'none',border:'none',cursor:'pointer',padding:6,margin:-6,position:'relative',outline:'none',WebkitTapHighlightColor:'transparent'}}>
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
        {/* #1 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u041d\u0415 \u043a\u043b\u0438\u043a\u0430\u0431\u0435\u043b\u044c\u043d\u043e \u2014 \u043f\u0440\u043e\u0441\u0442\u043e \u0442\u0435\u043a\u0441\u0442 */}
        <div style={{fontSize:17,fontWeight:600,color:TEXT_PRIMARY,lineHeight:1.3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginBottom:4}}>
          {current.title}
        </div>
        <button onClick={()=>{setFullPlayer(false);openArtist(current.permalink||'',current.artist,current.cover,0);}} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'block',textAlign:'left' as const,outline:'none'}}>
          <span style={{fontSize:13,color:ACC}}>{current.artist}</span>
        </button>
        {current.plays>0&&<div style={{fontSize:10,color:TEXT_MUTED,marginTop:2}}>{fmtP(current.plays)} {t('plays')}</div>}
      </div>
      <div style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0,marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center'}}>
          <HBtn track={current} sz={22}/>
          <button onClick={()=>setAddToPl(current)} style={{background:'none',border:'none',cursor:'pointer',padding:5,outline:'none'}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>
        <div style={{display:'flex',alignItems:'center'}}>
          <button onClick={()=>setLoop(!loop)} style={{background:'none',border:'none',cursor:'pointer',padding:5,outline:'none'}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={loop?ACC:'#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
          </button>
          <button onClick={()=>share(current)} style={{background:'none',border:'none',cursor:'pointer',padding:5,outline:'none'}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
      </div>
      {copied&&<div style={{fontSize:10,color:ACC,alignSelf:'flex-start',marginBottom:6,marginTop:-6}}>{t('copied')}</div>}
      <div style={{width:'100%',flexShrink:0,marginBottom:2}}>
        <SliderTrack val={progress/100} sp={seekSP} h={3} noAnim={true}/>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:TEXT_SEC,marginTop:5}}><span>{curTime}</span><span>{current.duration}</span></div>
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:32,flexShrink:0,marginBottom:12}}>
        <button style={{background:'none',border:'none',cursor:'pointer',opacity:0.35,outline:'none'}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg></button>
        <button onClick={togglePlay} style={{width:58,height:58,borderRadius:'50%',background:ACC,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,outline:'none'}}><PP sz="lg"/></button>
        <button onClick={()=>{if(queue.length>0){const nxt=queue[0];setQueue(prev=>prev.slice(1));playDirect(nxt);}}} style={{background:'none',border:'none',cursor:'pointer',opacity:queue.length>0?1:0.35,outline:'none'}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg></button>
      </div>
      <div style={{width:'100%',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5a5a5a" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>
        <SliderTrack val={volume} sp={volSP} h={3} noAnim={true}/>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5a5a5a" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>
      </div>
      {addToPl&&<PlModal track={addToPl}/>}
    </div>
  );

  // \u2500\u2500 MAIN \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  return(
    <div onClick={()=>menuId&&setMenuId(null)} style={{background:BG,minHeight:'100vh',width:'100%',fontFamily:"-apple-system,'SF Pro Display',sans-serif",position:'relative',boxSizing:'border-box'}}>
      <audio ref={audio}/>
      <style>{`
        button:focus{outline:none}
        button::-moz-focus-inner{border:0}
        *{-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{display:none}
      `}</style>
      <div style={{paddingBottom:current?NAV_H+76+8:NAV_H+6,minHeight:'100vh'}}>

        {/* \u2500\u2500 ARTIST PAGE \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        {screen==='artist'&&(
          <div>
            {/* #3 \u043a\u043d\u043e\u043f\u043a\u0430 \u043d\u0430\u0437\u0430\u0434 \u043f\u0440\u044f\u043c\u043e \u043f\u043e\u0434 \u0432\u0435\u0440\u0445\u043d\u0438\u043c \u043a\u0440\u0430\u0435\u043c, \u0431\u0435\u0437 \u043e\u0442\u0441\u0442\u0443\u043f\u0430 */}
            <div style={{paddingTop:44,paddingLeft:16,paddingRight:16}}>
              <BackBtn/>
            </div>
            {artistLoading?<Spinner/>:artistPage&&(
              <div>
                {/* #3 \u0431\u0430\u043d\u043d\u0435\u0440 \u0441\u0440\u0430\u0437\u0443 \u043f\u043e\u0441\u043b\u0435 \u043a\u043d\u043e\u043f\u043a\u0438 \u043d\u0430\u0437\u0430\u0434, \u0432\u043f\u043b\u043e\u0442\u043d\u0443\u044e */}
                <div style={{width:'100%',height:110,background:BG3,position:'relative',overflow:'hidden',marginTop:8,marginBottom:-30}}>
                  {artistPage.banner
                    ?<img src={artistPage.banner} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} onError={()=>{}}/>
                    :<div style={{width:'100%',height:'100%',background:`linear-gradient(135deg,#2a1f0e,${BG})`}}/>
                  }
                  <div style={{position:'absolute',inset:0,background:`linear-gradient(to bottom,transparent 30%,${BG})`}}/>
                </div>
                {/* \u0410\u0432\u0430\u0442\u0430\u0440 + \u0438\u043d\u0444\u043e */}
                <div style={{padding:'0 16px 14px',display:'flex',alignItems:'flex-end',gap:12,position:'relative',zIndex:1}}>
                  <div style={{flexShrink:0,borderRadius:'50%',overflow:'hidden',border:`2px solid ${BG}`}}>
                    <Img src={artistPage.avatar} size={68} radius={34}/>
                  </div>
                  <div style={{flex:1,minWidth:0,paddingBottom:2}}>
                    <div style={{fontSize:18,fontWeight:700,color:TEXT_PRIMARY,letterSpacing:-0.3}}>{artistPage.name}</div>
                    {artistPage.username&&<div style={{fontSize:11,color:TEXT_SEC,marginTop:1}}>@{artistPage.username}</div>}
                    {artistPage.followers>0&&<div style={{fontSize:11,color:TEXT_SEC,marginTop:1}}>{fmtP(artistPage.followers)} {lang==='ru'?'\u043f\u043e\u0434\u043f\u0438\u0441\u0447\u0438\u043a\u043e\u0432':'followers'}</div>}
                  </div>
                  <button onClick={()=>artistPage&&toggleFavA(artistPage)} style={{flexShrink:0,padding:'6px 13px',borderRadius:16,border:`1px solid ${isFavA(artistPage)?ACC:'#3a3a3a'}`,background:isFavA(artistPage)?ACC_DIM:'transparent',color:isFavA(artistPage)?ACC:TEXT_SEC,fontSize:12,cursor:'pointer',fontWeight:500,outline:'none'}}>
                    {isFavA(artistPage)?t('removeFav'):t('addFav')}
                  </button>
                </div>

                {/* \u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0439 \u0440\u0435\u043b\u0438\u0437 */}
                {artistPage.latestRelease&&(
                  <div style={{padding:'0 16px 14px'}}>
                    <SectionLabel text={t('latestRelease')}/>
                    <div onClick={()=>artistPage.latestRelease&&playTrack(artistPage.latestRelease)} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:12,background:BG2,cursor:'pointer',border:`1px solid #252525`}}>
                      <div style={{position:'relative',flexShrink:0}}>
                        <Img src={artistPage.latestRelease.cover} size={52} radius={8}/>
                        {current?.id===artistPage.latestRelease.id&&<div style={{position:'absolute',inset:0,borderRadius:8,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>{playing?'\u23f8':'\u25b6'}</div>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,fontWeight:600,color:current?.id===artistPage.latestRelease.id?ACC:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{artistPage.latestRelease.title}</div>
                        <div style={{fontSize:11,color:TEXT_SEC,marginTop:3}}>{artistPage.latestRelease.duration}{artistPage.latestRelease.plays>0?` \u00b7 ${fmtP(artistPage.latestRelease.plays)} ${t('plays')}`:''}</div>
                      </div>
                      <HBtn track={artistPage.latestRelease} sz={18}/>
                    </div>
                  </div>
                )}

                {/* \u0422\u043e\u043f 5 \u043f\u043e\u043f\u0443\u043b\u044f\u0440\u043d\u044b\u0445 */}
                {artistPage.tracks.length>0&&(
                  <div style={{marginBottom:14}}>
                    <SectionLabel text={t('popular')}/>
                    <div style={{padding:'0 4px'}}>
                      {artistPage.tracks.slice(0,5).map((tr,i)=><TRow key={tr.id} track={tr} num={i+1} onArtistClick={(n,c)=>openArtist('',n,c,0)}/>)}
                    </div>
                  </div>
                )}

                {/* \u0414\u0438\u0441\u043a\u043e\u0433\u0440\u0430\u0444\u0438\u044f: \u0410\u043b\u044c\u0431\u043e\u043c\u044b | \u0422\u0440\u0435\u043a\u0438 */}
                <div style={{padding:'0 16px 16px'}}>
                  <SectionLabel text={t('discography')}/>
                  <div style={{display:'flex',gap:6,marginBottom:14}}>
                    {(['albums','tracks'] as const).map(tab=>(
                      <button
                        key={tab}
                        onClick={()=>{
                          setArtistTab(tab);
                          // \u041f\u0440\u0438 \u043f\u0435\u0440\u0435\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u0438 \u043d\u0430 \u0442\u0440\u0435\u043a\u0438 \u2014 \u0435\u0441\u043b\u0438 \u043f\u0443\u0441\u0442\u044b\u0435 \u0438 \u0435\u0441\u0442\u044c userId, \u0433\u0440\u0443\u0437\u0438\u043c
                          if(tab==='tracks'&&artistTracks.length===0&&artistUserId.current){
                            loadArtistTracks(artistUserId.current,0,true);
                          }
                        }}
                        style={{padding:'5px 16px',borderRadius:16,border:'none',background:artistTab===tab?ACC:ACC_DIM,color:artistTab===tab?BG:ACC,fontSize:12,fontWeight:artistTab===tab?600:400,cursor:'pointer',outline:'none'}}
                      >
                        {tab==='albums'?t('albumsTab'):t('tracks')}
                      </button>
                    ))}
                  </div>

                  {/* \u0412\u043a\u043b\u0430\u0434\u043a\u0430 \u0410\u043b\u044c\u0431\u043e\u043c\u044b */}
                  {artistTab==='albums'&&(
                    artistAlbumsLoading&&artistAlbums.length===0
                      ?<Spinner/>
                      :artistAlbums.length===0
                        ?<div style={{textAlign:'center',color:TEXT_MUTED,fontSize:12,padding:'20px 0'}}>{lang==='ru'?'\u0410\u043b\u044c\u0431\u043e\u043c\u044b \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b':'No albums found'}</div>
                        :<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                          {artistAlbums.map(al=>(
                            <div key={al.id} onClick={()=>openAlbum(al.id,al.title,al.artist,al.cover)} style={{cursor:'pointer'}}>
                              {/* \u041a\u0432\u0430\u0434\u0440\u0430\u0442\u043d\u043e\u0435 \u0438\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u0435 */}
                              <div style={{borderRadius:10,overflow:'hidden',marginBottom:6,boxShadow:'0 4px 12px rgba(0,0,0,0.4)'}}>
                                <AlbumImg src={al.cover} radius={0}/>
                              </div>
                              <div style={{fontSize:12,fontWeight:500,color:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{al.title}</div>
                              <div style={{fontSize:10,color:TEXT_MUTED,marginTop:2}}>
                                {(al.trackCount??0)>0?`${al.trackCount} \u0442\u0440\u0435\u043a\u043e\u0432`:lang==='ru'?'\u0410\u043b\u044c\u0431\u043e\u043c':'Album'}
                              </div>
                            </div>
                          ))}
                        </div>
                  )}

                  {/* \u0412\u043a\u043b\u0430\u0434\u043a\u0430 \u0422\u0440\u0435\u043a\u0438 */}
                  {artistTab==='tracks'&&(
                    <div>
                      {artistTracksLoading&&artistTracks.length===0
                        ?<Spinner/>
                        :<div>
                          {artistTracks.length===0
                            ?<div style={{textAlign:'center',color:TEXT_MUTED,fontSize:12,padding:'20px 0'}}>{t('noTracks')}</div>
                            :<div style={{padding:'0 4px'}}>
                              {artistTracks.map((tr,i)=><TRow key={tr.id+'t'+i} track={tr} num={i+1} onArtistClick={(n,c)=>openArtist('',n,c,0)}/>)}
                            </div>
                          }
                          {artistTracksLoading&&artistTracks.length>0&&(
                            <div style={{textAlign:'center',padding:'12px',color:TEXT_MUTED,fontSize:12}}>{t('loading')}</div>
                          )}
                          {artistTracksHasMore&&!artistTracksLoading&&(
                            <div style={{display:'flex',justifyContent:'center',padding:'12px 0'}}>
                              <button onClick={()=>loadArtistTracks(artistUserId.current,artistTracksOffset)} style={{padding:'9px 28px',background:ACC_DIM,border:`1px solid ${ACC}22`,borderRadius:11,color:ACC,fontSize:12,cursor:'pointer',outline:'none'}}>
                                {t('showMore')}
                              </button>
                            </div>
                          )}
                        </div>
                      }
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* \u2500\u2500 ALBUM PAGE \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        {screen==='album'&&(
          <div>
            <div style={{padding:'44px 16px 0'}}><BackBtn/></div>
            {albumLoading?<Spinner/>:albumPage&&(
              <div>
                <div style={{padding:'10px 16px 0',display:'flex',gap:14,alignItems:'center'}}>
                  <Img src={albumPage.cover} size={80} radius={10}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:16,fontWeight:700,color:TEXT_PRIMARY,lineHeight:1.3}}>{albumPage.title}</div>
                    <button onClick={()=>openArtist('',albumPage.artist,'',0)} style={{background:'none',border:'none',padding:0,cursor:'pointer',marginTop:4,display:'block',textAlign:'left' as const,outline:'none'}}>
                      <span style={{fontSize:12,color:ACC}}>{albumPage.artist}</span>
                    </button>
                    <div style={{fontSize:11,color:TEXT_MUTED,marginTop:4}}>{albumPage.tracks.length} {lang==='ru'?'\u0442\u0440\u0435\u043a\u043e\u0432':'tracks'}</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:7,padding:'12px 16px'}}>
                  <button onClick={()=>{if(albumPage.tracks.length){playTrack(albumPage.tracks[0]);setQueue(albumPage.tracks.slice(1));}}} style={{flex:1,padding:'10px',background:ACC,border:'none',borderRadius:10,color:BG,fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5,outline:'none'}}>
                    <div style={{width:0,height:0,borderStyle:'solid',borderWidth:'5px 0 5px 9px',borderColor:`transparent transparent transparent ${BG}`}}/>
                    {lang==='ru'?'\u0418\u0433\u0440\u0430\u0442\u044c':'Play'}
                  </button>
                  <button onClick={()=>{const sh=[...albumPage.tracks].sort(()=>Math.random()-.5);if(sh.length){playTrack(sh[0]);setQueue(sh.slice(1));}}} style={{flex:1,padding:'10px',background:ACC_DIM,border:`1px solid ${ACC}22`,borderRadius:10,color:ACC,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5,outline:'none'}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
                    {t('shuffle')}
                  </button>
                  <button onClick={()=>toggleFavAl(albumPage)} style={{padding:'10px 14px',borderRadius:10,border:`1px solid ${isFavAl(albumPage.id)?ACC:'#3a3a3a'}`,background:isFavAl(albumPage.id)?ACC_DIM:'transparent',color:isFavAl(albumPage.id)?ACC:TEXT_SEC,fontSize:15,cursor:'pointer',outline:'none'}}>
                    {isFavAl(albumPage.id)?'\u2665':'\u2661'}
                  </button>
                </div>
                {albumPage.tracks.length===0
                  ?<div style={{textAlign:'center',padding:'24px',color:TEXT_MUTED,fontSize:12}}>{lang==='ru'?'\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...':'Loading...'}</div>
                  :<div style={{padding:'0 4px'}}>
                    {albumPage.tracks.map((tr,i)=><TRow key={tr.id} track={tr} num={i+1} onArtistClick={(n,c)=>openArtist('',n,c,0)}/>)}
                  </div>
                }
              </div>
            )}
          </div>
        )}

        {/* \u2500\u2500 HOME \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        {screen==='home'&&(
          <div>
            <div style={{padding:'44px 16px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:21,fontWeight:700,color:TEXT_PRIMARY,letterSpacing:-0.3}}>{greeting(lang)}</div>
                <div style={{fontSize:12,color:ACC,marginTop:3,letterSpacing:1.5,fontWeight:600,opacity:0.85}}>FORTY7</div>
              </div>
              <button onClick={()=>setScreen('profile')} style={{display:'flex',alignItems:'center',gap:7,padding:'6px 11px',borderRadius:18,background:BG2,border:`1px solid #2e2e2e`,cursor:'pointer',flexShrink:0,maxWidth:140,outline:'none'}}>
                <div style={{width:22,height:22,borderRadius:'50%',background:ACC_DIM,border:`1px solid ${ACC}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:ACC,flexShrink:0}}>{uInit}</div>
                <span style={{fontSize:12,color:TEXT_SEC,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:88}}>{uHandle||uName}</span>
              </button>
            </div>
            {history.length>0&&(
              <div>
                <div style={{padding:'6px 0 8px'}}><SectionLabel text={t('recent')}/></div>
                <div style={{display:'flex',gap:10,padding:'0 16px',overflowX:'auto'}}>
                  {history.slice(0,8).map(tr=>(
                    <RecentCard
                      key={tr.id} track={tr}
                      isActive={current?.id===tr.id} isPlaying={current?.id===tr.id&&playing}
                      onPlay={()=>playTrack(tr)} onQueue={()=>addQ(tr)} inQueue={inQ(tr.id)}
                      onArtist={()=>openArtist('',tr.artist,tr.cover,0)} acc={ACC}
                    />
                  ))}
                </div>
              </div>
            )}
            <div style={{padding:'14px 0 6px'}}><SectionLabel text={t('recommended')}/></div>
            {recs.length===0&&history.length<2
              ?<div style={{padding:'0 16px',fontSize:12,color:TEXT_MUTED}}>{t('noRecommended')}</div>
              :<div style={{padding:'0 4px'}}>{(recs.length>0?recs:history.filter(tr=>tr.mp3)).slice(0,10).map((tr,i)=><TRow key={tr.id} track={tr} num={i+1} onArtistClick={(n,c)=>openArtist('',n,c,0)} showBlockBtn={true}/>)}</div>
            }
          </div>
        )}

        {/* \u2500\u2500 SEARCH \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        {screen==='search'&&(
          <div>
            <div style={{padding:'44px 16px 12px'}}>
              <div style={{fontSize:22,fontWeight:700,color:TEXT_PRIMARY,marginBottom:12,letterSpacing:-0.5}}>{t('search')}</div>
              <div style={{display:'flex',gap:8}}>
                <input type="text" placeholder={t('searchPlaceholder')} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch()}
                  style={{flex:1,padding:'11px 14px',fontSize:14,background:BG2,border:'1px solid #2a2a2a',borderRadius:12,color:TEXT_PRIMARY,outline:'none',width:'100%',boxSizing:'border-box' as const}}/>
                <button onClick={()=>doSearch()} disabled={loading} style={{padding:'11px 14px',background:loading?BG3:ACC,color:loading?TEXT_MUTED:BG,border:'none',borderRadius:12,fontSize:13,fontWeight:600,cursor:loading?'not-allowed':'pointer',flexShrink:0,outline:'none'}}>{loading?'...':t('find')}</button>
              </div>
              <div style={{display:'flex',gap:5,marginTop:9,overflowX:'auto'}}>
                {(['sound','albums','remix','artists'] as const).map(m=>(
                  <button key={m} onClick={()=>setSearchMode(m)} style={{padding:'5px 13px',borderRadius:16,border:'none',background:searchMode===m?ACC:ACC_DIM,color:searchMode===m?BG:ACC,fontSize:12,fontWeight:searchMode===m?600:400,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap' as const,outline:'none'}}>
                    {m==='sound'?t('sound'):m==='albums'?t('albumsTab'):m==='remix'?t('remix'):t('artists')}
                  </button>
                ))}
              </div>
              {error&&<div style={{marginTop:8,padding:'8px 12px',background:'#1a0a0a',borderRadius:9,color:'#d06060',fontSize:12}}>{error}</div>}
            </div>
            <div style={{padding:'0 4px'}}>
              {loading&&<div style={{textAlign:'center',paddingTop:36,color:TEXT_MUTED,fontSize:12}}>{t('loading')}</div>}
              {results.map((tr,i)=><TRow key={tr.id} track={tr} num={i+1} onArtistClick={(n,c)=>openArtist('',n,c,0)}/>)}
            </div>
          </div>
        )}

        {/* \u2500\u2500 LIBRARY \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        {screen==='library'&&(
          <div>
            <div style={{padding:'44px 16px 12px'}}><div style={{fontSize:22,fontWeight:700,color:TEXT_PRIMARY,letterSpacing:-0.5}}>{t('library')}</div></div>
            <div style={{display:'flex',gap:5,padding:'0 16px 12px',overflowX:'auto'}}>
              {(['liked','playlists','artists','albums'] as const).map(tab=>(
                <button key={tab} onClick={()=>setLibTab(tab)} style={{padding:'5px 13px',borderRadius:16,border:'none',background:libTab===tab?ACC:ACC_DIM,color:libTab===tab?BG:ACC,fontSize:12,fontWeight:libTab===tab?600:400,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap' as const,outline:'none'}}>
                  {tab==='liked'?t('likedTracks'):tab==='playlists'?t('playlists'):tab==='artists'?t('favArtists'):t('albums')}
                </button>
              ))}
            </div>
            {libTab==='liked'&&(liked.length===0
              ?<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:60}}><div style={{fontSize:38,marginBottom:12,filter:'sepia(1) saturate(3) hue-rotate(10deg)'}}>\ud83c\udfb5</div><div style={{fontSize:13,color:TEXT_MUTED}}>{t('noLiked')}</div></div>
              :<div style={{padding:'0 4px'}}>{liked.map((tr,i)=><TRow key={tr.id} track={tr} num={i+1} onArtistClick={(n,c)=>openArtist('',n,c,0)}/>)}</div>
            )}
            {libTab==='artists'&&(
              <div style={{padding:'0 16px'}}>
                {favArtists.length===0
                  ?<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:60}}><div style={{fontSize:38,marginBottom:12,filter:'sepia(1) saturate(3) hue-rotate(10deg)'}}>\ud83c\udfa4</div><div style={{fontSize:13,color:TEXT_MUTED}}>{lang==='ru'?'\u041d\u0435\u0442 \u0438\u0437\u0431\u0440\u0430\u043d\u043d\u044b\u0445 \u0430\u0440\u0442\u0438\u0441\u0442\u043e\u0432':'No favourite artists'}</div></div>
                  :favArtists.map(a=>(
                    <div key={a.id||a.name} onClick={()=>openArtist(a.permalink||'',a.name,a.avatar||'',a.followers)} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid #1e1e1e`,cursor:'pointer'}}>
                      <Img src={a.avatar||''} size={46} radius={23}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:500,color:TEXT_PRIMARY}}>{a.name}</div>
                        {a.username&&<div style={{fontSize:10,color:TEXT_SEC,marginTop:1}}>@{a.username}</div>}
                        {a.followers>0&&<div style={{fontSize:10,color:TEXT_SEC,marginTop:1}}>{fmtP(a.followers)} {lang==='ru'?'\u043f\u043e\u0434\u043f\u0438\u0441\u0447\u0438\u043a\u043e\u0432':'followers'}</div>}
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
                  ?<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:60}}><div style={{fontSize:38,marginBottom:12,filter:'sepia(1) saturate(3) hue-rotate(10deg)'}}>\ud83d\udcbf</div><div style={{fontSize:13,color:TEXT_MUTED}}>{lang==='ru'?'\u041d\u0435\u0442 \u0438\u0437\u0431\u0440\u0430\u043d\u043d\u044b\u0445 \u0430\u043b\u044c\u0431\u043e\u043c\u043e\u0432':'No favourite albums'}</div></div>
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
                <button onClick={()=>setShowNewPl(true)} style={{width:'100%',padding:'10px',background:ACC_DIM,border:`1px dashed ${ACC}44`,borderRadius:11,color:ACC,fontSize:12,cursor:'pointer',marginBottom:9,display:'flex',alignItems:'center',justifyContent:'center',gap:6,outline:'none'}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  {t('createPlaylist')}
                </button>
                {showNewPl&&(
                  <div style={{background:BG2,border:'1px solid #242424',borderRadius:11,padding:'11px',marginBottom:9}}>
                    <input autoFocus placeholder={t('playlistName')} value={newPlName} onChange={e=>setNewPlName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createPl()}
                      style={{width:'100%',padding:'8px 11px',fontSize:13,background:BG,border:'1px solid #2a2a2a',borderRadius:7,color:TEXT_PRIMARY,outline:'none',boxSizing:'border-box' as const,marginBottom:7}}/>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={createPl} style={{flex:1,padding:'8px',background:ACC,border:'none',borderRadius:7,color:BG,fontSize:12,fontWeight:600,cursor:'pointer',outline:'none'}}>{t('create')}</button>
                      <button onClick={()=>{setShowNewPl(false);setNewPlName('');}} style={{flex:1,padding:'8px',background:BG3,border:'none',borderRadius:7,color:TEXT_SEC,fontSize:12,cursor:'pointer',outline:'none'}}>{t('cancel')}</button>
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
                          {pl.tracks.length===0&&<div style={{gridColumn:'span 2',gridRow:'span 2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,color:ACC}}>\ud83c\udfb5</div>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:500,color:TEXT_PRIMARY}}>{pl.name}</div>
                          <div style={{fontSize:10,color:TEXT_SEC,marginTop:2}}>{pl.tracks.length} {lang==='ru'?'\u0442\u0440\u0435\u043a\u043e\u0432':'tracks'}</div>
                        </div>
                        <button onClick={e=>{e.stopPropagation();playPl(pl);}} style={{width:34,height:34,minWidth:34,borderRadius:'50%',background:ACC,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,padding:0,outline:'none'}}>
                          <div style={{width:0,height:0,borderStyle:'solid',borderWidth:'6px 0 6px 10px',borderColor:`transparent transparent transparent ${BG}`,marginLeft:3}}/>
                        </button>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5a5a5a" strokeWidth="2" strokeLinecap="round" style={{transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.2s',flexShrink:0}}><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                      {isOpen&&(
                        <div>
                          <div style={{display:'flex',gap:5,padding:'0 13px 9px'}}>
                            <button onClick={()=>shufflePl(pl)} style={{flex:1,padding:'7px',background:ACC_DIM,border:'none',borderRadius:7,color:ACC,fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4,outline:'none'}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>{t('shuffle')}</button>
                            <button onClick={()=>setPlaylists(prev=>{const n=prev.map(p=>p.id===pl.id?{...p,repeat:!p.repeat}:p);try{localStorage.setItem('p47',JSON.stringify(n));}catch{}return n;})} style={{flex:1,padding:'7px',background:pl.repeat?ACC:ACC_DIM,border:'none',borderRadius:7,color:pl.repeat?BG:ACC,fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4,outline:'none'}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={pl.repeat?BG:ACC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>{t('repeatPl')}</button>
                          </div>
                          <div style={{borderTop:'1px solid #1e1e1e'}}>
                            {pl.tracks.length===0
                              ?<div style={{padding:'14px',textAlign:'center',color:TEXT_MUTED,fontSize:11}}>{lang==='ru'?'\u041d\u0435\u0442 \u0442\u0440\u0435\u043a\u043e\u0432':'No tracks'}</div>
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

        {/* \u2500\u2500 TRENDING \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        {screen==='trending'&&(()=>{
          const ct=trends[trendGenre]||[];
          return(
            <div>
              <div style={{padding:'44px 16px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:22,fontWeight:700,color:TEXT_PRIMARY,letterSpacing:-0.5}}>{t('trending')}</div>
                <button onClick={()=>loadTrend(trendGenre,true)} style={{background:'none',border:'none',cursor:'pointer',padding:4,outline:'none'}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5a5a5a" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg></button>
              </div>
              <div style={{display:'flex',gap:6,padding:'0 16px 12px',overflowX:'auto'}}>
                {GENRES.map(g=>(
                  <button key={g.id} onClick={()=>setTrendGenre(g.id)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'8px 11px',borderRadius:12,border:trendGenre===g.id?`1px solid ${ACC}44`:'1px solid #222',background:trendGenre===g.id?ACC_DIM:BG2,color:trendGenre===g.id?ACC:TEXT_SEC,cursor:'pointer',flexShrink:0,minWidth:54,transition:'all 0.15s',outline:'none'}}>
                    <span style={{fontSize:19}}>{g.e}</span>
                    <span style={{fontSize:9,fontWeight:trendGenre===g.id?600:400,whiteSpace:'nowrap'}}>{g.label}</span>
                  </button>
                ))}
              </div>
              {trendLoading&&ct.length===0?<Spinner/>
                :ct.length===0
                  ?<div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'60px 20px 0',textAlign:'center'}}><div style={{fontSize:38,marginBottom:12}}>\ud83d\udcc8</div><div style={{fontSize:13,color:TEXT_MUTED}}>{t('notFound')}</div><button onClick={()=>loadTrend(trendGenre,true)} style={{marginTop:12,padding:'8px 20px',background:ACC_DIM,border:'none',borderRadius:9,color:ACC,fontSize:12,cursor:'pointer',outline:'none'}}>{t('retry')}</button></div>
                  :<div>
                    <div style={{padding:'0 4px'}}>{ct.map((tr,i)=><TRow key={tr.id+i} track={tr} num={i+1} onArtistClick={(n,c)=>openArtist('',n,c,0)}/>)}</div>
                    <div style={{padding:'10px 16px 6px',display:'flex',justifyContent:'center'}}><button onClick={()=>loadTrend(trendGenre,false)} disabled={trendLoading} style={{padding:'9px 32px',background:ACC_DIM,border:`1px solid ${ACC}22`,borderRadius:11,color:ACC,fontSize:12,cursor:trendLoading?'not-allowed':'pointer',opacity:trendLoading?.5:1,outline:'none'}}>{trendLoading?t('loading'):t('loadMore')}</button></div>
                  </div>
              }
            </div>
          );
        })()}

        {/* \u2500\u2500 PROFILE \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        {screen==='profile'&&(
          <div>
            <div style={{padding:'44px 16px 18px',display:'flex',alignItems:'center',gap:4}}>
              <button onClick={()=>setScreen('home')} style={{background:'none',border:'none',cursor:'pointer',padding:'4px 8px 4px 0',display:'flex',alignItems:'center',gap:5,outline:'none'}}>
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
                    <button key={l} onClick={()=>chgLang(l)} style={{flex:1,padding:'9px',borderRadius:9,border:'none',background:lang===l?ACC:BG2,color:lang===l?BG:TEXT_SEC,fontSize:13,fontWeight:lang===l?600:400,cursor:'pointer',outline:'none'}}>
                      {l==='ru'?'\ud83c\uddf7\ud83c\uddfa \u0420\u0443\u0441\u0441\u043a\u0438\u0439':'\ud83c\uddfa\ud83c\uddf8 English'}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={()=>syncSave({liked,playlists,history,volume,favArtists,favAlbums})} style={{width:'100%',marginTop:9,padding:'11px',background:ACC_DIM,border:`1px solid ${ACC}22`,borderRadius:11,color:ACC,fontSize:12,cursor:'pointer',outline:'none'}}>\ud83d\udd04 {t('syncBtn')}</button>
              <button onClick={()=>{try{localStorage.clear();}catch{}setLiked([]);setPlaylists([]);setHistory([]);setRecs([]);setQueue([]);setFavArtists([]);setFavAlbums([]);}} style={{width:'100%',marginTop:6,padding:'11px',background:'#1a0a0a',border:'1px solid #2a1010',borderRadius:11,color:'#c05050',fontSize:12,cursor:'pointer',outline:'none'}}>{t('resetData')}</button>
            </div>
          </div>
        )}
      </div>

      {addToPl&&!fullPlayer&&<PlModal track={addToPl}/>}

      {/* \u2500\u2500 MINI PLAYER \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      {current&&(
        <div style={{position:'fixed',bottom:NAV_H+5,left:8,right:8,background:MINI_BG,backdropFilter:'blur(20px)',border:'1px solid #3a3228',borderRadius:14,padding:'9px 12px 8px',zIndex:100}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:7}}>
            <div onClick={()=>setFullPlayer(true)} style={{cursor:'pointer',flexShrink:0}}><Img src={current.cover} size={38} radius={7}/></div>
            <div onClick={()=>setFullPlayer(true)} style={{flex:1,minWidth:0,cursor:'pointer'}}>
              <div style={{fontSize:12,fontWeight:500,color:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{current.title}</div>
              <div style={{fontSize:10,color:TEXT_SEC,marginTop:1}}>{current.artist}</div>
            </div>
            {/* \u0413\u0440\u043e\u043c\u043a\u043e\u0441\u0442\u044c \u0441\u043b\u0435\u0432\u0430 \u043e\u0442 \u043f\u043b\u0435\u044f */}
            <div style={{display:'flex',alignItems:'center',gap:5,flexShrink:0}}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#5a5a5a" strokeWidth="2" strokeLinecap="round" style={{flexShrink:0}}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>
              <div {...volSP} ref={volSP.ref} style={{width:40,height:16,display:'flex',alignItems:'center',cursor:'pointer',touchAction:'none'}}>
                <div style={{width:'100%',height:2.5,background:'rgba(255,255,255,0.08)',borderRadius:2,position:'relative'}}>
                  <div style={{width:`${volume*100}%`,height:'100%',background:'#6a6050',borderRadius:2}}/>
                  <div style={{position:'absolute',top:'50%',left:`${volume*100}%`,transform:'translate(-50%,-50%)',width:8,height:8,background:'#8a8070',borderRadius:'50%'}}/>
                </div>
              </div>
              <button onClick={e=>{e.stopPropagation();togglePlay();}} style={{width:38,height:38,minWidth:38,borderRadius:'50%',background:ACC,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,padding:0,outline:'none'}}>
                <PP sz="sm" col={BG}/>
              </button>
            </div>
          </div>
          {/* \u041f\u0435\u0440\u0435\u043c\u0430\u0442\u044b\u0432\u0430\u0435\u043c\u044b\u0439 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u0441\u043d\u0438\u0437\u0443 */}
          <div style={{display:'flex',alignItems:'center',gap:7}}>
            <span style={{fontSize:9,color:TEXT_MUTED,minWidth:26,textAlign:'right'}}>{curTime}</span>
            <div {...miniSeekSP} ref={miniSeekSP.ref} style={{flex:1,height:16,display:'flex',alignItems:'center',cursor:'pointer',touchAction:'none'}}>
              <div style={{width:'100%',height:2.5,background:'rgba(255,255,255,0.08)',borderRadius:2,position:'relative'}}>
                <div style={{width:`${progress}%`,height:'100%',background:ACC,borderRadius:2,transition:'none'}}/>
                <div style={{position:'absolute',top:'50%',left:`${progress}%`,transform:'translate(-50%,-50%)',width:10,height:10,background:ACC,borderRadius:'50%'}}/>
              </div>
            </div>
            <span style={{fontSize:9,color:TEXT_MUTED,minWidth:26}}>{current.duration}</span>
          </div>
        </div>
      )}

      {/* \u2500\u2500 NAV \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      {screen!=='profile'&&screen!=='artist'&&screen!=='album'&&(
        <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(10,10,10,0.97)',backdropFilter:'blur(20px)',borderTop:'1px solid #1e1e1e',padding:'7px 0 13px',display:'flex',justifyContent:'space-around',zIndex:101,height:NAV_H}}>
          {NAV.map(item=>{
            const nr=useRef<{x:number,y:number}|null>(null);
            return(<div key={item.id}
              onPointerDown={e=>{nr.current={x:e.clientX,y:e.clientY};}}
              onPointerUp={e=>{if(!nr.current)return;const dx=Math.abs(e.clientX-nr.current.x);const dy=Math.abs(e.clientY-nr.current.y);nr.current=null;if(dx<10&&dy<10)setScreen(item.id as 'home'|'search'|'library'|'trending');}}
              onPointerCancel={()=>{nr.current=null;}}
              style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,cursor:'pointer',padding:'8px 4px 10px'}}>
              {item.icon(screen===item.id)}<span style={{fontSize:10,color:screen===item.id?ACC:'#606060',letterSpacing:0.3}}>{item.lbl()}</span>
            </div>);
          })}
        </div>
      )}
    </div>
  );
}
