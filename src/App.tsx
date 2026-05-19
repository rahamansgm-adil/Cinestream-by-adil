/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, LogIn, LogOut, Plus, ChevronLeft } from 'lucide-react';
import { cn } from './lib/utils';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import MovieRow from './components/MovieRow';
import MovieDetails from './components/MovieDetails';
import VideoPlayer from './components/VideoPlayer';
import AddMovieForm from './components/AddMovieForm';
import { LiveTV } from './components/LiveTV';
import { UserLoginModal } from './components/UserLoginModal';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { MOVIES as initialMovies, CATEGORIES, Movie } from './data/movies';
import { tmdbService } from './services/tmdbService';
import { db, auth, signInWithGoogle, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, query, orderBy, onSnapshot, getDocs, writeBatch, doc, setDoc, serverTimestamp, where } from 'firebase/firestore';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { UserProgress } from './data/movies';

export default function App() {
  const [movies, setMovies] = useState<Movie[]>(initialMovies);
  const [dbMovies, setDbMovies] = useState<Movie[]>([]);
  const [tmdbMovies, setTmdbMovies] = useState<Record<string, Movie[]>>({
    trending: [],
    popular: [],
    netflix: [],
    topRated: [],
    latest: [],
    jioHotstar: [],
    primeVideo: [],
    action: [],
    comedy: [],
    drama: [],
    romance: [],
    war: [],
    searchResults: []
  });
  const [activeCategory, setActiveCategory] = useState<'all' | 'tv' | 'movie' | 'live' | 'my-list'>('all');
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const progressRef = useRef<UserProgress[]>([]);
  const [progressMovies, setProgressMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [tmdbError, setTmdbError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [playingMovie, setPlayingMovie] = useState<Movie | null>(null);
  const playingMovieRef = useRef<Movie | null>(null);

  useEffect(() => {
    playingMovieRef.current = playingMovie;
  }, [playingMovie]);

  // Message listener for external players (Vidking)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!playingMovieRef.current || !user) return;
      
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        console.log("[App] Player Message:", data);

        // Standard progress message format (Vidking/Common players)
        // We look for time (currentTime) and duration
        const currentTime = data.currentTime || data.time || (data.data?.time);
        const duration = data.duration || (data.data?.duration);

        if (currentTime !== undefined && duration !== undefined) {
          const currentMovie = playingMovieRef.current;
          const currentEp = (currentMovie as any).currentEpisode;
          
          // Unique ID per movie/episode to track individual progress
          const progressId = currentEp?.id 
            ? `${user.uid}_${currentMovie.id}_${currentEp.id}` 
            : `${user.uid}_${currentMovie.id}`;

          setDoc(doc(db, 'userProgress', progressId), {
            movieId: currentMovie.id,
            userId: user.uid,
            progress: currentTime,
            duration: duration,
            lastWatched: serverTimestamp(),
            contentType: currentMovie.contentType || 'movie',
            episodeId: currentEp?.id || null,
            episodeNumber: currentEp?.number || null,
            seasonNumber: currentEp?.seasonNumber || null,
            videoUrl: currentMovie.videoUrl,
            episodeTitle: currentEp?.title || null
          }, { merge: true }).catch(err => console.error("Error saving external progress:", err));
        }
      } catch (err) {
        // Skip messages that aren't valid JSON
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [user]);

  const [activeAddForm, setActiveAddForm] = useState<'movie' | 'tv' | null>(null);
  const [showUserLogin, setShowUserLogin] = useState(false);
  const [myListIds, setMyListIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { isAdmin } = useAuth();

  useEffect(() => {
    progressRef.current = userProgress;
  }, [userProgress]);

  useEffect(() => {
    // Fetch missing movies for Continue Watching
    const fetchMissing = async () => {
      if (!user || userProgress.length === 0) return;
      
      const existingIds = new Set([
        ...dbMovies.map(m => m.id),
        ...movies.map(m => m.id),
        ...Object.values(tmdbMovies).flat().map(m => m.id),
        ...progressMovies.map(m => m.id)
      ]);
      
      const missing = userProgress.filter(p => !existingIds.has(p.movieId));
      
      if (missing.length > 0) {
        console.log(`[App] Fetching ${missing.length} missing movies from progress...`);
        const fetched = await Promise.all(
          missing.map(p => tmdbService.getMovieDetails(p.movieId, p.contentType))
        );
        const validFetched = fetched.filter(Boolean) as Movie[];
        if (validFetched.length > 0) {
          setProgressMovies(prev => [...prev, ...validFetched]);
        }
      }
    };
    
    fetchMissing();
  }, [userProgress, user, dbMovies, movies, tmdbMovies]);


  // Combined and filtered movies
  const allMovies = useMemo(() => {
    const combined = [
      ...dbMovies, 
      ...movies, 
      ...progressMovies, // Include movies fetched from progress
      ...tmdbMovies.trending, 
      ...tmdbMovies.popular, 
      ...tmdbMovies.netflix,
      ...tmdbMovies.topRated,
      ...tmdbMovies.latest,
      ...tmdbMovies.jioHotstar,
      ...tmdbMovies.primeVideo,
      ...tmdbMovies.action,
      ...tmdbMovies.comedy,
      ...tmdbMovies.drama,
      ...tmdbMovies.romance,
      ...tmdbMovies.war
    ].filter(Boolean); // Safety check
    
    // Use a Map to ensure unique by ID
    const unique = Array.from(new Map(combined.map(m => [m.id, m])).values());
    
    let filtered = unique;
    if (activeCategory !== 'all') {
      if (activeCategory === 'my-list') {
        filtered = unique.filter(m => myListIds.includes(m.id));
      } else {
        filtered = unique.filter(m => {
          if (activeCategory === 'tv') return m.contentType === 'tv';
          return m.contentType === 'movie' || !m.contentType;
        });
      }
    }

    if (!searchQuery.trim()) return filtered;
    
    // If we have search results from TMDB, prioritize them
    if (tmdbMovies.searchResults.length > 0) {
      return tmdbMovies.searchResults;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return filtered.filter(m => {
      try {
        const titleMatch = m.title?.toLowerCase().includes(query) || false;
        const descMatch = m.description?.toLowerCase().includes(query) || false;
        const genreMatch = (m.genres || []).some(g => g && typeof g === 'string' && g.toLowerCase().includes(query));
        const castMatch = (m.cast || []).some(c => c && typeof c === 'string' && c.toLowerCase().includes(query));
        
        let episodeMatch = false;
        if (m.contentType === 'tv' && Array.isArray(m.episodes)) {
          episodeMatch = m.episodes.some(ep => 
            ep?.title?.toLowerCase().includes(query) || 
            ep?.description?.toLowerCase().includes(query)
          );
        }
        
        return titleMatch || descMatch || genreMatch || castMatch || episodeMatch;
      } catch (err) {
        console.error("Search error for item:", m, err);
        return false;
      }
    });
  }, [dbMovies, movies, tmdbMovies, searchQuery, activeCategory, myListIds]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Fetch movies from Firestore
    const moviesQuery = query(collection(db, 'movies'), orderBy('createdAt', 'desc'));
    const unsubscribeMovies = onSnapshot(moviesQuery, (snapshot) => {
      const fetchedMovies = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Movie[];
      setDbMovies(fetchedMovies);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'movies');
    });

    let unsubscribeProgress = () => {};
    let unsubscribeMyList = () => {};

    if (user) {
      // Progress
      const progressQuery = query(
        collection(db, 'userProgress'), 
        where('userId', '==', user.uid),
        orderBy('lastWatched', 'desc')
      );
      unsubscribeProgress = onSnapshot(progressQuery, (snapshot) => {
        const fetchedProgress = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as UserProgress));
        setUserProgress(fetchedProgress);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'userProgress');
      });

      // My List
      const myListQuery = query(
        collection(db, 'myList'),
        where('userId', '==', user.uid)
      );
      unsubscribeMyList = onSnapshot(myListQuery, (snapshot) => {
        const items = snapshot.docs.map(doc => doc.data());
        // Sort by addedAt desc client-side
        const sortedIds = Array.from(new Set(items
          .sort((a, b) => (b.addedAt?.seconds || 0) - (a.addedAt?.seconds || 0))
          .map(item => item.movieId as string)));
        setMyListIds(sortedIds);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'myList');
      });
    } else {
      setUserProgress([]);
      setMyListIds([]);
    }

    return () => {
      unsubscribeAuth();
      unsubscribeMovies();
      unsubscribeProgress();
      unsubscribeMyList();
    };
  }, [user]);

  useEffect(() => {
    const fetchInitial = async () => {
      console.log("[App] Starting initial catalog fetch...");
      try {
        const [
          trending, popular, netflix, latest, topRated, 
          jioHotstar, primeVideo,
          actionMovies, actionTV,
          comedyMovies, comedyTV,
          dramaMovies, dramaTV,
          romanceMovies, romanceTV,
          warMovies, warTV
        ] = await Promise.all([
          tmdbService.getTrending(),
          tmdbService.getPopular(),
          tmdbService.getNetflixOriginals(),
          tmdbService.getLatestRelease(),
          tmdbService.getTopRated(),
          tmdbService.getJioHotstarContent(),
          tmdbService.getAmazonPrimeContent(),
          // Genres
          tmdbService.getByGenre(28, 'movie'), tmdbService.getByGenre(10759, 'tv'), // Action
          tmdbService.getByGenre(35, 'movie'), tmdbService.getByGenre(35, 'tv'),    // Comedy
          tmdbService.getByGenre(18, 'movie'), tmdbService.getByGenre(18, 'tv'),    // Drama
          tmdbService.getByGenre(10749, 'movie'), tmdbService.getByGenre(10749, 'tv'), // Romance
          tmdbService.getByGenre(10752, 'movie'), tmdbService.getByGenre(10768, 'tv')  // War
        ]);
        
        setTmdbMovies(prev => ({
          ...prev,
          trending: trending || [],
          popular: popular || [],
          netflix: netflix || [],
          latest: latest || [],
          topRated: topRated || [],
          jioHotstar: jioHotstar || [],
          primeVideo: primeVideo || [],
          action: tmdbService.uniqueById([...(actionMovies || []), ...(actionTV || [])]),
          comedy: tmdbService.uniqueById([...(comedyMovies || []), ...(comedyTV || [])]),
          drama: tmdbService.uniqueById([...(dramaMovies || []), ...(dramaTV || [])]),
          romance: tmdbService.uniqueById([...(romanceMovies || []), ...(romanceTV || [])]),
          war: tmdbService.uniqueById([...(warMovies || []), ...(warTV || [])])
        }));
      } catch (err: any) {
        console.error("[App] Failed to fetch initial catalog:", err);
        if (err.message?.includes('401') || err.response?.status === 401) {
          setTmdbError("TMDB API Key unauthorized or missing. Check your environment variables.");
        } else {
          setTmdbError("Failed to load movie catalogs. Please refresh or check connection.");
        }
      }
    };
    fetchInitial();
  }, []);

  // Search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setTmdbMovies(prev => ({ ...prev, searchResults: [] }));
      return;
    }

    const timer = setTimeout(async () => {
      const results = await tmdbService.search(searchQuery);
      setTmdbMovies(prev => ({ ...prev, searchResults: results || [] }));
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const continueWatchingMovies = useMemo(() => {
    if (!user || userProgress.length === 0) return [];
    
    const movies = userProgress.map(progress => {
      // First check in all current lists
      let movie = allMovies.find(m => m.id === progress.movieId);
      
      // If not found, create a placeholder from progress data until full details load
      // This ensures the row doesn't disappear if the movie isn't in the current trending/popular lists
      if (!movie) {
        // We might want to fetch it explicitly, but for now we can at least show what we have
        return null; 
      }
      
      return {
        ...movie,
        // Override with progress specific data
        videoUrl: (progress as any).videoUrl || movie.videoUrl,
        progress: progress.progress,
        totalDuration: progress.duration,
        progressId: progress.id,
        currentEpisodeId: (progress as any).episodeId
      };
    }).filter(Boolean) as (Movie & { progress: number; totalDuration: number; progressId: string; currentEpisodeId?: string })[];

    return Array.from(new Map(movies.map(m => [m.id, m])).values());
  }, [allMovies, userProgress, user]);

  const myListMovies = useMemo(() => {
    if (!user || myListIds.length === 0) return [];
    return myListIds.map(id => allMovies.find(m => m.id === id)).filter(Boolean) as Movie[];
  }, [allMovies, myListIds, user]);

  const featuredMovies = useMemo(() => {
    const trending = tmdbMovies.trending.slice(0, 10);
    // If trending is empty (e.g. API loading or failed), fallback to initial movies
    if (trending.length === 0) {
      return movies.slice(0, 10);
    }
    return trending;
  }, [tmdbMovies.trending, movies]);

  const filterMovies = useCallback((list: Movie[]) => {
    if (activeCategory === 'all') return list;
    return list.filter(m => {
      if (activeCategory === 'tv') return m.contentType === 'tv';
      return m.contentType === 'movie' || !m.contentType;
    });
  }, [activeCategory]);

  const handlePlay = (movie: Movie) => {
    setPlayingMovie(movie);
  };

  const handleAddMovie = (newMovie: Movie) => {
    // This is now handled by the observer, but we can keep it for immediate feedback if needed
    // or just let the observer update dbMovies
  };

  const handleClosePlayer = useCallback(() => {
    setPlayingMovie(null);
  }, []);

  const handleMovieSelect = async (movie: Movie) => {
    // If it's a TMDB movie (has a numeric ID and not already in dbMovies)
    if (!dbMovies.find(m => m.id === movie.id) && !movies.find(m => m.id === movie.id)) {
      const details = await tmdbService.getMovieDetails(movie.id, movie.contentType);
      if (details) {
        setSelectedMovie(details);
        return;
      }
    }
    setSelectedMovie(movie);
  };

  const handlePlayerReady = useCallback((player: any) => {
    if (playingMovie && user) {
      // Find existing progress from ref to avoid dependency cycle
      const existingProgress = progressRef.current.find(p => p.movieId === playingMovie.id);
      
      // If it's a TV show, check if the episode matches too (or just resume if it's the right URL)
      if (existingProgress && existingProgress.progress > 5) {
         // Only resume if the playing URL matches the saved one OR if it's a single movie
         const isSameVideo = !(existingProgress as any).videoUrl || (existingProgress as any).videoUrl === playingMovie.videoUrl;
         if (isSameVideo) {
            player.currentTime(existingProgress.progress);
         }
      }

      let lastSavedTime = 0;
      player.on('timeupdate', () => {
        const currentTime = player.currentTime();
        const duration = player.duration();
        
        // Save every 5 seconds or if substantial change
        if (currentTime - lastSavedTime > 5 || Math.abs(currentTime - lastSavedTime) > 5) {
          lastSavedTime = currentTime;
          
          const currentEp = (playingMovie as any).currentEpisode;
          const progressId = currentEp?.id 
            ? `${user.uid}_${playingMovie.id}_${currentEp.id}` 
            : `${user.uid}_${playingMovie.id}`;

          setDoc(doc(db, 'userProgress', progressId), {
            movieId: playingMovie.id,
            userId: user.uid,
            progress: currentTime,
            duration: duration,
            lastWatched: serverTimestamp(),
            contentType: playingMovie.contentType || 'movie',
            episodeId: currentEp?.id || null,
            episodeNumber: currentEp?.number || null,
            seasonNumber: currentEp?.seasonNumber || null,
            videoUrl: playingMovie.videoUrl,
            episodeTitle: currentEp?.title || null
          }, { merge: true }).catch(err => console.error("Error saving progress:", err));
        }
      });
    }
  }, [playingMovie, user]);

  const isEmbed = useMemo(() => {
    if (!playingMovie) return false;
    const url = playingMovie.videoUrl || '';
    const isLive = playingMovie.rating === 'LIVE';
    
    return url.includes('vidking.net') || 
           url.includes('youtube.com/embed') || 
           url.includes('vimeo.com/video') ||
           url.includes('mhdtvhub.com') ||
           url.includes('mhdtvlive.com') ||
           url.includes('mhdtv-world.com') ||
           url.includes('player.') ||
           url.startsWith('/embed/') ||
           (isLive && !url.includes('.m3u8') && !url.includes('.mp4'));
  }, [playingMovie]);

  const videoJsOptions = useMemo(() => {
    if (!playingMovie || isEmbed) return null;
    
    const url = playingMovie.videoUrl.toLowerCase();
    let src = playingMovie.videoUrl;
    let type = 'video/mp4'; // Default
    
    const isDrive = url.includes('drive.google.com');
    const isHLS = url.includes('.m3u8');
    
    if (isDrive) {
      const driveId = url.match(/(?:id=|d\/|file\/d\/)([\w-]{25,})/)?.[1];
      if (driveId) {
        src = `/api/stream?id=${driveId}`;
      }
      type = 'video/mp4';
    } else if (isHLS) {
      type = 'application/x-mpegURL';
    }

    const tracks = playingMovie.subtitles?.map(s => ({
      kind: 'captions',
      label: s.label,
      srclang: s.lang,
      src: s.src,
      default: false
    })) || [];

    return {
      autoplay: true,
      controls: true,
      responsive: true,
      fluid: true,
      liveui: playingMovie.rating === 'LIVE',
      sources: [{
        src: src,
        type: type
      }],
      tracks: tracks
    };
  }, [playingMovie]);

  return (
    <div className="relative min-h-screen bg-netflix-black text-white">
      <Navbar 
        onAddMovieClick={() => setActiveAddForm('movie')} 
        onAddTVShowClick={() => setActiveAddForm('tv')}
        onCategoryChange={setActiveCategory}
        activeCategory={activeCategory}
        user={user}
        onLogin={() => setShowUserLogin(true)}
        onLogout={() => signOut(auth)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      {tmdbError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md px-4">
          <div className="bg-red-900/90 border border-red-500 text-white p-4 rounded-md shadow-2xl backdrop-blur-md flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">Content Provider Error</p>
              <p className="text-xs opacity-90">{tmdbError}</p>
            </div>
            <button onClick={() => setTmdbError(null)} className="p-1 hover:bg-white/10 rounded">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      
      <main className="pb-40">
        {!searchQuery ? (
          <>
            {activeCategory === 'live' ? (
              <LiveTV onPlay={handlePlay} />
            ) : activeCategory === 'my-list' ? (
              <div className="pt-32 px-4 md:px-12">
                <div className="flex items-center gap-4 mb-8">
                   <h1 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter">My List</h1>
                   <div className="h-px flex-1 bg-white/10" />
                   <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{myListMovies.length} Items</span>
                </div>
                
                {myListMovies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-40 gap-6">
                    <div className="p-8 rounded-full bg-zinc-900 border border-white/5 shadow-2xl">
                      <Plus size={48} className="text-zinc-700" />
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-black text-white uppercase tracking-widest">Your list is empty</h3>
                      <p className="text-zinc-500 text-xs font-bold max-w-xs mx-auto">Add movies and TV shows to your list to keep track of what you want to watch next.</p>
                    </div>
                    <button 
                      onClick={() => setActiveCategory('all')}
                      className="px-8 py-3 bg-white text-black text-xs font-black uppercase tracking-widest rounded hover:bg-zinc-200 transition-all active:scale-95"
                    >
                      Browse Content
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-y-8 md:gap-y-12 gap-x-4 md:gap-x-6">
                    {myListMovies.map((movie) => (
                      <div 
                        key={movie.id}
                        onClick={() => handleMovieSelect(movie)}
                        className="group relative cursor-pointer"
                      >
                        <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-zinc-900 border border-white/5 hover:scale-105 transition-all duration-300 shadow-xl group/card">
                           <img 
                              src={movie.thumbnailUrl} 
                              alt={movie.title}
                              className="w-full h-full object-cover group-hover/card:opacity-40 transition-opacity"
                              referrerPolicy="no-referrer"
                           />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity flex flex-col justify-end p-4">
                              <div className="p-1 px-2 bg-netflix-red w-fit rounded-sm mb-2 scale-75 origin-left">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white leading-none">Play</span>
                              </div>
                              <h3 className="text-[10px] font-black text-white uppercase tracking-tighter leading-tight line-clamp-2">{movie.title}</h3>
                           </div>
                        </div>
                        <div className="mt-3">
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-netflix-red tracking-tight">{movie.year}</span>
                              <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                              <span className="text-[10px] font-bold text-zinc-500 capitalize">{movie.contentType || 'movie'}</span>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {featuredMovies.length > 0 && (
                  <Hero 
                    movies={featuredMovies} 
                    onPlay={handlePlay} 
                    onMoreInfo={handleMovieSelect} 
                  />
                )}
        
                <div className={cn("relative z-10 pb-20", featuredMovies.length === 0 && "pt-32")}>
                  {myListMovies.length > 0 && (
                    <MovieRow 
                      key="my-list-row"
                      title="My List"
                      movies={myListMovies}
                      onMovieClick={handleMovieSelect}
                    />
                  )}

                  {continueWatchingMovies.length > 0 && (
                    <MovieRow 
                      key="continue-watching"
                      title="Continue Watching"
                      movies={continueWatchingMovies as any}
                      onMovieClick={handleMovieSelect}
                    />
                  )}
    
                  {filterMovies(tmdbMovies.netflix).length > 0 && (
                    <MovieRow 
                      key="netflix-originals"
                      title="Netflix Originals"
                      movies={filterMovies(tmdbMovies.netflix)}
                      onMovieClick={handleMovieSelect}
                    />
                  )}
    
                  {filterMovies(tmdbMovies.jioHotstar).length > 0 && (
                    <MovieRow 
                      key="jio-hotstar"
                      title="JioCinema & Hotstar"
                      movies={filterMovies(tmdbMovies.jioHotstar)}
                      onMovieClick={handleMovieSelect}
                    />
                  )}
    
                  {filterMovies(tmdbMovies.primeVideo).length > 0 && (
                    <MovieRow 
                      key="prime-video"
                      title="Amazon Prime Video"
                      movies={filterMovies(tmdbMovies.primeVideo)}
                      onMovieClick={handleMovieSelect}
                    />
                  )}
    
                  {filterMovies(tmdbMovies.trending).length > 0 && (
                    <MovieRow 
                      key="trending-now"
                      title="Trending Now"
                      movies={filterMovies(tmdbMovies.trending)}
                      onMovieClick={handleMovieSelect}
                    />
                  )}
    
                  {filterMovies(tmdbMovies.popular).length > 0 && (
                    <MovieRow 
                      key="popular-on-cinestream"
                      title="Popular on CineStream"
                      movies={filterMovies(tmdbMovies.popular)}
                      onMovieClick={handleMovieSelect}
                    />
                  )}
    
                  {filterMovies(tmdbMovies.latest).length > 0 && (
                    <MovieRow 
                      key="latest-releases"
                      title="Latest Releases"
                      movies={filterMovies(tmdbMovies.latest)}
                      onMovieClick={handleMovieSelect}
                    />
                  )}
    
                  {filterMovies(tmdbMovies.topRated).length > 0 && (
                    <MovieRow 
                      key="top-rated-movies"
                      title="Top Rated Movies"
                      movies={filterMovies(tmdbMovies.topRated)}
                      onMovieClick={handleMovieSelect}
                    />
                  )}
    
                  {/* Genre Based Rows */}
                  {filterMovies(allMovies.filter(m => (m.genres || []).some(g => g && typeof g === 'string' && (g.toLowerCase().includes('romcom') || (g.toLowerCase().includes('romance') && g.toLowerCase().includes('comedy')))))).length > 0 && (
                    <MovieRow 
                      key="genre-romcom"
                      title="RomComs"
                      movies={filterMovies(allMovies.filter(m => (m.genres || []).some(g => g && typeof g === 'string' && (g.toLowerCase().includes('romcom') || (g.toLowerCase().includes('romance') && g.toLowerCase().includes('comedy'))))))}
                      onMovieClick={handleMovieSelect}
                    />
                  )}

                  {filterMovies(allMovies.filter(m => (m.genres || []).some(g => g && typeof g === 'string' && g.toLowerCase().includes('action')))).length > 0 && (
                    <MovieRow 
                      key="genre-action"
                      title="Action & Adventure"
                      movies={filterMovies(allMovies.filter(m => (m.genres || []).some(g => g && typeof g === 'string' && g.toLowerCase().includes('action'))))}
                      onMovieClick={handleMovieSelect}
                    />
                  )}

                  {filterMovies(allMovies.filter(m => (m.genres || []).some(g => g && typeof g === 'string' && g.toLowerCase().includes('comedy') && !g.toLowerCase().includes('romance')))).length > 0 && (
                    <MovieRow 
                      key="genre-comedy"
                      title="Comedies"
                      movies={filterMovies(allMovies.filter(m => (m.genres || []).some(g => g && typeof g === 'string' && g.toLowerCase().includes('comedy'))))}
                      onMovieClick={handleMovieSelect}
                    />
                  )}

                  {filterMovies(allMovies.filter(m => (m.genres || []).some(g => g && typeof g === 'string' && g.toLowerCase().includes('drama')))).length > 0 && (
                    <MovieRow 
                      key="genre-drama"
                      title="Emotional Dramas"
                      movies={filterMovies(allMovies.filter(m => (m.genres || []).some(g => g && typeof g === 'string' && g.toLowerCase().includes('drama'))))}
                      onMovieClick={handleMovieSelect}
                    />
                  )}

                  {filterMovies(allMovies.filter(m => (m.genres || []).some(g => g && typeof g === 'string' && (g.toLowerCase().includes('war') || g.toLowerCase().includes('history'))))).length > 0 && (
                    <MovieRow 
                      key="genre-war"
                      title="War & History"
                      movies={filterMovies(allMovies.filter(m => (m.genres || []).some(g => g && typeof g === 'string' && (g.toLowerCase().includes('war') || g.toLowerCase().includes('history')))))}
                      onMovieClick={handleMovieSelect}
                    />
                  )}

                  {CATEGORIES.map((category) => {
                    const categoryMovies = filterMovies(allMovies.filter(m => category.movieIds.includes(m.id)));
                    if (categoryMovies.length === 0) return null;
                    return (
                      <MovieRow 
                        key={category.id}
                        title={category.title}
                        movies={categoryMovies}
                        onMovieClick={handleMovieSelect}
                      />
                    );
                  })}
    
                  {allMovies.length > 0 && (
                    <MovieRow 
                      key="all-content-row"
                      title="All Content"
                      movies={allMovies}
                      onMovieClick={handleMovieSelect}
                    />
                  )}
    
                  {allMovies.filter(m => m.contentType === 'tv').length > 0 && (
                    <MovieRow 
                      key="tv-shows-all"
                      title="TV Shows"
                      movies={allMovies.filter(m => m.contentType === 'tv')}
                      onMovieClick={handleMovieSelect}
                    />
                  )}
    
                  {allMovies.filter(m => m.contentType === 'movie').length > 0 && (
                    <MovieRow 
                      key="movies-all"
                      title="Popular Movies"
                      movies={allMovies.filter(m => m.contentType === 'movie' || !m.contentType)}
                      onMovieClick={handleMovieSelect}
                    />
                  )}
        
                  {allMovies.length > initialMovies.length && (
                    <MovieRow 
                      key="recently-added-row"
                      title="Recently Added"
                      movies={allMovies.slice(0, allMovies.length - initialMovies.length)}
                      onMovieClick={handleMovieSelect}
                    />
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="pt-24 md:pt-32 px-4 md:px-12">
            <h2 className="text-xl md:text-2xl font-bold mb-6">Search Results for "{searchQuery}"</h2>
            {allMovies.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-y-8 md:gap-y-12 gap-x-4 md:gap-x-6">
                {allMovies.map(movie => (
                  <div key={movie.id} onClick={() => handleMovieSelect(movie)} className="group cursor-pointer">
                    <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-white/5 shadow-2xl hover:scale-105 transition-all duration-300">
                      <img 
                        src={movie.thumbnailUrl} 
                        alt={movie.title} 
                        className="w-full h-full object-cover group-hover:opacity-40 transition-opacity"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="p-1 px-2 bg-netflix-red w-fit rounded-sm mb-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-white leading-none">Play</span>
                         </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <h3 className="font-black text-[10px] md:text-xs text-white uppercase tracking-tighter leading-tight line-clamp-1">{movie.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-zinc-500 font-bold">{movie.year}</span>
                        <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                        <span className="text-[10px] text-zinc-600 font-bold capitalize">{movie.contentType || 'movie'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-500">Your search for "{searchQuery}" did not have any matches.</p>
                <div className="mt-4 text-sm text-gray-600">
                  <p>Suggestions:</p>
                  <ul className="list-disc inline-block text-left mt-2">
                    <li>Try different keywords</li>
                    <li>Try looking for a movie title or actor</li>
                    <li>Try a genre, such as Action or Comedy</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Subtle Fade */}
      <div className="h-20 bg-gradient-to-t from-black to-transparent pointer-events-none" />

      {/* Movie Details Modal */}
      <AnimatePresence>
        {selectedMovie && (
          <MovieDetails 
            movie={selectedMovie} 
            user={user}
            onClose={() => setSelectedMovie(null)} 
            onPlay={handlePlay}
            onMovieClick={handleMovieSelect}
          />
        )}
      </AnimatePresence>

      {/* Admin Add Movie / TV Show Form Modal */}
      <AnimatePresence>
        {activeAddForm && (
          <ProtectedRoute>
            <AddMovieForm 
              type={activeAddForm}
              onAdd={handleAddMovie}
              onClose={() => setActiveAddForm(null)}
            />
          </ProtectedRoute>
        )}
      </AnimatePresence>

      {/* User Login Modal */}
      <AnimatePresence>
        {showUserLogin && (
          <UserLoginModal onClose={() => setShowUserLogin(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {playingMovie && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black"
          >
            <div className="w-full h-full relative group">
              {isEmbed ? (
                <div className="w-full h-full relative">
                  <iframe 
                    src={playingMovie.videoUrl.startsWith('/') ? `https://www.vidking.net${playingMovie.videoUrl}` : playingMovie.videoUrl} 
                    className="w-full h-full border-0"
                    allowFullScreen
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture; xr-spatial-tracking; clipboard-write; gyroscope; accelerometer; microphone; camera"
                  />
                  <button 
                    onClick={handleClosePlayer}
                    className="absolute top-8 left-8 p-3 bg-black/50 hover:bg-white/20 rounded-full transition-all text-white z-[1001] opacity-0 group-hover:opacity-100"
                  >
                    <ChevronLeft size={32} />
                  </button>
                </div>
              ) : videoJsOptions && (
                <VideoPlayer 
                  options={{
                    ...videoJsOptions,
                    controls: false // Force off, handled by custom UI
                  }} 
                  onBack={handleClosePlayer}
                  onReady={handlePlayerReady}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-20 px-4 md:px-12 py-12 border-t border-zinc-800 text-gray-500">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mb-12">
          <div className="flex flex-col gap-3 text-sm">
            <a href="#" className="hover:underline">Audio Description</a>
            <a href="#" className="hover:underline">Help Center</a>
            <a href="#" className="hover:underline">Gift Cards</a>
            <a href="#" className="hover:underline">Media Center</a>
          </div>
          <div className="flex flex-col gap-3 text-sm">
            <a href="#" className="hover:underline">Investor Relations</a>
            <a href="#" className="hover:underline">Jobs</a>
            <a href="#" className="hover:underline">Terms of Use</a>
            <a href="#" className="hover:underline">Privacy</a>
          </div>
          <div className="flex flex-col gap-3 text-sm">
            <a href="#" className="hover:underline">Legal Notices</a>
            <a href="#" className="hover:underline">Cookie Preferences</a>
            <a href="#" className="hover:underline">Corporate Information</a>
            <a href="#" className="hover:underline">Contact Us</a>
          </div>
        </div>
        <div className="text-xs">
          &copy; 2026 CineStream By Adil Inc.
        </div>
      </footer>
    </div>
  );
}

