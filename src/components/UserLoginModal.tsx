import React from 'react';
import { motion } from 'motion/react';
import { X, Github, User, Chrome } from 'lucide-react';
import { signInWithGoogle, signInWithGithub, signInGuest } from '../lib/firebase';

interface UserLoginModalProps {
  onClose: () => void;
}

export const UserLoginModal: React.FC<UserLoginModalProps> = ({ onClose }) => {
  const handleLogin = async (provider: 'google' | 'github' | 'guest') => {
    try {
      if (provider === 'google') await signInWithGoogle();
      if (provider === 'github') await signInWithGithub();
      if (provider === 'guest') await signInGuest();
      onClose();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl p-8 overflow-hidden"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-white tracking-tighter mb-2 italic uppercase">
            Sign In to CineStream
          </h2>
          <p className="text-gray-400 text-sm">Choose your preferred login method</p>
        </div>

        <div className="flex flex-col gap-4">
          <button 
            onClick={() => handleLogin('google')}
            className="flex items-center justify-center gap-3 w-full py-3 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors"
          >
            <Chrome size={20} />
            Continue with Google
          </button>

          <button 
            onClick={() => handleLogin('github')}
            className="flex items-center justify-center gap-3 w-full py-3 bg-zinc-800 text-white font-bold rounded hover:bg-zinc-700 transition-colors border border-white/10"
          >
            <Github size={20} />
            Continue with GitHub
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900 px-2 text-gray-500 font-bold tracking-widest leading-none">Or</span>
            </div>
          </div>

          <button 
            onClick={() => handleLogin('guest')}
            className="flex items-center justify-center gap-3 w-full py-3 bg-transparent text-gray-400 font-bold rounded hover:text-white transition-colors border border-dashed border-zinc-800 hover:border-zinc-600 italic tracking-wider"
          >
            <User size={20} />
            Browse as Guest (Anonymous)
          </button>
        </div>

        <p className="mt-8 text-[10px] text-center text-gray-600 uppercase tracking-widest font-black leading-relaxed">
          By signing in, you agree to our <br/>
          <span className="text-gray-500 cursor-pointer hover:underline">Terms of Service</span> & <span className="text-gray-500 cursor-pointer hover:underline">Privacy Policy</span>
        </p>

        {/* Decorative elements */}
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-netflix-red/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
      </motion.div>
    </div>
  );
};
