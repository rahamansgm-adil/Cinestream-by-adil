import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { parse } from 'iptv-playlist-parser';
import { Search, Tv, Play, Loader2, SignalHigh, Globe2, Activity, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface IPTVViewProps {
  onPlay: (streamUrl: string, title: string, logo: string) => void;
  searchQuery?: string;
}

interface Channel {
  name: string;
  url: string;
  logo: string;
  category: string;
  group: string;
}

export const IPTVView = ({ onPlay, searchQuery: globalSearchQuery }: IPTVViewProps) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentUrl, setCurrentUrl] = useState('https://iptv-org.github.io/iptv/index.m3u');
  const [history, setHistory] = useState<string[]>([]);

  const activeSearch = globalSearchQuery || localSearchQuery;

  const fetchPlaylist = async (url: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(url);
      const playlist = parse(response.data);
      
      const mappedChannels: Channel[] = playlist.items.map(item => ({
        name: item.name || 'Unknown Channel',
        url: item.url,
        logo: item.tvg.logo || '',
        category: item.group.title || 'General',
        group: item.group.title || 'General'
      }));

      setChannels(mappedChannels);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching IPTV playlist:', err);
      setError('Connection failed. IPTV source might be temporarily unavailable or blocked by CORS.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylist(currentUrl);
  }, [currentUrl]);

  const handleItemClick = (item: Channel) => {
    const url = item.url.toLowerCase();
    const isPlaylist = url.endsWith('.m3u') || url.includes('/countries/') || url.includes('/categories/');
    
    if (isPlaylist) {
      setHistory(prev => [...prev, currentUrl]);
      setCurrentUrl(item.url);
    } else {
      onPlay(item.url, item.name, item.logo || 'https://via.placeholder.com/300x169/141414/ffffff?text=' + encodeURIComponent(item.name));
    }
  };

  const goBack = () => {
    const prevUrl = history[history.length - 1];
    if (prevUrl) {
      setHistory(prev => prev.slice(0, -1));
      setCurrentUrl(prevUrl);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(channels.map(c => c.category));
    return ['All', ...Array.from(cats)].filter(c => c && c !== 'undefined').sort();
  }, [channels]);

  const filteredChannels = useMemo(() => {
    return channels.filter(channel => {
      const nameMatch = channel.name.toLowerCase().includes(activeSearch.toLowerCase());
      const categoryMatch = selectedCategory === 'All' || channel.category === selectedCategory;
      return nameMatch && categoryMatch;
    });
  }, [channels, activeSearch, selectedCategory]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-white">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-netflix-red animate-spin" />
          <Tv className="absolute inset-0 m-auto w-6 h-6 text-white opacity-50" />
        </div>
        <h2 className="mt-6 text-xl font-bold tracking-tight uppercase italic">Syncing Streams</h2>
        <p className="text-gray-500 mt-2 text-sm animate-pulse">Establishing connection to IPTV network...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-white px-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 max-w-lg text-center shadow-2xl">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <SignalHigh className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-black mb-3 italic">CONNECTION ERROR</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Could not fetch the IPTV playlist. This often happens because the external source blocks requests from other websites.
          </p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => fetchPlaylist(currentUrl)}
              className="px-8 py-3 bg-white text-black hover:bg-gray-200 rounded font-black transition-all"
            >
              RETRY
            </button>
            {history.length > 0 && (
              <button 
                onClick={goBack}
                className="px-8 py-3 bg-zinc-800 text-white hover:bg-zinc-700 rounded font-black transition-all"
              >
                GO BACK
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 max-w-[1700px] mx-auto">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {history.length > 0 ? (
              <button onClick={goBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors uppercase font-bold text-xs tracking-widest">
                <ArrowLeft size={16} /> Back to global
              </button>
            ) : (
              <>
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                </span>
                <span className="text-netflix-red font-black tracking-widest text-xs uppercase">Global Broadcast</span>
              </>
            )}
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none italic uppercase">
            LIVE <span className="text-netflix-red">TV</span>
          </h1>
          <div className="flex items-center gap-6 text-gray-400 text-sm font-medium pt-2">
            <div className="flex items-center gap-2">
              <Globe2 size={16} className="text-netflix-red" />
              <span>{channels.length.toLocaleString()} Items</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="relative group w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-netflix-red transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Filter streams..."
              className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-lg pl-12 pr-4 py-3.5 text-sm outline-none focus:border-netflix-red transition-all w-full font-medium"
              value={activeSearch}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
            />
          </div>

          <div className="relative w-full sm:w-64">
            <select 
              className="appearance-none bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-lg px-6 py-3.5 text-sm outline-none focus:border-netflix-red transition-all w-full font-bold cursor-pointer"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="space-y-12">
        <div className="flex items-center gap-4 border-b border-zinc-800 pb-4">
          <h2 className="text-lg font-bold tracking-tight uppercase italic">
            {history.length > 0 ? 'STREAMS' : 'CHANNELS & REGIONS'}
          </h2>
          <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-gray-400 uppercase font-bold tracking-tighter">
            {filteredChannels.length} results
          </span>
        </div>

        {filteredChannels.length === 0 ? (
          <div className="py-40 text-center">
            <Search className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 uppercase italic text-zinc-500">No results found</h3>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
            <AnimatePresence mode="popLayout">
              {filteredChannels.slice(0, 150).map((item, index) => {
                const isPlaylist = item.url.toLowerCase().endsWith('.m3u') || item.url.includes('/countries/') || item.url.includes('/categories/');
                return (
                  <motion.div
                    key={`${item.url}-${index}`}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: (index % 30) * 0.01 }}
                    className="group relative cursor-pointer"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className={cn(
                      "relative aspect-video rounded-md overflow-hidden bg-zinc-900 border transition-all duration-300 mb-3 flex items-center justify-center",
                      isPlaylist ? "border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)] group-hover:border-blue-400" : "border-zinc-800 group-hover:border-white shadow-lg"
                    )}>
                      {item.logo ? (
                        <img 
                          src={item.logo} 
                          alt={item.name}
                          className="w-full h-full object-contain p-6 group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x169/141414/ffffff?text=' + encodeURIComponent(item.name); }}
                        />
                      ) : (
                        <div className="text-center p-4">
                          <Tv className={cn("mx-auto mb-2 opacity-20", isPlaylist ? "text-blue-500" : "text-white")} size={32} />
                          <span className="text-[10px] font-black leading-tight tracking-tighter uppercase line-clamp-2">
                            {item.name}
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <div className={cn(
                          "w-12 h-12 backdrop-blur-md rounded-full flex items-center justify-center border transform scale-75 group-hover:scale-100 transition-transform",
                          isPlaylist ? "bg-blue-500/20 border-blue-400/30" : "bg-white/10 border-white/20"
                        )}>
                          {isPlaylist ? <Activity size={24} className="text-blue-400" /> : <Play fill="white" size={24} className="ml-1" />}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">{isPlaylist ? 'Browse' : 'Watch'}</span>
                      </div>

                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded font-black border",
                          isPlaylist ? "bg-blue-600 border-blue-400" : "bg-red-600 border-red-400"
                        )}>
                          {isPlaylist ? 'LIST' : 'LIVE'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-bold text-sm tracking-tight truncate group-hover:text-netflix-red transition-colors uppercase">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest truncate">
                          {item.category || (isPlaylist ? 'Collection' : 'Stream')}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
