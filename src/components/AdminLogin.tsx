import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

interface AdminLoginProps {
  onClose: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onClose }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const success = await login(username, password);
      if (success) {
        onClose();
      } else {
        setError('Invalid admin credentials. Please check your username and password.');
      }
    } catch (err) {
      setError('A connection error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-netflix-red/10 flex items-center justify-center">
              <Lock className="text-netflix-red" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight uppercase">Admin Access</h2>
              <p className="text-xs text-gray-400 font-medium tracking-widest uppercase mt-0.5">Secure Area</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex gap-3 text-red-500 text-sm"
              >
                <AlertCircle className="shrink-0" size={18} />
                <p>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  type="text"
                  required
                  placeholder="Admin username"
                  className="w-full bg-zinc-800/50 border-2 border-transparent pl-12 pr-4 py-3 text-white outline-none focus:border-netflix-red focus:bg-zinc-800 transition-all rounded-lg"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-zinc-800/50 border-2 border-transparent pl-12 pr-4 py-3 text-white outline-none focus:border-netflix-red focus:bg-zinc-800 transition-all rounded-lg"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "w-full py-4 rounded-lg font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-3",
              isSubmitting 
                ? "bg-zinc-800 text-gray-500 cursor-not-allowed" 
                : "bg-netflix-red text-white hover:bg-[#ff0a16] shadow-lg shadow-netflix-red/20"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Authenticating...
              </>
            ) : (
              'Unlock Dashboard'
            )}
          </button>
        </form>

        <div className="p-6 bg-zinc-950/50 border-t border-white/5">
          <p className="text-[10px] text-gray-500 text-center uppercase tracking-[0.2em] font-medium">
            Authorized Personnel Only • Session encrypted with AES-256
          </p>
        </div>
      </motion.div>
    </div>
  );
};
