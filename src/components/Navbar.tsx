import { useState, useEffect } from 'react';
import { Search, Bell, User, Menu, LogOut, LogIn, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { User as FirebaseUser } from 'firebase/auth';

interface NavbarProps {
  onAddMovieClick: () => void;
  onAddTVShowClick: () => void;
  user: FirebaseUser | null;
  onLogin: () => void;
  onLogout: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Navbar = ({ 
  onAddMovieClick, 
  onAddTVShowClick, 
  user, 
  onLogin, 
  onLogout, 
  searchQuery, 
  setSearchQuery 
}: NavbarProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
      "fixed top-0 w-full z-50 transition-all duration-300 px-12 py-5 flex items-center justify-between",
      isScrolled ? "bg-black shadow-2xl" : "bg-gradient-to-b from-black/80 to-transparent"
    )}>
      <div className="flex items-center gap-10">
        <div className="text-netflix-red text-2xl font-black tracking-tighter cursor-pointer whitespace-nowrap">
          CINESTREAM BY ADIL
        </div>
        
        <ul className="hidden lg:flex items-center gap-5 text-sm font-medium text-gray-200">
          <li className="text-white cursor-pointer transition-colors">Home</li>
          <li className="hover:text-gray-400 cursor-pointer transition-colors">TV Shows</li>
          <li className="hover:text-gray-400 cursor-pointer transition-colors">Movies</li>
          <li className="hover:text-gray-400 cursor-pointer transition-colors">New & Popular</li>
          <li className="hover:text-gray-400 cursor-pointer transition-colors">My List</li>
          <div className="flex gap-2 ml-4">
            <li onClick={onAddMovieClick} className="px-3 py-1 bg-netflix-red text-white text-[10px] font-bold rounded cursor-pointer hover:bg-[#ff0a16] transition-colors uppercase tracking-widest whitespace-nowrap">Add Movie</li>
            <li onClick={onAddTVShowClick} className="px-3 py-1 bg-zinc-800 text-white text-[10px] font-bold rounded cursor-pointer hover:bg-zinc-700 transition-colors uppercase tracking-widest whitespace-nowrap border border-white/10">Add TV Show</li>
          </div>
        </ul>
      </div>

      <div className="flex items-center gap-6 text-white">
        <div className={cn(
          "flex items-center gap-2 px-2 py-1 transition-all duration-300 border border-transparent rounded",
          isSearchOpen ? "bg-black/50 border-white/20 w-48 md:w-64" : "w-10"
        )}>
          <button 
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="hover:text-gray-400 transition-colors"
          >
            <Search size={20} strokeWidth={2} />
          </button>
          
          <input 
            type="text"
            placeholder="Titles, people, genres"
            className={cn(
              "bg-transparent outline-none text-sm transition-all duration-300 placeholder:text-gray-500",
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
              className="w-8 h-8 bg-blue-500 rounded cursor-pointer shrink-0 overflow-hidden border border-zinc-700"
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
                  <p className="text-sm font-bold truncate">{user.displayName || user.email}</p>
                </div>
                <button 
                  onClick={() => { onLogout(); setShowProfileMenu(false); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                >
                  <LogOut size={16} /> Sign out of CineStream By Adil
                </button>
              </div>
            )}
          </div>
        ) : (
          <button 
            onClick={onLogin}
            className="flex items-center gap-2 bg-netflix-red px-4 py-1.5 rounded-sm font-bold text-sm hover:bg-[#ff0a16] transition-colors uppercase tracking-wide"
          >
            <LogIn size={16} /> Login
          </button>
        )}
        
        <Menu className="lg:hidden cursor-pointer" size={24} />
      </div>
    </nav>
  );
};

export default Navbar;
