import { useState, useEffect, useRef } from 'react';
import { X, Play, Plus, ThumbsUp, Volume2, VolumeX, Trash2, Loader2, Download, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Movie } from '@/src/data/movies';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useAuth } from '../context/AuthContext';

interface MovieDetailsProps {
  movie: Movie | null;
  user: FirebaseUser | null;
  onClose: () => void;
  onPlay: (movie: Movie) => void;
}

export const MovieDetails = ({ movie, user, onClose, onPlay }: MovieDetailsProps) => {
  const { isAdmin } = useAuth();
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!movie) {
      setShowTrailer(false);
      return;
    }

    setSelectedSeason(1);

    // Delay showing the trailer
    const timer = setTimeout(() => {
      setShowTrailer(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [movie]);

  if (!movie) return null;

  const isOwner = user && movie && (movie as any).createdBy === user.uid;
  const canDelete = isAdmin || isOwner;

  const handleDelete = async () => {
    if (!movie || !movie.id) return;
    if (!window.confirm('Are you sure you want to remove this movie from CineStream By Adil?')) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'movies', movie.id));
      onClose();
    } catch (error: any) {
      console.error("Error deleting movie:", error);
      alert(`Failed to delete movie: ${error.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const isYouTube = movie.trailerUrl?.includes('youtube.com') || movie.trailerUrl?.includes('youtu.be');
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-sm overflow-y-auto pt-20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-4xl bg-zinc-900 rounded-xl overflow-hidden shadow-2xl"
        >
          {/* Hero Banner with Trailer Transition */}
          <div className="relative h-64 md:h-[500px] w-full overflow-hidden">
            {/* Background Image (Always there as fallback or during loading) */}
            <img 
              src={movie.bannerUrl} 
              alt={movie.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />

            {/* Subdued Overlay for when trailer is not playing or while loading */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />

            {/* Auto-playing Trailer Overlay */}
            <AnimatePresence>
              {showTrailer && movie.trailerUrl && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10"
                >
                  {isYouTube ? (
                    <iframe
                      className="w-full h-full object-cover pointer-events-none scale-125" // Scale to hide borders
                      src={`https://www.youtube.com/embed/${getYouTubeId(movie.trailerUrl)}?autoplay=1&mute=1&controls=0&loop=1&playlist=${getYouTubeId(movie.trailerUrl)}&modestbranding=1&rel=0`}
                      allow="autoplay; encrypted-media"
                      title="Trailer"
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
                  {/* Subtle Gradient over Video */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent pointer-events-none" />
                </motion.div>
              )}
            </AnimatePresence>
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/60 rounded-full text-white hover:bg-black transition-colors z-50"
            >
              <X size={24} />
            </button>

            {/* Mute Toggle Button */}
            {showTrailer && movie.trailerUrl && !isYouTube && (
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="absolute bottom-24 right-8 p-2 border-2 border-white/40 rounded-full text-white hover:bg-white/10 transition-colors z-50 group"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            )}

            <div className="absolute bottom-8 left-8 right-8 z-30">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-6 uppercase tracking-tighter">
                {movie.title}
              </h2>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    if (movie.contentType === 'tv' && movie.episodes && movie.episodes.length > 0) {
                      const sortedEpisodes = [...movie.episodes].sort((a, b) => {
                        const s1 = a.seasonNumber || 1;
                        const s2 = b.seasonNumber || 1;
                        if (s1 !== s2) return s1 - s2;
                        return a.number - b.number;
                      });
                      const firstEp = sortedEpisodes[0];
                      onPlay({ 
                        ...movie, 
                        videoUrl: firstEp.videoUrl, 
                        title: `${movie.title} - S${firstEp.seasonNumber || 1}:E${firstEp.number} ${firstEp.title}` 
                      });
                    } else {
                      onPlay(movie);
                    }
                  }}
                  className="flex items-center justify-center gap-2 bg-white text-black px-8 py-3 rounded hover:bg-white/80 transition-colors font-bold text-lg shadow-lg"
                >
                  <Play size={24} fill="black" /> {movie.contentType === 'tv' ? 'Play S1:E1' : 'Play'}
                </button>
                <button 
                  onClick={() => {
                    const videoUrlToDownload = movie.contentType === 'tv' && movie.episodes && movie.episodes.length > 0
                      ? movie.episodes[0].videoUrl
                      : movie.videoUrl;
                    
                    const link = document.createElement('a');
                    link.href = videoUrlToDownload;
                    link.download = movie.title;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="flex items-center justify-center p-3 border-2 border-gray-500 rounded-full text-white hover:border-white transition-colors bg-black/40"
                  title="Download"
                >
                  <Download size={24} />
                </button>
                <button className="flex items-center justify-center p-3 border-2 border-gray-500 rounded-full text-white hover:border-white transition-colors bg-black/40">
                  <Plus size={24} />
                </button>
                <button className="flex items-center justify-center p-3 border-2 border-gray-500 rounded-full text-white hover:border-white transition-colors bg-black/40">
                  <ThumbsUp size={24} />
                </button>
                
                {canDelete && (
                  <button 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center justify-center p-3 border-2 border-red-500/50 rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-all bg-black/40 ml-auto disabled:opacity-50"
                    title="Remove Movie"
                  >
                    {isDeleting ? <Loader2 size={24} className="animate-spin" /> : <Trash2 size={24} />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Details Content */}
          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div className="flex items-center gap-4 text-sm font-bold">
                <span className="text-green-500 font-extrabold tracking-tight">98% Match</span>
                <span className="text-gray-400">{movie.year}</span>
                <span className="border border-gray-500 px-1.5 py-0.5 rounded text-xs text-zinc-100 bg-zinc-800">{movie.rating}</span>
                <span className="text-gray-400">{movie.duration}</span>
                <span className="border border-gray-700 px-1.5 py-0.5 rounded text-[10px] text-gray-400 font-black tracking-widest uppercase">
                  {movie.contentType === 'tv' ? 'HD' : '4K Ultra HD'}
                </span>
              </div>
              
              <p className="text-lg text-gray-200 leading-relaxed font-medium">
                {movie.description}
              </p>
            </div>

            <div className="space-y-4 text-sm bg-zinc-800/30 p-6 rounded-lg border border-white/5">
              <div>
                <span className="text-gray-500 font-bold">Cast: </span>
                <span className="text-gray-300">{(movie.cast || []).join(', ')}</span>
              </div>
              <div>
                <span className="text-gray-500 font-bold">Genres: </span>
                <span className="text-gray-300">{(movie.genres || []).join(', ')}</span>
              </div>
              <div>
                <span className="text-gray-500 font-bold">This {movie.contentType === 'tv' ? 'show' : 'movie'} is: </span>
                <span className="text-gray-300">Exciting, Emotional, Visionary</span>
              </div>
            </div>
          </div>

          {/* Episode List for TV Shows */}
          {movie.contentType === 'tv' && movie.episodes && movie.episodes.length > 0 && (
            <div className="px-8 pb-12 border-t border-zinc-800 pt-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <h3 className="text-2xl font-bold text-white">Episodes</h3>
                
                {/* Season Selector */}
                <div className="relative inline-block w-48">
                  <select 
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(Number(e.target.value))}
                    className="w-full bg-zinc-800 text-white text-sm font-bold py-2.5 px-4 rounded border border-gray-700 outline-none focus:border-gray-500 appearance-none cursor-pointer pr-10"
                  >
                    {Array.from(new Set(movie.episodes.map(ep => ep.seasonNumber || 1)))
                      .sort((a, b) => a - b)
                      .map(season => (
                        <option key={season} value={season}>Season {season}</option>
                      ))
                    }
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {movie.episodes
                  .filter(ep => (ep.seasonNumber || 1) === selectedSeason)
                  .sort((a, b) => a.number - b.number)
                  .map((episode) => (
                    <div 
                      key={episode.id}
                      className="group flex flex-col md:flex-row items-start md:items-center gap-6 p-4 rounded-lg bg-zinc-800/20 border border-transparent hover:bg-zinc-800/40 hover:border-white/10 transition-all cursor-pointer"
                      onClick={() => onPlay({ ...movie, videoUrl: episode.videoUrl, title: `${movie.title} - S${episode.seasonNumber || 1}:E${episode.number} ${episode.title}` })}
                    >
                      <div className="text-2xl font-black text-gray-600 group-hover:text-white transition-colors w-8 text-center shrink-0">
                        {episode.number}
                      </div>
                      <div className="relative w-full md:w-40 aspect-video rounded-md overflow-hidden bg-zinc-800 flex-shrink-0">
                         <img src={episode.thumbnailUrl || movie.thumbnailUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                         <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play size={32} fill="white" className="text-white" />
                         </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-white group-hover:text-netflix-red transition-colors">{episode.title}</h4>
                          <span className="text-sm text-gray-500 font-medium">{episode.duration}</span>
                        </div>
                        <p className="text-sm text-gray-400 line-clamp-2 md:line-clamp-3 leading-relaxed">
                          {episode.description || `Chapter ${episode.number} of Season ${episode.seasonNumber || 1}.`}
                        </p>
                      </div>
                    </div>
                  ))
                }
                
                {movie.episodes.filter(ep => (ep.seasonNumber || 1) === selectedSeason).length === 0 && (
                  <div className="text-center py-12 text-gray-500 font-bold italic">
                    No episodes found for Season {selectedSeason}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default MovieDetails;
