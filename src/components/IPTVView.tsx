import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { parse } from 'iptv-playlist-parser';
import { Search, Tv, Play, Loader2, SignalHigh, Globe2, Activity, ArrowLeft, Settings, Database, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { IPTVProvider, iptvService, XtreamCategory, XtreamStream } from '../services/iptvService';
import { IPTVProviderSetup } from './IPTVProviderSetup';

interface IPTVViewProps {
  onPlay: (streamUrl: string, title: string, logo: string) => void;
  searchQuery?: string;
}

export const IPTVView = ({ onPlay, searchQuery: globalSearchQuery }: IPTVViewProps) => {
  const [providers, setProviders] = useState<IPTVProvider[]>(() => {
    const saved = localStorage.getItem('iptv_providers');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeProviderId, setActiveProviderId] = useState<string | null>(() => {
    return localStorage.getItem('active_iptv_provider');
  });
  const [view, setView] = useState<'browse' | 'settings'>('browse');
  
  // Data State
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Browsing State
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [history, setHistory] = useState<any[]>([]);
  const [contentType, setContentType] = useState<'live' | 'vod' | 'series'>('live');
  const [displayLimit, setDisplayLimit] = useState(60);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(localSearchQuery || globalSearchQuery || '');
      setDisplayLimit(60); // Reset limit on search
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearchQuery, globalSearchQuery]);

  const activeProvider = useMemo(() => 
    providers.find(p => p.id === activeProviderId), 
    [providers, activeProviderId]
  );

  const activeSearch = globalSearchQuery || debouncedSearch;

  useEffect(() => {
    localStorage.setItem('iptv_providers', JSON.stringify(providers));
  }, [providers]);

  useEffect(() => {
    if (activeProviderId) {
      localStorage.setItem('active_iptv_provider', activeProviderId);
    }
  }, [activeProviderId]);

  const fetchData = async () => {
    if (!activeProvider) {
      setItems([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      iptvService.setProvider(activeProvider);

      if (activeProvider.type === 'm3u') {
        const response = await axios.get(activeProvider.url);
        const playlist = parse(response.data);
        const mapped = playlist.items.map(item => ({
          name: item.name || 'Unknown Channel',
          url: item.url,
          logo: item.tvg.logo || '',
          category: item.group.title || 'General',
          type: 'stream'
        }));
        setItems(mapped);
      } else {
        // Xtream Logic - Start with Categories
        const categories = await iptvService.fetchXtream(
          contentType === 'live' ? 'get_live_categories' : (contentType === 'vod' ? 'get_vod_categories' : 'get_series_categories')
        );
        setItems(categories.map((c: XtreamCategory) => ({
          ...c,
          name: c.category_name,
          id: c.category_id,
          type: 'category'
        })));
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching IPTV data:', err);
      setError('Connection failed. Verify your provider details or network connection.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'browse') {
      fetchData();
      setHistory([]);
    }
  }, [activeProviderId, view, contentType]);

  const handleProviderSave = (provider: IPTVProvider) => {
    setProviders(prev => [...prev, provider]);
    if (!activeProviderId) setActiveProviderId(provider.id);
  };

  const handleProviderDelete = (id: string) => {
    setProviders(prev => prev.filter(p => p.id !== id));
    if (activeProviderId === id) setActiveProviderId(null);
  };

  const handleItemClick = async (item: any) => {
    if (item.type === 'stream') {
      onPlay(item.url, item.name, item.logo);
      return;
    }

    if (item.type === 'category') {
      try {
        setLoading(true);
        const streams = await iptvService.fetchXtream(
            contentType === 'live' ? 'get_live_streams' : (contentType === 'vod' ? 'get_vod_streams' : 'get_series'),
            item.id
        );
        
        const mapped = streams.map((s: any) => ({
          name: s.name,
          url: activeProvider?.type === 'xtream' 
            ? iptvService.generateXtreamUrl(s.stream_id || s.series_id, contentType, s.container_extension) 
            : s.url,
          logo: s.stream_icon || s.cover || '',
          category: item.name,
          type: 'stream',
          stream_id: s.stream_id || s.series_id
        }));

        setHistory(prev => [...prev, items]);
        setItems(mapped);
        setLoading(false);
      } catch (err) {
        setError('Failed to load category content.');
        setLoading(false);
      }
    }
  };

  const goBack = () => {
    if (history.length > 0) {
      const prevItems = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setItems(prevItems);
    }
  };

  const categories = useMemo(() => {
    if (activeProvider?.type === 'xtream' && items.some(i => i.type === 'category')) return ['All'];
    const cats = new Set(items.map(c => c.category));
    return ['All', ...Array.from(cats)].filter(c => c && c !== 'undefined').sort();
  }, [items, activeProvider]);

  const filteredItems = useMemo(() => {
    if (!items.length) return [];
    
    // Fast path for no search/filter
    if (!activeSearch && selectedCategory === 'All') return items;

    const query = activeSearch.toLowerCase();
    return items.filter(item => {
      const nameMatch = !query || item.name.toLowerCase().includes(query);
      const categoryMatch = selectedCategory === 'All' || item.category === selectedCategory;
      return nameMatch && categoryMatch;
    });
  }, [items, activeSearch, selectedCategory]);

  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, displayLimit);
  }, [filteredItems, displayLimit]);

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 max-w-[1700px] mx-auto min-h-screen">
      {/* Sub Navbar */}
      <div className="flex items-center gap-6 mb-12 border-b border-zinc-800 pb-4 overflow-x-auto scrollbar-hide">
        <button 
          onClick={() => setView('browse')}
          className={cn(
            "flex items-center gap-2 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
            view === 'browse' ? "bg-white text-black" : "bg-zinc-900 text-zinc-500 hover:text-white"
          )}
        >
          <Tv size={14} /> Browse
        </button>
        <button 
          onClick={() => setView('settings')}
          className={cn(
            "flex items-center gap-2 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
            view === 'settings' ? "bg-white text-black" : "bg-zinc-900 text-zinc-500 hover:text-white"
          )}
        >
          <Database size={14} /> Providers
        </button>

        {view === 'browse' && activeProvider?.type === 'xtream' && (
          <div className="h-6 w-px bg-zinc-800 hidden sm:block" />
        )}

        {view === 'browse' && activeProvider?.type === 'xtream' && (
          <div className="flex items-center gap-4">
             {['live', 'vod', 'series'].map((t) => (
                <button
                  key={t}
                  onClick={() => { setContentType(t as any); setHistory([]); }}
                  className={cn(
                    "text-[10px] font-black uppercase tracking-tighter transition-all px-4 py-1.5 rounded-md",
                    contentType === t ? "text-netflix-red bg-red-500/10" : "text-zinc-600 hover:text-zinc-300"
                  )}
                >
                  {t}
                </button>
             ))}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {view === 'settings' ? (
          <motion.div
            key="settings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <IPTVProviderSetup 
              providers={providers}
              activeProviderId={activeProviderId}
              onSave={handleProviderSave}
              onDelete={handleProviderDelete}
              onSelect={(id) => { setActiveProviderId(id); setView('browse'); }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="browse"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {!activeProvider ? (
               <div className="py-40 text-center">
                 <Database size={64} className="mx-auto mb-6 text-zinc-800" />
                 <h2 className="text-3xl font-black italic uppercase italic mb-4">No Active Provider</h2>
                 <p className="text-zinc-500 max-w-sm mx-auto mb-10">Connect an IPTV or Xtream Codes service in the providers tab to watch live content.</p>
                 <button 
                  onClick={() => setView('settings')}
                  className="px-10 py-4 bg-white text-black font-black uppercase tracking-widest rounded-full hover:bg-zinc-200 transition-all"
                >
                  Setup Provider
                </button>
               </div>
            ) : (
              <>
                {/* Search & Filters */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      {history.length > 0 ? (
                        <button onClick={goBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors uppercase font-bold text-xs tracking-widest">
                          <ArrowLeft size={16} /> Previous
                        </button>
                      ) : (
                        <>
                          <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                          </span>
                          <span className="text-netflix-red font-black tracking-widest text-xs uppercase">{activeProvider.name}</span>
                        </>
                      )}
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none italic uppercase">
                      STREAM <span className="text-netflix-red">LIVE</span>
                    </h1>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    <div className="relative group w-full sm:w-80">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-netflix-red transition-colors" size={18} />
                      <input 
                        type="text"
                        placeholder="Filter content..."
                        className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-lg pl-12 pr-4 py-3.5 text-sm outline-none focus:border-netflix-red transition-all w-full font-medium"
                        value={activeSearch}
                        onChange={(e) => setLocalSearchQuery(e.target.value)}
                      />
                    </div>

                    {categories.length > 1 && (
                      <div className="relative w-full sm:w-64">
                        <select 
                          className="appearance-none bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-lg px-6 py-3.5 text-sm outline-none focus:border-netflix-red transition-all w-full font-bold cursor-pointer"
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                          <option value="All">All Groups</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" size={14} />
                      </div>
                    )}
                  </div>
                </div>

                {loading ? (
                  <div className="py-40 text-center">
                    <Loader2 className="w-12 h-12 text-netflix-red animate-spin mx-auto mb-6" />
                    <p className="text-zinc-500 font-black uppercase tracking-widest text-xs animate-pulse">Communicating with server...</p>
                  </div>
                ) : error ? (
                  <div className="py-20 text-center bg-red-500/5 border border-red-500/20 rounded-3xl">
                    <SignalHigh size={48} className="mx-auto mb-4 text-red-500" />
                    <h3 className="text-xl font-bold uppercase italic">{error}</h3>
                    <button onClick={fetchData} className="mt-6 px-8 py-2 bg-white text-black rounded-lg font-black uppercase text-xs">Retry</button>
                  </div>
                ) : (
                  <div className="space-y-12">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
                      <AnimatePresence mode="popLayout" initial={false}>
                        {displayedItems.map((item, index) => {
                          const isBucket = item.type === 'category';
                          return (
                            <motion.div
                              key={`${item.id || item.url}-${index}`}
                              layout={false} // Disable layout animation for better performance
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="group relative cursor-pointer"
                              onClick={() => handleItemClick(item)}
                            >
                              <div className={cn(
                                "relative aspect-video rounded-md overflow-hidden bg-zinc-900 border transition-all duration-300 mb-3 flex items-center justify-center",
                                isBucket ? "border-blue-500/30 bg-blue-500/5 group-hover:border-blue-400" : "border-zinc-800 group-hover:border-white shadow-lg"
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
                                    <Tv className={cn("mx-auto mb-2 opacity-20", isBucket ? "text-blue-500" : "text-white")} size={32} />
                                    <span className="text-[10px] font-black leading-tight tracking-tighter uppercase line-clamp-2">
                                      {item.name}
                                    </span>
                                  </div>
                                )}
  
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                  <div className={cn(
                                    "w-12 h-12 backdrop-blur-md rounded-full flex items-center justify-center border transform scale-75 group-hover:scale-100 transition-transform",
                                    isBucket ? "bg-blue-500/20 border-blue-400/30" : "bg-white/10 border-white/20"
                                  )}>
                                    {isBucket ? <Activity size={24} className="text-blue-400" /> : <Play fill="white" size={24} className="ml-1" />}
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-widest">{isBucket ? 'Open' : 'Watch'}</span>
                                </div>
  
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className={cn(
                                    "text-[9px] px-1.5 py-0.5 rounded font-black border",
                                    isBucket ? "bg-blue-600 border-blue-400" : "bg-red-600 border-red-400"
                                  )}>
                                    {isBucket ? 'GROUP' : 'LIVE'}
                                  </span>
                                </div>
                              </div>
  
                              <div className="space-y-1">
                                <h3 className="font-bold text-sm tracking-tight truncate group-hover:text-netflix-red transition-colors uppercase">
                                  {item.name}
                                </h3>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest truncate">
                                    {item.category || (isBucket ? 'Collection' : 'Stream')}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>

                    {filteredItems.length > displayLimit && (
                      <div className="flex justify-center pt-8">
                        <button 
                          onClick={() => setDisplayLimit(prev => prev + 60)}
                          className="flex items-center gap-2 px-12 py-4 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-black uppercase tracking-widest hover:border-white transition-all active:scale-95"
                        >
                          <Loader2 size={16} className="text-netflix-red" /> LOAD MORE CONTENT
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
