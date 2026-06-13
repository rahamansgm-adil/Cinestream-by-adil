import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
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

interface VideoPlayerProps {
  options: any;
  onReady?: (player: any) => void;
  onBack?: () => void;
}

export const VideoPlayer = ({ options, onReady, onBack }: VideoPlayerProps) => {
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
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
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
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

  // Sync state & configure iframe sources
  useEffect(() => {
    let firstSource = options?.sources?.[0]?.src || '';
    if (firstSource.startsWith('/')) {
      firstSource = `https://vidlink.pro${firstSource}`;
    }

    if (firstSource.includes('vidking.net') && !firstSource.includes('autoPlay=')) {
      const separator = firstSource.includes('?') ? '&' : '?';
      firstSource = `${firstSource}${separator}autoPlay=true&nextEpisode=true&episodeSelector=true`;
    }

    const isIframe = firstSource.includes('vidking.net') || 
                     firstSource.includes('vidking.com') || 
                     firstSource.includes('vidlink.pro') || 
                     firstSource.includes('mhdtvhub.com') ||
                     firstSource.includes('mhdtvlive.com') ||
                     firstSource.includes('mhdtv-world.com') ||
                     firstSource.includes('/embed/') ||
                     firstSource.includes('youtube.com/embed') ||
                     firstSource.includes('player.vimeo.com') ||
                     (firstSource.startsWith('http') && !firstSource.includes('.m3u8') && !firstSource.includes('.mp4'));

    if (isIframe) {
      setIframeUrl(firstSource);
    } else {
      setIframeUrl(null);
    }
  }, [options]);

  // Handle continue watching events from VidLink player
  useEffect(() => {
    const handleVidLinkMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://vidlink.pro') return;
      
      if (event.data?.type === 'MEDIA_DATA') {
        const mediaData = event.data.data;
        localStorage.setItem('vidLinkProgress', JSON.stringify(mediaData));
      }
    };

    window.addEventListener('message', handleVidLinkMessage);
    return () => window.removeEventListener('message', handleVidLinkMessage);
  }, []);

  // Main Live Stream / Progressive Stream Loading logic (Video.js)
  useEffect(() => {
    if (iframeUrl) return;
    const placeholder = videoContainerRef.current;
    if (!placeholder) return;

    setError(null);
    setIsBuffering(true);

    let firstSource = options?.sources?.[0]?.src || '';
    if (firstSource.includes('drive.google.com')) {
      const match = firstSource.match(/(?:id=|d\/|file\/d\/)([\w-]{25,})/);
      const driveId = match ? match[1] : '';
      firstSource = `/api/stream?id=${driveId}`;
    }

    const isHLS = firstSource.includes('.m3u8') || firstSource.includes('.mpd');
    let srcType = options?.sources?.[0]?.type || 'video/mp4';
    if (isHLS) {
      srcType = 'application/x-mpegURL';
    }

    // Dynamic clean element creation to ensure React Virtual DOM and Video.js DOM play nicely
    const videoElement = document.createElement('video-js');
    videoElement.className = 'video-js w-full h-full object-contain';
    videoElement.setAttribute('crossorigin', 'anonymous');
    videoElement.setAttribute('playsinline', 'true');
    placeholder.appendChild(videoElement);

    const videoJsOptions = {
      autoplay: true,
      controls: false, // Fully controlled by our custom CineStream overlay controls!
      responsive: true,
      fluid: true,
      sources: [{
        src: firstSource,
        type: srcType
      }],
      tracks: options?.tracks || []
    };

    const player = videojs(videoElement, videoJsOptions, () => {
      console.log('Video.js player successfully loaded live manifest or source:', firstSource);
      if (onReady) {
        onReady(player);
      }
    });

    playerRef.current = player;

    // Synchronize player events to our custom controls overlay React states
    player.on('play', () => setIsPlaying(true));
    player.on('pause', () => setIsPlaying(false));
    
    player.on('timeupdate', () => {
      setCurrentTime(player.currentTime() || 0);
    });

    player.on('durationchange', () => {
      setDuration(player.duration() || 0);
    });

    player.on('volumechange', () => {
      setVolume(player.volume() || 1);
      setIsMuted(player.muted() || false);
    });

    player.on('ratechange', () => {
      setPlaybackSpeed(player.playbackRate() || 1);
    });

    player.on('waiting', () => setIsBuffering(true));
    player.on('playing', () => setIsBuffering(false));
    player.on('seeking', () => setIsBuffering(true));
    player.on('seeked', () => setIsBuffering(false));

    player.on('error', () => {
      const vError = player.error();
      console.error('Video.js stream load failed:', vError);
      setError(`Streaming Error: Code ${vError?.code || 'UNKNOWN'}. This can occur due to broadcaster CORS restrictions or mixed-content (HTTP vs HTTPS) blocks.`);
    });

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
      if (placeholder) {
        placeholder.innerHTML = '';
      }
    };
  }, [options?.sources, iframeUrl]);

  // Sync subtitles
  useEffect(() => {
    if (options?.tracks) {
      setSubtitles(options.tracks);
    } else {
      setSubtitles([]);
    }
  }, [options?.tracks]);

  // Monitor Fullscreen Changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  // Keyboard navigation remote controls for native (m3u8/mp4) streams
  useEffect(() => {
    if (iframeUrl) return;

    const handlePlayerKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      handleMouseMove();

      switch (e.key) {
        case ' ': // Space Key
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          {
            const player = playerRef.current;
            if (player) {
              const currentV = player.volume() || 0;
              const nextV = Math.min(1, currentV + 0.1);
              player.volume(nextV);
              setVolume(nextV);
            }
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          {
            const player = playerRef.current;
            if (player) {
              const currentV = player.volume() || 0;
              const nextV = Math.max(0, currentV - 0.1);
              player.volume(nextV);
              setVolume(nextV);
            }
          }
          break;
        case 'Escape':
        case 'Backspace':
          if (onBack) {
            e.preventDefault();
            onBack();
          }
          break;
      }
    };

    window.addEventListener('keydown', handlePlayerKeyDown);
    return () => window.removeEventListener('keydown', handlePlayerKeyDown);
  }, [iframeUrl, isPlaying, onBack]);

  const togglePlay = () => {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying) {
      player.pause();
    } else {
      player.play()?.catch((err: any) => console.error("Playback start error:", err));
    }
  };

  const skip = (seconds: number) => {
    const player = playerRef.current;
    if (!player) return;
    const current = player.currentTime() || 0;
    player.currentTime(current + seconds);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const player = playerRef.current;
    if (!player) return;
    const time = parseFloat(e.target.value);
    player.currentTime(time);
    setCurrentTime(time);
  };

  const toggleMute = () => {
    const player = playerRef.current;
    if (!player) return;
    const muted = !isMuted;
    player.muted(muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const player = playerRef.current;
    if (!player) return;
    const val = parseFloat(e.target.value);
    player.volume(val);
    setVolume(val);
    if (val > 0) {
      player.muted(false);
    } else {
      player.muted(true);
    }
  };

  const changeSpeed = (speed: number) => {
    const player = playerRef.current;
    if (!player) return;
    player.playbackRate(speed);
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  const changeSubtitle = (label: string) => {
    const player = playerRef.current;
    if (!player) return;
    const textTracks = player.textTracks();
    for (let i = 0; i < textTracks.length; i++) {
      const track = textTracks[i];
      if (label === 'off') {
        track.mode = 'disabled';
      } else {
        track.mode = track.label === label ? 'showing' : 'disabled';
      }
    }
    setActiveSubtitle(label);
    setShowSubtitleMenu(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error("Fullscreen request failed:", err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="group relative w-full h-full bg-black overflow-hidden select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {iframeUrl ? (
        <iframe
          src={iframeUrl}
          className="w-full h-full border-0 bg-black"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture; xr-spatial-tracking; clipboard-write; gyroscope; accelerometer; microphone; camera"
          allowFullScreen
          title="Video Player"
          key={iframeUrl}
        />
      ) : (
        <div 
          ref={videoContainerRef} 
          className="w-full h-full relative" 
        />
      )}

      {/* Custom Controls Overlay */}
      <AnimatePresence>
        {showControls && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`absolute inset-0 z-10 flex flex-col justify-between ${iframeUrl ? 'pointer-events-none' : 'bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-auto'}`}
            onClick={(e) => {
              if (e.target === e.currentTarget && !iframeUrl) {
                togglePlay();
              }
            }}
          >
            {/* Top Bar */}
            <div className={`p-8 flex items-center justify-between pointer-events-auto ${iframeUrl ? 'bg-gradient-to-b from-black/80 to-transparent' : ''}`}>
              {onBack && (
                <button 
                  onClick={onBack}
                  className="p-2 transition-transform hover:scale-110 flex items-center gap-2 group text-white drop-shadow-lg"
                >
                  <ChevronLeft size={32} strokeWidth={2.5} />
                  <span className="text-xl font-medium opacity-0 group-hover:opacity-100 transition-opacity">Back</span>
                </button>
              )}
              {!iframeUrl && (
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
              )}
            </div>

            {/* Middle clickable area for play/pause toggle */}
            <div 
              className="flex-1 pointer-events-auto cursor-pointer" 
              onClick={() => togglePlay()}
            />

            {/* Center Play/Pause Large Feed */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {isBuffering && (
                <Loader2 className="animate-spin text-netflix-red" size={80} />
              )}
            </div>

            {/* Bottom Controls */}
            {!iframeUrl && (
              <div className="p-8 pb-10 space-y-4 pointer-events-auto">
                {/* Progress Bar Container - only display seeker bar if duration exists */}
                {duration > 0 && isFinite(duration) && (
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
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    {/* Play/Pause */}
                    <button onClick={togglePlay} className="transition-transform hover:scale-110 text-white">
                      {isPlaying ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" />}
                    </button>

                    {/* Skip Rewind/Forward */}
                    {duration > 0 && isFinite(duration) && (
                      <>
                        <button onClick={() => skip(-10)} className="group/skip flex flex-col items-center text-white">
                          <RotateCcw size={24} className="group-hover/skip:animate-pulse" />
                          <span className="text-[10px] font-bold mt-1">10</span>
                        </button>
                        <button onClick={() => skip(10)} className="group/skip flex flex-col items-center text-white">
                          <RotateCw size={24} className="group-hover/skip:animate-pulse" />
                          <span className="text-[10px] font-bold mt-1">10</span>
                        </button>
                      </>
                    )}

                    {/* Volume */}
                    <div className="flex items-center gap-3 group/volume text-white">
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
                    <div className="text-sm font-medium tracking-wider text-white">
                      {duration > 0 && isFinite(duration) ? (
                        `${formatTime(currentTime)} / ${formatTime(duration)}`
                      ) : (
                        <span className="flex items-center gap-2 font-bold text-netflix-red">
                          <span className="w-2 h-2 bg-netflix-red rounded-full animate-ping" />
                          LIVE
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-white">
                    {/* Fullscreen */}
                    <button onClick={toggleFullscreen} className="p-2 transition-transform hover:scale-110">
                      {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
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
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-8 text-center"
          >
            <AlertTriangle className="text-netflix-red mb-4" size={48} />
            <h2 className="text-xl font-bold mb-4 text-white">Playback Error</h2>
            <p className="text-gray-300 max-w-md mx-auto leading-relaxed text-sm">
              {error}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => window.location.reload()}
                className="mt-8 px-6 py-2 bg-white text-black font-bold uppercase tracking-wider rounded-sm hover:bg-gray-200 transition-colors text-xs"
              >
                Reload
              </button>
              {onBack && (
                <button 
                  onClick={onBack}
                  className="mt-8 px-6 py-2 border border-white/30 text-white font-bold uppercase tracking-wider rounded-sm hover:bg-white/10 transition-colors text-xs"
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
};

export default VideoPlayer;
