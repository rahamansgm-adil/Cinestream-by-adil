import { useState, useEffect, useRef } from 'react';
import { Play, Info, Volume2, VolumeX, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Movie } from '@/src/data/movies';
import { cn } from '../lib/utils';

interface HeroProps {
  movies: Movie[];
  onPlay: (movie: Movie) => void;
  onMoreInfo: (movie: Movie) => void;
}

export const Hero = ({ movies, onPlay, onMoreInfo }: HeroProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const movie = movies[currentIndex] || movies[0];

  const resetInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (movies.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % movies.length);
    }, 15000);
  };

  useEffect(() => {
    resetInterval();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [movies.length]);

  const handleManualSelect = (idx: number) => {
    setCurrentIndex(idx);
    resetInterval();
  };

  useEffect(() => {
    setShowTrailer(false);
    if (!movie?.trailerUrl) return;

    const timer = setTimeout(() => {
      if (movie?.trailerUrl) {
        setShowTrailer(true);
      }
    }, 4000); // 4 second delay

    return () => clearTimeout(timer);
  }, [movie, currentIndex]);

  if (!movies || movies.length === 0) return null;

  const isYouTube = movie.trailerUrl?.includes('youtube.com') || movie.trailerUrl?.includes('youtu.be');
  const normalizedTrailerUrl = movie.trailerUrl?.startsWith('/') 
    ? `https://www.vidking.net${movie.trailerUrl}` 
    : movie.trailerUrl;

  const isEmbed = normalizedTrailerUrl?.includes('vidking.net') || 
                  normalizedTrailerUrl?.includes('vidking.com') || 
                  normalizedTrailerUrl?.includes('/embed/') ||
                  normalizedTrailerUrl?.includes('player.') ||
                  normalizedTrailerUrl?.includes('vimeo.com');

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
    <div className="relative h-[80vh] md:h-[85vh] w-full overflow-hidden [perspective:1000px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, rotateY: 90, scale: 0.9 }}
          animate={{ opacity: 1, rotateY: 0, scale: 1 }}
          exit={{ opacity: 0, rotateY: -90, scale: 0.9 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformStyle: 'preserve-3d' }}
          className="absolute inset-0 w-full h-full"
        >
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
                  ) : isEmbed ? (
                    <div className="w-full h-full pointer-events-none">
                      <iframe
                        className="w-full h-full border-0"
                        src={normalizedTrailerUrl + (normalizedTrailerUrl?.includes('?') ? '&' : '?') + 'autoplay=1&mute=1&controls=0'}
                        allow="autoplay; fullscreen; encrypted-media"
                        title="Hero Trailer"
                      />
                    </div>
                  ) : (
                    <video
                      ref={videoRef}
                      src={normalizedTrailerUrl}
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
          <div className="absolute bottom-0 left-0 z-10 w-full flex flex-col justify-end px-4 md:px-12 pb-20 md:pb-32">
            <div className="max-w-full md:max-w-xl text-center md:text-left">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="flex items-center justify-center md:justify-start gap-2 mb-2 md:mb-4"
              >
                {movie.contentType === 'tv' && (
                  <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded text-[9px] md:text-[10px] font-black tracking-widest text-white uppercase border border-white/10">
                    TV SHOW
                  </span>
                )}
                <span className="text-gray-400 text-xs md:text-sm font-bold tracking-widest">{movie.year}</span>
              </motion.div>

              <motion.h1 
                className="text-3xl sm:text-4xl md:text-7xl font-bold mb-2 md:mb-3 tracking-tight text-white uppercase leading-tight"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                {movie.title}
              </motion.h1>

              {movie.genres && movie.genres.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4 md:mb-6"
                >
                  {movie.genres.map((genre, idx) => (
                    <span key={idx} className="flex items-center gap-1.5">
                      <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white/70">{genre}</span>
                      {idx < movie.genres.length - 1 && <span className="w-1 h-1 bg-netflix-red rounded-full opacity-50" />}
                    </span>
                  ))}
                </motion.div>
              )}
              
              <motion.p 
                className="text-sm md:text-lg text-gray-200 mb-6 md:mb-8 line-clamp-2 md:line-clamp-3 leading-relaxed font-light drop-shadow-md max-w-lg mx-auto md:mx-0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                {movie.description}
              </motion.p>

              <motion.div 
                className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
              >
                <button 
                  onClick={handlePlayClick}
                  className="flex items-center justify-center gap-2 bg-white text-black px-4 md:px-8 py-2 md:py-3 rounded hover:bg-white/90 transition-all font-bold shadow-lg text-sm md:text-base active:scale-95"
                >
                  <Play size={20} className="md:w-6 md:h-6" fill="black" /> 
                  <span>{movie.contentType === 'tv' ? 'S1:E1 Play' : 'Play'}</span>
                </button>
                <button 
                  onClick={() => onMoreInfo(movie)}
                  className="flex items-center justify-center gap-2 bg-gray-500/50 text-white px-4 md:px-8 py-2 md:py-3 rounded hover:bg-gray-500/40 transition-all font-bold backdrop-blur-md border border-white/10 text-sm md:text-base active:scale-95"
                >
                  <Info size={20} className="md:w-6 md:h-6" /> More Info
                </button>
                <button 
                  onClick={handleDownload}
                  className="flex items-center justify-center p-2 md:p-3 bg-gray-500/50 text-white rounded hover:bg-gray-500/40 transition-all backdrop-blur-md border border-white/10 active:scale-95"
                  title="Download"
                >
                  <Download size={20} className="md:w-6 md:h-6" />
                </button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Slide Indicators */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        {movies.map((_, idx) => (
          <button
            key={idx}
            onClick={() => handleManualSelect(idx)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              currentIndex === idx ? "w-8 bg-netflix-red shadow-[0_0_10px_rgba(229,9,20,0.5)]" : "w-2 bg-white/20 hover:bg-white/40"
            )}
          />
        ))}
      </div>

      {/* Mute Toggle */}
      {showTrailer && movie.trailerUrl && !isYouTube && !isEmbed && (
        <motion.button 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setIsMuted(!isMuted)}
          className="absolute bottom-20 md:bottom-32 right-4 md:right-24 p-2 border border-white/40 rounded-full text-white hover:bg-white/10 transition-colors z-20"
        >
          {isMuted ? <VolumeX size={18} className="md:w-5 md:h-5" /> : <Volume2 size={18} className="md:w-5 md:h-5" />}
        </motion.button>
      )}
    </div>
  );
};

export default Hero;
