import React,{ useState, useEffect, useRef, useCallback } from 'react';
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

// ── ГЛОБАЛЬНЫЙ СВАЙП-МЕНЕДЖЕР ──
// Работает на уровне window, полностью вне React.
// React ре-рендеры не влияют на него никак.
const SwipeManager = (() => {
  type SwipeItem = {
    el: HTMLElement;           // wrapper элемент
    inner: HTMLElement;        // элемент который двигается
    bgR?: HTMLElement | null;  // фон вправо
    bgL?: HTMLElement | null;  // фон влево
    onRight: () => void;
    onLeft?: () => void;
    onTap: () => void;
    threshold: number;
  };

  const items = new Map<number, SwipeItem>(); // pointerId → item
  let registeredItems: Array<{el: HTMLElement} & SwipeItem> = [];

  type State = {
    item: SwipeItem;
    sx: number; sy: number; st: number;
    dx: number;
    captured: boolean;
    pid: number;
  };
  let active: State | null = null;

  const applyDx = (item: SwipeItem, dx: number, animated = false) => {
    const c = Math.max(-80, Math.min(80, dx));
    item.inner.style.transition = animated ? 'transform 0.2s ease' : 'none';
    item.inner.style.transform = c !== 0 ? `translateX(${c}px)` : '';
    if (item.bgR) item.bgR.style.opacity = dx > 6 ? String(Math.min(1, dx / 55)) : '0';
    if (item.bgL) item.bgL.style.opacity = dx < -6 ? String(Math.min(1, -dx / 55)) : '0';
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    const target = e.target as HTMLElement;
    const item = registeredItems.find(r => r.el === target || r.el.contains(target));
    if (!item) return;
    active = { item, sx: e.clientX, sy: e.clientY, st: Date.now(), dx: 0, captured: false, pid: e.pointerId };
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!active || active.pid !== e.pointerId) return;
    const dx = e.clientX - active.sx;
    const dy = Math.abs(e.clientY - active.sy);
    if (!active.captured) {
      if (dy > Math.abs(dx) * 1.3 && dy > 5) { active = null; return; }
      if (Math.abs(dx) < 6) return;
      active.captured = true;
      // Захватываем pointer на wrapper элементе
      try { active.item.el.setPointerCapture(e.pointerId); } catch {}
    }
    active.dx = dx;
    applyDx(active.item, dx);
    e.preventDefault();
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!active || active.pid !== e.pointerId) return;
    const { item, dx, sx, sy, st, captured } = active;
    active = null;
    applyDx(item, 0, true);
    if (captured) {
      if (dx > 45) item.onRight();
      else if (dx < -45 && item.onLeft) item.onLeft();
      return;
    }
    const elapsed = Date.now() - st;
    const moved = Math.abs(e.clientX - sx) < 10 && Math.abs(e.clientY - sy) < 10;
    if (elapsed < 400 && moved) {
      item.onTap();
      // Помечаем элемент чтобы onClick не сработал двойно
      (item.el as any).__swipeTapped = true;
      setTimeout(() => { (item.el as any).__swipeTapped = false; }, 300);
    }
  };

  const onPointerCancel = (e: PointerEvent) => {
    if (!active || active.pid !== e.pointerId) return;
    applyDx(active.item, 0, true);
    active = null;
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerCancel, { passive: true });
  }

  return {
    register(item: SwipeItem) {
      registeredItems.push({ ...item });
    },
    unregister(el: HTMLElement) {
      registeredItems = registeredItems.filter(r => r.el !== el);
      if (active?.item.el === el) active = null;
    },
  };
})();

// Хук для регистрации свайп-строки
function useSwipeRow(opts: {
  onRight: () => void;
  onLeft?: () => void;
  onTap: () => void;
  threshold?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const bgRRef = useRef<HTMLDivElement>(null);
  const bgLRef = useRef<HTMLDivElement>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const el = wrapRef.current;
    const inner = innerRef.current;
    if (!el || !inner) return;
    const item = {
      el, inner,
      get bgR() { return bgRRef.current; },
      get bgL() { return bgLRef.current; },
      get onRight() { return optsRef.current.onRight; },
      get onLeft() { return optsRef.current.onLeft; },
      get onTap() { return optsRef.current.onTap; },
      threshold: opts.threshold ?? 45,
    };
    SwipeManager.register(item);
    return () => SwipeManager.unregister(el);
  }, []); // [] — только mount/unmount, не зависит от пропсов

  return { wrapRef, innerRef, bgRRef, bgLRef };
}



interface Track {
  id: string; title: string; artist: string; cover: string;
  duration: string; plays: number; mp3: string | null;
  isArtist?: boolean; isAlbum?: boolean; permalink?: string;
  trackCount?: number; albumId?: string; albumTitle?: string;
}
interface Playlist { id: string; name: string; tracks: Track[]; repeat: boolean; sort?: 'default'|'az'|'za'|'artist'|'newest'|'oldest'; }
interface AlbumInfo { id: string; title: string; artist: string; cover: string; tracks: Track[]; permalink: string; trackCount?: number; plays?: number; }
interface ArtistInfo {
  id: string; name: string; username: string; avatar: string; banner: string;
  followers: number; permalink: string; tracks: Track[];
  albums: AlbumInfo[]; latestRelease: Track | null;
}

