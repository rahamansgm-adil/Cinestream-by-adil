import { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, AlertTriangle } from 'lucide-react';
import 'video.js/dist/video-js.css';

interface VideoPlayerProps {
  options: any;
  onReady?: (player: Player) => void;
}

export const VideoPlayer = ({ options, onReady }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Handle Google Drive proxy conversion
    let modifiedOptions = { ...options };
    const isDrive = modifiedOptions.sources?.some((s: any) => s.src.includes('drive.google.com'));
    setError(null);

    if (isDrive && modifiedOptions.sources) {
      modifiedOptions.sources = modifiedOptions.sources.map((s: any) => {
        if (s.src.includes('drive.google.com')) {
          const match = s.src.match(/(?:id=|d\/|file\/d\/)([\w-]{25,})/);
          const driveId = match ? match[1] : '';
          
          return {
            ...s,
            src: `/api/stream?id=${driveId}`,
            type: 'video/mp4'
          };
        }
        return s;
      });
    }

    // Make sure Video.js player is only initialized once
    if (!playerRef.current) {
      const videoElement = document.createElement("video-js");
      videoElement.classList.add('vjs-big-play-centered');
      videoElement.classList.add('vjs-theme-city');
      
      if (videoRef.current) {
        videoRef.current.appendChild(videoElement);
      }

      const player = playerRef.current = videojs(videoElement, modifiedOptions, () => {
        player.on('error', () => {
          const vjsError = player.error();
          console.error('Video.js Error:', vjsError);
          setError("The video could not be loaded. This might be due to restricted permissions on Google Drive or an incompatible file format. Please check if the file is shared as 'Anyone with the link can view'.");
        });
        onReady && onReady(player);
      });
    } else {
      const player = playerRef.current;
      player.autoplay(modifiedOptions.autoplay);
      if (modifiedOptions.sources) {
        player.src(modifiedOptions.sources);
      }
    }
  }, [options, videoRef]);

  // Dispose the player on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        const player = playerRef.current;
        playerRef.current = null;
        if (!player.isDisposed()) {
          try {
            player.dispose();
          } catch (e) {
            console.error("Video.js disposal error:", e);
          }
        }
      }
    };
  }, []);

  return (
    <div data-vjs-player className="relative w-full h-full bg-black overflow-hidden">
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-8 text-center"
          >
            <AlertTriangle className="text-netflix-red mb-4" size={48} />
            <h2 className="text-xl font-bold mb-4">Playback Error</h2>
            <p className="text-gray-300 max-w-md mx-auto leading-relaxed underline decoration-netflix-red/30 underline-offset-4">
              {error}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-8 px-6 py-2 bg-white text-black font-bold uppercase tracking-wider rounded-sm hover:bg-gray-200 transition-colors"
            >
              Reload Application
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={videoRef} className="w-full h-full" />
    </div>
  );
}

export default VideoPlayer;
