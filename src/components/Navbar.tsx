import { useState, useEffect } from 'react';
import { Search, Bell, User, Menu, LogOut, LogIn, X, Settings, Plus, Clapperboard } from 'lucide-react';
import { cn } from '../lib/utils';
import { User as FirebaseUser } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  onAddMovieClick: () => void;
  onAddTVShowClick: () => void;
  onCategoryChange: (category: 'all' | 'tv' | 'movie' | 'live' | 'my-list') => void;
  activeCategory: 'all' | 'tv' | 'movie' | 'live' | 'my-list';
  user: FirebaseUser | null;
  onLogin: () => void;
  onLogout: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Navbar = ({ 
  onAddMovieClick, 
  onAddTVShowClick, 
  onCategoryChange,
  activeCategory,
  user, 
  onLogin, 
  onLogout, 
  searchQuery, 
  setSearchQuery
}: NavbarProps) => {
  const { isAdmin } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={cn(
      "fixed top-0 w-full z-50 transition-all duration-300 px-4 md:px-12 py-3 md:py-5 flex items-center justify-between",
      isScrolled ? "bg-black shadow-2xl" : "bg-gradient-to-b from-black/80 to-transparent"
    )}>
      <div className="flex items-center gap-4 md:gap-10 overflow-hidden">
        <div 
          onClick={() => onCategoryChange('all')}
          className="flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform shrink-0 group"
        >
          <div className="p-1 sm:p-1.5 bg-gradient-to-br from-netflix-red to-[#ff0a16] rounded shadow-lg shadow-netflix-red/30 flex items-center justify-center transform group-hover:rotate-12 transition-transform">
            <Clapperboard size={18} className="text-white sm:w-5 sm:h-5" strokeWidth={3} />
          </div>
          <div className="text-netflix-red text-xl md:text-2xl font-black tracking-tighter whitespace-nowrap">
            <span className="hidden sm:inline font-black uppercase tracking-tighter">CineStream By Adil</span>
            <span className="sm:hidden font-black uppercase tracking-tighter">CineStream</span>
          </div>
        </div>
        
        <ul className="hidden lg:flex items-center gap-5 text-sm font-medium text-gray-200">
          <li 
            onClick={() => onCategoryChange('all')}
            className={cn("cursor-pointer transition-colors hover:text-white", activeCategory === 'all' ? "text-white font-bold underline decoration-netflix-red decoration-2 underline-offset-8" : "text-gray-400")}
          >
            Home
          </li>
          <li 
            onClick={() => onCategoryChange('tv')}
            className={cn("cursor-pointer transition-colors hover:text-white", activeCategory === 'tv' ? "text-white font-bold underline decoration-netflix-red decoration-2 underline-offset-8" : "text-gray-400")}
          >
            TV Shows
          </li>
          <li 
            onClick={() => onCategoryChange('movie')}
            className={cn("cursor-pointer transition-colors hover:text-white", activeCategory === 'movie' ? "text-white font-bold underline decoration-netflix-red decoration-2 underline-offset-8" : "text-gray-400")}
          >
            Movies
          </li>
          <li 
            onClick={() => onCategoryChange('live')}
            className={cn("cursor-pointer transition-colors hover:text-white", activeCategory === 'live' ? "text-white font-bold underline decoration-netflix-red decoration-2 underline-offset-8" : "text-gray-400")}
          >
            Live TV
          </li>
          <li className="hover:text-gray-400 cursor-pointer transition-colors">New & Popular</li>
          <li 
            onClick={() => onCategoryChange('my-list')}
            className={cn("cursor-pointer transition-colors hover:text-white", activeCategory === 'my-list' ? "text-white font-bold underline decoration-netflix-red decoration-2 underline-offset-8" : "text-gray-400")}
          >
            My List
          </li>
          
          {isAdmin && (
            <div className="flex items-center gap-3 ml-6 pl-6 border-l border-white/20">
              <button 
                onClick={onAddMovieClick} 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-netflix-red text-white text-[11px] font-black uppercase tracking-widest rounded hover:bg-[#ff0a16] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-netflix-red/20"
              >
                <Plus size={14} /> Add Movie
              </button>
              <button 
                onClick={onAddTVShowClick} 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-white text-[11px] font-black uppercase tracking-widest rounded hover:bg-zinc-700 transition-all hover:scale-105 active:scale-95 border border-white/10"
              >
                <Plus size={14} /> Add TV Show
              </button>
            </div>
          )}
        </ul>
      </div>

      <div className="flex items-center gap-3 sm:gap-6 text-white">
        <div className={cn(
          "flex items-center gap-2 px-2 py-1 transition-all duration-300 border border-transparent rounded",
          isSearchOpen ? "bg-black/50 border-white/20 w-32 sm:w-48 md:w-64" : "w-10"
        )}>
          <button 
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="hover:text-gray-400 transition-colors"
          >
            <Search size={20} className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
          </button>
          
          <input 
            type="text"
            placeholder={isSearchOpen ? "Search..." : ""}
            className={cn(
              "bg-transparent outline-none text-xs sm:text-sm transition-all duration-300 placeholder:text-gray-500",
              isSearchOpen ? "w-full opacity-100" : "w-0 opacity-0 pointer-events-none"
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && isSearchOpen && (
            <button 
              onClick={() => setSearchQuery('')}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button className="hidden sm:block hover:text-gray-400 transition-colors"><Bell size={20} strokeWidth={2} /></button>
        
        {user ? (
          <div className="relative">
            <div 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 rounded cursor-pointer shrink-0 overflow-hidden border border-zinc-700"
            >
              <img 
                src={user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100"} 
                alt="Avatar" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            
            {showProfileMenu && (
              <div className="absolute right-0 mt-4 w-48 bg-black/95 border border-zinc-800 rounded-sm shadow-2xl py-2 z-50">
                <div className="px-4 py-2 border-b border-zinc-800 mb-2">
                  <p className="text-xs text-gray-400">Signed in as</p>
                  <p className="text-sm font-bold truncate">
                    {user.isAnonymous ? "Guest Browser" : (user.displayName || user.email)}
                  </p>
                </div>
                
                {!isAdmin && (!user?.email || user.isAnonymous) && (
                  <button 
                    onClick={() => { onLogin(); setShowProfileMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 flex items-center gap-2 transition-colors border-b border-zinc-800"
                  >
                    <Settings size={16} /> Admin Access
                  </button>
                )}

                {isAdmin && (
                  <>
                    <button 
                      onClick={() => { onAddMovieClick(); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 flex items-center gap-2 transition-colors text-white font-medium"
                    >
                      <Plus size={16} /> Add Movie
                    </button>
                    <button 
                      onClick={() => { onAddTVShowClick(); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 flex items-center gap-2 transition-colors text-white font-medium border-b border-zinc-800"
                    >
                      <Plus size={16} /> Add TV Show
                    </button>
                  </>
                )}

                <button 
                  onClick={() => { onLogout(); setShowProfileMenu(false); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
             {!isAdmin && (
                <button 
                  onClick={onLogin}
                  className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                >
                  <Settings size={16} /> Admin
                </button>
              )}
            <button 
              onClick={onLogin}
              className="flex items-center gap-1 sm:gap-2 bg-netflix-red px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-sm font-bold text-xs sm:text-sm hover:bg-[#ff0a16] transition-all uppercase tracking-wide shrink-0 whitespace-nowrap active:scale-95"
            >
              <LogIn size={16} className="w-4 h-4 sm:w-5 sm:h-5" /> 
              <span className="hidden sm:inline">Login</span>
              <span className="sm:hidden">Sign In</span>
            </button>
          </div>
        )}
        
        <Menu 
          className="lg:hidden cursor-pointer hover:text-netflix-red transition-colors" 
          size={24} 
          onClick={() => setIsMobileMenuOpen(true)}
        />
      </div>

      {/* Mobile Sidebar Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[280px] bg-zinc-950 z-[101] shadow-2xl flex flex-col pt-20"
            >
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <div className="flex flex-col gap-1 px-4">
                <p className="px-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-4">Navigation</p>
                <MobileMenuItem 
                  active={activeCategory === 'all'} 
                  onClick={() => { onCategoryChange('all'); setIsMobileMenuOpen(false); }}
                  label="Home"
                />
                <MobileMenuItem 
                  active={activeCategory === 'tv'} 
                  onClick={() => { onCategoryChange('tv'); setIsMobileMenuOpen(false); }}
                  label="TV Shows"
                />
                <MobileMenuItem 
                  active={activeCategory === 'movie'} 
                  onClick={() => { onCategoryChange('movie'); setIsMobileMenuOpen(false); }}
                  label="Movies"
                />
                <MobileMenuItem 
                  active={activeCategory === 'live'} 
                  onClick={() => { onCategoryChange('live'); setIsMobileMenuOpen(false); }}
                  label="Live TV"
                />
                <MobileMenuItem 
                  active={activeCategory === 'my-list'} 
                  onClick={() => { onCategoryChange('my-list'); setIsMobileMenuOpen(false); }}
                  label="My List"
                />
              </div>

              <div className="mt-10 px-4">
                 <p className="px-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-4">Account</p>
                 {user ? (
                   <div className="space-y-4 px-4 bg-zinc-900/40 p-4 rounded-xl border border-white/5 mx-2">
                     <div className="flex items-center gap-3">
                       <img 
                        src={user.photoURL || ''} 
                        className="w-10 h-10 rounded-full object-cover border border-white/10" 
                        alt="Avatar"
                       />
                       <div className="min-w-0">
                         <p className="text-sm font-black text-white truncate">{user.displayName || 'User'}</p>
                         <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                       </div>
                     </div>
                     <button 
                        onClick={() => { onLogout(); setIsMobileMenuOpen(false); }}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-zinc-800 rounded-lg text-xs font-bold text-gray-400 hover:bg-zinc-700 hover:text-white transition-all"
                     >
                       <LogOut size={14} /> Sign Out
                     </button>
                   </div>
                 ) : (
                   <button 
                      onClick={() => { onLogin(); setIsMobileMenuOpen(false); }}
                      className="w-full flex items-center justify-center gap-3 py-4 bg-netflix-red rounded-xl text-sm font-black uppercase tracking-widest text-white hover:bg-[#ff0a16] shadow-lg shadow-netflix-red/20 mx-2"
                   >
                     <LogIn size={20} /> Login Now
                   </button>
                 )}
              </div>

              {isAdmin && (
                <div className="mt-10 px-4">
                  <p className="px-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-4">Admin Actions</p>
                  <div className="flex flex-col gap-2 mx-2">
                    <button 
                      onClick={() => { onAddMovieClick(); setIsMobileMenuOpen(false); }}
                      className="flex items-center gap-3 px-4 py-3 bg-zinc-900 rounded-xl text-sm font-bold border border-white/5"
                    >
                      <Plus size={18} className="text-netflix-red" /> Add Movie
                    </button>
                    <button 
                      onClick={() => { onAddTVShowClick(); setIsMobileMenuOpen(false); }}
                      className="flex items-center gap-3 px-4 py-3 bg-zinc-900 rounded-xl text-sm font-bold border border-white/5"
                    >
                      <Plus size={18} className="text-netflix-red" /> Add TV Show
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};

interface MobileMenuItemProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const MobileMenuItem = ({ label, active, onClick }: MobileMenuItemProps) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full text-left px-5 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
      active ? "bg-white/5 text-netflix-red border-l-2 border-netflix-red" : "text-zinc-400 hover:text-white"
    )}
  >
    {label}
  </button>
);

export default Navbar;