const T: Record<string,Record<string,string>> = {
  uk: {
    home:'Головна',search:'Пошук',library:'Бібліотека',trending:'Для тебе',profile:'Профіль',
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
    importPlaylist:'Імпорт плейлиста',importTabMain:'Spotify / YouTube',importTabOther:'Яндекс / Apple',
    importLinkHint:'Встав посилання на плейлист',importFindBtn:'Знайти плейлист',
    importLoading:'Завантажуємо плейлист...',importMatching:'Шукаємо треки на SoundCloud...',
    importDone:'Готово!',importFound:'Знайдено',importOf:'з',importTracksWord:'треків',
    importOpen:'Відкрити плейлист',importOtherTitle:'Яндекс Музика або Apple Music?',
    importOtherStep1:'Відкрий',importOtherStep2:'і підключи свій акаунт',
    importOtherStep3:'Вибери плейлист і перенеси його в SoundCloud',
    importOtherStep4:'Поверніться сюди і вставте посилання SoundCloud плейлиста',
    importOtherBtn:'Відкрити Soundiiz',importNotFound:'не знайдено на SoundCloud',spotifyConnect:'Підключити Spotify',spotifyConnected:'Spotify підключено',spotifyDisconnect:'Відключити Spotify',
  },
  kk: {
    home:'Басты',search:'Іздеу',library:'Медиатека',trending:'Сен үшін',profile:'Профиль',
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
    importPlaylist:'Плейлист импорты',importTabMain:'Spotify / YouTube',importTabOther:'Яндекс / Apple',
    importLinkHint:'Плейлист сілтемесін қой',importFindBtn:'Плейлист табу',
    importLoading:'Плейлист жүктелуде...',importMatching:'SoundCloud-та іздеуде...',
    importDone:'Дайын!',importFound:'Табылды',importOf:'/',importTracksWord:'трек',
    importOpen:'Плейлистті ашу',importOtherTitle:'Яндекс Музыка немесе Apple Music?',
    importOtherStep1:'Ашу',importOtherStep2:'және аккаунтты қосу',
    importOtherStep3:'Плейлистті таңдап SoundCloud-қа көшір',
    importOtherStep4:'Осында оралып SoundCloud плейлист сілтемесін қой',
    importOtherBtn:'Soundiiz ашу',importNotFound:'SoundCloud-та табылмады',spotifyConnect:'Spotify қосу',spotifyConnected:'Spotify қосылды',spotifyDisconnect:'Spotify ажырату',
  },
  pl: {
    home:'Główna',search:'Szukaj',library:'Biblioteka',trending:'Dla Ciebie',profile:'Profil',
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
    importPlaylist:'Importuj playlistę',importTabMain:'Spotify / YouTube',importTabOther:'Yandex / Apple',
    importLinkHint:'Wklej link do playlisty',importFindBtn:'Znajdź playlistę',
    importLoading:'Ładowanie playlisty...',importMatching:'Szukamy na SoundCloud...',
    importDone:'Gotowe!',importFound:'Znaleziono',importOf:'z',importTracksWord:'utworów',
    importOpen:'Otwórz playlistę',importOtherTitle:'Yandex Music lub Apple Music?',
    importOtherStep1:'Otwórz',importOtherStep2:'i połącz swoje konto',
    importOtherStep3:'Wybierz playlistę i przenieś ją do SoundCloud',
    importOtherStep4:'Wróć tutaj i wklej link do playlisty SoundCloud',
    importOtherBtn:'Otwórz Soundiiz',importNotFound:'nie znaleziono na SoundCloud',spotifyConnect:'Połącz Spotify',spotifyConnected:'Spotify połączono',spotifyDisconnect:'Odłącz Spotify',
  },
  tr: {
    home:'Ana Sayfa',search:'Ara',library:'Kütüphane',trending:'Senin İçin',profile:'Profil',
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
    importPlaylist:'Çalma Listesi İçe Aktar',importTabMain:'Spotify / YouTube',importTabOther:'Yandex / Apple',
    importLinkHint:'Çalma listesi bağlantısını yapıştır',importFindBtn:'Çalma listesini bul',
    importLoading:'Çalma listesi yükleniyor...',importMatching:'SoundCloud\'da aranıyor...',
    importDone:'Tamam!',importFound:'Bulundu',importOf:'/',importTracksWord:'parça',
    importOpen:'Çalma listesini aç',importOtherTitle:'Yandex Music veya Apple Music?',
    importOtherStep1:'Aç',importOtherStep2:'ve hesabını bağla',
    importOtherStep3:'Çalma listeni seç ve SoundCloud\'a aktar',
    importOtherStep4:'Buraya dön ve SoundCloud çalma listesi bağlantısını yapıştır',
    importOtherBtn:'Soundiiz\'i Aç',importNotFound:'SoundCloud\'da bulunamadı',
  },
  en: {
    home:'Home',search:'Search',library:'Library',trending:'For You',profile:'Profile',
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
    importPlaylist:'Import Playlist',importTabMain:'Spotify / YouTube',importTabOther:'Yandex / Apple',
    importLinkHint:'Paste a playlist link',importFindBtn:'Find Playlist',
    importLoading:'Loading playlist...',importMatching:'Searching on SoundCloud...',
    importDone:'Done!',importFound:'Found',importOf:'of',importTracksWord:'tracks',
    importOpen:'Open Playlist',importOtherTitle:'Yandex Music or Apple Music?',
    importOtherStep1:'Open',importOtherStep2:'and connect your account',
    importOtherStep3:'Select your playlist and transfer it to SoundCloud',
    importOtherStep4:'Come back here and paste the SoundCloud playlist link',
    importOtherBtn:'Open Soundiiz',importNotFound:'not found on SoundCloud',spotifyConnect:'Connect Spotify',spotifyConnected:'Spotify Connected',spotifyDisconnect:'Disconnect Spotify',
  },
  ru: {
    home:'Главная',search:'Поиск',library:'Библиотека',trending:'Для тебя',profile:'Профиль',
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
    importPlaylist:'Импорт плейлиста',importTabMain:'Spotify / YouTube',importTabOther:'Яндекс / Apple',
    importLinkHint:'Вставь ссылку на плейлист',importFindBtn:'Найти плейлист',
    importLoading:'Загружаем плейлист...',importMatching:'Ищем треки на SoundCloud...',
    importDone:'Готово!',importFound:'Найдено',importOf:'из',importTracksWord:'треков',
    importOpen:'Открыть плейлист',importOtherTitle:'Яндекс Музыка или Apple Music?',
    importOtherStep1:'Открой',importOtherStep2:'и подключи свой аккаунт',
    importOtherStep3:'Выбери плейлист и перенеси его в SoundCloud',
    importOtherStep4:'Вернись сюда и вставь ссылку на плейлист SoundCloud',
    importOtherBtn:'Открыть Soundiiz',importNotFound:'не найден на SoundCloud',spotifyConnect:'Подключить Spotify',spotifyConnected:'Spotify подключён',spotifyDisconnect:'Отключить Spotify',
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
  const prevSrc=useRef('');
  // Только сбрасываем ошибку если src реально изменился
  if(src&&src!==prevSrc.current){prevSrc.current=src;if(e)sE(false);}
  const s:React.CSSProperties={width:size,height:size,borderRadius:radius,flexShrink:0,display:'block'};
  // Пустой src — сразу показываем fallback без попытки загрузки
  if(!src||e)return<div style={{...s,background:BG3,display:'flex',alignItems:'center',justifyContent:'center',fontSize:Math.floor(size*.36),color:ACC}}>{fb}</div>;
  return<img src={src} style={{...s,objectFit:'cover'}} onError={()=>sE(true)}/>;
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

function MiniSlider({val,onChange}:{val:number;onChange:(v:number)=>void}){
  const trackRef=useRef<HTMLDivElement>(null);
  const[dragging,setDragging]=useState(false);
  const[disp,setDisp]=useState(val);

  useEffect(()=>{
    if(!dragging)setDisp(val);
  },[val,dragging]);

  const updateFromClientX=useCallback((clientX:number)=>{
    const el=trackRef.current;
    if(!el)return;
    const rect=el.getBoundingClientRect();
    const next=Math.max(0,Math.min(1,(clientX-rect.left)/rect.width));
    setDisp(next);
    onChange(next);
  },[onChange]);

  const onPointerDown=(e:React.PointerEvent<HTMLDivElement>)=>{
    e.stopPropagation();
    e.preventDefault();
    const el=trackRef.current;
    if(!el)return;
    setDragging(true);
    el.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };
  const onPointerMove=(e:React.PointerEvent<HTMLDivElement>)=>{
    if(!dragging)return;
    e.stopPropagation();
    updateFromClientX(e.clientX);
  };
  const onPointerUp=(e:React.PointerEvent<HTMLDivElement>)=>{
    if(!dragging)return;
    e.stopPropagation();
    updateFromClientX(e.clientX);
    setDragging(false);
  };
  const onPointerCancel=()=>{setDragging(false);};

  return(
    <div
      ref={trackRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{width:'100%',height:18,display:'flex',alignItems:'center',cursor:'pointer',touchAction:'none',userSelect:'none' as const}}
    >
      <div style={{width:'100%',height:3,background:'rgba(255,255,255,0.1)',borderRadius:999,position:'relative'}}>
        <div style={{width:`${disp*100}%`,height:'100%',background:ACC,borderRadius:999}}/>
        <div style={{position:'absolute',top:'50%',left:`${disp*100}%`,transform:'translate(-50%,-50%)',width:12,height:12,borderRadius:'50%',background:ACC,pointerEvents:'none'}}/>
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


// ══════════════════════════════════════════════════════════
// СТАБИЛЬНЫЕ МОДАЛКИ — вне App, не пересоздаются при ре-рендере
// ══════════════════════════════════════════════════════════

interface PlModalProps {
  track: Track;
  playlists: Playlist[];
  onClose: () => void;
  onAdd: (plId: string, track: Track) => void;
  lang: string;
  t: (k: string) => string;
}

const PlModalExt = React.memo(({track, playlists, onClose, onAdd, lang, t}: PlModalProps) => {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'flex-end',zIndex:300}} onPointerDown={onClose}>
      <div className="modal-sheet" style={{background:'#1a1a1a',width:'100%',borderRadius:'18px 18px 0 0',padding:'18px 16px 36px'}} onPointerDown={e=>e.stopPropagation()}>
        <div style={{fontSize:14,fontWeight:600,color:TEXT_PRIMARY,marginBottom:12}}>{t('addToPlaylist')}</div>
        {playlists.length===0
          ? <div style={{color:TEXT_MUTED,fontSize:12,textAlign:'center',padding:'16px 0'}}>{t('noPlaylists')}</div>
          : playlists.map(pl=>(
              <div key={pl.id} onPointerDown={()=>onAdd(pl.id,track)}
                style={{padding:'11px 12px',borderRadius:9,background:BG3,marginBottom:5,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{color:'#d0d0d0',fontSize:13}}>{pl.name}</span>
                <span style={{color:TEXT_MUTED,fontSize:11}}>{pl.tracks.length}</span>
              </div>
            ))
        }
        <button onPointerDown={onClose} style={{width:'100%',padding:'10px',background:BG3,border:'none',borderRadius:9,color:TEXT_SEC,fontSize:12,cursor:'pointer',marginTop:4}}>{t('cancel')}</button>
      </div>
    </div>
  );
});


type ImportStep = 'idle'|'fetching'|'preview'|'matching'|'done'|'error';
type ImportPreview = {source:string;title:string;cover:string;totalTracks:number;tracks:{sourceTitle:string;sourceArtist:string}[]}|null;
type ImportResult = {imported:{sourceTitle:string;sourceArtist:string};matched:Track|null;status:string};

interface ImportModalProps {
  importStep: ImportStep;
  setImportStep: (s: ImportStep) => void;
  importTab: 'main'|'other';
  setImportTab: (t: 'main'|'other') => void;
  importUrl: string;
  setImportUrl: (u: string) => void;
  importError: string;
  setImportError: (e: string) => void;
  importPreview: ImportPreview;
  setImportPreview: (p: ImportPreview) => void;
  importResults: ImportResult[];
  importProgress: number;
  onClose: () => void;
  onImport: () => void;
  onMatch: (title: string) => void;
  lang: string;
  t: (k: string) => string;
}

const ImportModalExt = React.memo(({
  importStep, setImportStep, importTab, setImportTab,
  importUrl, setImportUrl, importError, importPreview,
  importResults, importProgress, onClose, onImport, onMatch, lang, t
}: ImportModalProps) => {
  const tap: React.CSSProperties = {outline:'none',WebkitTapHighlightColor:'transparent' as any};

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:400,display:'flex',alignItems:'flex-end'}}
      onPointerDown={()=>{if(importStep!=='matching')onClose();}}>
      <div className="modal-sheet" style={{background:'#1a1a1a',width:'100%',borderRadius:'18px 18px 0 0',padding:'18px 16px 40px',maxHeight:'88vh',overflowY:'auto'}}
        onPointerDown={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{fontSize:15,fontWeight:700,color:TEXT_PRIMARY}}>{t('importPlaylist')}</div>
          {importStep!=='matching'&&<button onPointerDown={onClose} style={{background:'none',border:'none',cursor:'pointer',color:TEXT_SEC,fontSize:20,padding:4,lineHeight:1,...tap}}>×</button>}
        </div>

        {/* Tabs */}
        {(importStep==='idle'||importStep==='error')&&(
          <div style={{display:'flex',gap:6,marginBottom:16,background:BG,borderRadius:12,padding:4}}>
            {(['main','other'] as const).map(tab=>(
              <button key={tab} onPointerDown={()=>{setImportTab(tab);setImportUrl('');}}
                style={{flex:1,padding:'8px 0',borderRadius:9,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,
                  background:importTab===tab?'#2a2a2a':'transparent',
                  color:importTab===tab?TEXT_PRIMARY:TEXT_MUTED,...tap}}>
                {tab==='main'?t('importTabMain'):t('importTabOther')}
              </button>
            ))}
          </div>
        )}

        {/* Main tab */}
        {(importStep==='idle'||importStep==='error')&&importTab==='main'&&(<>
          <div style={{display:'flex',gap:6,marginBottom:12}}>
            {[{icon:'🟢',label:'Spotify'},{icon:'🔴',label:'YouTube'},{icon:'🟠',label:'SoundCloud'}].map(s=>(
              <div key={s.label} style={{padding:'4px 10px',background:BG3,borderRadius:8,fontSize:10,color:TEXT_MUTED,display:'flex',alignItems:'center',gap:4}}>
                <span>{s.icon}</span><span>{s.label}</span>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:TEXT_MUTED,marginBottom:8}}>{t('importLinkHint')}</div>
          <input
            autoFocus
            placeholder="https://open.spotify.com/playlist/..."
            value={importUrl}
            onChange={e=>setImportUrl(e.target.value)}
            style={{width:'100%',padding:'12px 13px',fontSize:13,background:BG,border:`1px solid ${importStep==='error'?'#d06060':'#2a2a2a'}`,borderRadius:10,color:TEXT_PRIMARY,outline:'none',boxSizing:'border-box' as const,marginBottom:8}}
          />
          {importStep==='error'&&importError&&(
            <div style={{padding:'8px 12px',background:'#1a0808',borderRadius:8,color:'#d06060',fontSize:12,marginBottom:8}}>{importError}</div>
          )}
          <button onPointerDown={onImport} disabled={!importUrl.trim()}
            style={{width:'100%',padding:'13px',background:importUrl.trim()?ACC:BG3,border:'none',borderRadius:10,color:importUrl.trim()?BG:TEXT_MUTED,fontSize:13,fontWeight:700,cursor:importUrl.trim()?'pointer':'default',...tap}}>
            {t('importFindBtn')}
          </button>
        </>)}

        {/* Other tab */}
        {(importStep==='idle'||importStep==='error')&&importTab==='other'&&(<>
          <div style={{fontSize:13,fontWeight:600,color:TEXT_PRIMARY,marginBottom:12}}>{t('importOtherTitle')}</div>
          {[
            {num:'1',text:<>{t('importOtherStep1')} <span style={{color:ACC,fontWeight:600}}>soundiiz.com</span> {t('importOtherStep2')}</>},
            {num:'2',text:t('importOtherStep3')},
            {num:'3',text:t('importOtherStep4')},
          ].map(step=>(
            <div key={step.num} style={{display:'flex',gap:10,marginBottom:12,alignItems:'flex-start'}}>
              <div style={{width:24,height:24,borderRadius:'50%',background:'rgba(239,191,127,0.13)',border:`1px solid ${ACC}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:11,fontWeight:700,color:ACC}}>{step.num}</div>
              <div style={{fontSize:13,color:TEXT_SEC,lineHeight:1.55,paddingTop:2}}>{step.text}</div>
            </div>
          ))}
          <a href="https://soundiiz.com/" target="_blank" rel="noreferrer"
            style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,width:'100%',padding:'13px',background:'#1a2a1a',border:'1px solid #2a4a2a',borderRadius:10,color:'#7ecf7e',fontSize:13,fontWeight:700,cursor:'pointer',textDecoration:'none',marginBottom:14,boxSizing:'border-box' as const}}
            onClick={e=>{e.preventDefault();const tgObj=(window as any).Telegram?.WebApp;if(tgObj?.openLink)tgObj.openLink('https://soundiiz.com/');else window.open('https://soundiiz.com/','_blank');}}>
            🔗 {t('importOtherBtn')}
          </a>
          <div style={{fontSize:11,color:TEXT_MUTED,marginBottom:8}}>{t('importLinkHint')} (SoundCloud)</div>
          <input placeholder="https://soundcloud.com/user/sets/..."
            value={importUrl} onChange={e=>setImportUrl(e.target.value)}
            style={{width:'100%',padding:'12px 13px',fontSize:13,background:BG,border:'1px solid #2a2a2a',borderRadius:10,color:TEXT_PRIMARY,outline:'none',boxSizing:'border-box' as const,marginBottom:8}}/>
          <button onPointerDown={onImport} disabled={!importUrl.trim()}
            style={{width:'100%',padding:'13px',background:importUrl.trim()?ACC:BG3,border:'none',borderRadius:10,color:importUrl.trim()?BG:TEXT_MUTED,fontSize:13,fontWeight:700,cursor:importUrl.trim()?'pointer':'default',...tap}}>
            {t('importFindBtn')}
          </button>
        </>)}

        {/* Fetching */}
        {importStep==='fetching'&&(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'36px 0',gap:14}}>
            <div style={{width:36,height:36,borderRadius:'50%',border:`3px solid ${ACC}`,borderTopColor:'transparent',animation:'spin 0.8s linear infinite'}}/>
            <div style={{fontSize:13,color:TEXT_SEC}}>{t('importLoading')}</div>
          </div>
        )}

        {/* Preview */}
        {importStep==='preview'&&importPreview&&(
          <div>
            <div style={{display:'flex',gap:12,alignItems:'center',padding:'10px 0 16px',borderBottom:'1px solid #252525',marginBottom:14}}>
              {importPreview.cover
                ?<img src={importPreview.cover} style={{width:58,height:58,borderRadius:9,objectFit:'cover' as const,flexShrink:0}}/>
                :<div style={{width:58,height:58,borderRadius:9,background:BG3,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0}}>
                  {importPreview.source==='spotify'?'🟢':importPreview.source==='youtube'?'🔴':'🟠'}
                </div>
              }
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,color:TEXT_MUTED,marginBottom:3,textTransform:'uppercase' as const,letterSpacing:'0.5px'}}>
                  {importPreview.source==='spotify'?'Spotify':importPreview.source==='youtube'?'YouTube':'SoundCloud'}
                </div>
                <div style={{fontSize:15,fontWeight:700,color:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{importPreview.title}</div>
                <div style={{fontSize:11,color:TEXT_SEC,marginTop:3}}>{importPreview.totalTracks} {t('importTracksWord')}</div>
              </div>
            </div>
            <div style={{maxHeight:200,overflowY:'auto',marginBottom:14}}>
              {importPreview.tracks.slice(0,8).map((tr,i)=>(
                <div key={i} style={{display:'flex',gap:8,alignItems:'center',padding:'6px 0',borderBottom:'1px solid #1e1e1e'}}>
                  <div style={{fontSize:10,color:TEXT_MUTED,width:16,textAlign:'right' as const,flexShrink:0}}>{i+1}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{tr.sourceTitle}</div>
                    <div style={{fontSize:10,color:TEXT_SEC}}>{tr.sourceArtist}</div>
                  </div>
                </div>
              ))}
              {importPreview.totalTracks>8&&<div style={{textAlign:'center' as const,padding:'8px',fontSize:11,color:TEXT_MUTED}}>+{importPreview.totalTracks-8} {t('importTracksWord')}</div>}
            </div>
            <button onPointerDown={()=>onMatch(importPreview.title)}
              style={{width:'100%',padding:'13px',background:ACC,border:'none',borderRadius:10,color:BG,fontSize:13,fontWeight:700,cursor:'pointer',...tap}}>
              {t('importPlaylist')}
            </button>
          </div>
        )}

        {/* Matching */}
        {importStep==='matching'&&(
          <div>
            <div style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:TEXT_SEC,marginBottom:6}}>
                <span>{t('importMatching')}</span>
                <span style={{color:ACC,fontWeight:600}}>{importProgress}%</span>
              </div>
              <div style={{width:'100%',height:4,background:BG3,borderRadius:4}}>
                <div style={{width:`${importProgress}%`,height:'100%',background:ACC,borderRadius:4,transition:'width 0.3s ease'}}/>
              </div>
            </div>
            {importResults.length>0&&(
              <div style={{maxHeight:320,overflowY:'auto'}}>
                {importResults.map((r,i)=>(
                  <div key={i} style={{display:'flex',gap:8,alignItems:'center',padding:'6px 0',borderBottom:'1px solid #1a1a1a'}}>
                    <div style={{fontSize:13,flexShrink:0}}>{r.status==='found'?'✅':'⬜'}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,color:r.status==='found'?TEXT_PRIMARY:TEXT_MUTED,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.imported.sourceTitle}</div>
                      {r.matched&&<div style={{fontSize:10,color:TEXT_SEC}}>{r.matched.artist}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Done */}
        {importStep==='done'&&(()=>{
          const found=importResults.filter(r=>r.status==='found').length;
          const total=importResults.length;
          return(
            <div style={{textAlign:'center' as const,padding:'8px 0'}}>
              <div style={{fontSize:40,marginBottom:12}}>🎵</div>
              <div style={{fontSize:17,fontWeight:700,color:TEXT_PRIMARY,marginBottom:6}}>{t('importDone')}</div>
              <div style={{fontSize:13,color:TEXT_SEC,marginBottom:4}}>
                {t('importFound')} {found} {t('importOf')} {total} {t('importTracksWord')}
              </div>
              {found<total&&(
                <div style={{fontSize:11,color:TEXT_MUTED,marginBottom:16}}>{total-found} {t('importNotFound')}</div>
              )}
              <button onPointerDown={onClose}
                style={{width:'100%',padding:'13px',background:ACC,border:'none',borderRadius:10,color:BG,fontSize:13,fontWeight:700,cursor:'pointer',marginTop:8,...tap}}>
                {t('importOpen')}
              </button>
            </div>
          );
        })()}

      </div>
    </div>
  );
});

export default function App(){
  const[screen,setScreen]=useState<'home'|'search'|'library'|'trending'|'profile'|'artist'|'album'|'monthstats'>('home');
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

  // Monthly stats: current month accumulator + last completed month archive
  type MonthTrackEntry={title:string;artist:string;cover:string;count:number};
  type MonthData={month:string;totalSec:number;trackPlays:Record<string,MonthTrackEntry>;listenedIds:string[]};
  const[monthStats,setMonthStats]=useState<{current:MonthData;prev:MonthData|null;firstEverMonth:string|null}>(()=>{
    try{const s=localStorage.getItem('mst47');if(s)return JSON.parse(s);}catch{}
    const m=new Date().toISOString().slice(0,7);
    return{current:{month:m,totalSec:0,trackPlays:{},listenedIds:[]},prev:null,firstEverMonth:null};
  });
  const monthStatsRef=useRef(monthStats);
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
  // progress и curTime — refs, не state. Ре-рендера от аудио нет.
  const progressRef=useRef(0);
  const curTimeRef=useRef('0:00');
  // DOM refs для прямого обновления без React
  const seekBarFillRef=useRef<HTMLDivElement>(null);
  const seekBarThumbRef=useRef<HTMLDivElement>(null);
  const curTimeDisplayRef=useRef<HTMLSpanElement>(null);
  const miniBarFillRef=useRef<HTMLDivElement>(null);
  const miniBarThumbRef=useRef<HTMLDivElement>(null);
  const miniTimeRef=useRef<HTMLSpanElement>(null);
  const[volume,setVolume]=useState(1);
  const[loop,setLoop]=useState(false);
  const[fullPlayer,setFullPlayer]=useState(false);
  const[showQueue,setShowQueue]=useState(false);
  const[queue,setQueue]=useState<Track[]>([]);
  // IDs of tracks manually added to queue (not from playlist auto-queue)
  const[manualQIds,setManualQIds]=useState<Set<string>>(new Set());
  const[playHistory,setPlayHistory]=useState<Track[]>([]);
  const[dragIdx,setDragIdx]=useState<number|null>(null);
  const[liked,setLiked]=useState<Track[]>([]);
  const[playlists,setPlaylists]=useState<Playlist[]>([]);
  const[openPlId,setOpenPlId]=useState<string|null>(null);
  const[plMenuId,setPlMenuId]=useState<string|null>(null);
  const[renamePlId,setRenamePlId]=useState<string|null>(null);
  const[renamePlVal,setRenamePlVal]=useState('');
  const[pinnedPlId,setPinnedPlId]=useState<string|null>(()=>{try{return localStorage.getItem('pin47')||null;}catch{return null;}});
  const[openPlPage,setOpenPlPage]=useState<string|null>(null);
  const[playingPlId,setPlayingPlId]=useState<string|null>(null);
  const[trackMenuPlId,setTrackMenuPlId]=useState<string|null>(null);
  const[trackMenuTr,setTrackMenuTr]=useState<Track|null>(null);
  const[history,setHistory]=useState<Track[]>([]);
  const[recs,setRecs]=useState<Track[]>([]);
  const[recsVersion,setRecsVersion]=useState(0);
  const[hotTracks,setHotTracks]=useState<Track[]>([]);
  const[risingTracks,setRisingTracks]=useState<Track[]>([]);
  const[trendLoading,setTrendLoading]=useState(false);
  const[trendSection,setTrendSection]=useState<'hot'|'rising'>('hot');
  // ── ИЗМЕНЕНИЕ: единый курсор для трендов ──
  const[trendNextCursor,setTrendNextCursor]=useState<Record<'hot'|'rising',string>>({hot:'',rising:''});
  const[trends]=useState<Record<string,Track[]>>({});
  const[trendGenre]=useState('top');
  const[trendOff]=useState<Record<string,number>>({});
  const[forYouTracks,setForYouTracks]=useState<Track[]>([]);
  const[forYouLoading,setForYouLoading]=useState(false);
  const[forYouLoaded,setForYouLoaded]=useState(false);
  const[showImport,setShowImport]=useState(false);
  const[importUrl,setImportUrl]=useState('');
  const[importTab,setImportTab]=useState<'main'|'other'>('main');
  const[importStep,setImportStep]=useState<'idle'|'fetching'|'preview'|'matching'|'done'|'error'>('idle');
  const[importError,setImportError]=useState('');
  const[importPreview,setImportPreview]=useState<{source:string;title:string;cover:string;totalTracks:number;tracks:{sourceTitle:string;sourceArtist:string}[]}|null>(null);
  const[importResults,setImportResults]=useState<{imported:{sourceTitle:string;sourceArtist:string};matched:Track|null;status:string}[]>([]);
  const[importProgress,setImportProgress]=useState(0);

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
    const now_ts=Date.now();
    // Сохраняем timestamp каждого типа данных локально
    try{localStorage.setItem('sync_ts',String(now_ts));}catch{}
    syncTimer.current=setTimeout(()=>syncSave({
      liked:likedRef.current,
      liked_ts:now_ts,
      playlists:playlistsRef.current,
      playlists_ts:parseInt(localStorage.getItem('p47_ts')||String(now_ts)),
      history:historyRef.current,
      history_ts:now_ts,
      favArtists:favArtistsRef.current,
      favArtists_ts:now_ts,
      favAlbums:favAlbumsRef.current,
      favAlbums_ts:now_ts,
      blockedArtists:blockedRef.current,
      bgCover:bgCoverRef.current,
      // volume НЕ синхронизируем — на каждом устройстве своя
      recs:recsRef.current.slice(0,20),
      pinnedPlId:pinnedPlId,
      monthStats:monthStatsRef.current,
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
        // Timestamp-based merge: берём данные с новейшим timestamp
        const localSyncTs=parseInt(localStorage.getItem('sync_ts')||'0');
        const serverSyncTs=sv.history_ts||sv.liked_ts||0;
        const serverIsNewer=serverSyncTs>localSyncTs;

        // ЛАЙКИ — timestamp merge
        const localLiked=likedRef.current;
        const likedFromServer=serverIsNewer&&sv.liked!=null?sv.liked:
          (!sv.liked?.length?localLiked:sv.liked.length>=localLiked.length?sv.liked:localLiked);
        if(JSON.stringify(likedFromServer)!==JSON.stringify(localLiked)){
          setLiked(likedFromServer);try{localStorage.setItem('l47',JSON.stringify(likedFromServer));}catch{}
        }

        // ПЛЕЙЛИСТЫ — timestamp merge
        const localPl=playlistsRef.current;
        const localPlTs=parseInt(localStorage.getItem('p47_ts')||'0');
        const serverPlTs=sv.playlists_ts||0;
        const plFromServer=serverPlTs>localPlTs&&sv.playlists!=null?sv.playlists:localPl;
        if(JSON.stringify(plFromServer)!==JSON.stringify(localPl)){
          setPlaylists(plFromServer);try{localStorage.setItem('p47',JSON.stringify(plFromServer));}catch{}
          if(serverPlTs>localPlTs)try{localStorage.setItem('p47_ts',String(serverPlTs));}catch{}
        }

        // ИСТОРИЯ — merge: объединяем уникальные треки, новые сверху, макс 50
        const localH=historyRef.current;
        if(sv.history?.length){
          const serverH:Track[]=sv.history;
          // Если сервер новее — берём серверную историю, иначе объединяем
          let mergedH:Track[];
          if(serverIsNewer&&serverH.length>0){
            // Объединяем: серверная + локальная уникальные, без дублей
            const seen=new Set(serverH.map((t:Track)=>t.id));
            const extra=localH.filter((t:Track)=>!seen.has(t.id));
            mergedH=[...serverH,...extra].slice(0,50);
          } else {
            const seen=new Set(localH.map((t:Track)=>t.id));
            const extra=serverH.filter((t:Track)=>!seen.has(t.id));
            mergedH=[...localH,...extra].slice(0,50);
          }
          if(JSON.stringify(mergedH)!==JSON.stringify(localH)){
            setHistory(mergedH);try{localStorage.setItem('h47',JSON.stringify(mergedH));}catch{}
          }
        }

        // АРТИСТЫ В ИЗБРАННОМ — timestamp merge
        const localFA=favArtistsRef.current;
        const faFromServer=serverIsNewer&&sv.favArtists!=null?sv.favArtists:
          (!sv.favArtists?.length?localFA:sv.favArtists.length>=localFA.length?sv.favArtists:localFA);
        if(JSON.stringify(faFromServer)!==JSON.stringify(localFA)){
          setFavArtists(faFromServer);try{localStorage.setItem('fa47',JSON.stringify(faFromServer));}catch{}
        }

        // АЛЬБОМЫ В ИЗБРАННОМ — timestamp merge
        const localFAl=favAlbumsRef.current;
        const falFromServer=serverIsNewer&&sv.favAlbums!=null?sv.favAlbums:
          (!sv.favAlbums?.length?localFAl:sv.favAlbums.length>=localFAl.length?sv.favAlbums:localFAl);
        if(JSON.stringify(falFromServer)!==JSON.stringify(localFAl)){
          setFavAlbums(falFromServer);try{localStorage.setItem('fal47',JSON.stringify(falFromServer));}catch{}
        }

        // ЗАБЛОКИРОВАННЫЕ АРТИСТЫ — объединяем множества
        if(sv.blockedArtists?.length){
          const merged_ba=[...new Set([...blockedRef.current,...sv.blockedArtists])];
          setBlockedArtists(merged_ba);try{localStorage.setItem('ba47',JSON.stringify(merged_ba));}catch{}
        }

        // ОБЛОЖКА ФОНА
        if(sv.bgCover&&!bgCoverRef.current){setBgCover(sv.bgCover);try{localStorage.setItem('bgc47',sv.bgCover);}catch{}}

        // ЗАКРЕП ПЛЕЙЛИСТА
        if(sv.pinnedPlId!==undefined&&sv.pinnedPlId!==null){
          setPinnedPlId(sv.pinnedPlId);
          try{if(sv.pinnedPlId)localStorage.setItem('pin47',sv.pinnedPlId);else localStorage.removeItem('pin47');}catch{}
        }

        // РЕКОМЕНДАЦИИ (только если сервер новее)
        if(sv.recs?.length&&serverIsNewer){
          const blocked=sv.blockedArtists||blockedRef.current||[];
          const freshRecs=sv.recs.filter((tr:Track)=>!blocked.includes(tr.artist));
          if(freshRecs.length>0){setRecs(freshRecs);try{localStorage.setItem('recs47',JSON.stringify(freshRecs));}catch{}}
        }

        // СТАТИСТИКА — merge максимумов (аддитивная, берём больший)
        if(sv.stats){
          const s=sv.stats;
          const newTotalSec=Math.max(s.totalSec||0,totalSecRef.current);
          if(newTotalSec>totalSecRef.current){setTotalSec(newTotalSec);totalSecRef.current=newTotalSec;try{localStorage.setItem('tsec47',String(newTotalSec));}catch{}}
          // exploredIds и listenedIds — объединяем множества
          if(s.exploredIds?.length){
            const merged=[...new Set([...exploredIdsRef.current,...s.exploredIds])];
            if(merged.length>exploredIdsRef.current.length){setExploredIds(merged);exploredIdsRef.current=merged;try{localStorage.setItem('exp47',JSON.stringify(merged));}catch{}}
          }
          if(s.listenedIds?.length){
            const merged=[...new Set([...listenedIdsRef.current,...s.listenedIds])];
            if(merged.length>listenedIdsRef.current.length){setListenedIds(merged);listenedIdsRef.current=merged;try{localStorage.setItem('lst47',JSON.stringify(merged));}catch{}}
          }
          // trackPlays — объединяем, суммируя count
          if(s.trackPlays&&Object.keys(s.trackPlays).length){
            const merged:{[k:string]:any}={...trackPlaysRef.current};
            for(const[id,v] of Object.entries(s.trackPlays) as any){
              if(!merged[id])merged[id]=v;
              else merged[id]={...merged[id],count:Math.max(merged[id].count||0,(v as any).count||0)};
            }
            if(JSON.stringify(merged)!==JSON.stringify(trackPlaysRef.current)){
              setTrackPlays(merged);trackPlaysRef.current=merged;try{localStorage.setItem('tpl47',JSON.stringify(merged));}catch{}
            }
          }
          if(s.streakDays?.length){
            const merged=[...new Set([...streakDaysRef.current,...s.streakDays])].sort();
            if(merged.length>streakDaysRef.current.length){
              setStreakDays(merged);streakDaysRef.current=merged;
              const mx=calcMaxStreak(merged);setMaxStreak(mx);maxStreakRef.current=mx;
              try{localStorage.setItem('sdays47',JSON.stringify(merged));}catch{}
            }
          }
        }

        // MONTHLY STATS — берём с большим totalSec
        if(sv.monthStats?.current&&(sv.monthStats.current.totalSec||0)>monthStatsRef.current.current.totalSec){
          setMonthStats(sv.monthStats);try{localStorage.setItem('mst47',JSON.stringify(sv.monthStats));}catch{}
        }

        // Сохраняем серверный timestamp локально
        if(serverSyncTs>localSyncTs)try{localStorage.setItem('sync_ts',String(serverSyncTs));}catch{}

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
  useEffect(()=>{monthStatsRef.current=monthStats;},[monthStats]);

  // Month rollover check — runs on mount and when app becomes active
  useEffect(()=>{
    const checkMonthRollover=()=>{
      const now=new Date().toISOString().slice(0,7); // "2026-03"
      setMonthStats(prev=>{
        if(prev.current.month===now)return prev; // same month, no change
        // Month changed — archive current into prev, start fresh
        const isFirst=prev.firstEverMonth===null;
        const next={
          current:{month:now,totalSec:0,trackPlays:{},listenedIds:[]},
          prev: isFirst?null:prev.current, // don't archive if it was the very first month (incomplete)
          firstEverMonth: prev.firstEverMonth??prev.current.month,
        };
        try{localStorage.setItem('mst47',JSON.stringify(next));}catch{}
        return next;
      });
    };
    checkMonthRollover();
    const interval=setInterval(checkMonthRollover,60*1000); // check every minute
    return()=>clearInterval(interval);
  },[]);
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
        const pct2=audio.current.currentTime/(audio.current.duration||1)*100;
        progressRef.current=pct2;
        if(seekBarFillRef.current)seekBarFillRef.current.style.width=`${pct2}%`;
        if(seekBarThumbRef.current)seekBarThumbRef.current.style.left=`${pct2}%`;
        if(miniBarFillRef.current)miniBarFillRef.current.style.width=`${pct2}%`;
        if(miniBarThumbRef.current)miniBarThumbRef.current.style.left=`${pct2}%`;
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
    const onVisible=()=>{
      if(document.visibilityState==='visible'){
        loadRecommendations();
        // Подгружаем свежие данные с сервера при возврате в приложение
        if(uid!=='anon'){
          fetch(`${W}/sync/load?uid=${uid}`).then(r=>r.json()).then(d=>{
            if(!d.data)return;
            const sv=d.data;
            const localSyncTs=parseInt(localStorage.getItem('sync_ts')||'0');
            const serverSyncTs=sv.history_ts||sv.liked_ts||0;
            // Обновляем только если сервер новее
            if(serverSyncTs<=localSyncTs)return;
            // История
            if(sv.history?.length){
              const localH=historyRef.current;
              const seen=new Set(sv.history.map((t:Track)=>t.id));
              const extra=localH.filter((t:Track)=>!seen.has(t.id));
              const merged=[...sv.history,...extra].slice(0,50);
              if(merged.length!==localH.length||merged[0]?.id!==localH[0]?.id){
                setHistory(merged);try{localStorage.setItem('h47',JSON.stringify(merged));}catch{}
              }
            }
            // Лайки
            if(sv.liked!=null){
              const localL=likedRef.current;
              if(JSON.stringify(sv.liked)!==JSON.stringify(localL)){
                setLiked(sv.liked);try{localStorage.setItem('l47',JSON.stringify(sv.liked));}catch{}
              }
            }
            // Плейлисты
            const localPlTs=parseInt(localStorage.getItem('p47_ts')||'0');
            if((sv.playlists_ts||0)>localPlTs&&sv.playlists!=null){
              setPlaylists(sv.playlists);
              try{localStorage.setItem('p47',JSON.stringify(sv.playlists));localStorage.setItem('p47_ts',String(sv.playlists_ts));}catch{}
            }
            // Артисты и альбомы
            if(sv.favArtists!=null){setFavArtists(sv.favArtists);try{localStorage.setItem('fa47',JSON.stringify(sv.favArtists));}catch{}}
            if(sv.favAlbums!=null){setFavAlbums(sv.favAlbums);try{localStorage.setItem('fal47',JSON.stringify(sv.favAlbums));}catch{}}
            if(serverSyncTs>localSyncTs)try{localStorage.setItem('sync_ts',String(serverSyncTs));}catch{}
          }).catch(()=>{});
        }
      }
    };
    document.addEventListener('visibilitychange',onVisible);
    return()=>document.removeEventListener('visibilitychange',onVisible);
  },[loadRecommendations]);

  useEffect(()=>{
    const a=audio.current;if(!a)return;
    const onT=()=>{
      if(a.duration){
        const pct=a.currentTime/a.duration*100;
        const m=Math.floor(a.currentTime/60),s=Math.floor(a.currentTime%60);
        const timeStr=`${m}:${s.toString().padStart(2,'0')}`;
        progressRef.current=pct;
        curTimeRef.current=timeStr;
        // Обновляем DOM напрямую — без setProgress, без ре-рендера
        if(seekBarFillRef.current)seekBarFillRef.current.style.width=`${pct}%`;
        if(seekBarThumbRef.current)seekBarThumbRef.current.style.left=`${pct}%`;
        if(curTimeDisplayRef.current)curTimeDisplayRef.current.textContent=timeStr;
        if(miniBarFillRef.current)miniBarFillRef.current.style.width=`${pct}%`;
        if(miniBarThumbRef.current)miniBarThumbRef.current.style.left=`${pct}%`;
        if(miniTimeRef.current)miniTimeRef.current.textContent=timeStr;
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
    // Когда система меняет громкость (кнопки телефона) — обновляем ползунок
    const onVol=()=>{
      const sysVol=a.volume;
      if(Math.abs(sysVol-volumeRef.current)>0.02){
        setVolume(sysVol);
        volumeRef.current=sysVol;
        try{localStorage.setItem('v47',String(sysVol));}catch{}
      }
    };
    a.addEventListener('volumechange',onVol);
    return()=>a.removeEventListener('volumechange',onVol);
  },[]);

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
    setCurrent({...track,mp3:freshMp3});
    progressRef.current=0;curTimeRef.current='0:00';
    if(seekBarFillRef.current)seekBarFillRef.current.style.width='0%';
    if(seekBarThumbRef.current)seekBarThumbRef.current.style.left='0%';
    if(curTimeDisplayRef.current)curTimeDisplayRef.current.textContent='0:00';
    if(miniBarFillRef.current)miniBarFillRef.current.style.width='0%';
    if(miniBarThumbRef.current)miniBarThumbRef.current.style.left='0%';
    if(miniTimeRef.current)miniTimeRef.current.textContent='0:00';
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
      // Monthly stats: accumulate seconds
      setMonthStats(prev=>{
        const now=new Date().toISOString().slice(0,7);
        if(prev.current.month!==now)return prev; // rollover will handle it
        const next={...prev,current:{...prev.current,totalSec:prev.current.totalSec+1}};
        try{localStorage.setItem('mst47',JSON.stringify(next));}catch{}
        return next;
      });
      if(listenSec.current===40){
        const tid=listenTrackId.current;
        setListenedIds(prev=>{if(prev.includes(tid))return prev;const n=[...prev,tid];try{localStorage.setItem('lst47',JSON.stringify(n));}catch{}return n;});
        setTrackPlays(prev=>{const entry=prev[tid]||{title:track.title,artist:track.artist,cover:track.cover||'',count:0};const n={...prev,[tid]:{...entry,cover:track.cover||entry.cover||'',count:entry.count+1}};try{localStorage.setItem('tpl47',JSON.stringify(n));}catch{}return n;});
        // Monthly stats: record track play
        setMonthStats(prev=>{
          const now=new Date().toISOString().slice(0,7);
          if(prev.current.month!==now)return prev;
          const cur=prev.current;
          const entry=cur.trackPlays[tid]||{title:track.title,artist:track.artist,cover:track.cover||'',count:0};
          const newListenedIds=cur.listenedIds.includes(tid)?cur.listenedIds:[...cur.listenedIds,tid];
          const next={...prev,current:{...cur,
            trackPlays:{...cur.trackPlays,[tid]:{...entry,cover:track.cover||entry.cover||'',count:entry.count+1}},
            listenedIds:newListenedIds,
          }};
          try{localStorage.setItem('mst47',JSON.stringify(next));}catch{}
          return next;
        });
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

  const deepLinkHandled=useRef(false);
  useEffect(()=>{
    const startParam=window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    if(!startParam||deepLinkHandled.current)return;
    if(!startParam.startsWith('track-')&&!startParam.startsWith('album-'))return;
    deepLinkHandled.current=true;
    const openAndPlay=async()=>{
      try{
        if(startParam.startsWith('album-')){
          const albumId=startParam.replace('album-','');
          openAlbum(albumId,'','','');
        } else {
          const trackId=startParam.replace('track-','');
          const r=await fetch(`${W}/resolve?id=${trackId}`);
          const d=await r.json();
          if(d.mp3){
            const track:Track={id:trackId,title:d.title||'',artist:d.artist||'',cover:d.cover||'',duration:d.duration||'',plays:d.plays||0,mp3:d.mp3};
            setCurrent(track);
            playDirect(track);
          }
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
      setCurrent(prev);
      progressRef.current=0;curTimeRef.current='0:00';
      if(seekBarFillRef.current)seekBarFillRef.current.style.width='0%';
      if(seekBarThumbRef.current)seekBarThumbRef.current.style.left='0%';
      if(curTimeDisplayRef.current)curTimeDisplayRef.current.textContent='0:00';
      if(miniBarFillRef.current)miniBarFillRef.current.style.width='0%';
      if(miniBarThumbRef.current)miniBarThumbRef.current.style.left='0%';
      if(miniTimeRef.current)miniTimeRef.current.textContent='0:00';
    } else if(current&&audio.current){
      audio.current.currentTime=0;
    }
  };

  const playNext=()=>{
    if(queue.length>0){
      const nxt=queue[0];
      setManualQIds(prev=>{const n=new Set(prev);n.delete(nxt.id);return n;});
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

  // ── ИЗМЕНЕНИЕ: упрощённый loadTrend — один список, один cursor ──
  const loadTrend=async(genre='top',reset=false)=>{
    // cursor: при reset — пустой (первая страница), иначе берём сохранённый
    const cursor=reset?'':trendNextCursor['hot'];
    setTrendLoading(true);
    try{
      const params=new URLSearchParams({genre});
      if(cursor)params.set('cursor',cursor);
      const r=await fetch(`${W}/trending?${params}`);
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const d=await r.json();
      if(reset){
        setHotTracks(d.tracks||[]);
      }else{
        setHotTracks(prev=>[...prev,...(d.tracks||[])]);
      }
      setTrendNextCursor(prev=>({...prev,hot:d.nextCursor||''}));
    }catch(e){console.error('trend load error:',e);}
    setTrendLoading(false);
  };

  // ── ИЗМЕНЕНИЕ: только один loadTrend('top', true), без 'new' ──
  useEffect(()=>{
    if(screen==='trending'&&hotTracks.length===0){
      loadTrend('top',true);
    }
  },[screen]);

  const loadForYou=useCallback(async(reset=false)=>{
    const hist=historyRef.current;
    const blocked=blockedRef.current;
    if(hist.length<1)return;
    setForYouLoading(true);
    try{
      const allCounts=getArtistPlayCounts(hist.slice(0,100));
      const recentCounts=getArtistPlayCounts(hist.slice(0,20));
      const merged:Record<string,number>={};
      for(const[a,n] of Object.entries(allCounts))merged[a]=n;
      for(const[a,n] of Object.entries(recentCounts))merged[a]=(merged[a]||0)+n*2;
      const sortedArtists=Object.entries(merged)
        .filter(([a])=>!blocked.includes(a))
        .sort((a,b)=>b[1]-a[1])
        .map(([a])=>a);
      if(!sortedArtists.length){setForYouLoading(false);return;}

      const listenedSet=new Set(listenedIdsRef.current);
      const excludeIds=hist.slice(0,50).map(tr=>tr.id).join(',');

      // Извлекаем featured-артистов из истории (feat., ft., &, x )
      const featRegex=/(?:feat\.|ft\.|featuring|&|\bx\b)\s+([^,)\]]+)/gi;
      const featArtists=new Set<string>();
      hist.slice(0,30).forEach(tr=>{
        const combined=`${tr.title} ${tr.artist}`;
        let m;
        while((m=featRegex.exec(combined))!==null){
          const name=m[1].trim().split(/[\s,]/)[0];
          if(name.length>2&&!blocked.includes(name)&&!sortedArtists.includes(name))featArtists.add(name);
        }
      });

      const knownArtists=sortedArtists.slice(0,5);
      const midArtists=sortedArtists.slice(5,10);
      const featArr=[...featArtists].slice(0,5);

      // Seed-запросы: берём случайные треки из истории для поиска похожего
      const seedTracks=hist.filter(tr=>!REMIX_W.some(w=>tr.title.toLowerCase().includes(w))).slice(0,8);
      const seed1=seedTracks[Math.floor(Math.random()*Math.min(3,seedTracks.length))];
      const seed2=seedTracks[Math.floor(Math.random()*seedTracks.length)];

      // 4 параллельных запроса:
      // 1. Топ артисты (знакомое)
      // 2. Средние артисты + featured (новое из вкуса)
      // 3. Поиск по треку seed1 — похожие треки
      // 4. Поиск по треку seed2 — ещё похожие
      const allDiscovery=[...midArtists,...featArr].filter(Boolean);
      const [r1,r2,r3,r4]=await Promise.allSettled([
        fetch(`${W}/recommend?artists=${encodeURIComponent(knownArtists.join(','))}&exclude=${encodeURIComponent(excludeIds)}&limit=12`),
        allDiscovery.length>0
          ?fetch(`${W}/recommend?artists=${encodeURIComponent(allDiscovery.slice(0,8).join(','))}&exclude=${encodeURIComponent(excludeIds)}&limit=10`)
          :Promise.resolve(null),
        seed1?fetch(`${W}/search?q=${encodeURIComponent(seed1.artist)}&mode=sound`):Promise.resolve(null),
        seed2&&seed2.id!==seed1?.id?fetch(`${W}/search?q=${encodeURIComponent(seed2.title.split(' ').slice(0,2).join(' '))}&mode=sound`):Promise.resolve(null),
      ]);

      const g=async(r:PromiseSettledResult<Response|null>):Promise<Track[]>=>{
        if(r.status!=='fulfilled'||!r.value)return[];
        const resp=r.value as Response;
        if(!resp.ok)return[];
        const d=await resp.json();
        return d.tracks||[];
      };

      const [pool1,pool2,pool3,pool4]=await Promise.all([g(r1),g(r2),g(r3),g(r4)]);

      const knownSet=new Set(sortedArtists);
      const filter=(t:Track)=>!!(!blocked.includes(t.artist)&&!listenedSet.has(t.id)&&t.mp3);

      const fresh1=pool1.filter(filter);
      // Из пула 2 берём всё (и знакомых из середины и feat-артистов)
      const fresh2=pool2.filter(filter);
      // Из поиска по seed-артисту: приоритет незнакомым артистам
      const fresh3=pool3.filter(t=>filter(t)&&!knownSet.has(t.artist));
      // Из поиска по названию: только совсем новые артисты
      const fresh4=pool4.filter(t=>filter(t)&&!knownSet.has(t.artist));

      const result:Track[]=[];
      const seen=new Set<string>();
      const addUniq=(arr:Track[],max:number)=>{
        let c=0;
        const sh=[...arr].sort(()=>Math.random()-0.5);
        for(const t of sh){if(c>=max)break;if(!seen.has(t.id)){seen.add(t.id);result.push(t);c++;}}
      };

      addUniq(fresh1,12);   // знакомое
      addUniq(fresh2,8);    // feat + средние артисты
      addUniq(fresh3,6);    // похожие по артисту
      addUniq(fresh4,4);    // похожие по названию

      // Лёгкое перемешивание чтобы новое не всегда в конце
      const final=result.sort(()=>Math.random()-0.38);

      if(final.length>0){
        setForYouTracks(prev=>reset?final:[...prev.filter(t=>!final.some((f:Track)=>f.id===t.id)),...final]);
        setForYouLoaded(true);
      }
    }catch(e){console.warn('forYou failed:',e);}
    setForYouLoading(false);
  },[]);

  useEffect(()=>{
    if(screen==='trending'&&!forYouLoaded&&history.length>=1){
      loadForYou(true);
    }
  },[screen,history.length]);

  const extractPlaylistId=(url:string)=>{
    try{
      const parsed=new URL(url);
      const list=parsed.searchParams.get('list');
      if(list)return list;
    }catch{}
    const match=url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    return match?match[1]:null;
  };

  // ── IMPORT: Spotify через Client Credentials (без OAuth) ──
  const runImport=async()=>{
    const trimmedUrl=importUrl.trim();
    if(!trimmedUrl)return;
    setImportStep('fetching');setImportError('');setImportPreview(null);setImportResults([]);setImportProgress(0);

    try{
      // ── SPOTIFY ──
      if(trimmedUrl.includes('spotify.com/playlist')||trimmedUrl.startsWith('spotify:playlist')){
        const res=await fetch(`${W}/spotify/playlist?url=${encodeURIComponent(trimmedUrl)}`);
        const data=await res.json();
        if(!res.ok||data.error){
          if(data.code==='PRIVATE_PLAYLIST'){
            setImportError(
              lang==='ru'?'Плейлист приватный. Открой его в Spotify → три точки → Сделать публичным, затем попробуй снова.':
              lang==='uk'?'Плейлист приватний. Відкрий у Spotify → три крапки → Зробити публічним, потім спробуй знову.':
              'Playlist is private. Open it in Spotify → three dots → Make public, then try again.'
            );
          }else{
            setImportError(data.error||'Failed to fetch Spotify playlist');
          }
          setImportStep('error');
          return;
        }
        setImportPreview({
          source:'spotify',
          title:data.title||'Spotify Playlist',
          cover:data.cover||'',
          totalTracks:data.totalTracks||0,
          tracks:data.tracks||[],
        });
        setImportStep('preview');
        return;
      }

      // ── YOUTUBE ──
      if(trimmedUrl.includes('youtube.com')||trimmedUrl.includes('youtu.be')){
        const plId=extractPlaylistId(trimmedUrl);
        if(!plId){setImportError(t('importNotFound'));setImportStep('error');return;}
        const ytRes=await fetch(`${W}/youtube-playlist?id=${plId}`);
        const ytData=await ytRes.json();
        if(!ytRes.ok||ytData.error){setImportError(ytData.error||'YouTube API error');setImportStep('error');return;}
        if(!ytData.tracks?.length){setImportError(t('notFound'));setImportStep('error');return;}
        setImportPreview({
          source:'youtube',
          title:ytData.title||ytData.name||'YouTube Playlist',
          cover:ytData.cover||'',
          totalTracks:ytData.totalTracks||ytData.tracks.length,
          tracks:ytData.tracks,
        });
        setImportStep('preview');
        return;
      }

      // ── SOUNDCLOUD (прямой через /album) ──
      if(trimmedUrl.includes('soundcloud.com')){
        const scRes=await fetch(`${W}/sc/playlist?url=${encodeURIComponent(trimmedUrl)}`);
        const scData=await scRes.json();
        if(scData.tracks?.length){
          const newPl:Playlist={id:Date.now().toString(),name:scData.title||'SoundCloud Playlist',tracks:scData.tracks,repeat:false};
          setPlaylists(prev=>{const n=[newPl,...prev];try{localStorage.setItem('p47',JSON.stringify(n));}catch{}doFullSync();return n;});
          setImportResults(scData.tracks.map((tr:Track)=>({imported:{sourceTitle:tr.title,sourceArtist:tr.artist},matched:tr,status:'found'})));
          setImportProgress(scData.tracks.length);
          setImportStep('done');
          setTimeout(()=>{setShowImport(false);setLibTab('playlists');setScreen('library');},1400);
        }else{
          setImportError(lang==='ru'?'Не удалось загрузить плейлист SoundCloud':'Failed to load SoundCloud playlist');
          setImportStep('error');
        }
        return;
      }

      setImportError(
        lang==='ru'?'Поддерживается: Spotify (публичные плейлисты) и SoundCloud.':
        lang==='uk'?'Підтримується: Spotify (публічні плейлисти) та SoundCloud.':
        'Supported: Spotify (public playlists) and SoundCloud.'
      );
      setImportStep('error');
    }catch(e:any){
      setImportError(e?.message||String(e));
      setImportStep('error');
    }
  };

  const runMatch=async(playlistName:string)=>{
    if(!importPreview)return;
    setImportStep('matching');setImportResults([]);setImportProgress(0);
    const tracks=importPreview.tracks;
    const allResults:{imported:{sourceTitle:string;sourceArtist:string};matched:Track|null;status:string}[]=[];

    for(let i=0;i<tracks.length;i++){
      const item=tracks[i];
      try{
        const q=`${item.sourceArtist} ${item.sourceTitle}`.trim();
        const r=await fetch(`${W}/search?q=${encodeURIComponent(q)}&limit=3&mode=sound`);
        const d=await r.json();
        const found:Track|null=d.tracks?.[0]||null;
        allResults.push({
          imported:{sourceTitle:item.sourceTitle,sourceArtist:item.sourceArtist},
          matched:found,
          status:found?'found':'not_found',
        });
      }catch{
        allResults.push({imported:{sourceTitle:item.sourceTitle,sourceArtist:item.sourceArtist},matched:null,status:'not_found'});
      }
      setImportProgress(Math.round(((i+1)/tracks.length)*100));
      setImportResults([...allResults]);
      if(i%5===4)await new Promise(r=>setTimeout(r,200));
    }

    const matched=allResults.filter(r=>r.status==='found'&&r.matched).map(r=>r.matched as Track);
    if(matched.length>0){
      const pl:Playlist={id:Date.now().toString(),name:playlistName,tracks:matched,repeat:false};
      setPlaylists(prev=>{const n=[pl,...prev];try{localStorage.setItem('p47',JSON.stringify(n));}catch{}doFullSync();return n;});
      setImportStep('done');
      setTimeout(()=>{setShowImport(false);setLibTab('playlists');setScreen('library');},1400);
    }else{
      setImportError(lang==='ru'?'Ни один трек не найден на SoundCloud':lang==='uk'?'Жоден трек не знайдено':'No tracks found on SoundCloud');
      setImportStep('error');
    }
  };

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
      // Убираем артистов из всех режимов кроме 'artists'
      if(mode!=='artists'){tracks=tracks.filter(tr=>!tr.isArtist);}
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
  const deletePl=(plId:string)=>{setPlaylists(prev=>{const n=prev.filter(p=>p.id!==plId);try{localStorage.setItem('p47',JSON.stringify(n));localStorage.setItem('p47_ts',String(Date.now()));}catch{}doFullSync();return n;});if(openPlId===plId)setOpenPlId(null);if(pinnedPlId===plId){setPinnedPlId(null);try{localStorage.removeItem('pin47');}catch{}}if(openPlPage===plId)setOpenPlPage(null);};
  const pinPl=(plId:string)=>{const newPin=pinnedPlId===plId?null:plId;setPinnedPlId(newPin);try{if(newPin)localStorage.setItem('pin47',newPin);else localStorage.removeItem('pin47');}catch{}doFullSync();};
  const removeFromPl=(plId:string,trackId:string)=>{setPlaylists(prev=>{const n=prev.map(p=>p.id===plId?{...p,tracks:p.tracks.filter(t=>t.id!==trackId)}:p);try{localStorage.setItem('p47',JSON.stringify(n));}catch{}return n;});};
  const moveTrackInPl=(plId:string,from:number,to:number)=>{setPlaylists(prev=>{const n=prev.map(p=>{if(p.id!==plId)return p;const tracks=[...p.tracks];const[item]=tracks.splice(from,1);tracks.splice(to,0,item);return{...p,tracks};});try{localStorage.setItem('p47',JSON.stringify(n));}catch{}return n;});};
  const addToPl2=(plId:string,track:Track)=>{setPlaylists(prev=>{const n=prev.map(pl=>pl.id===plId&&!pl.tracks.some(t=>t.id===track.id)?{...pl,tracks:[...pl.tracks,track]}:pl);try{localStorage.setItem('p47',JSON.stringify(n));}catch{}return n;});setAddToPl(null);};
  const playPl=(pl:Playlist)=>{if(!pl.tracks.length)return;setPlayingPlId(pl.id);setManualQIds(new Set());playTrack(pl.tracks[0]);setQueue(pl.tracks.slice(1));};
  const shufflePl=(pl:Playlist)=>{const sh=[...pl.tracks].sort(()=>Math.random()-.5);if(!sh.length)return;setPlayingPlId(pl.id);setManualQIds(new Set());playTrack(sh[0]);setQueue(sh.slice(1));};
  const moveQ=(from:number,to:number)=>setQueue(prev=>{const n=[...prev];const[item]=n.splice(from,1);n.splice(to,0,item);return n;});
  // Smart add to queue: if playing from a playlist, insert NEXT; otherwise append
  const smartAddQ=(track:Track)=>{
    // Always insert as NEXT track (position 0 in queue = plays after current)
    // If already manually queued → remove it (toggle off)
    setManualQIds(prev=>{
      const next=new Set(prev);
      if(next.has(track.id)){
        // toggle off — remove from queue
        next.delete(track.id);
        setQueue(q=>q.filter(t=>t.id!==track.id));
        return next;
      }
      // Add: insert at front of queue (plays next)
      next.add(track.id);
      setQueue(q=>{
        // Remove any existing copy first, then insert at position 0
        const without=q.filter(t=>t.id!==track.id);
        return[track,...without];
      });
      return next;
    });
  };
  const share=(track:Track)=>{navigator.clipboard?.writeText(`${track.artist} — ${track.title}`).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});};
  const shareTrack=(track:Track)=>{
    const deepLink=`https://t.me/forty7mbot?startapp=track-${track.id}`;
    const text=`${track.title} — ${track.artist} 🎵\nListen on Forty7`;
    const tgApp=window.Telegram?.WebApp;
    if(tgApp){
      if(typeof tgApp.shareUrl==='function'){tgApp.shareUrl(deepLink,text);return;}
      if(typeof tgApp.openTelegramLink==='function'){tgApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(text)}`);return;}
      if(typeof tgApp.openLink==='function'){tgApp.openLink(`https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(text)}`);return;}
    }
    window.open(`https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(text)}`,'_blank');
  };
  const chgLang=(l:'ru'|'en'|'uk'|'kk'|'pl'|'tr')=>{setLang(l);try{localStorage.setItem('lg47',l);}catch{}};

  // seekSP removed — slider теперь управляется через DOM refs напрямую
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
    const {wrapRef,innerRef,bgRRef,bgLRef}=useSwipeRow({
      onRight:()=>{if(!track.isArtist&&!track.isAlbum)toggleQ(track);},
      onLeft:onSwipeLeft,
      onTap:()=>{if(mOpen){setMenuId(null);return;}playTrack(track);},
    });

    // На ПК SwipeManager не работает (mouse) — добавляем обычный onClick
    const handleClick=(e:React.MouseEvent)=>{
      // Если touch уже обработал tap через SwipeManager — не дублируем
      if((e.currentTarget as any).__swipeTapped)return;
      // Если клик по кнопкам внутри — не обрабатываем
      const target=e.target as HTMLElement;
      if(target.closest('button'))return;
      if(mOpen){setMenuId(null);return;}
      playTrack(track);
    };

        const menuItems=[
      {icon:<svg width="14" height="14" viewBox="0 0 24 24" fill={isLk(track.id)?ACC:'none'} stroke={isLk(track.id)?ACC:'#aaa'} strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,label:isLk(track.id)?(lang==='ru'?'Убрать лайк':'Unlike'):(lang==='ru'?'Лайк':'Like'),fn:(e:React.MouseEvent)=>{toggleLike(track,e);setMenuId(null);}},
      {icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,label:t('addToPlaylist'),fn:()=>{setAddToPl(track);setMenuId(null);}},
      {icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,label:t('share'),fn:()=>{shareTrack(track);setMenuId(null);}},
      {icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,label:lang==='ru'?'К артисту':'Go to artist',fn:()=>{openArtist('',track.artist,'',0);setMenuId(null);}},
      ...(track.albumId?[{icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,label:t('goToAlbum'),fn:()=>{openAlbum(track.albumId!,track.albumTitle||'',track.artist,track.cover);setMenuId(null);}}]:[]),
      ...(showBlockBtn?[{icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d06060" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,label:t('blockArtist'),fn:()=>{blockArtist(track.artist);setMenuId(null);}}]:[]),
    ];
    return(
      <div ref={wrapRef} style={{position:'relative',overflow:'hidden',touchAction:'pan-y'}} onClick={handleClick}>
        {/* Фон свайпа вправо — всегда в DOM, opacity управляется через ref */}
        {!track.isArtist&&!track.isAlbum&&<div ref={bgRRef} style={{position:'absolute',inset:0,background:'rgba(239,191,127,0.15)',display:'flex',alignItems:'center',paddingLeft:14,pointerEvents:'none',opacity:0}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2.2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1.3" fill={ACC}/><circle cx="3" cy="12" r="1.3" fill={ACC}/><circle cx="3" cy="18" r="1.3" fill={ACC}/></svg>
        </div>}
        {/* Фон свайпа влево — всегда в DOM */}
        {onSwipeLeft&&<div ref={bgLRef} style={{position:'absolute',inset:0,background:'rgba(200,60,60,0.12)',display:'flex',alignItems:'center',justifyContent:'flex-end',paddingRight:14,pointerEvents:'none',opacity:0}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d06060" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        </div>}
        <div ref={innerRef}
          className="track-row"
          style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:12,cursor:'pointer',marginBottom:1,background:active?ACC_DIM:'transparent',willChange:'transform',userSelect:'none'}}>
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

  const sourceIcon=(s:string)=>s==='spotify'?'🟢':s==='youtube'?'🔴':s==='yandex'?'🟡':'📋';
  const sourceName=(s:string)=>s==='spotify'?'Spotify':s==='youtube'?'YouTube':s==='yandex'?'Яндекс Музыка':'Playlist';

  // ImportModal перенесён за пределы App (см. ниже) — здесь пустышка

  // PlModal перенесён за пределы App (см. ниже) — здесь пустышка

  // ── Компонент строки трека в плейлисте ──
  const PlTrackRow=({tr,i,isActive,playing:isPlaying,isManualQ,curSort,pl,sortedTracks,onPlay,onQueue,onRemove,onMenu,onDragStart,onDrop}:{
    tr:Track;i:number;isActive:boolean;playing:boolean;isManualQ:boolean;
    curSort:string;pl:Playlist;sortedTracks:Track[];
    onPlay:()=>void;onQueue:()=>void;onRemove:()=>void;onMenu:()=>void;
    onDragStart:()=>void;onDrop:()=>void;
  })=>{
    const {wrapRef,innerRef,bgRRef,bgLRef}=useSwipeRow({
      onRight:onQueue,
      onLeft:onRemove,
      onTap:onPlay,
    });
    // На ПК SwipeManager не работает — добавляем onClick для мыши
    const handleClick=(e:React.MouseEvent)=>{
      if((e.currentTarget as any).__swipeTapped)return;
      if((e.target as HTMLElement).closest('button'))return;
      onPlay();
    };
    return(
      <div
        ref={wrapRef}
        draggable={curSort==='default'}
        onDragStart={onDragStart}
        onDragOver={e=>e.preventDefault()}
        onDrop={onDrop}
        onClick={handleClick}
        style={{position:'relative',touchAction:'pan-y',userSelect:'none' as const,borderBottom:'1px solid #111',overflow:'hidden',background:isActive?ACC_DIM:'transparent'}}
      >
        <div ref={bgRRef} style={{position:'absolute',inset:0,background:'rgba(239,191,127,0.15)',display:'flex',alignItems:'center',paddingLeft:14,pointerEvents:'none',opacity:0}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2.2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1.3" fill={ACC}/><circle cx="3" cy="12" r="1.3" fill={ACC}/><circle cx="3" cy="18" r="1.3" fill={ACC}/></svg>
        </div>
        <div ref={bgLRef} style={{position:'absolute',inset:0,background:'rgba(200,60,60,0.12)',display:'flex',alignItems:'center',justifyContent:'flex-end',paddingRight:14,pointerEvents:'none',opacity:0}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e06060" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        </div>
        <div ref={innerRef} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px 10px 14px',willChange:'transform'}}>
          {curSort==='default'&&<div style={{color:'#333',fontSize:14,flexShrink:0,cursor:'grab'}}>⠿</div>}
          <div style={{display:'flex',alignItems:'center',gap:11,flex:1,minWidth:0}}>
            <div style={{position:'relative',flexShrink:0}}>
              <Img src={tr.cover} size={44} radius={7}/>
              {isActive&&<div style={{position:'absolute',inset:0,borderRadius:7,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>{isPlaying?'⏸':'▶'}</div>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,color:isActive?ACC:TEXT_PRIMARY,fontWeight:isActive?700:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{tr.title}</div>
              <div style={{fontSize:11,color:TEXT_SEC,marginTop:2}}>{tr.artist}</div>
            </div>
            <div style={{fontSize:10,color:TEXT_MUTED,flexShrink:0,paddingRight:2}}>{tr.duration}</div>
          </div>
          <button onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>{e.stopPropagation();onQueue();}} style={{background:'none',border:'none',cursor:'pointer',padding:'8px 4px',flexShrink:0}}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={isManualQ?ACC:TEXT_MUTED} strokeWidth="2.2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
          <button onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>{e.stopPropagation();onMenu();}} style={{background:'none',border:'none',cursor:'pointer',padding:'8px 3px',flexShrink:0}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="2" fill={TEXT_MUTED}/><circle cx="12" cy="12" r="2" fill={TEXT_MUTED}/><circle cx="12" cy="19" r="2" fill={TEXT_MUTED}/></svg>
          </button>
        </div>
      </div>
    );
  };

  const NAV=[
    {id:'home',icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#606060'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{transition:'stroke 0.2s ease'}}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,lbl:()=>t('home')},
    {id:'search',icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#606060'} strokeWidth="1.8" strokeLinecap="round" style={{transition:'stroke 0.2s ease'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,lbl:()=>t('search')},
    {id:'library',icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#606060'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{transition:'stroke 0.2s ease'}}><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,lbl:()=>t('library')},
    {id:'trending',icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?ACC:'#606060'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{transition:'stroke 0.2s ease'}}><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>,lbl:()=>t('trending')},
  ];

  if(fullPlayer&&current)return(
    <div style={{background:`linear-gradient(160deg, ${fpColors.dark} 0%, ${fpColors.mid} 40%, #0e0e0e 100%)`,height:'100vh',width:'100%',display:'flex',flexDirection:'column',alignItems:'center',padding:'0 22px',fontFamily:"-apple-system,'SF Pro Display',sans-serif",boxSizing:'border-box',overflow:'hidden',transition:'background 0.8s ease',animation:'fadeIn 0.3s ease'}}>
      <audio ref={audio}/>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes fadeInFast{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes trackIn{from{opacity:0;transform:translateX(18px) scale(0.97)}to{opacity:1;transform:translateX(0) scale(1)}}
        @keyframes trackOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(-18px)}}
        @keyframes popIn{from{opacity:0;transform:scale(0.88)}to{opacity:1;transform:scale(1)}}
        @keyframes dotPulse{0%,100%{opacity:0.4;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}
        .track-row{transition:background 0.15s ease}
        
        .mini-player{transition:opacity 0.25s ease,transform 0.25s cubic-bezier(0.34,1.56,0.64,1)}
        .mini-cover{transition:transform 0.2s ease}
        .mini-cover:active{transform:scale(0.93)}
        .play-btn{transition:transform 0.15s ease,box-shadow 0.2s ease}
        .play-btn:active{transform:scale(0.91)}
        .prev-next-btn{transition:opacity 0.2s ease,transform 0.15s ease}
        .prev-next-btn:active{transform:scale(0.88)}
        .nav-item{transition:opacity 0.15s ease}
        .nav-item:active{opacity:0.6}
        .tab-btn{transition:background 0.2s ease,color 0.2s ease,transform 0.15s ease}
        .tab-btn:active{transform:scale(0.95)}
        .modal-sheet{animation:slideUp 0.28s cubic-bezier(0.25,0.46,0.45,0.94) both;will-change:transform}
        .screen-fade{animation:fadeIn 0.22s ease both}
        .screen-slide-up{animation:slideUp 0.25s cubic-bezier(0.25,0.46,0.45,0.94) both}
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
        .track-row{transition:background 0.15s ease}
        
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
          onPointerDown={()=>setFullPlayer(false)}
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
        {/* Прогресс-бар полного плеера — управляется через DOM refs */}
        <div style={{width:'100%',position:'relative'}}
          onPointerDown={e=>{
            e.stopPropagation();
            const rect=e.currentTarget.getBoundingClientRect();
            const v=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
            const a=audio.current;if(a?.duration){a.currentTime=v*a.duration;progressRef.current=v*100;}
          }}>
          <div style={{width:'100%',height:3,background:'rgba(255,255,255,0.1)',borderRadius:3,position:'relative',cursor:'pointer'}}>
            <div ref={seekBarFillRef} style={{height:'100%',background:ACC,borderRadius:3,width:'0%',pointerEvents:'none'}}/>
            <div ref={seekBarThumbRef} style={{position:'absolute',top:'50%',left:'0%',transform:'translate(-50%,-50%)',width:13,height:13,background:ACC,borderRadius:'50%',pointerEvents:'none'}}/>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'rgba(240,240,240,0.5)',marginTop:4}}>
          <span ref={curTimeDisplayRef}>0:00</span>
          <span>{current.duration}</span>
        </div>
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
      {addToPl&&<PlModalExt track={addToPl} playlists={playlists} onClose={()=>setAddToPl(null)} onAdd={addToPl2} lang={lang} t={t}/>}
    </div>
  );

  return(
    <div onPointerDown={()=>{if(menuId)setMenuId(null);if(plMenuId)setPlMenuId(null);if(trackMenuPlId){setTrackMenuPlId(null);setTrackMenuTr(null);}}} style={{background:BG,minHeight:'100vh',width:'100%',fontFamily:"-apple-system,'SF Pro Display',sans-serif",position:'relative',boxSizing:'border-box'}}>
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
        @keyframes dotPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.35;transform:scale(0.65)}}
        button:focus{outline:none!important}
        *{-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{display:none}
        .nav-item{transition:transform 0.15s cubic-bezier(0.34,1.56,0.64,1),opacity 0.15s ease}
        .nav-item:active{transform:scale(0.82)}
        .active-nav{animation:popIn 0.2s cubic-bezier(0.34,1.56,0.64,1)}
        .track-row{transition:background 0.15s ease}
        
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
      <div style={{paddingBottom:current?NAV_H+5+96+8:NAV_H+6,minHeight:'100vh'}}>

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
                  <button onPointerDown={()=>{
                    const deepLink=`https://t.me/forty7mbot?startapp=album-${albumPage.id}`;
                    const text=`${albumPage.title} — ${albumPage.artist} 💿\nListen on Forty7`;
                    const tgApp=window.Telegram?.WebApp;
                    if(tgApp){
                      if(typeof tgApp.shareUrl==='function'){tgApp.shareUrl(deepLink,text);return;}
                      if(typeof tgApp.openTelegramLink==='function'){tgApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(text)}`);return;}
                      if(typeof tgApp.openLink==='function'){tgApp.openLink(`https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(text)}`);return;}
                    }
                    window.open(`https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(text)}`,'_blank');
                  }} style={{padding:'10px 14px',borderRadius:10,border:'1px solid #3a3a3a',background:'transparent',color:TEXT_SEC,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s ease',...tap}}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  </button>
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
            {/* Pinned playlist */}
            {pinnedPlId&&playlists.find(p=>p.id===pinnedPlId)&&(()=>{
              const pp=playlists.find(p=>p.id===pinnedPlId)!;
              return(
              <div style={{padding:'0 16px',marginBottom:14,animation:'slideUp 0.3s ease both'}}>
                <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:'uppercase' as const,letterSpacing:0.8,marginBottom:8}}>📌 {lang==='ru'?'Закреплённый плейлист':lang==='uk'?'Закріплений плейлист':lang==='kk'?'Бекітілген':lang==='pl'?'Przypięta playlista':'Pinned playlist'}</div>
                <div onPointerDown={()=>{setScreen('library');setLibTab('playlists');setOpenPlPage(pp.id);}} style={{background:BG2,border:`1px solid ${ACC}33`,borderRadius:14,padding:'12px 14px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',...tap}}>
                  <div style={{width:52,height:52,borderRadius:9,overflow:'hidden',flexShrink:0,display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:BG3}}>
                    {pp.tracks.slice(0,4).map((tr,i)=><div key={i} style={{overflow:'hidden'}}><Img src={tr.cover} size={26} radius={0}/></div>)}
                    {pp.tracks.length===0&&<div style={{gridColumn:'span 2',gridRow:'span 2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,color:ACC}}>🎵</div>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{pp.name}</div>
                    <div style={{fontSize:11,color:TEXT_SEC,marginTop:2}}>{pp.tracks.length} {lang==='ru'?'треков':lang==='uk'?'треків':'tracks'}</div>
                  </div>
                  <div style={{flexShrink:0,padding:'6px 11px',borderRadius:8,border:`1px solid ${ACC}44`,background:'transparent',display:'flex',alignItems:'center',gap:5}}>
                    <span style={{fontSize:11,color:ACC+'bb',fontWeight:500}}>{lang==='ru'?'Открыть':lang==='uk'?'Відкрити':lang==='kk'?'Ашу':lang==='pl'?'Otwórz':'Open'}</span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={ACC+'99'} strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                </div>
              </div>
              );
            })()}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',marginBottom:8,animation:'slideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94) 0.1s both'}}>
              <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:'uppercase' as const,letterSpacing:0.8}}>{t('recommended')}</div>
<button onPointerDown={()=>loadRecommendations()} disabled={recsLoading} style={{background:'none',border:'none',cursor:recsLoading?'default':'pointer',padding:4,...tap,opacity:recsLoading?0.5:1}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2.2" strokeLinecap="round" style={{display:'block',animation:recsLoading?'spin 0.8s linear infinite':undefined,transition:'opacity 0.2s ease'}}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
              </button>
            </div>
            {recs.length===0&&history.length<1
              ?<div style={{padding:'0 16px'}}>
                <div style={{fontSize:12,color:TEXT_MUTED,marginBottom:12}}>{t('noRecommended')}</div>
                <div style={{background:`linear-gradient(135deg,${ACC_DIM},rgba(239,191,127,0.06))`,border:`1px solid ${ACC}33`,borderRadius:14,padding:'14px 16px',display:'flex',alignItems:'center',gap:12,animation:'slideUp 0.3s ease both'}}>
                  <div style={{fontSize:28,flexShrink:0}}>🎵</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:TEXT_PRIMARY,marginBottom:3}}>
                      {lang==='ru'?'Перенеси свои плейлисты':lang==='uk'?'Перенеси свої плейлисти':lang==='kk'?'Плейлисттеріңді әкел':lang==='pl'?'Przenieś swoje playlisty':lang==='tr'?'Playlistlerini taşı':'Import your playlists'}
                    </div>
                    <div style={{fontSize:11,color:TEXT_SEC}}>
                      {lang==='ru'?'Spotify, YouTube, SoundCloud, Apple Music, Яндекс':lang==='uk'?'Spotify, YouTube, SoundCloud, Apple Music, Яндекс':lang==='kk'?'Spotify, YouTube, SoundCloud, Apple Music':lang==='pl'?'Spotify, YouTube, SoundCloud, Apple Music, Yandex':lang==='tr'?'Spotify, YouTube, SoundCloud, Apple Music, Yandex':'Spotify, YouTube, SoundCloud, Apple Music, Yandex'}
                    </div>
                  </div>
                  <button onPointerDown={()=>{setScreen('library');setLibTab('playlists');setTimeout(()=>{setShowImport(true);setImportStep('idle');setImportUrl('');setImportError('');setImportPreview(null);setImportResults([]);},100);}} style={{flexShrink:0,padding:'8px 14px',background:ACC,border:'none',borderRadius:9,color:BG,fontSize:12,fontWeight:600,cursor:'pointer',...tap}}>
                    {lang==='ru'?'Импорт':lang==='uk'?'Імпорт':'Import'}
                  </button>
                </div>
              </div>
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
                <div style={{display:'flex',gap:7,marginBottom:9}}>
                  <button onPointerDown={()=>setShowNewPl(true)} style={{flex:1,padding:'10px',background:ACC_DIM,border:`1px dashed ${ACC}44`,borderRadius:11,color:ACC,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,transition:'background 0.2s ease',...tap}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{t('createPlaylist')}
                  </button>
                  <button onPointerDown={()=>{setShowImport(true);setImportStep('idle');setImportUrl('');setImportError('');setImportPreview(null);setImportResults([]);}} style={{padding:'10px 13px',background:BG2,border:'1px solid #2a2a2a',borderRadius:11,color:TEXT_SEC,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:5,transition:'background 0.2s ease',...tap}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={TEXT_SEC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    {lang==='ru'?'Импорт':lang==='uk'?'Імпорт':'Import'}
                  </button>
                </div>
                {showNewPl&&(<div style={{background:BG2,border:'1px solid #242424',borderRadius:11,padding:'11px',marginBottom:9,animation:'slideDown 0.22s cubic-bezier(0.25,0.46,0.45,0.94) both'}}><input autoFocus placeholder={t('playlistName')} value={newPlName} onChange={e=>setNewPlName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createPl()} style={{width:'100%',padding:'8px 11px',fontSize:13,background:BG,border:'1px solid #2a2a2a',borderRadius:7,color:TEXT_PRIMARY,outline:'none',boxSizing:'border-box' as const,marginBottom:4}}/><div style={{display:'flex',gap:6}}><button onPointerDown={createPl} style={{flex:1,padding:'8px',background:ACC,border:'none',borderRadius:7,color:BG,fontSize:12,fontWeight:600,cursor:'pointer',transition:'transform 0.15s ease',...tap}}>{t('create')}</button><button onPointerDown={()=>{setShowNewPl(false);setNewPlName('');}} style={{flex:1,padding:'8px',background:BG3,border:'none',borderRadius:7,color:TEXT_SEC,fontSize:12,cursor:'pointer',...tap}}>{t('cancel')}</button></div></div>)}
                {playlists.map(pl=>(
                  <div key={pl.id} onPointerDown={()=>setOpenPlPage(pl.id)} style={{background:BG2,border:`1px solid ${pinnedPlId===pl.id?ACC+'44':'#1e1e1e'}`,borderRadius:12,marginBottom:7,padding:'11px 13px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,transition:'background 0.15s ease',...tap}}>
                    <div style={{width:46,height:46,borderRadius:7,overflow:'hidden',flexShrink:0,display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:BG3}}>{pl.tracks.slice(0,4).map((tr,i)=><div key={i} style={{overflow:'hidden',width:'100%',height:'100%'}}><Img src={tr.cover} size={23} radius={0}/></div>)}{pl.tracks.length===0&&<div style={{gridColumn:'span 2',gridRow:'span 2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,color:ACC}}>🎵</div>}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:500,color:TEXT_PRIMARY,display:'flex',alignItems:'center',gap:5}}>
                        {pl.name}
                        {pinnedPlId===pl.id&&<span style={{fontSize:9,color:ACC,background:ACC_DIM,padding:'1px 5px',borderRadius:4}}>📌</span>}
                      </div>
                      <div style={{fontSize:10,color:TEXT_SEC,marginTop:2}}>{pl.tracks.length} {lang==='ru'?'треков':lang==='uk'?'треків':'tracks'}</div>
                    </div>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                ))}              </div>
            )}
          </div>
        )}
 
        {/* ── FOR YOU ── */}
        {screen==='trending'&&(
          <div className="screen-fade" style={{minHeight:'100vh'}}>
            <div style={{padding:'18px 16px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:24,fontWeight:800,color:TEXT_PRIMARY,letterSpacing:-0.5}}>
                  {lang==='ru'?'✨ Для тебя':lang==='uk'?'✨ Для тебе':lang==='kk'?'✨ Сен үшін':lang==='pl'?'✨ Dla Ciebie':lang==='tr'?'✨ Senin İçin':'✨ For You'}
                </div>
                <div style={{fontSize:11,color:'#666',marginTop:3,letterSpacing:0.3}}>
                  {lang==='ru'?'Подобрано по твоему вкусу':lang==='uk'?'Підібрано за твоїм смаком':lang==='kk'?'Талғамыңа сай':lang==='pl'?'Dobrane dla Ciebie':lang==='tr'?'Zevkine göre seçildi':'Curated just for you'}
                </div>
              </div>
              <button onPointerDown={()=>loadForYou(true)} disabled={forYouLoading} style={{background:'none',border:'none',cursor:forYouLoading?'default':'pointer',padding:4,...tap,opacity:forYouLoading?0.5:1}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2.2" strokeLinecap="round" style={{display:'block',animation:forYouLoading?'spin 0.8s linear infinite':undefined}}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
              </button>
            </div>
            {forYouLoading&&forYouTracks.length===0?(
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:60,gap:12}}>
                <div style={{width:36,height:36,borderRadius:'50%',border:`2px solid ${ACC}`,borderTopColor:'transparent',animation:'spin 0.8s linear infinite'}}/>
                <div style={{fontSize:12,color:'#555'}}>{lang==='ru'?'Подбираем треки...':lang==='uk'?'Підбираємо треки...':lang==='kk'?'Жүктелуде...':lang==='pl'?'Dobieramy utwory...':lang==='tr'?'Parçalar seçiliyor...':'Finding tracks for you...'}</div>
              </div>
            ):!forYouLoaded&&history.length<1?(
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:70,gap:12,animation:'fadeIn 0.3s ease'}}>
                <div style={{fontSize:40}}>🎵</div>
                <div style={{fontSize:13,color:TEXT_MUTED,textAlign:'center',padding:'0 32px',lineHeight:1.6}}>
                  {lang==='ru'?'Послушай несколько треков — и мы подберём музыку специально для тебя':lang==='uk'?'Послухай кілька треків — і ми підберемо музику спеціально для тебе':lang==='kk'?'Бірнеше трек тыңда, сосын саған арнайы музыка ұсынамыз':lang==='pl'?'Posłuchaj kilku utworów, a my dobierzemy muzykę specjalnie dla Ciebie':lang==='tr'?'Birkaç parça dinle, sana özel müzik seçelim':'Listen to some tracks and we\'ll find music just for you'}
                </div>
              </div>
            ):forYouTracks.length===0?(
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:70,gap:12,animation:'fadeIn 0.3s ease'}}>
                <div style={{fontSize:40}}>🔍</div>
                <div style={{fontSize:13,color:'#555'}}>{lang==='ru'?'Нет данных':lang==='uk'?'Немає даних':lang==='kk'?'Деректер жоқ':lang==='pl'?'Brak danych':lang==='tr'?'Veri yok':'No data'}</div>
                <button onPointerDown={()=>loadForYou(true)} style={{padding:'9px 24px',background:ACC_DIM,border:`1px solid ${ACC}44`,borderRadius:10,color:ACC,fontSize:12,cursor:'pointer',transition:'background 0.2s ease',...tap}}>
                  {lang==='ru'?'Обновить':lang==='uk'?'Оновити':lang==='kk'?'Жаңарту':lang==='pl'?'Odśwież':lang==='tr'?'Yenile':'Refresh'}
                </button>
              </div>
            ):(
              <div style={{padding:'0 4px 16px'}}>
                {forYouTracks.map((tr,i)=>(
                  <TRow key={tr.id+'fy'+i} track={tr} num={i+1} showBlockBtn={true} onArtistClick={(n,c)=>openArtist('',n,c,0)}/>
                ))}
                <div style={{display:'flex',justifyContent:'center',padding:'16px 0 8px'}}>
                  <button onPointerDown={()=>loadForYou(false)} disabled={forYouLoading}
                    style={{padding:'11px 28px',background:forYouLoading?'#2a2a2a':ACC_DIM,border:`1px solid ${ACC}33`,borderRadius:12,color:forYouLoading?'#5a5a5a':ACC,fontSize:13,fontWeight:600,cursor:forYouLoading?'not-allowed':'pointer',opacity:forYouLoading?0.6:1,transition:'background 0.2s ease,opacity 0.2s ease',...tap}}>
                    {forYouLoading?'...':(lang==='ru'?'Ещё треки':lang==='uk'?'Ще треки':lang==='kk'?'Тағы жүктеу':lang==='pl'?'Więcej':'More tracks')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
 
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
                  {/* ── MONTHLY STATS BUTTON ── */}
                  <div style={{position:'relative',zIndex:1,padding:'0 16px',paddingBottom:16}}>
                  {(()=>{const mStat=monthStats.current;const mTop=Object.entries(mStat.trackPlays).sort((a,b)=>b[1].count-a[1].count);const mSec=(s:number)=>{const h=Math.floor(s/3600);const m2=Math.floor((s%3600)/60);return h>0?`${h}h ${m2}m`:`${m2}m`;};return(
                  <button onPointerDown={()=>setScreen('monthstats')} style={{width:'100%',padding:'13px 16px',background:`linear-gradient(135deg,rgba(239,191,127,0.12),rgba(239,191,127,0.06))`,border:`1px solid ${ACC}33`,borderRadius:14,display:'flex',alignItems:'center',gap:12,marginBottom:12,cursor:'pointer',textAlign:'left' as const,transition:'all 0.2s ease',...tap}}>
                    <div style={{fontSize:26,flexShrink:0}}>📊</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:TEXT_PRIMARY,marginBottom:2}}>{lang==='ru'?'Статистика за месяц':lang==='uk'?'Статистика за місяць':lang==='kk'?'Ай статистикасы':lang==='pl'?'Statystyki miesiąca':lang==='tr'?'Aylık istatistikler':'Monthly Stats'}</div>
                      <div style={{fontSize:11,color:TEXT_SEC}}>{mSec(mStat.totalSec)} · {mStat.listenedIds.length} {lang==='ru'?'треков':lang==='uk'?'треків':lang==='kk'?'трек':lang==='pl'?'utworów':lang==='tr'?'parça':'tracks'}{mTop[0]?` · ${mTop[0][1].artist}`:''}</div>
                    </div>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth="2" strokeLinecap="round" style={{flexShrink:0}}><polyline points="9 18 15 12 9 6"/></svg>
                  </button>);})()}

                  <div style={{height:1,background:'#1e1e1e',marginBottom:12}}/>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                    <div style={{background:'rgba(25,25,25,0.85)',border:'1px solid #222',borderRadius:12,padding:'12px'}}>
                      <div style={{fontSize:10,color:TEXT_MUTED,marginBottom:6,textTransform:'uppercase' as const,letterSpacing:0.7}}>{lang==='ru'?'Времени в музыке':lang==='uk'?'В музиці':lang==='kk'?'Музыкада':lang==='pl'?'W muzyce':lang==='tr'?'Müzikte':'Time in music'}</div>
                      <div style={{fontSize:18,fontWeight:700,color:ACC}}>{fmtTime()}</div>
                    </div>
                    <div style={{background:'rgba(25,25,25,0.85)',border:'1px solid #222',borderRadius:12,padding:'12px'}}>
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
 
      {addToPl&&!fullPlayer&&<PlModalExt track={addToPl} playlists={playlists} onClose={()=>setAddToPl(null)} onAdd={addToPl2} lang={lang} t={t}/>}
      {showImport&&<ImportModalExt
        importStep={importStep} setImportStep={setImportStep}
        importTab={importTab} setImportTab={setImportTab}
        importUrl={importUrl} setImportUrl={setImportUrl}
        importError={importError} setImportError={setImportError}
        importPreview={importPreview} setImportPreview={setImportPreview}
        importResults={importResults}
        importProgress={importProgress}
        onClose={()=>setShowImport(false)}
        onImport={runImport}
        onMatch={runMatch}
        lang={lang} t={t}
      />}
 
      {/* ── MONTH STATS SCREEN ── */}
      {screen==='monthstats'&&(()=>{
        // Показываем текущий месяц — он всегда собирается
        const mStat=monthStats.current;
        const mNames={'01':'January','02':'February','03':'March','04':'April','05':'May','06':'June','07':'July','08':'August','09':'September','10':'October','11':'November','12':'December'} as Record<string,string>;
        const mNamesRu={'01':'январь','02':'февраль','03':'март','04':'апрель','05':'май','06':'июнь','07':'июль','08':'август','09':'сентябрь','10':'октябрь','11':'ноябрь','12':'декабрь'} as Record<string,string>;
        const mNamesUk={'01':'січень','02':'лютий','03':'березень','04':'квітень','05':'травень','06':'червень','07':'липень','08':'серпень','09':'вересень','10':'жовтень','11':'листопад','12':'грудень'} as Record<string,string>;
        const mm=mStat.month.slice(5,7);const yyyy=mStat.month.slice(0,4);
        const mName=lang==='ru'?mNamesRu[mm]:lang==='uk'?mNamesUk[mm]:mNames[mm];
        const monthTitle=lang==='ru'?`${mName.charAt(0).toUpperCase()+mName.slice(1)} ${yyyy}`:lang==='uk'?`${mName.charAt(0).toUpperCase()+mName.slice(1)} ${yyyy}`:`${mName} ${yyyy}`;
        const totalSecs=mStat.totalSec;
        const hh=Math.floor(totalSecs/3600);const mm2=Math.floor((totalSecs%3600)/60);
        const fmtT=hh>0?(lang==='ru'||lang==='uk'?`${hh} ч ${mm2} мин`:lang==='kk'?`${hh} сағ ${mm2} мин`:lang==='pl'?`${hh} godz ${mm2} min`:lang==='tr'?`${hh} sa ${mm2} dk`:`${hh}h ${mm2}m`):(lang==='ru'||lang==='uk'?`${mm2} мин`:lang==='kk'?`${mm2} мин`:lang==='pl'?`${mm2} min`:lang==='tr'?`${mm2} dk`:`${mm2}m`);
        const topTracks=Object.entries(mStat.trackPlays).sort((a,b)=>b[1].count-a[1].count);
        const topArtists=(()=>{const m:Record<string,{name:string;cover:string;count:number;secs:number}>={};for(const [,v] of topTracks){if(!m[v.artist])m[v.artist]={name:v.artist,cover:v.cover,count:0,secs:0};m[v.artist].count+=v.count;m[v.artist].secs+=v.count*210;}return Object.values(m).sort((a,b)=>b.count-a.count).slice(0,5);})();
        const totalPlays=topTracks.reduce((s,[,v])=>s+v.count,0);
        const topCover=topTracks[0]?topTracks[0][1].cover:'';
        const isFirstEver=monthStats.current.totalSec===0&&monthStats.current.listenedIds.length===0;
        const isCollecting=monthStats.current.totalSec>0||monthStats.current.listenedIds.length>0;
        return(
        <div className="screen-fade" style={{position:'fixed',inset:0,background:BG,overflowY:'auto',paddingBottom:100,zIndex:50}}>
          {/* Hero */}
          <div style={{position:'relative',overflow:'hidden',marginBottom:0}}>
            {topCover&&<img src={topCover} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',filter:'blur(20px) saturate(0.7) brightness(0.35)',transform:'scale(1.1)'}} onError={()=>{}}/>}
            {topCover&&<div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(14,14,14,0.2) 0%,rgba(14,14,14,0.95) 100%)'}}/>}
            <div style={{position:'relative',zIndex:1,padding:'14px 16px 20px'}}>
              <button onPointerDown={()=>setScreen('profile')} style={{background:'none',border:'none',cursor:'pointer',padding:'4px 8px 4px 0',display:'flex',alignItems:'center',gap:4,marginBottom:16,...tap}}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={TEXT_SEC} strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                <span style={{fontSize:12,color:TEXT_SEC}}>{lang==='ru'?'Профиль':lang==='uk'?'Профіль':lang==='kk'?'Профиль':lang==='pl'?'Profil':lang==='tr'?'Profil':'Profile'}</span>
              </button>
              <div style={{fontSize:11,color:ACC,fontWeight:600,marginBottom:6,letterSpacing:1,textTransform:'uppercase' as const}}>
                {lang==='ru'?'Итоги месяца':lang==='uk'?'Підсумки місяця':lang==='kk'?'Ай қорытындысы':lang==='pl'?'Podsumowanie miesiąca':lang==='tr'?'Aylık özet':'Monthly Recap'}
              </div>
              <div style={{fontSize:28,fontWeight:800,color:TEXT_PRIMARY,marginBottom:4,letterSpacing:-0.5}}>{monthTitle}</div>
              {isFirstEver?(
                <div style={{fontSize:13,color:TEXT_SEC,marginTop:8,lineHeight:1.6}}>
                  {lang==='ru'?'Слушай музыку весь месяц — в конце покажем твои итоги 🎵':lang==='uk'?'Слухай музику весь місяць — наприкінці покажемо підсумки 🎵':'Listen all month — we\'ll show your recap at the end 🎵'}
                </div>
              ):isCollecting?(
                <div>
                  <div style={{display:'flex',gap:16,marginTop:8}}>
                    <div><div style={{fontSize:30,fontWeight:800,color:ACC,lineHeight:1}}>{fmtT}</div><div style={{fontSize:10,color:TEXT_SEC,marginTop:2}}>{lang==='ru'?'прослушано':lang==='uk'?'прослухано':'listened'}</div></div>
                    <div><div style={{fontSize:30,fontWeight:800,color:TEXT_PRIMARY,lineHeight:1}}>{mStat.listenedIds.length}</div><div style={{fontSize:10,color:TEXT_SEC,marginTop:2}}>{lang==='ru'?'треков':lang==='uk'?'треків':'tracks'}</div></div>
                  </div>
                  <div style={{marginTop:10,fontSize:11,color:TEXT_MUTED,display:'flex',alignItems:'center',gap:6}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:'#7ecf7e',animation:'dotPulse 1.6s ease infinite',flexShrink:0}}/>
                    {lang==='ru'?'Идёт сбор статистики...':lang==='uk'?'Збирається статистика...':'Collecting stats...'}
                  </div>
                </div>
              ):(
                <div>
                  <div style={{display:'flex',gap:16,marginTop:8}}>
                    <div><div style={{fontSize:30,fontWeight:800,color:ACC,lineHeight:1}}>{fmtT}</div><div style={{fontSize:10,color:TEXT_SEC,marginTop:2}}>{lang==='ru'?'прослушано':lang==='uk'?'прослухано':'listened'}</div></div>
                    <div><div style={{fontSize:30,fontWeight:800,color:TEXT_PRIMARY,lineHeight:1}}>{mStat.listenedIds.length}</div><div style={{fontSize:10,color:TEXT_SEC,marginTop:2}}>{lang==='ru'?'треков':lang==='uk'?'треків':'tracks'}</div></div>
                    {totalPlays>0&&<div><div style={{fontSize:30,fontWeight:800,color:TEXT_PRIMARY,lineHeight:1}}>{totalPlays}</div><div style={{fontSize:10,color:TEXT_SEC,marginTop:2}}>{lang==='ru'?'включений':lang==='uk'?'увімкнень':'plays'}</div></div>}
                  </div>
                  {topArtists[0]&&<div style={{marginTop:10,fontSize:11,color:TEXT_SEC}}>{'🎤 '}{lang==='ru'?'Топ-артист:':lang==='uk'?'Топ-артист:':'Top artist:'} <span style={{color:ACC,fontWeight:600}}>{topArtists[0].name}</span></div>}
                </div>
              )}
            </div>
          </div>

          <div style={{padding:'0 16px'}}>

          {/* Top track card */}
          {topTracks[0]&&!isFirstEver&&(
            <div style={{background:'rgba(20,20,20,0.9)',border:`1px solid ${ACC}22`,borderRadius:16,overflow:'hidden',marginBottom:14,animation:'slideUp 0.3s ease both'}}>
              <div style={{position:'relative',height:160,overflow:'hidden'}}>
                <img src={topTracks[0][1].cover} style={{width:'100%',height:'100%',objectFit:'cover',filter:'brightness(0.6)'}} onError={()=>{}}/>
                <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(14,14,14,0.95) 0%,transparent 60%)'}}/>
                <div style={{position:'absolute',bottom:12,left:14,right:14}}>
                  <div style={{fontSize:9,color:ACC,fontWeight:700,letterSpacing:1,textTransform:'uppercase' as const,marginBottom:4}}>
                    {lang==='ru'?'🔥 Трек месяца':lang==='uk'?'🔥 Трек місяця':lang==='kk'?'🔥 Ай треги':lang==='pl'?'🔥 Utwór miesiąca':lang==='tr'?'🔥 Ayın parçası':'🔥 Track of the month'}
                  </div>
                  <div style={{fontSize:16,fontWeight:700,color:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{topTracks[0][1].title}</div>
                  <div style={{fontSize:12,color:TEXT_SEC,marginTop:2}}>{topTracks[0][1].artist}</div>
                </div>
              </div>
              <div style={{padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',gap:16}}>
                  <div style={{textAlign:'center' as const}}><div style={{fontSize:18,fontWeight:700,color:ACC}}>{topTracks[0][1].count}</div><div style={{fontSize:9,color:TEXT_MUTED}}>{lang==='ru'?'включений':lang==='uk'?'увімкнень':'plays'}</div></div>
                  {totalPlays>0&&<div style={{textAlign:'center' as const}}><div style={{fontSize:18,fontWeight:700,color:TEXT_PRIMARY}}>{Math.round(topTracks[0][1].count/totalPlays*100)}%</div><div style={{fontSize:9,color:TEXT_MUTED}}>{lang==='ru'?'от всего':lang==='uk'?'від усього':'of total'}</div></div>}
                </div>
                <button onPointerDown={()=>{const t=topTracks[0];if(t)playTrack({id:t[0],title:t[1].title,artist:t[1].artist,cover:t[1].cover,duration:'',plays:t[1].count,mp3:null});}} style={{padding:'7px 14px',background:ACC,border:'none',borderRadius:9,color:BG,fontSize:11,fontWeight:700,cursor:'pointer',...tap}}>
                  {lang==='ru'?'▶ Слушать':lang==='uk'?'▶ Слухати':'▶ Play'}
                </button>
              </div>
            </div>
          )}

          {/* Top 5 tracks */}
          {topTracks.length>1&&!isFirstEver&&(
            <div style={{background:'rgba(20,20,20,0.8)',border:'1px solid #222',borderRadius:14,padding:'12px 14px',marginBottom:14,animation:'slideUp 0.35s ease both'}}>
              <div style={{fontSize:11,fontWeight:700,color:TEXT_PRIMARY,marginBottom:10}}>
                {lang==='ru'?'🎵 Топ-5 треков':lang==='uk'?'🎵 Топ-5 треків':lang==='kk'?'🎵 Топ-5 трек':lang==='pl'?'🎵 Top 5 utworów':lang==='tr'?'🎵 Top 5 parça':'🎵 Top 5 Tracks'}
              </div>
              {topTracks.slice(0,5).map(([id,v],i)=>(
                <div key={id} onPointerDown={()=>playTrack({id,title:v.title,artist:v.artist,cover:v.cover,duration:'',plays:v.count,mp3:null})} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0',borderBottom:i<4?'1px solid #1a1a1a':'none',cursor:'pointer'}}>
                  <div style={{fontSize:13,fontWeight:800,color:i===0?ACC:'#444',width:18,textAlign:'right' as const,flexShrink:0}}>{i+1}</div>
                  <Img src={v.cover||''} size={38} radius={7}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:i===0?ACC:TEXT_PRIMARY,fontWeight:i===0?700:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{v.title}</div>
                    <div style={{fontSize:10,color:TEXT_SEC,marginTop:1}}>{v.artist}</div>
                  </div>
                  <div style={{textAlign:'right' as const,flexShrink:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:i===0?ACC:TEXT_SEC}}>{v.count}</div>
                    <div style={{fontSize:9,color:TEXT_MUTED}}>{lang==='ru'?'раз':lang==='uk'?'разів':'×'}</div>
                  </div>
                </div>
              ))}
              {topTracks.length>=3&&(
                <button onPointerDown={()=>{const tracks=topTracks.slice(0,10).map(([id,v])=>({id,title:v.title,artist:v.artist,cover:v.cover,duration:'',plays:v.count,mp3:null} as Track));const pl:Playlist={id:Date.now().toString(),name:`${monthTitle} top`,tracks,repeat:false};setPlaylists(prev=>{const n=[...prev,pl];try{localStorage.setItem('p47',JSON.stringify(n));}catch{}return n;});setScreen('library');setLibTab('playlists');}} style={{width:'100%',marginTop:10,padding:'9px',background:ACC_DIM,border:`1px solid ${ACC}33`,borderRadius:9,color:ACC,fontSize:11,fontWeight:600,cursor:'pointer',...tap}}>
                  {lang==='ru'?`💾 Создать плейлист «${monthTitle} top»`:lang==='uk'?`💾 Створити плейлист «${monthTitle} top»`:`💾 Create playlist "${monthTitle} top"`}
                </button>
              )}
            </div>
          )}

          {/* Top artists */}
          {topArtists.length>0&&!isFirstEver&&(
            <div style={{background:'rgba(20,20,20,0.8)',border:'1px solid #222',borderRadius:14,padding:'12px 14px',marginBottom:14,animation:'slideUp 0.4s ease both'}}>
              <div style={{fontSize:11,fontWeight:700,color:TEXT_PRIMARY,marginBottom:10}}>
                {lang==='ru'?'🎤 Топ артистов':lang==='uk'?'🎤 Топ артистів':lang==='kk'?'🎤 Топ орындаушылар':lang==='pl'?'🎤 Top artystów':lang==='tr'?'🎤 Top sanatçılar':'🎤 Top Artists'}
              </div>
              {topArtists.map((a,i)=>(
                <div key={a.name} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0',borderBottom:i<topArtists.length-1?'1px solid #1a1a1a':'none'}}>
                  <div style={{fontSize:13,fontWeight:800,color:i===0?ACC:'#444',width:18,textAlign:'right' as const,flexShrink:0}}>{i+1}</div>
                  <div style={{width:38,height:38,borderRadius:'50%',overflow:'hidden',flexShrink:0,background:BG3}}><Img src={a.cover||''} size={38} radius={19}/></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:i===0?ACC:TEXT_PRIMARY,fontWeight:i===0?700:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.name}</div>
                    <div style={{fontSize:10,color:TEXT_SEC,marginTop:1}}>{a.count} {lang==='ru'?'треков':lang==='uk'?'треків':'tracks'}</div>
                  </div>
                  {totalPlays>0&&<div style={{fontSize:11,color:TEXT_MUTED,flexShrink:0}}>{Math.round(a.count/totalPlays*100)}%</div>}
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {isFirstEver&&(
            <div style={{textAlign:'center' as const,padding:'40px 20px',animation:'fadeIn 0.4s ease'}}>
              <div style={{fontSize:48,marginBottom:16}}>🎵</div>
              <div style={{fontSize:15,fontWeight:600,color:TEXT_PRIMARY,marginBottom:8}}>
                {lang==='ru'?'Статистика пока не готова':lang==='uk'?'Статистика ще не готова':'Stats not ready yet'}
              </div>
              <div style={{fontSize:13,color:TEXT_SEC,lineHeight:1.6}}>
                {lang==='ru'?'Слушай музыку в течение месяца — в конце января покажем все твои итоги':lang==='uk'?'Слухай музику протягом місяця — наприкінці покажемо підсумки':'Listen to music this month — we\'ll show your full recap at the end of the month'}
              </div>
            </div>
          )}

          </div>
        </div>
        );
      })()}

      {/* ── PLAYLIST PAGE ── */}
      {/* ── PLAYLIST PAGE ── */}
      {openPlPage&&(()=>{
        const pl=playlists.find(p=>p.id===openPlPage);
        if(!pl)return null;
        if(screen!=='library')return null;
        const isPinned=pinnedPlId===pl.id;
        const coverSrc=pl.tracks[0]?.cover||'';
        const sortPl=(s:'default'|'az'|'za'|'artist'|'newest'|'oldest')=>{
          setPlaylists(prev=>{const n=prev.map(p=>p.id===pl.id?{...p,sort:s}:p);try{localStorage.setItem('p47',JSON.stringify(n));}catch{}return n;});
        };
        const curSort=pl.sort||'default';
        const sortedTracks=[...pl.tracks].sort((a,b)=>{
          if(curSort==='az')return a.title.localeCompare(b.title);
          if(curSort==='za')return b.title.localeCompare(a.title);
          if(curSort==='artist')return a.artist.localeCompare(b.artist);
          if(curSort==='newest')return pl.tracks.indexOf(b)-pl.tracks.indexOf(a);
          if(curSort==='oldest')return pl.tracks.indexOf(a)-pl.tracks.indexOf(b);
          return 0;
        });
        const SORTS:[string,'default'|'az'|'za'|'artist'|'newest'|'oldest'][]=[
          [lang==='ru'?'По умолчанию':lang==='uk'?'За замовч.':'Default','default'],
          [lang==='ru'?'А → Я':lang==='uk'?'А → Я':'A → Z','az'],
          [lang==='ru'?'Я → А':lang==='uk'?'Я → А':'Z → A','za'],
          [lang==='ru'?'Артист':'Artist','artist'],
          [lang==='ru'?'Новые':lang==='uk'?'Нові':'Newest','newest'],
          [lang==='ru'?'Старые':lang==='uk'?'Старі':'Oldest','oldest'],
        ];
        return(
        <div className="screen-fade" style={{position:'fixed',inset:0,background:BG,zIndex:50,overflowY:'auto',paddingBottom:120}}>
          {/* Header */}
          <div style={{position:'relative',overflow:'hidden'}}>
            {coverSrc&&<img src={coverSrc} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',filter:'blur(24px) brightness(0.3)',transform:'scale(1.1)'}} onError={()=>{}}/>}
            <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent 0%,rgba(14,14,14,0.85) 70%,'+BG+' 100%)'}}/>
            <div style={{position:'relative',zIndex:1,padding:'14px 16px 0'}}>
              <button onPointerDown={()=>setOpenPlPage(null)} style={{background:'none',border:'none',cursor:'pointer',padding:'6px 10px 6px 0',display:'flex',alignItems:'center',gap:6,marginBottom:14,...tap}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={TEXT_SEC} strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                <span style={{fontSize:13,color:TEXT_SEC}}>{lang==='ru'?'Плейлисты':lang==='uk'?'Плейлисти':'Playlists'}</span>
              </button>
              <div style={{display:'flex',gap:16,alignItems:'flex-end',marginBottom:18}}>
                <div style={{width:100,height:100,borderRadius:14,overflow:'hidden',flexShrink:0,display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:BG3,boxShadow:'0 8px 32px rgba(0,0,0,0.5)'}}>
                  {pl.tracks.slice(0,4).map((tr,i)=><div key={i} style={{overflow:'hidden'}}><Img src={tr.cover} size={50} radius={0}/></div>)}
                  {pl.tracks.length===0&&<div style={{gridColumn:'span 2',gridRow:'span 2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,color:ACC}}>🎵</div>}
                </div>
                <div style={{flex:1,minWidth:0,paddingBottom:4}}>
                  {renamePlId===pl.id?(
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      <input autoFocus value={renamePlVal} onChange={e=>setRenamePlVal(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){setPlaylists(prev=>{const n=prev.map(p=>p.id===pl.id?{...p,name:renamePlVal.trim()||p.name}:p);try{localStorage.setItem('p47',JSON.stringify(n));}catch{}return n;});setRenamePlId(null);}if(e.key==='Escape')setRenamePlId(null);}} style={{flex:1,padding:'8px 12px',fontSize:15,background:'rgba(40,40,40,0.9)',border:'1px solid #3a3a3a',borderRadius:10,color:TEXT_PRIMARY,outline:'none',fontWeight:700}}/>
                      <button onPointerDown={()=>{setPlaylists(prev=>{const n=prev.map(p=>p.id===pl.id?{...p,name:renamePlVal.trim()||p.name}:p);try{localStorage.setItem('p47',JSON.stringify(n));}catch{}return n;});setRenamePlId(null);}} style={{padding:'8px 14px',background:ACC,border:'none',borderRadius:10,color:BG,fontSize:14,fontWeight:700,cursor:'pointer',...tap}}>✓</button>
                    </div>
                  ):(
                    <div style={{fontSize:22,fontWeight:800,color:TEXT_PRIMARY,letterSpacing:-0.5}}>{pl.name}{isPinned&&<span style={{fontSize:14,marginLeft:8}}>📌</span>}</div>
                  )}
                  <div style={{fontSize:12,color:TEXT_SEC,marginTop:5}}>{pl.tracks.length} {lang==='ru'?'треков':lang==='uk'?'треків':'tracks'}</div>
                </div>
              </div>
              {/* Action buttons */}
              <div style={{display:'flex',gap:10,marginBottom:16,alignItems:'center'}}>
                <button onPointerDown={()=>playPl(pl)} style={{flex:1,padding:'13px 0',background:ACC,border:'none',borderRadius:14,color:BG,fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,...tap}}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill={BG}><polygon points="6 3 20 12 6 21 6 3"/></svg>
                  {lang==='ru'?'Слушать':lang==='uk'?'Слухати':'Play'}
                </button>
                <button onPointerDown={()=>shufflePl(pl)} style={{flex:1,padding:'13px 0',background:ACC_DIM,border:`1px solid ${ACC}44`,borderRadius:14,color:ACC,fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,...tap}}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2.2" strokeLinecap="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
                  Shuffle
                </button>
                <button onPointerDown={()=>setPlaylists(prev=>{const n=prev.map(p=>p.id===pl.id?{...p,repeat:!p.repeat}:p);try{localStorage.setItem('p47',JSON.stringify(n));}catch{}return n;})} style={{width:52,height:52,borderRadius:14,background:pl.repeat?ACC:BG3,border:`1px solid ${pl.repeat?ACC:'#2a2a2a'}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,...tap}}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={pl.repeat?BG:TEXT_PRIMARY} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
                </button>
                <button onPointerDown={e=>{e.stopPropagation();setPlMenuId(plMenuId===pl.id?null:pl.id);}} style={{width:52,height:52,borderRadius:14,background:BG3,border:'1px solid #2a2a2a',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,...tap}}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="2.5" fill={TEXT_PRIMARY}/><circle cx="12" cy="12" r="2.5" fill={TEXT_PRIMARY}/><circle cx="12" cy="19" r="2.5" fill={TEXT_PRIMARY}/></svg>
                </button>
              </div>
              {/* Sort tabs */}
              <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:12,marginBottom:0}}>
                {SORTS.map(([label,val])=>(
                  <button key={val} onPointerDown={()=>sortPl(val)} style={{flexShrink:0,padding:'6px 12px',borderRadius:20,border:'none',background:curSort===val?ACC:BG3,color:curSort===val?BG:TEXT_SEC,fontSize:11,fontWeight:curSort===val?700:400,cursor:'pointer',transition:'all 0.15s ease',...tap}}>{label}</button>
                ))}
              </div>
            </div>
          </div>
          {/* 3-dot dropdown */}
          {plMenuId===pl.id&&(
            <>
              <div onPointerDown={()=>setPlMenuId(null)} style={{position:'fixed',inset:0,zIndex:199}}/>
              <div onPointerDown={e=>e.stopPropagation()} style={{position:'fixed',top:16,right:16,left:16,background:'#1e1e1e',border:'1px solid #333',borderRadius:14,overflow:'hidden',zIndex:200,animation:'slideDown 0.2s cubic-bezier(0.25,0.46,0.45,0.94) both',boxShadow:'0 20px 60px rgba(0,0,0,0.85)'}}>
                <div style={{padding:'10px 14px',borderBottom:'1px solid #2a2a2a',fontSize:11,color:TEXT_MUTED,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:0.9}}>{pl.name}</div>
                <button onPointerDown={()=>{setPlMenuId(null);pinPl(pl.id);}} style={{width:'100%',padding:'12px 14px',background:'none',border:'none',borderBottom:'1px solid #222',cursor:'pointer',display:'flex',alignItems:'center',gap:10,color:TEXT_PRIMARY,fontSize:13,...tap}}>
                  <span style={{fontSize:16,width:22,textAlign:'center' as const,flexShrink:0}}>{isPinned?'🔓':'📌'}</span>
                  {isPinned?(lang==='ru'?'Открепить с главной':lang==='uk'?'Відкріпити':'Unpin from home'):(lang==='ru'?'Закрепить на главной':lang==='uk'?'Закріпити на головній':'Pin to home')}
                </button>
                <button onPointerDown={()=>{setPlMenuId(null);setRenamePlId(pl.id);setRenamePlVal(pl.name);}} style={{width:'100%',padding:'12px 14px',background:'none',border:'none',borderBottom:'1px solid #222',cursor:'pointer',display:'flex',alignItems:'center',gap:10,color:TEXT_PRIMARY,fontSize:13,...tap}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEXT_SEC} strokeWidth="2" strokeLinecap="round" style={{flexShrink:0}}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  {lang==='ru'?'Переименовать':lang==='uk'?'Перейменувати':'Rename'}
                </button>
                <button onPointerDown={()=>{setPlMenuId(null);if(window.confirm(lang==='ru'?`Удалить "${pl.name}"?`:`Delete "${pl.name}"?`)){deletePl(pl.id);setOpenPlPage(null);}}} style={{width:'100%',padding:'12px 14px',background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:10,color:'#e06060',fontSize:13,...tap}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e06060" strokeWidth="2" strokeLinecap="round" style={{flexShrink:0}}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                  {lang==='ru'?'Удалить плейлист':lang==='uk'?'Видалити плейлист':'Delete playlist'}
                </button>
              </div>
            </>
          )}
          {/* Track 3-dot menu overlay - compact, near track */}
          {trackMenuPlId===pl.id&&trackMenuTr&&(
            <>
              <div onPointerDown={()=>{setTrackMenuPlId(null);setTrackMenuTr(null);}} style={{position:'fixed',inset:0,zIndex:199}}/>
              <div onPointerDown={e=>e.stopPropagation()} style={{position:'fixed',bottom:Math.max(80,window.innerHeight/2-100),right:12,left:12,background:'#1c1c1c',border:'1px solid #2a2a2a',borderRadius:13,overflow:'hidden',zIndex:200,animation:'scaleIn 0.15s ease both',boxShadow:'0 8px 32px rgba(0,0,0,0.85)'}}>
                <div style={{padding:'9px 12px',borderBottom:'1px solid #222',display:'flex',alignItems:'center',gap:9,background:'#222'}}>
                  <Img src={trackMenuTr.cover} size={32} radius={5}/>
                  <div style={{minWidth:0,flex:1}}>
                    <div style={{fontSize:11,fontWeight:600,color:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{trackMenuTr.title}</div>
                    <div style={{fontSize:10,color:TEXT_SEC}}>{trackMenuTr.artist}</div>
                  </div>
                </div>
                {[
                  {icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={TEXT_SEC} strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,label:lang==='ru'?'Поделиться':'Share',color:TEXT_PRIMARY,fn:()=>{const t=trackMenuTr;setTrackMenuPlId(null);setTrackMenuTr(null);shareTrack(t);}},
                  {icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={TEXT_SEC} strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,label:lang==='ru'?'К артисту':'Go to artist',color:TEXT_PRIMARY,fn:()=>{const t=trackMenuTr;setTrackMenuPlId(null);setTrackMenuTr(null);setFullPlayer(false);openArtist('',t.artist,t.cover,0);}},
                  {icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e06060" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>,label:lang==='ru'?'Удалить из плейлиста':'Remove',color:'#e06060',fn:()=>{const t=trackMenuTr;setTrackMenuPlId(null);setTrackMenuTr(null);removeFromPl(pl.id,t.id);}},
                ].map((item,ii,arr)=>(
                  <button key={ii} onPointerDown={item.fn} style={{width:'100%',padding:'11px 12px',background:'none',border:'none',borderBottom:ii<arr.length-1?'1px solid #1a1a1a':'none',cursor:'pointer',display:'flex',alignItems:'center',gap:10,color:item.color,fontSize:12,textAlign:'left' as const,...tap}}>
                    {item.icon}{item.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {/* Track list */}
          <div>
            {pl.tracks.length===0?(
              <div style={{textAlign:'center' as const,padding:'48px 16px',color:TEXT_MUTED,fontSize:14}}>
                {lang==='ru'?'Плейлист пустой — добавь треки через ❤️':'Empty — like tracks to add them ❤️'}
              </div>
            ):sortedTracks.map((tr,i)=>{
              const isActive=current?.id===tr.id;
              return(
              <PlTrackRow
                key={tr.id+String(i)}
                tr={tr}
                i={i}
                isActive={isActive}
                playing={playing}
                isManualQ={manualQIds.has(tr.id)}
                curSort={curSort}
                pl={pl}
                sortedTracks={sortedTracks}
                onPlay={()=>{playTrack(tr);setPlayingPlId(pl.id);setQueue(sortedTracks.slice(i+1));}}
                onQueue={()=>smartAddQ(tr)}
                onRemove={()=>removeFromPl(pl.id,tr.id)}
                onMenu={()=>{setTrackMenuPlId(pl.id);setTrackMenuTr(tr);}}
                onDragStart={()=>{if(curSort==='default'){const ev=window.event as DragEvent;ev?.dataTransfer?.setData('plTrackIdx',String(pl.tracks.indexOf(tr)));ev?.dataTransfer?.setData('plId',pl.id);}}}
                onDrop={()=>{const ev=window.event as DragEvent;if(!ev?.dataTransfer)return;const from=parseInt(ev.dataTransfer.getData('plTrackIdx'));const pid=ev.dataTransfer.getData('plId');if(pid===pl.id&&from!==pl.tracks.indexOf(tr))moveTrackInPl(pl.id,from,pl.tracks.indexOf(tr));}}
              />
              );
            })}
          </div>
        </div>
        );
      })()}

      {/* ── MINI PLAYER ── */}
      {current && screen !== 'profile' && screen !== 'monthstats' && (
        <div
          className="mini-player"
          style={{
            position:'fixed',
            left:8,right:8,
            bottom:NAV_H+5,
            height:96,
            background:'rgba(18,18,18,0.98)',
            backdropFilter:'blur(20px)',
            border:'1px solid #252525',
            borderRadius:16,
            zIndex:100,
            boxSizing:'border-box' as const,
            overflow:'hidden',
          }}
        >
          <div style={{
            position:'relative',
            zIndex:2,
            display:'flex',
            alignItems:'center',
            gap:12,
            padding:'10px 12px 34px',
            height:'100%',
            boxSizing:'border-box' as const,
          }}>
            <button
              type="button"
              key={current.id+'-c'}
              className="mini-cover"
              onPointerDown={(e)=>{e.stopPropagation();setFullPlayer(true);}}
              style={{background:'none',border:'none',padding:0,margin:0,cursor:'pointer',borderRadius:10,overflow:'hidden',flexShrink:0,display:'block',animation:'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both',...tap}}
            >
              <Img src={current.cover} size={52} radius={10}/>
            </button>
 
            <button
              type="button"
              onPointerDown={(e)=>{e.stopPropagation();setFullPlayer(true);}}
              style={{flex:1,minWidth:0,background:'none',border:'none',padding:0,margin:0,cursor:'pointer',textAlign:'left' as const,display:'block',...tap}}
            >
              <div key={current.id+'-t'} style={{fontSize:14,fontWeight:700,color:TEXT_PRIMARY,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',lineHeight:1.2,pointerEvents:'none' as const,animation:'trackIn 0.28s cubic-bezier(0.25,0.46,0.45,0.94) both'}}>
                {current.title}
              </div>
              <div key={current.id+'-a'} style={{fontSize:11,color:TEXT_SEC,marginTop:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',lineHeight:1.2,pointerEvents:'none' as const,animation:'trackIn 0.28s cubic-bezier(0.25,0.46,0.45,0.94) 0.04s both'}}>
                {current.artist}
              </div>
            </button>
 
            <div style={{display:'flex',alignItems:'center',gap:0,flexShrink:0}}>
              <button className="prev-next-btn"
                onPointerDown={(e)=>{e.stopPropagation();playPrev();}}
                style={{background:'none',border:'none',cursor:'pointer',padding:'8px 6px',opacity:playHistory.length>0?1:0.35,...tap}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
              </button>
              <button className="prev-next-btn"
                onPointerDown={(e)=>{e.stopPropagation();playNext();}}
                style={{background:'none',border:'none',cursor:'pointer',padding:'8px 6px',opacity:(queue.length>0||recs.length>0||history.length>0)?1:0.35,...tap}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
              </button>
            </div>
 
            <button className="play-btn"
              onPointerDown={(e)=>{e.stopPropagation();togglePlay();}}
              style={{width:48,height:48,minWidth:48,borderRadius:'50%',background:ACC,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,padding:0,boxShadow:`0 4px 16px ${ACC}44`,...tap}}>
              <PP sz="sm" col={BG}/>
            </button>
          </div>
 
          <div
            style={{
            position:'absolute',
            left:12,right:12,
            bottom:8,
            height:22,
            zIndex:10,
            display:'flex',
            alignItems:'center',
            gap:8,
            pointerEvents:'auto',
          }}
            onPointerDown={e=>e.stopPropagation()}
            onClick={e=>e.stopPropagation()}
          >
            <span ref={miniTimeRef} style={{fontSize:10,color:'#555',minWidth:28,textAlign:'right' as const,flexShrink:0,pointerEvents:'none' as const}}>0:00</span>
            <div style={{flex:1,minWidth:0,height:18,display:'flex',alignItems:'center',cursor:'pointer'}}
              onPointerDown={e=>{
                e.stopPropagation();
                const rect=e.currentTarget.getBoundingClientRect();
                const v=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
                const a=audio.current;if(a?.duration){a.currentTime=v*a.duration;progressRef.current=v*100;}
              }}>
              <div style={{width:'100%',height:3,background:'rgba(255,255,255,0.08)',borderRadius:999,position:'relative'}}>
                <div ref={miniBarFillRef} style={{height:'100%',background:ACC,borderRadius:999,width:'0%',pointerEvents:'none'}}/>
                <div ref={miniBarThumbRef} style={{position:'absolute',top:'50%',left:'0%',transform:'translate(-50%,-50%)',width:11,height:11,background:ACC,borderRadius:'50%',pointerEvents:'none'}}/>
              </div>
            </div>
            <span style={{fontSize:10,color:'#555',minWidth:28,flexShrink:0,pointerEvents:'none' as const}}>{current.duration}</span>
          </div>
        </div>
      )}
 
      {/* ── NAV ── */}
      {screen!=='profile'&&screen!=='artist'&&screen!=='album'&&screen!=='monthstats'&&(
        <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(10,10,10,0.97)',backdropFilter:'blur(20px)',borderTop:'1px solid #1e1e1e',display:'flex',justifyContent:'space-around',alignItems:'stretch',zIndex:101,height:NAV_H}}>
          {NAV.map(item=>(
            <NavItem
              key={item.id}
              item={item}
              active={screen===item.id||(item.id==='library'&&openPlPage!==null&&screen==='library')}
              onSelect={()=>{
                setScreen(item.id as 'home'|'search'|'library'|'trending');
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
