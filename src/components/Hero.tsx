import { useState, useEffect, useRef } from 'react';
import { Play, Info, Volume2, VolumeX, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Movie } from '@/src/data/movies';

interface HeroProps {
  movie: Movie;
  onPlay: (movie: Movie) => void;
  onMoreInfo: (movie: Movie) => void;
}

export const Hero = ({ movie, onPlay, onMoreInfo }: HeroProps) => {
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setShowTrailer(false);
    if (!movie?.trailerUrl) return;

    const timer = setTimeout(() => {
      if (movie?.trailerUrl) {
        setShowTrailer(true);
      }
    }, 4000); // 4 second delay

    return () => clearTimeout(timer);
  }, [movie]);

  if (!movie) return null;

  const isYouTube = movie.trailerUrl?.includes('youtube.com') || movie.trailerUrl?.includes('youtu.be');
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handlePlayClick = () => {
    if (movie.contentType === 'tv' && movie.episodes && movie.episodes.length > 0) {
      // Play first episode
      const firstEpisode = movie.episodes[0];
      onPlay({ 
        ...movie, 
        videoUrl: firstEpisode.videoUrl, 
        title: `${movie.title} - ${firstEpisode.title}` 
      });
    } else {
      onPlay(movie);
    }
  };

  const handleDownload = () => {
    const videoUrl = movie.contentType === 'tv' && movie.episodes && movie.episodes.length > 0 
      ? movie.episodes[0].videoUrl 
      : movie.videoUrl;
    
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = movie.title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative h-[80vh] md:h-[85vh] w-full flex flex-col justify-end px-12 pb-32 overflow-hidden">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
        <img 
          src={movie.bannerUrl} 
          alt={movie.title}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        
        {/* Auto-playing Trailer Overlay */}
        <AnimatePresence>
          {showTrailer && movie.trailerUrl && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0"
            >
              {isYouTube ? (
                <div className="w-full h-full pointer-events-none scale-[1.35]">
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${getYouTubeId(movie.trailerUrl)}?autoplay=1&mute=1&controls=0&loop=1&playlist=${getYouTubeId(movie.trailerUrl)}&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1`}
                    allow="autoplay; encrypted-media"
                    title="Hero Trailer"
                  />
                </div>
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
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-xl">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8 }}
           className="flex items-center gap-2 mb-4"
        >
          {movie.contentType === 'tv' && (
            <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded text-[10px] font-black tracking-widest text-white uppercase border border-white/10">
              TV SHOW
            </span>
          )}
          <span className="text-gray-400 text-sm font-bold tracking-widest">{movie.year}</span>
        </motion.div>

        <motion.h1 
          className="text-5xl md:text-7xl font-bold mb-4 tracking-tight text-white uppercase"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {movie.title}
        </motion.h1>
        
        <motion.p 
          className="text-lg text-gray-200 mb-8 line-clamp-3 leading-relaxed font-light drop-shadow-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {movie.description}
        </motion.p>

        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <button 
            onClick={handlePlayClick}
            className="flex items-center justify-center gap-2 bg-white text-black px-8 py-3 rounded hover:bg-white/90 transition-colors font-bold shadow-lg"
          >
            <Play size={24} fill="black" /> {movie.contentType === 'tv' ? 'S1:E1 Play' : 'Play'}
          </button>
          <button 
            onClick={handleDownload}
            className="flex items-center justify-center p-3 bg-gray-500/50 text-white rounded hover:bg-gray-500/40 transition-colors backdrop-blur-md border border-white/10"
            title="Download"
          >
            <Download size={24} />
          </button>
          <button 
            onClick={() => onMoreInfo(movie)}
            className="flex items-center justify-center gap-2 bg-gray-500/50 text-white px-8 py-3 rounded hover:bg-gray-500/40 transition-colors font-bold backdrop-blur-md border border-white/10"
          >
            <Info size={24} /> More Info
          </button>
        </motion.div>
      </div>

      {/* Mute Toggle */}
      {showTrailer && movie.trailerUrl && !isYouTube && (
        <motion.button 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setIsMuted(!isMuted)}
          className="absolute bottom-32 right-12 md:right-24 p-2 border-2 border-white/40 rounded-full text-white hover:bg-white/10 transition-colors z-20"
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </motion.button>
      )}
    </div>
  );
};

export default Hero;
