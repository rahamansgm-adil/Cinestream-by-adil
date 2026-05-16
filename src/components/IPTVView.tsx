import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { parse } from 'iptv-playlist-parser';
import { Search, Tv, Play, Loader2, SignalHigh, Globe2, Activity } from 'lucide-react';
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
  language?: string;
}

export const IPTVView = ({ onPlay, searchQuery: globalSearchQuery }: IPTVViewProps) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const activeSearch = globalSearchQuery || localSearchQuery;

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        setLoading(true);
        // Using a slightly smaller/curated list might be faster, but let's stick to the requested one
        const response = await axios.get('https://iptv-org.github.io/iptv/index.m3u');
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
        setError('Connection failed. IPTV source might be temporarily unavailable.');
        setLoading(false);
      }
    };

    fetchPlaylist();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(channels.map(c => c.category));
    return ['All', ...Array.from(cats)].filter(c => c && c !== 'undefined').sort();
  }, [channels]);

  const filteredChannels = useMemo(() => {
    return channels.filter(channel => {
      const matchesSearch = channel.name.toLowerCase().includes(activeSearch.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || channel.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [channels, activeSearch, selectedCategory]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-white">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-netflix-red animate-spin" />
          <Tv className="absolute inset-0 m-auto w-6 h-6 text-white opacity-50" />
        </div>
        <h2 className="mt-6 text-xl font-bold tracking-tight">Syncing Global Streams</h2>
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
          <h2 className="text-2xl font-black mb-3">CONNECTION REFUSED</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            The IPTV playlist at <span className="text-zinc-300 font-mono text-xs block mt-1">iptv-org.github.io</span> could not be reached. This may be due to CORS restrictions or source downtime.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-white text-black hover:bg-gray-200 rounded font-black transition-all active:scale-95"
            >
              RETRY CONNECTION
            </button>
            <button 
              onClick={() => window.location.href = '/'}
              className="px-8 py-3 bg-zinc-800 text-white hover:bg-zinc-700 rounded font-black transition-all active:scale-95"
            >
              BACK HOME
            </button>
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
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 shadow-[0_0_10px_rgba(229,9,20,0.8)]"></span>
            </span>
            <span className="text-netflix-red font-black tracking-widest text-xs uppercase">Global Broadcast</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none italic uppercase">
            LIVE <span className="text-netflix-red">TV</span>
          </h1>
          <div className="flex items-center gap-6 text-gray-400 text-sm font-medium pt-2">
            <div className="flex items-center gap-2">
              <Globe2 size={16} className="text-netflix-red" />
              <span>{channels.length.toLocaleString()} Channels</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-green-500" />
              <span>Real-time Streams</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="relative group w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-netflix-red transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Search local or global channels..."
              className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-lg pl-12 pr-4 py-3.5 text-sm outline-none focus:border-netflix-red focus:ring-1 focus:ring-netflix-red transition-all w-full font-medium"
              value={activeSearch}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
            />
          </div>

          <div className="relative w-full sm:w-64">
            <select 
              className="appearance-none bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-lg px-6 py-3.5 text-sm outline-none focus:border-netflix-red transition-all w-full font-bold cursor-pointer pr-10"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
              <Tv size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="space-y-12">
        <div className="flex items-center gap-4 border-b border-zinc-800 pb-4">
          <h2 className="text-lg font-bold tracking-tight">IPTV CHANNELS</h2>
          <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-gray-400 uppercase font-bold tracking-tighter">
            {filteredChannels.length} results
          </span>
        </div>

        {filteredChannels.length === 0 ? (
          <div className="py-40 text-center">
            <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-800">
              <Search className="w-10 h-10 text-zinc-700" />
            </div>
            <h3 className="text-xl font-bold mb-2">No channels matched your request</h3>
            <p className="text-zinc-500 max-w-sm mx-auto">Try adjusting your filters or search terms for better results.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
            <AnimatePresence mode="popLayout">
              {filteredChannels.slice(0, 150).map((channel, index) => (
                <motion.div
                  key={`${channel.url}-${index}`}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: (index % 30) * 0.02 }}
                  className="group relative"
                  onClick={() => onPlay(channel.url, channel.name, channel.logo || 'https://via.placeholder.com/300x169/141414/ffffff?text=' + encodeURIComponent(channel.name))}
                >
                  <div className="relative aspect-video rounded-md overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-white shadow-lg transition-all duration-300 cursor-pointer mb-3">
                    {/* Channel Logo / Banner */}
                    {channel.logo ? (
                      <img 
                        src={channel.logo} 
                        alt={channel.name}
                        className="w-full h-full object-contain p-6 group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://via.placeholder.com/300x169/141414/ffffff?text=' + encodeURIComponent(channel.name);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 p-4">
                        <span className="text-xl font-black text-center leading-tight tracking-tighter uppercase line-clamp-2">
                          {channel.name}
                        </span>
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                      <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                        <Play fill="white" size={28} className="ml-1" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest">Watch Now</span>
                    </div>

                    {/* Tags */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-black border border-red-400">
                        HD
                      </span>
                    </div>
                  </div>

                  {/* Channel Info */}
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm tracking-tight truncate group-hover:text-netflix-red transition-colors uppercase">
                      {channel.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest truncate max-w-[70%]">
                        {channel.category}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-zinc-700 shrink-0" />
                      <span className="text-[10px] text-zinc-600 font-bold uppercase truncate">
                        Live Stream
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {filteredChannels.length > 150 && (
        <div className="mt-24 py-12 border-t border-zinc-900 text-center">
          <p className="text-zinc-600 text-sm font-medium">
            Showing top 150 channels. Refine your search to find more specific content.
          </p>
        </div>
      )}
    </div>
  );
};

