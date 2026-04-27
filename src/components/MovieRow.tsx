import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MovieCard } from './MovieCard';
import { Movie } from '@/src/data/movies';

interface MovieRowProps {
  title: string;
  movies: (Movie & { progress?: number; totalDuration?: number })[];
  onMovieClick: (movie: Movie) => void;
}

export const MovieRow: React.FC<MovieRowProps> = ({ title, movies, onMovieClick }) => {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-4 mb-4 mt-8 group">
      <h2 className="text-xl font-bold text-gray-200 px-12 group-hover:text-white transition-colors uppercase tracking-tight">
        {title}
      </h2>
      
      <div className="relative">
        {/* Left Arrow */}
        <button 
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-40 w-12 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 backdrop-blur-sm"
        >
          <ChevronLeft size={32} />
        </button>

        <div 
          ref={rowRef}
          className="movie-row-scroll gap-2 px-12 py-2"
        >
          {movies.map((movie) => (
            <MovieCard 
              key={movie.id} 
              movie={movie} 
              onClick={onMovieClick} 
            />
          ))}
        </div>

        {/* Right Arrow */}
        <button 
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-40 w-12 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 backdrop-blur-sm"
        >
          <ChevronRight size={32} />
        </button>
      </div>
    </div>
  );
};

export default MovieRow;
