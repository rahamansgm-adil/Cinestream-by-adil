/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, LogIn, LogOut, Plus, ChevronLeft } from 'lucide-react';
import { cn } from './lib/utils';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import MovieRow from './components/MovieRow';
import MovieDetails from './components/MovieDetails';
import VideoPlayer from './components/VideoPlayer';
import AddMovieForm from './components/AddMovieForm';
import { UserLoginModal } from './components/UserLoginModal';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { MOVIES as initialMovies, CATEGORIES, Movie } from './data/movies';
import { db, auth, signInWithGoogle } from './lib/firebase';
import { collection, query, orderBy, onSnapshot, getDocs, writeBatch, doc } from 'firebase/firestore';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

export default function App() {
  const [movies, setMovies] = useState<Movie[]>(initialMovies);
  const [dbMovies, setDbMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [playingMovie, setPlayingMovie] = useState<Movie | null>(null);
  const [activeAddForm, setActiveAddForm] = useState<'movie' | 'tv' | null>(null);
  const [showUserLogin, setShowUserLogin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { isAdmin } = useAuth();

  // Combined and filtered movies
  const allMovies = useMemo(() => {
    const combined = [...dbMovies, ...movies];
    const unique = Array.from(new Map(combined.map(m => [m.id, m])).values());
    
    if (!searchQuery.trim()) return unique;
    
    const query = searchQuery.toLowerCase().trim();
    return unique.filter(m => {
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
  }, [dbMovies, movies, searchQuery]);

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
    });

    return () => {
      unsubscribeAuth();
      unsubscribeMovies();
    };
  }, []);

  const featuredMovie = allMovies[0];

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

  const handlePlayerReady = useCallback((player: any) => {
    console.log('Video Player Ready');
  }, []);

  const isEmbed = useMemo(() => {
    if (!playingMovie) return false;
    const url = playingMovie.videoUrl || '';
    return url.includes('vidking.net') || 
           url.includes('youtube.com/embed') || 
           url.includes('vimeo.com/video') ||
           url.includes('player.') ||
           url.startsWith('/embed/');
  }, [playingMovie]);

  const videoJsOptions = useMemo(() => {
    if (!playingMovie || isEmbed) return null;
    
    const url = playingMovie.videoUrl.toLowerCase();
    let src = playingMovie.videoUrl;
    let type = 'video/mp4'; // Default
    
    const isDrive = url.includes('drive.google.com');
    if (isDrive) {
      const driveId = url.match(/(?:id=|d\/|file\/d\/)([\w-]{25,})/)?.[1];
      if (driveId) {
        src = `/api/stream?id=${driveId}`;
      }
      type = 'video/mp4';
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
        user={user}
        onLogin={() => setShowUserLogin(true)}
        onLogout={() => signOut(auth)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      <main className="pb-40">
        {!searchQuery ? (
          <>
            {featuredMovie && (
              <Hero 
                movie={featuredMovie} 
                onPlay={handlePlay} 
                onMoreInfo={setSelectedMovie} 
              />
            )}
    
            <div className={cn("relative z-10 pb-20", !featuredMovie && "pt-32")}>
              {CATEGORIES.map((category) => (
                <MovieRow 
                  key={category.id}
                  title={category.title}
                  movies={allMovies.filter(m => category.movieIds.includes(m.id))}
                  onMovieClick={(movie: Movie) => setSelectedMovie(movie)}
                />
              ))}

              {dbMovies.filter(m => m.contentType === 'tv').length > 0 && (
                <MovieRow 
                  key="tv-shows-community"
                  title="TV Shows"
                  movies={dbMovies.filter(m => m.contentType === 'tv')}
                  onMovieClick={(movie: Movie) => setSelectedMovie(movie)}
                />
              )}

              {dbMovies.length > 0 && (
                <MovieRow 
                  key="added-by-community"
                  title="Community Picks"
                  movies={dbMovies}
                  onMovieClick={(movie: Movie) => setSelectedMovie(movie)}
                />
              )}
    
              {allMovies.length > initialMovies.length && (
                <MovieRow 
                  key="recently-added-row"
                  title="Recently Added"
                  movies={allMovies.slice(0, allMovies.length - initialMovies.length)}
                  onMovieClick={(movie: Movie) => setSelectedMovie(movie)}
                />
              )}
            </div>
          </>
        ) : (
          <div className="pt-32 px-4 md:px-12">
            <h2 className="text-2xl font-bold mb-6">Search Results for "{searchQuery}"</h2>
            {allMovies.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-y-10 gap-x-4">
                {allMovies.map(movie => (
                  <div key={movie.id} onClick={() => setSelectedMovie(movie)} className="cursor-pointer">
                    <img 
                      src={movie.thumbnailUrl} 
                      alt={movie.title} 
                      className="w-full aspect-video object-cover rounded-md hover:scale-105 transition-transform duration-300"
                    />
                    <h3 className="mt-2 font-medium text-sm text-gray-300">{movie.title}</h3>
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

