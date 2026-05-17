import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Tv, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { fetchIPTVPlaylist, IPTVChannel } from '../utils/m3uParser';
import { motion, AnimatePresence } from 'motion/react';

interface LiveTVProps {
  onPlay: (channel: any) => void;
}

const ITEMS_PER_PAGE = 40;

export const LiveTV: React.FC<LiveTVProps> = ({ onPlay }) => {
  const [channels, setChannels] = useState<IPTVChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadChannels = async () => {
      try {
        const data = await fetchIPTVPlaylist();
        setChannels(data);
      } catch (err) {
        setError('Failed to load channels. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    loadChannels();
  }, []);

  const filteredChannels = useMemo(() => {
    if (!searchTerm.trim()) return channels;
    const query = searchTerm.toLowerCase();
    return channels.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.group.toLowerCase().includes(query)
    );
  }, [channels, searchTerm]);

  const visibleChannels = useMemo(() => {
    return filteredChannels.slice(0, visibleCount);
  }, [filteredChannels, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchTerm]);

  return (
    <div className="w-full px-4 md:px-12 pt-10 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight uppercase">Live TV & Channels</h1>
          <p className="text-zinc-400 mt-2 font-medium">Broadcasts from around the world • {channels.length} Channels</p>
        </div>

        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search channels, countries, languages..." 
            className="w-full bg-zinc-900 border border-zinc-800 text-white pl-12 pr-4 py-3 rounded-md outline-none focus:border-white/30 focus:bg-zinc-800 transition-all placeholder:text-zinc-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Loader2 className="animate-spin text-red-600" size={48} />
          <p className="text-zinc-400 font-bold tracking-widest uppercase text-sm">Tuning channels...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4 text-center">
          <AlertCircle className="text-zinc-600" size={64} />
          <h2 className="text-2xl font-bold text-white">Oops! Connection Lost</h2>
          <p className="text-zinc-500 max-w-md">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-8 py-2 bg-white text-black font-black uppercase tracking-wider rounded hover:bg-zinc-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="pb-20">
          {visibleChannels.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {visibleChannels.map((channel, idx) => (
                  <motion.div 
                    key={`${channel.url}-${idx}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (idx % 10) * 0.05 }}
                    onClick={() => onPlay({
                      id: `live-${channel.url}`,
                      title: channel.name,
                      videoUrl: channel.url,
                      thumbnailUrl: channel.logo || 'https://images.unsplash.com/photo-1594909122845-11baa439b7ea?auto=format&fit=crop&q=80&w=400',
                      contentType: 'movie',
                      rating: 'LIVE'
                    })}
                    className="p-1"
                  >
                    <div className="group relative bg-zinc-900 rounded-md overflow-hidden cursor-pointer aspect-video border border-zinc-800 hover:border-white/30 transition-all shadow-lg hover:shadow-2xl">
                      {channel.logo ? (
                        <img 
                          src={channel.logo} 
                          alt={channel.name} 
                          className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-300"
                          onError={(e: any) => {
                            e.target.src = 'https://images.unsplash.com/photo-1594909122845-11baa439b7ea?auto=format&fit=crop&q=80&w=400';
                          }}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 text-zinc-500">
                          <Tv size={48} strokeWidth={1.5} />
                          <span className="text-[10px] mt-1 font-bold text-zinc-600">NO LOGO</span>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-xs font-bold leading-tight line-clamp-2">{channel.name}</span>
                        <span className="text-zinc-400 text-[10px] mt-1 uppercase tracking-wider truncate">{channel.group}</span>
                      </div>

                      <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-red-600 text-[10px] font-black rounded-sm text-white shadow-sm">
                        LIVE
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {visibleCount < filteredChannels.length && (
                <div ref={loadMoreRef} className="mt-12 flex justify-center">
                  <button 
                    onClick={handleLoadMore}
                    className="flex items-center gap-2 px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-full transition-all active:scale-95 group border border-white/5"
                  >
                    Load More Channels
                    <ChevronDown size={20} className="group-hover:translate-y-1 transition-transform" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-40">
                <Tv className="mx-auto text-zinc-800 mb-4" size={64} />
                <h3 className="text-xl font-bold text-zinc-400">No channels found for "{searchTerm}"</h3>
                <p className="text-zinc-600 mt-2">Try a different keyword or check your spelling.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
