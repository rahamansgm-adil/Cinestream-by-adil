import React, { useEffect, useRef, useState, useCallback } from 'react';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2, 
  AlertTriangle, 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Settings,
  ChevronLeft,
  Captions
} from 'lucide-react';
import 'video.js/dist/video-js.css';

interface VideoPlayerProps {
  options: any;
  onReady?: (player: Player) => void;
  onBack?: () => void;
}

export const VideoPlayer = ({ options, onReady, onBack }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [subtitles, setSubtitles] = useState<any[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<string>('off');

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSpeedMenu(false);
        setShowSubtitleMenu(false);
      }
    }, 3000);
  };

  useEffect(() => {
    // Handle Google Drive proxy conversion
    let modifiedOptions = { 
      ...options,
      controls: false, // We'll use our own
      controlBar: false,
      userActions: {
        doubleClick: false,
        hotkeys: true
      },
      fluid: true,
      responsive: true
    };
    
    // Convert Drive Source URLs
    if (modifiedOptions.sources) {
      modifiedOptions.sources = modifiedOptions.sources.map((s: any) => {
        if (s.src && s.src.includes('drive.google.com')) {
          const match = s.src.match(/(?:id=|d\/|file\/d\/)([\w-]{25,})/);
          const driveId = match ? match[1] : '';
          return { ...s, src: `/api/stream?id=${driveId}`, type: 'video/mp4' };
        }
        return s;
      });
    }

    // Convert Drive Track URLs
    if (modifiedOptions.tracks) {
      modifiedOptions.tracks = modifiedOptions.tracks.map((t: any) => {
        if (t.src && t.src.includes('drive.google.com')) {
          const match = t.src.match(/(?:id=|d\/|file\/d\/)([\w-]{25,})/);
          const driveId = match ? match[1] : '';
          return { ...t, src: `/api/stream?id=${driveId}` };
        }
        return t;
      });
    }

    setError(null);

    if (!playerRef.current) {
      const videoElement = document.createElement("video-js");
      videoElement.classList.add('vjs-big-play-centered');
      videoElement.classList.add('vjs-theme-netflix'); // Custom theme class
      
      if (videoRef.current) {
        videoRef.current.appendChild(videoElement);
      }

      const player = playerRef.current = videojs(videoElement, modifiedOptions, () => {
        // Events
        player.on('play', () => setIsPlaying(true));
        player.on('pause', () => setIsPlaying(false));
        player.on('timeupdate', () => setCurrentTime(player.currentTime() || 0));
        player.on('durationchange', () => setDuration(player.duration() || 0));
        player.on('volumechange', () => {
          setVolume(player.volume() || 0);
          setIsMuted(player.muted() || false);
        });
        player.on('ratechange', () => setPlaybackSpeed(player.playbackRate() || 1));
        player.on('waiting', () => setIsBuffering(true));
        player.on('playing', () => setIsBuffering(false));
        player.on('fullscreenchange', () => setIsFullscreen(player.isFullscreen() || false));

        // Initial subtitle state
        const tracks = player.textTracks();
        for (let i = 0; i < tracks.length; i++) {
          if (tracks[i].mode === 'showing') {
            setActiveSubtitle(tracks[i].label);
          }
        }

        player.on('error', () => {
          const vjsError = player.error();
          console.error('Video.js Error:', vjsError);
          setError("The video could not be loaded. This might be due to restricted permissions on Google Drive or an incompatible file format.");
        });

        onReady && onReady(player);
      });
    } else {
      const player = playerRef.current;
      if (modifiedOptions.sources) {
        player.src(modifiedOptions.sources);
      }
    }
  }, [options, onReady]);

  // Sync subtitles state with options
  useEffect(() => {
    if (options?.tracks) {
      setSubtitles(options.tracks);
    } else {
      setSubtitles([]);
    }
  }, [options?.tracks]);

  // Handle disposal
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
  };

  const skip = (seconds: number) => {
    if (!playerRef.current) return;
    playerRef.current.currentTime(playerRef.current.currentTime()! + seconds);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!playerRef.current) return;
    const time = parseFloat(e.target.value);
    playerRef.current.currentTime(time);
    setCurrentTime(time);
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    playerRef.current.muted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!playerRef.current) return;
    const val = parseFloat(e.target.value);
    playerRef.current.volume(val);
    if (val > 0 && isMuted) {
      playerRef.current.muted(false);
    } else if (val === 0 && !isMuted) {
      playerRef.current.muted(true);
    }
  };

  const changeSpeed = (speed: number) => {
    if (!playerRef.current) return;
    playerRef.current.playbackRate(speed);
    setShowSpeedMenu(false);
  };

  const changeSubtitle = (label: string) => {
    if (!playerRef.current) return;
    const tracks = playerRef.current.textTracks();
    for (let i = 0; i < tracks.length; i++) {
        if (label === 'off') {
            tracks[i].mode = 'disabled';
        } else {
            tracks[i].mode = tracks[i].label === label ? 'showing' : 'disabled';
        }
    }
    setActiveSubtitle(label);
    setShowSubtitleMenu(false);
  };

  const toggleFullscreen = () => {
    if (!playerRef.current) return;
    if (playerRef.current.isFullscreen()) {
      playerRef.current.exitFullscreen();
    } else {
      playerRef.current.requestFullscreen();
    }
  };

  return (
    <div 
      ref={containerRef}
      className="group relative w-full h-full bg-black overflow-hidden select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <div ref={videoRef} className="w-full h-full" />

      {/* Custom Controls Overlay */}
      <AnimatePresence>
        {showControls && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-10 flex flex-col justify-between bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                togglePlay();
              }
            }}
          >
            {/* Top Bar */}
            <div className="p-8 flex items-center justify-between pointer-events-auto">
              {onBack && (
                <button 
                  onClick={onBack}
                  className="p-2 transition-transform hover:scale-110 flex items-center gap-2 group"
                >
                  <ChevronLeft size={32} strokeWidth={2.5} />
                  <span className="text-xl font-medium opacity-0 group-hover:opacity-100 transition-opacity">Back</span>
                </button>
              )}
              <div className="flex items-center gap-6">
                {/* Subtitle Selector */}
                {subtitles.length > 0 && (
                    <div className="relative">
                      <button 
                        onClick={() => {
                            setShowSubtitleMenu(!showSubtitleMenu);
                            setShowSpeedMenu(false);
                        }}
                        className={`p-2 hover:bg-white/20 rounded-full transition-colors ${activeSubtitle !== 'off' ? 'text-netflix-red' : 'text-white'}`}
                      >
                        <Captions size={24} />
                      </button>
                      
                      {showSubtitleMenu && (
                        <div className="absolute right-0 top-full mt-4 w-48 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl overflow-hidden py-2 z-50 pointer-events-auto">
                          <button
                            onClick={() => changeSubtitle('off')}
                            className={`w-full px-4 py-2 text-left hover:bg-white/10 transition-colors ${activeSubtitle === 'off' ? 'text-netflix-red font-bold' : ''}`}
                          >
                            Off
                          </button>
                          {subtitles.map((track) => (
                            <button
                              key={track.label}
                              onClick={() => changeSubtitle(track.label)}
                              className={`w-full px-4 py-2 text-left hover:bg-white/10 transition-colors ${activeSubtitle === track.label ? 'text-netflix-red font-bold' : ''}`}
                            >
                              {track.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                )}

                {/* Speed Selector */}
                <div className="relative">
                  <button 
                    onClick={() => {
                        setShowSpeedMenu(!showSpeedMenu);
                        setShowSubtitleMenu(false);
                    }}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors flex items-center gap-2"
                  >
                    <Settings size={24} />
                    <span className="text-sm font-bold">{playbackSpeed}x</span>
                  </button>
                  
                  {showSpeedMenu && (
                    <div className="absolute right-0 top-full mt-4 w-32 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl overflow-hidden py-2 z-50 pointer-events-auto">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                        <button
                          key={speed}
                          onClick={() => changeSpeed(speed)}
                          className={`w-full px-4 py-2 text-left hover:bg-white/10 transition-colors ${playbackSpeed === speed ? 'text-netflix-red font-bold' : ''}`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Middle clickable area for play/pause toggle */}
            <div 
              className="flex-1 pointer-events-auto cursor-pointer" 
              onClick={() => togglePlay()}
            />

            {/* Center Play/Pause Large Feed (Optional, but icons only for buffering) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {isBuffering && (
                <Loader2 className="animate-spin text-netflix-red" size={80} />
              )}
            </div>

            {/* Bottom Controls */}
            <div className="p-8 pb-10 space-y-4 pointer-events-auto">
              {/* Progress Bar Container */}
              <div className="group/progress relative h-2 w-full flex items-center">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="absolute inset-0 w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-netflix-red hover:h-2 transition-all"
                  style={{
                    background: `linear-gradient(to right, #E50914 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.3) ${(currentTime / (duration || 1)) * 100}%)`
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  {/* Play/Pause */}
                  <button onClick={togglePlay} className="transition-transform hover:scale-110">
                    {isPlaying ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" />}
                  </button>

                  {/* Skip Rewind/Forward */}
                  <button onClick={() => skip(-10)} className="group/skip flex flex-col items-center">
                    <RotateCcw size={24} className="group-hover/skip:animate-pulse" />
                    <span className="text-[10px] font-bold mt-1">10</span>
                  </button>
                  <button onClick={() => skip(10)} className="group/skip flex flex-col items-center">
                    <RotateCw size={24} className="group-hover/skip:animate-pulse" />
                    <span className="text-[10px] font-bold mt-1">10</span>
                  </button>

                  {/* Volume */}
                  <div className="flex items-center gap-3 group/volume">
                    <button onClick={toggleMute} className="transition-transform hover:scale-110">
                      {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-0 group-hover/volume:w-24 transition-all duration-300 appearance-none bg-white/30 h-1 rounded-full accent-white"
                    />
                  </div>

                  {/* Time */}
                  <div className="text-sm font-medium tracking-wider">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Fullscreen */}
                  <button onClick={toggleFullscreen} className="p-2 transition-transform hover:scale-110">
                    {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Overlay */}
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
            <div className="flex gap-4">
              <button 
                onClick={() => window.location.reload()}
                className="mt-8 px-6 py-2 bg-white text-black font-bold uppercase tracking-wider rounded-sm hover:bg-gray-200 transition-colors"
              >
                Reload
              </button>
              {onBack && (
                <button 
                  onClick={onBack}
                  className="mt-8 px-6 py-2 border border-white/30 text-white font-bold uppercase tracking-wider rounded-sm hover:bg-white/10 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default VideoPlayer;

