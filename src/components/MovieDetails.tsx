import { useState, useEffect, useRef } from 'react';
import { X, Play, Plus, ThumbsUp, Volume2, VolumeX, Trash2, Loader2, Download, ChevronDown, Share2, Info, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Movie } from '@/src/data/movies';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, deleteDoc, setDoc, serverTimestamp, getDoc, onSnapshot, query, collection, where } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

interface MovieDetailsProps {
  movie: Movie | null;
  user: FirebaseUser | null;
  onClose: () => void;
  onPlay: (movie: Movie) => void;
  onMovieClick?: (movie: Movie) => void;
}

type TabType = 'overview' | 'seasons' | 'similar';

export const MovieDetails = ({ movie, user, onClose, onPlay, onMovieClick }: MovieDetailsProps) => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [currentEpisodes, setCurrentEpisodes] = useState<any[]>([]);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [isInList, setIsInList] = useState(false);
  const [isUpdatingList, setIsUpdatingList] = useState(false);
  const [showDownloadMessage, setShowDownloadMessage] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showDownloadMessage) {
      const timer = setTimeout(() => setShowDownloadMessage(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showDownloadMessage]);

  useEffect(() => {
    if (!user || !movie) {
      setIsInList(false);
      return;
    }

    const listDocId = `${user.uid}_${movie.id}`;
    const unsubscribe = onSnapshot(doc(db, 'myList', listDocId), (snapshot) => {
      setIsInList(snapshot.exists());
    });

    return () => unsubscribe();
  }, [user, movie]);

  useEffect(() => {
    if (!movie) {
      setShowTrailer(false);
      setCurrentEpisodes([]);
      setActiveTab('overview');
      return;
    }

    setSelectedSeason(1);
    setCurrentEpisodes(movie.episodes || []);
    
    // Scroll to top when movie changes
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const timer = setTimeout(() => {
      setShowTrailer(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [movie]);

  useEffect(() => {
    const fetchSeasonEpisodes = async () => {
      if (movie?.contentType === 'tv' && selectedSeason > 1) {
        setIsLoadingEpisodes(true);
        try {
          const { tmdbService } = await import('../services/tmdbService');
          const episodes = await tmdbService.getTVSeasonDetails(movie.id, selectedSeason);
          setCurrentEpisodes(episodes);
        } catch (error) {
          console.error("Error fetching season episodes:", error);
        } finally {
          setIsLoadingEpisodes(false);
        }
      } else if (movie?.contentType === 'tv' && selectedSeason === 1) {
        setCurrentEpisodes(movie.episodes || []);
      }
    };

    if (activeTab === 'seasons') {
      fetchSeasonEpisodes();
    }
  }, [selectedSeason, movie, activeTab]);

  if (!movie) return null;

  const isOwner = user && movie && (movie as any).createdBy === user.uid;
  const canDelete = isAdmin || isOwner;

  const seasonsList = (movie as any).seasons || [];
  const displaySeasons = seasonsList.length > 0 
    ? seasonsList 
    : Array.from(new Set(movie.episodes?.map(ep => ep.seasonNumber || 1) || [1]))
        .sort((a, b) => a - b)
        .map(n => ({ number: n, name: `Season ${n}` }));

  const handleDelete = async () => {
    if (!movie || !movie.id) return;
    if (!window.confirm('Are you sure you want to remove this from CineStream?')) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'movies', movie.id));
      onClose();
    } catch (error: any) {
      console.error("Error deleting movie:", error);
      alert(`Failed to delete: ${error.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleMyList = async () => {
    if (!user || !movie || isUpdatingList) return;

    setIsUpdatingList(true);
    const listDocId = `${user.uid}_${movie.id}`;
    
    try {
      if (isInList) {
        await deleteDoc(doc(db, 'myList', listDocId));
      } else {
        await setDoc(doc(db, 'myList', listDocId), {
          userId: user.uid,
          movieId: movie.id,
          addedAt: serverTimestamp(),
          title: movie.title,
          thumbnailUrl: movie.thumbnailUrl,
          contentType: movie.contentType || 'movie'
        });
      }
    } catch (error) {
      console.error("Error updating My List:", error);
    } finally {
      setIsUpdatingList(false);
    }
  };

  const [allProgress, setAllProgress] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!user || !movie) return;

    // Fetch all progress for this movie (including episodes)
    const progressQuery = query(
      collection(db, 'userProgress'),
      where('userId', '==', user.uid),
      where('movieId', '==', movie.id)
    );

    const unsubscribe = onSnapshot(progressQuery, (snapshot) => {
      const progressMap: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.episodeId) {
          progressMap[data.episodeId] = data;
        } else {
          progressMap['main'] = data;
        }
      });
      setAllProgress(progressMap);
    });

    return () => unsubscribe();
  }, [user, movie]);

  const lastProgress = allProgress['main'] || Object.values(allProgress).sort((a, b) => (b.lastWatched?.seconds || 0) - (a.lastWatched?.seconds || 0))[0];

  const handlePlayMain = () => {
    if (movie.contentType === 'tv' && lastProgress?.videoUrl) {
      // Find the episode if possible (checking all seasons would be better but we check currentEpisodes)
      const ep = currentEpisodes.find(e => e.videoUrl === lastProgress.videoUrl);
      onPlay({
        ...movie,
        videoUrl: lastProgress.videoUrl,
        title: ep ? `${movie.title} - S${ep.seasonNumber}:E${ep.number} ${ep.title}` : movie.title,
        currentEpisode: ep || { id: lastProgress.episodeId, title: lastProgress.episodeTitle }
      } as any);
    } else {
      onPlay(movie);
    }
  };

  const formatMinutesLeft = (progress: number, duration: number, data?: any) => {
    if (!duration || duration <= 0) return null;
    const left = duration - progress;
    const mins = Math.floor(left / 60);
    const percent = (progress / duration) * 100;
    
    let timeStr = '';
    if (percent > 95) timeStr = 'Finished';
    else if (mins <= 0) timeStr = 'Just started';
    else timeStr = `${mins}m left`;

    if (data?.contentType === 'tv' && data?.episodeNumber !== undefined && data?.episodeNumber !== null) {
      const s = data.seasonNumber ?? 1;
      const e = data.episodeNumber;
      const title = data.episodeTitle ? `: ${data.episodeTitle}` : '';
      return `S${s}E${e}${title} - ${timeStr}`;
    }

    return timeStr;
  };

  const isYouTube = movie.trailerUrl?.includes('youtube.com') || movie.trailerUrl?.includes('youtu.be');
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const matchPercentage = Math.floor(Math.random() * 15) + 85;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 100 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 100 }}
          className="relative w-full h-full md:h-[90vh] md:max-w-4xl bg-zinc-950 md:rounded-2xl overflow-y-auto scrollbar-hide flex flex-col pt-safe"
          ref={scrollRef}
        >
          <AnimatePresence>
            {showDownloadMessage && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-zinc-900 border border-white/10 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-xl"
              >
                <div className="p-1.5 bg-netflix-red/20 rounded-full">
                  <Download size={16} className="text-netflix-red" />
                </div>
                <span className="text-xs font-black text-white uppercase tracking-[0.2em]">Offline Viewing Coming Soon</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top Floating Close Button */}
          <button 
            onClick={onClose}
            className="fixed md:absolute top-4 right-4 p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black transition-all z-[110] border border-white/10"
          >
            <X size={20} />
          </button>

          {/* Hero Header Area */}
          <div className="relative w-full aspect-[2/3] md:aspect-video shrink-0 overflow-hidden">
             <AnimatePresence mode="wait">
                {showTrailer && movie.trailerUrl ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-10"
                  >
                    {isYouTube ? (
                      <iframe
                        className="w-full h-full object-cover scale-[1.3] pointer-events-none"
                        src={`https://www.youtube.com/embed/${getYouTubeId(movie.trailerUrl)}?autoplay=1&mute=1&controls=0&loop=1&playlist=${getYouTubeId(movie.trailerUrl)}&modestbranding=1&rel=0`}
                        allow="autoplay; encrypted-media"
                      />
                    ) : (
                      <video
                        ref={videoRef}
                        src={movie.trailerUrl}
                        autoPlay
                        muted={isMuted}
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/40" />
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0"
                  >
                    <img 
                      src={movie.bannerUrl || undefined} 
                      className="w-full h-full object-cover" 
                      alt={movie.title}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-black/40" />
                  </motion.div>
                )}
             </AnimatePresence>

             {/* Title & Overlay Content */}
             <div className="absolute bottom-16 left-0 right-0 p-6 z-20 flex flex-col items-center text-center">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="flex items-center gap-2 mb-2"
                >
                   <div className="w-1.5 h-4 bg-netflix-red rounded-full" />
                   <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] translate-y-px">
                      {movie.contentType === 'tv' ? 'Series' : 'Movie'}
                   </span>
                </motion.div>
                {movie.logoUrl ? (
                  <motion.div
                    initial={{ y: 20, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-6 flex justify-center"
                  >
                    <img 
                      src={movie.logoUrl} 
                      alt={movie.title} 
                      className="max-w-[85%] max-h-[120px] md:max-h-[180px] object-contain drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                ) : (
                  <motion.h1 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase mb-4"
                  >
                    {movie.title}
                  </motion.h1>
                )}
                <div className="flex gap-2 mb-6 flex-wrap justify-center">
                   {movie.genres.slice(0, 3).map((genre) => (
                      <span key={genre} className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest text-zinc-300 border border-white/5">
                        {genre}
                      </span>
                   ))}
                </div>

                {/* Pill Action Bar */}
                <div className="flex items-center gap-3 sm:gap-6 px-4 sm:px-6 py-2 sm:py-3 bg-zinc-900/80 backdrop-blur-xl rounded-full border border-white/5 shadow-2xl overflow-x-auto max-w-[95vw] md:max-w-none scrollbar-hide">
                   <button className="flex flex-col items-center gap-1 group shrink-0">
                      <div className="p-2 sm:p-2.5 rounded-full border border-white/10 group-hover:bg-white/10 transition-all">
                        <Share2 size={18} className="text-zinc-400 group-hover:text-white sm:w-5 sm:h-5" />
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 group-hover:text-zinc-300 uppercase">Share</span>
                   </button>
                   <button 
                    onClick={toggleMyList}
                    disabled={!user || isUpdatingList}
                    className={cn(
                      "flex flex-col items-center gap-1 group shrink-0 transition-all",
                      !user && "opacity-50 cursor-not-allowed"
                    )}
                   >
                      <div className={cn(
                        "p-2 sm:p-2.5 rounded-full border transition-all",
                        isInList 
                          ? "bg-white border-white" 
                          : "border-white/10 group-hover:bg-white/10"
                      )}>
                        {isUpdatingList ? (
                          <Loader2 size={18} className="animate-spin text-zinc-400 sm:w-5 sm:h-5" />
                        ) : isInList ? (
                          <Check size={18} className="text-black sm:w-5 sm:h-5" />
                        ) : (
                          <Plus size={18} className="text-zinc-400 group-hover:text-white sm:w-5 sm:h-5" />
                        )}
                      </div>
                      <span className={cn(
                        "text-[9px] sm:text-[10px] font-bold uppercase",
                        isInList ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"
                      )}>
                        {isInList ? 'In List' : 'List'}
                      </span>
                   </button>
                   <button 
                    onClick={handlePlayMain}
                    className="flex flex-col items-center gap-1 group shrink-0"
                   >
                      <div className="p-3 sm:p-4 rounded-full bg-netflix-red shadow-lg shadow-netflix-red/40 group-hover:scale-110 active:scale-95 transition-all duration-300">
                        <Play size={22} fill="white" className="text-white translate-x-0.5 sm:w-6 sm:h-6" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-black text-white uppercase tracking-[0.2em] mt-1 shadow-sm">
                        {lastProgress && lastProgress.progress > 5 ? 'Resume' : 'Play'}
                      </span>
                   </button>
                   <button className="flex flex-col items-center gap-1 group shrink-0">
                      <div className="p-2 sm:p-2.5 rounded-full border border-white/10 group-hover:bg-white/10 transition-all">
                        <ThumbsUp size={18} className="text-zinc-400 group-hover:text-white sm:w-5 sm:h-5" />
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 group-hover:text-zinc-300 uppercase">Rate</span>
                   </button>
                   <button 
                    onClick={() => setShowDownloadMessage(true)}
                    className="flex flex-col items-center gap-1 group shrink-0"
                   >
                      <div className="p-2 sm:p-2.5 rounded-full border border-white/10 group-hover:bg-white/10 transition-all">
                        <Download size={18} className="text-zinc-400 group-hover:text-white sm:w-5 sm:h-5" />
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 group-hover:text-zinc-300 uppercase">Download</span>
                   </button>
                   {canDelete && (
                      <button 
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex flex-col items-center gap-1 group shrink-0"
                      >
                        <div className="p-2 sm:p-2.5 rounded-full border border-red-500/20 group-hover:bg-red-500/20 transition-all">
                          {isDeleting ? <Loader2 size={18} className="animate-spin text-red-500 sm:w-5 sm:h-5" /> : <Trash2 size={18} className="text-red-500 sm:w-5 sm:h-5" />}
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-bold text-red-500/70 group-hover:text-red-500 uppercase">Delete</span>
                      </button>
                   )}
                </div>
             </div>
          </div>

          {/* Main Progress Bar (Hero) */}
          {lastProgress && lastProgress.duration > 0 && (
             <div className="relative h-1.5 bg-zinc-900 border-t border-white/5 overflow-hidden z-30">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${(lastProgress.progress / lastProgress.duration) * 100}%` }}
                 className="h-full bg-netflix-red shadow-[0_0_10px_rgba(229,9,20,0.4)]"
               />
             </div>
           )}

          {/* Main Content Area */}
          <div className="flex-1 bg-zinc-950 px-6 py-6 space-y-8 pb-32">
             {/* Metadata Row */}
             <div className="flex items-center gap-4 text-[13px] font-bold">
                <span className="text-green-500 font-black">{matchPercentage}% match</span>
                <span className="text-zinc-400">{movie.year}</span>
                <span className="bg-zinc-800 text-zinc-100 px-1.5 py-0.5 rounded text-[11px] border border-white/5">{movie.rating}</span>
                <span className="text-zinc-400">{movie.duration}</span>
                {lastProgress && lastProgress.duration > 0 && (
                  <span className="text-netflix-red font-black uppercase tracking-tighter">
                    {formatMinutesLeft(lastProgress.progress, lastProgress.duration, lastProgress)}
                  </span>
                )}
                <span className="text-[10px] border border-zinc-700 px-1.5 py-0.5 rounded tracking-tighter text-zinc-500">Ultra HD 4K</span>
             </div>

             <div className="space-y-4">
                <p className="text-zinc-300 leading-relaxed text-[15px] font-medium">
                  {movie.description}
                </p>

                {/* Cast Summary (Quick Look) */}
                <div className="text-[13px] line-clamp-1">
                  <span className="text-zinc-500 font-bold">Starring: </span>
                  <span className="text-zinc-400">{movie.cast.join(', ')}</span>
                </div>
             </div>

             {/* Tabbed Navigation */}
             <div className="sticky top-0 bg-zinc-950/80 backdrop-blur-xl z-30 -mx-6 px-6 pt-2 border-b border-white/5">
                <div className="flex gap-8 overflow-x-auto scrollbar-hide">
                   {(['overview', 'seasons', 'similar'] as TabType[]).map((tab) => {
                      if (tab === 'seasons' && movie.contentType !== 'tv') return null;
                      return (
                        <button 
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={cn(
                            "pb-3 text-sm font-black uppercase tracking-widest transition-all relative shrink-0",
                            activeTab === tab ? "text-white" : "text-zinc-500"
                          )}
                        >
                          {tab}
                          {activeTab === tab && (
                            <motion.div 
                              layoutId="tab-underline"
                              className="absolute bottom-0 left-0 right-0 h-1 bg-netflix-red"
                            />
                          )}
                        </button>
                      );
                   })}
                </div>
             </div>

             <div className="min-h-[400px]">
                {activeTab === 'overview' && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-10"
                  >
                     {/* Cast & Crew Section */}
                     {movie.castDetails && movie.castDetails.length > 0 && (
                       <section className="space-y-4">
                          <div className="flex items-center justify-between">
                             <h3 className="text-lg font-black text-white uppercase tracking-tight">Cast & Crew</h3>
                             <button className="text-[10px] font-black text-netflix-red uppercase tracking-widest px-3 py-1 bg-netflix-red/10 rounded-full border border-netflix-red/20 shadow-lg">See All</button>
                          </div>
                          <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-6 px-6">
                             {movie.castDetails.map((person) => (
                               <div key={person.id} className="flex flex-col items-center gap-3 shrink-0 w-24">
                                  <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white/5 bg-zinc-900 group shadow-lg">
                                     <img 
                                      src={person.profileUrl || 'https://via.placeholder.com/185x185?text=Cast'} 
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                      alt={person.name}
                                     />
                                  </div>
                                  <div className="text-center">
                                    <p className="text-[11px] font-black text-white line-clamp-1">{person.name}</p>
                                    <p className="text-[10px] text-zinc-500 line-clamp-1 italic">{person.character}</p>
                                  </div>
                               </div>
                             ))}
                          </div>
                       </section>
                     )}

                     {/* Director Feature */}
                     {movie.director && (
                       <section className="bg-zinc-900/40 rounded-2xl p-6 border border-white/5 flex gap-6 items-center">
                          <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-2xl border border-white/10">
                             <img src={movie.director.profileUrl || 'https://via.placeholder.com/185x185?text=Director'} className="w-full h-full object-cover" alt={movie.director.name} />
                          </div>
                          <div className="space-y-2">
                             <span className="text-[10px] font-black text-netflix-red uppercase tracking-[0.2em]">{movie.director.job}</span>
                             <h4 className="text-xl font-black text-white tracking-tight">{movie.director.name}</h4>
                             <p className="text-xs text-zinc-500 leading-relaxed max-w-xs italic">
                               Expertly helmed the vision of {movie.title}, currently trending on CineStream.
                             </p>
                          </div>
                       </section>
                     )}
                  </motion.div>
                )}

                {activeTab === 'seasons' && movie.contentType === 'tv' && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                       <div className="relative">
                          <select 
                            value={selectedSeason}
                            onChange={(e) => setSelectedSeason(Number(e.target.value))}
                            className="bg-zinc-900 text-white text-xs font-black py-2 pl-4 pr-10 rounded-lg border border-white/10 appearance-none cursor-pointer outline-none focus:border-netflix-red/50 uppercase tracking-widest shadow-xl"
                          >
                             {displaySeasons.map((s: any) => (
                               <option key={s.number} value={s.number}>{s.name}</option>
                             ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                       </div>
                       <span className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">{currentEpisodes.length} Episodes</span>
                    </div>

                    {isLoadingEpisodes ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="animate-spin text-netflix-red" size={32} />
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Downloading Episodes...</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {currentEpisodes.map((ep, idx) => (
                           <motion.div 
                            key={ep.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => onPlay({
                              ...movie,
                              videoUrl: ep.videoUrl,
                              title: `${movie.title} - S${ep.seasonNumber}:E${ep.number} ${ep.title}`,
                              currentEpisode: ep
                            } as any)}
                             className="group flex flex-col gap-3 p-3 rounded-2xl bg-zinc-900/20 hover:bg-zinc-900/60 border border-transparent hover:border-white/5 transition-all cursor-pointer shadow-lg"
                            >
                               <div className="flex gap-4">
                                  <div className="relative w-32 aspect-video rounded-xl overflow-hidden shrink-0 shadow-lg border border-white/5">
                                     <img src={ep.thumbnailUrl || movie.thumbnailUrl || undefined} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" alt={ep.title} referrerPolicy="no-referrer" />
                                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-2xl">
                                          <Play size={16} fill="black" className="text-black translate-x-0.5" />
                                        </div>
                                     </div>
                                  </div>
                                  <div className="flex-1 min-w-0 space-y-1 pt-1">
                                     <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black text-white uppercase tracking-tight truncate group-hover:text-netflix-red transition-colors">{ep.number}. {ep.title}</h4>
                                        <span className="text-[10px] text-zinc-600 font-bold shrink-0">{ep.duration}</span>
                                     </div>
                                     <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed italic">
                                        {ep.description || `Chapter ${ep.number} of Season ${ep.seasonNumber}.`}
                                     </p>
                                  </div>
                               </div>
                               
                               {/* Episode Progress Bar */}
                               {allProgress[ep.id] && allProgress[ep.id].duration > 0 && (
                                 <div className="px-1">
                                   <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                     <div 
                                       className="h-full bg-netflix-red" 
                                       style={{ width: `${(allProgress[ep.id].progress / allProgress[ep.id].duration) * 100}%` }}
                                     />
                                   </div>
                                 </div>
                               )}
                            </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'similar' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-12"
                  >
                    {!movie.recommendations || movie.recommendations.length === 0 ? (
                      <div className="col-span-full flex flex-col items-center justify-center py-20 text-center gap-6">
                        <div className="p-6 rounded-full bg-zinc-900 border border-white/5 shadow-2xl">
                          <Info size={40} className="text-zinc-600" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xl font-black text-white uppercase tracking-widest">More Like This</h4>
                          <p className="text-xs text-zinc-500 font-bold max-w-xs">We're finding more content for you. Check back later!</p>
                        </div>
                      </div>
                    ) : (
                      movie.recommendations.map((m, idx) => (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => onMovieClick?.(m)}
                          className="group relative cursor-pointer"
                        >
                          <div className="relative aspect-video rounded-lg overflow-hidden border border-white/5 shadow-md">
                            <img 
                              src={m.bannerUrl || m.thumbnailUrl} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" 
                              alt={m.title}
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                              <Play size={24} fill="white" className="text-white" />
                            </div>
                            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center z-20">
                              <span className="text-[10px] font-black text-white px-1.5 py-0.5 bg-black/60 rounded shadow-sm">
                                {m.year}
                              </span>
                              <span className="text-[10px] font-black text-green-500 px-1.5 py-0.5 bg-black/60 rounded shadow-sm">
                                {m.rating} Rating
                              </span>
                            </div>
                          </div>
                          <h5 className="mt-2 text-[11px] font-black text-zinc-400 uppercase tracking-tighter truncate group-hover:text-white transition-colors">
                            {m.title}
                          </h5>
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                )}
             </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default MovieDetails;
