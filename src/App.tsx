/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, LogIn, LogOut, Plus } from 'lucide-react';
import { cn } from './lib/utils';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import MovieRow from './components/MovieRow';
import MovieDetails from './components/MovieDetails';
import VideoPlayer from './components/VideoPlayer';
import AddMovieForm from './components/AddMovieForm';
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
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Combined and filtered movies
  const allMovies = useMemo(() => {
    const combined = [...dbMovies, ...movies];
    const unique = Array.from(new Map(combined.map(m => [m.id, m])).values());
    
    if (!searchQuery.trim()) return unique;
    
    const query = searchQuery.toLowerCase().trim();
    return unique.filter(m => 
      m.title.toLowerCase().includes(query) ||
      m.description.toLowerCase().includes(query) ||
      m.genres.some(g => g.toLowerCase().includes(query)) ||
      m.cast.some(c => c.toLowerCase().includes(query)) ||
      (m.contentType === 'tv' && m.episodes?.some(ep => 
        ep.title.toLowerCase().includes(query) ||
        ep.description.toLowerCase().includes(query)
      ))
    );
  }, [dbMovies, movies, searchQuery]);

  useEffect(() => {
    const isAdmin = user?.email === 'rahamansgmadil2@gmail.com';
    const hasCleared = localStorage.getItem('initial_db_clear_v1');

    if (isAdmin && !hasCleared) {
      const clearAll = async () => {
        try {
          const querySnapshot = await getDocs(collection(db, 'movies'));
          const batch = writeBatch(db);
          querySnapshot.forEach((document) => {
            batch.delete(doc(db, 'movies', document.id));
          });
          await batch.commit();
          localStorage.setItem('initial_db_clear_v1', 'true');
          window.location.reload();
        } catch (error) {
          console.error("Auto-clear failed:", error);
        }
      };
      clearAll();
    }
  }, [user]);

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

  const handleClosePlayer = () => {
    setPlayingMovie(null);
  };

  const videoJsOptions = useMemo(() => {
    if (!playingMovie) return null;
    
    const url = playingMovie.videoUrl.toLowerCase();
    let type = 'video/mp4'; // Default
    
    if (url.endsWith('.m3u8')) {
      type = 'application/x-mpegURL';
    } else if (url.endsWith('.mkv')) {
      type = 'video/x-matroska';
    } else if (url.endsWith('.webm')) {
      type = 'video/webm';
    } else if (url.includes('drive.google.com')) {
      type = 'video/mp4'; // Our proxy serves it as mp4
    }

    return {
      autoplay: true,
      controls: true,
      responsive: true,
      fluid: true,
      sources: [{
        src: playingMovie.videoUrl,
        type: type
      }]
    };
  }, [playingMovie]);

  return (
    <div className="relative min-h-screen bg-netflix-black text-white">
      <Navbar 
        onAddMovieClick={() => setActiveAddForm('movie')} 
        onAddTVShowClick={() => setActiveAddForm('tv')}
        user={user}
        onLogin={signInWithGoogle}
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

              {dbMovies.filter(m => m.contentType !== 'tv').length > 0 && (
                <MovieRow 
                  key="added-by-community"
                  title="Community Picks"
                  movies={dbMovies.filter(m => m.contentType !== 'tv')}
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
          <AddMovieForm 
            type={activeAddForm}
            onAdd={handleAddMovie}
            onClose={() => setActiveAddForm(null)}
          />
        )}
      </AnimatePresence>

      {/* High-Quality Video Player Overlay */}
      <AnimatePresence>
        {playingMovie && videoJsOptions && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black"
          >
            <button 
              onClick={handleClosePlayer}
              className="absolute top-8 left-8 z-[1001] p-3 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
            >
              <X size={32} />
            </button>
            
            <div className="w-full h-full flex items-center justify-center">
              <VideoPlayer 
                options={videoJsOptions} 
                onReady={(player) => {
                  console.log('Video Player Ready');
                }}
              />
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

