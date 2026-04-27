import React from 'react';
import { motion } from 'motion/react';
import { Play, Plus, ChevronDown, ThumbsUp } from 'lucide-react';
import { Movie } from '@/src/data/movies';

interface MovieCardProps {
  movie: Movie & { progress?: number; totalDuration?: number };
  onClick: (movie: Movie) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, onClick }) => {
  const progressPercent = movie.progress && movie.totalDuration 
    ? (movie.progress / movie.totalDuration) * 100 
    : 0;

  return (
    <motion.div 
      className="relative group min-w-[200px] md:min-w-[240px] h-[112px] md:h-[135px] cursor-pointer rounded overflow-hidden border border-transparent hover:border-white/50 transition-all duration-300"
      initial={{ opacity: 1 }}
      whileHover={{ scale: 1.05, zIndex: 10 }}
      onClick={() => onClick(movie)}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
      <img 
        src={movie.thumbnailUrl} 
        alt={movie.title}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
      
      <div className="absolute inset-x-0 bottom-0 p-3 z-20">
        {movie.progress !== undefined && movie.totalDuration !== undefined && (
          <div className="w-full bg-white/20 h-1 rounded-full mb-3 overflow-hidden">
            <div 
              className="bg-netflix-red h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
        <div className="flex items-center gap-1.5 mb-1.5">
          {movie.contentType === 'tv' && (
            <span className="text-[7px] font-black tracking-widest text-white bg-netflix-red px-1 rounded-sm uppercase">TV</span>
          )}
          <span className="text-[8px] text-gray-400 font-bold">{movie.year}</span>
        </div>
        <h3 className="text-xs font-bold text-white uppercase tracking-wider line-clamp-1">{movie.title}</h3>
      </div>
      
      {/* Detailed overlay shown only on larger hover effect if needed, but keeping it minimal per design */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center gap-3 z-30">
        <div className="p-2 rounded-full bg-white/20 hover:bg-white/40 transition-colors backdrop-blur-sm">
          <Play size={20} fill="white" className="text-white" />
        </div>
      </div>
    </motion.div>
  );
};

export default MovieCard;
