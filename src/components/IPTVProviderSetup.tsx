import { useState } from 'react';
import { Plus, Server, Globe, Key, User, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IPTVProvider } from '../services/iptvService';

interface IPTVProviderSetupProps {
  onSave: (provider: IPTVProvider) => void;
  onDelete: (id: string) => void;
  providers: IPTVProvider[];
  activeProviderId: string | null;
  onSelect: (id: string) => void;
}

export const IPTVProviderSetup = ({ onSave, onDelete, providers, activeProviderId, onSelect }: IPTVProviderSetupProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [type, setType] = useState<'m3u' | 'xtream'>('xtream');
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    username: '',
    password: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newProvider: IPTVProvider = {
      id: Date.now().toString(),
      type,
      name: formData.name || (type === 'm3u' ? 'M3U Playlist' : 'Xtream Server'),
      url: formData.url.replace(/\/$/, ''), // Remove trailing slash
      username: formData.username,
      password: formData.password
    };
    onSave(newProvider);
    setIsAdding(false);
    setFormData({ name: '', url: '', username: '', password: '' });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter">My Providers</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-black text-xs hover:bg-gray-200 transition-all active:scale-95"
        >
          <Plus size={16} /> ADD PROVIDER
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map(provider => (
          <motion.div 
            key={provider.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative p-6 rounded-2xl border transition-all cursor-pointer ${
              activeProviderId === provider.id 
                ? 'bg-zinc-900 border-netflix-red shadow-[0_0_20px_rgba(229,9,20,0.15)]' 
                : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
            }`}
            onClick={() => onSelect(provider.id)}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-xl ${provider.type === 'xtream' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                {provider.type === 'xtream' ? <Server size={24} /> : <Globe size={24} />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate uppercase tracking-tight">{provider.name}</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{provider.type}</p>
              </div>
              {activeProviderId === provider.id && (
                <CheckCircle2 size={20} className="text-netflix-red shrink-0" />
              )}
            </div>

            <div className="space-y-1 mb-6">
              <p className="text-[10px] text-zinc-600 truncate font-mono">{provider.url}</p>
              {provider.username && (
                <p className="text-[10px] text-zinc-600 font-mono">User: {provider.username}</p>
              )}
            </div>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(provider.id);
              }}
              className="absolute top-4 right-4 p-2 text-zinc-700 hover:text-red-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>

            <div className={`text-[10px] font-black italic uppercase px-3 py-1 rounded inline-block ${
               activeProviderId === provider.id ? 'bg-netflix-red text-white' : 'bg-zinc-800 text-zinc-500'
            }`}>
              {activeProviderId === provider.id ? 'Active' : 'Select'}
            </div>
          </motion.div>
        ))}

        {providers.length === 0 && !isAdding && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-800 rounded-3xl">
            <AlertCircle size={48} className="mx-auto mb-4 text-zinc-800" />
            <h3 className="text-xl font-bold text-zinc-600 italic uppercase">No providers found</h3>
            <p className="text-zinc-500 text-sm mt-2">Connect an M3U or Xtream Codes server to start streaming.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl w-full max-w-lg shadow-2xl"
            >
              <h3 className="text-2xl font-black italic uppercase italic mb-8">Add New Provider</h3>
              
              <div className="flex gap-2 p-1 bg-zinc-900 rounded-xl mb-8">
                <button 
                  onClick={() => setType('xtream')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${type === 'xtream' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
                >
                  Xtream Codes
                </button>
                <button 
                  onClick={() => setType('m3u')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${type === 'm3u' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
                >
                  M3U Playlist
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Display Name</label>
                  <div className="relative">
                    <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. My Premium IPTV"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-netflix-red transition-all"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Server URL (Host)</label>
                  <div className="relative">
                    <Server className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                    <input 
                      required
                      type="url" 
                      placeholder="http://server.com:8080"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-netflix-red transition-all"
                      value={formData.url}
                      onChange={e => setFormData({...formData, url: e.target.value})}
                    />
                  </div>
                </div>

                {type === 'xtream' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Username</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                        <input 
                          required
                          type="text" 
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-netflix-red transition-all"
                          value={formData.username}
                          onChange={e => setFormData({...formData, username: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Password</label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                        <input 
                          required
                          type="password" 
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-netflix-red transition-all"
                          value={formData.password}
                          onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-4 rounded-xl font-black uppercase text-xs text-zinc-500 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 rounded-xl bg-netflix-red text-white font-black uppercase text-xs hover:bg-red-700 transition-all shadow-[0_4px_20px_rgba(229,9,20,0.3)] active:scale-95"
                  >
                    Save Provider
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
