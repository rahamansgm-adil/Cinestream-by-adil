import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Check, AlertCircle, Play, Plus, Info, Loader2, Trash2, ChevronDown, ChevronUp, Captions, Search } from 'lucide-react';
import { Movie, Episode } from '@/src/data/movies';
import { cn } from '@/src/lib/utils';
import { db, auth } from '@/src/lib/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

interface AddMovieFormProps {
  onAdd: (movie: Movie) => void;
  onClose: () => void;
  type?: 'movie' | 'tv';
}

export const AddMovieForm: React.FC<AddMovieFormProps> = ({ onAdd, onClose, type = 'movie' }) => {
  const { isAdmin: isSystemAdmin, getAuthHeaders } = useAuth();
  const [formData, setFormData] = useState<Partial<Movie>>({
    title: '',
    description: '',
    thumbnailUrl: '',
    bannerUrl: '',
    videoUrl: '',
    year: '2024',
    rating: 'PG-13',
    duration: '',
    trailerUrl: '',
    logoUrl: '',
    genres: [],
    cast: [],
    contentType: type,
    episodes: []
  });

  const [episodes, setEpisodes] = useState<Partial<Episode>[]>([]);
  const [showEpisodeForm, setShowEpisodeForm] = useState(false);
  const [newEpisode, setNewEpisode] = useState<Partial<Episode>>({
    title: '',
    description: '',
    videoUrl: '',
    duration: '',
    number: 1,
    seasonNumber: 1
  });

  const [subtitles, setSubtitles] = useState<{ label: string, src: string, lang: string }[]>([]);
  const [newSubtitle, setNewSubtitle] = useState({ label: '', src: '', lang: 'en' });
  const [showSubtitleForm, setShowSubtitleForm] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contentGenreInput, setContentGenreInput] = useState('');
  const [contentCastInput, setContentCastInput] = useState('');
  const [tmdbSearch, setTmdbSearch] = useState('');
  const [tmdbResults, setTmdbResults] = useState<any[]>([]);
  const [isSearchingTmdb, setIsSearchingTmdb] = useState(false);
  const [currentTmdbId, setCurrentTmdbId] = useState<number | null>(null);
  const [seasonToFetch, setSeasonToFetch] = useState(1);
  const [isFetchingSeason, setIsFetchingSeason] = useState(false);
  const [multiSeasonInput, setMultiSeasonInput] = useState('');

  const tmdbApiKey = import.meta.env.VITE_TMDB_API_KEY;

  const fetchSeason = async (seasonNum: number, append = false) => {
    if (!currentTmdbId || !tmdbApiKey) return;
    setIsFetchingSeason(true);
    try {
      const response = await axios.get(`https://api.themoviedb.org/3/tv/${currentTmdbId}/season/${seasonNum}`, {
        params: { api_key: tmdbApiKey, language: 'en-US' }
      });
      const data = response.data;
      const fetchedEpisodes = data.episodes.map((ep: any) => ({
        id: `tmdb-${ep.id}`,
        number: ep.episode_number,
        seasonNumber: seasonNum,
        title: ep.name,
        description: ep.overview,
        videoUrl: '', 
        duration: '45m',
        thumbnailUrl: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : ''
      }));
      
      if (append) {
        setEpisodes(prev => [...prev, ...fetchedEpisodes]);
      } else {
        setEpisodes(fetchedEpisodes);
      }
    } catch (error) {
      console.error(`Fetch Season ${seasonNum} Error:`, error);
    } finally {
      setIsFetchingSeason(false);
    }
  };

  const fetchMultipleSeasons = async () => {
    if (!currentTmdbId || !tmdbApiKey || !multiSeasonInput.trim()) return;
    
    // Parse input (supports "1-3" or "1,2,3")
    let seasons: number[] = [];
    if (multiSeasonInput.includes('-')) {
      const [start, end] = multiSeasonInput.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) seasons.push(i);
      }
    } else {
      seasons = multiSeasonInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    }

    if (seasons.length === 0) return;

    setIsFetchingSeason(true);
    setEpisodes([]); // Clear current list for a fresh batch import
    
    try {
      for (const seasonNum of seasons) {
        await fetchSeason(seasonNum, true);
      }
    } finally {
      setIsFetchingSeason(false);
    }
  };

  const handleTmdbSearch = async () => {
    if (!tmdbSearch.trim() || !tmdbApiKey) return;
    setIsSearchingTmdb(true);
    try {
      const response = await axios.get(`https://api.themoviedb.org/3/search/multi`, {
        params: {
          api_key: tmdbApiKey,
          query: tmdbSearch,
          language: 'en-US',
          page: 1,
          include_adult: false
        }
      });
      const filteredResults = response.data.results.filter((res: any) => 
        res.media_type === (type === 'movie' ? 'movie' : 'tv') || res.media_type === 'movie' || res.media_type === 'tv'
      );
      setTmdbResults(filteredResults);
    } catch (error) {
      console.error("TMDB Search Error:", error);
    } finally {
      setIsSearchingTmdb(false);
    }
  };

  const selectTmdbItem = async (item: any) => {
    const mediaType = item.media_type || (type === 'movie' ? 'movie' : 'tv');
    setIsSearchingTmdb(true);
    try {
      // Get detailed info including credits
      const detailResponse = await axios.get(`https://api.themoviedb.org/3/${mediaType}/${item.id}`, {
        params: {
          api_key: tmdbApiKey,
          append_to_response: 'credits,videos,release_dates,content_ratings'
        }
      });

      const data = detailResponse.data;
      setCurrentTmdbId(item.id);
      
      // Determine Rating
      let rating = 'PG-13';
      if (mediaType === 'movie') {
        const release = data.release_dates?.results?.find((r: any) => r.iso_3166_1 === 'US');
        rating = release?.release_dates?.[0]?.certification || 'PG-13';
      } else {
        const contentRating = data.content_ratings?.results?.find((r: any) => r.iso_3166_1 === 'US');
        rating = contentRating?.rating || 'TV-14';
      }

      setFormData({
        ...formData,
        title: data.title || data.name,
        description: data.overview,
        thumbnailUrl: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '',
        bannerUrl: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : '',
        year: (data.release_date || data.first_air_date || '').split('-')[0] || '2024',
        rating,
        duration: mediaType === 'movie' ? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m` : `${data.number_of_seasons} Seasons`,
        trailerUrl: data.videos?.results?.find((v: any) => v.type === 'Trailer')?.key ? `https://www.youtube.com/watch?v=${data.videos.results.find((v: any) => v.type === 'Trailer').key}` : '',
        contentType: mediaType === 'movie' ? 'movie' : 'tv'
      });

      // Fetch episodes for TV shows
      if (mediaType === 'tv') {
        fetchSeason(1);
      }

      setContentGenreInput(data.genres?.map((g: any) => g.name).join(', ') || '');
      setContentCastInput(data.credits?.cast?.slice(0, 10).map((c: any) => c.name).join(', ') || '');
      
      setTmdbResults([]);
      setTmdbSearch('');
    } catch (error) {
      console.error("TMDB Detail Error:", error);
    } finally {
      setIsSearchingTmdb(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title?.trim()) newErrors.title = 'Title is required';
    if (!formData.description?.trim()) newErrors.description = 'Description is required';
    if (!formData.thumbnailUrl?.trim()) newErrors.thumbnailUrl = 'Thumbnail URL is required';
    if (!formData.bannerUrl?.trim()) newErrors.bannerUrl = 'Banner URL is required';
    
    if (formData.contentType === 'movie') {
      if (!formData.videoUrl?.trim()) {
        newErrors.videoUrl = 'Video URL is required';
      } else {
        const videoUrl = formData.videoUrl.trim();
        const isDriveUrl = videoUrl.includes('drive.google.com/uc?export=download&id=') || 
                           videoUrl.includes('drive.google.com/file/d/') ||
                           videoUrl.includes('id=');
        const isEmbedUrl = videoUrl.includes('vidking.net') || 
                           videoUrl.includes('youtube.com/embed') || 
                           videoUrl.includes('vimeo.com/video') ||
                           videoUrl.startsWith('/embed/');
        const isArchiveUrl = videoUrl.includes('archive.org/');
        const isValidFormat = videoUrl.endsWith('.m3u8') || 
                              videoUrl.endsWith('.mp4') || 
                              videoUrl.endsWith('.mkv') || 
                              videoUrl.endsWith('.webm') ||
                              isDriveUrl || isArchiveUrl || isEmbedUrl;
        
        if (!isValidFormat) {
          newErrors.videoUrl = 'Use .mp4, .m3u8, .mkv, .webm, Google Drive, Embed link or Archive.org link';
        }
      }
    } else {
      if (episodes.length === 0) {
        newErrors.episodes = 'At least one episode is required for TV Shows';
      }
    }
    
    if (!formData.duration?.trim()) newErrors.duration = 'Duration or Season count is required';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      // Scroll to top of form or show error toast handled by UI
      const firstError = Object.values(newErrors)[0];
      console.warn('Validation failed:', firstError);
    }
    return Object.keys(newErrors).length === 0;
  };

  const isMkvDetected = formData.videoUrl?.toLowerCase().endsWith('.mkv');
  const isDriveDetected = formData.videoUrl?.includes('drive.google.com');
  const isArchiveDetected = formData.videoUrl?.includes('archive.org');

  const extractDriveId = (url: string) => {
    const match = url.match(/(?:id=|d\/|file\/d\/)([\w-]{25,})/);
    return match ? match[1] : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setIsSubmitting(true);
      try {
        const movieData = {
          title: formData.title,
          description: formData.description,
          thumbnailUrl: formData.thumbnailUrl,
          bannerUrl: formData.bannerUrl,
          videoUrl: formData.contentType === 'movie' ? (formData.videoUrl || '') : (episodes[0]?.videoUrl || ''),
          year: formData.year,
          rating: formData.rating,
          duration: formData.duration,
          trailerUrl: formData.trailerUrl || '',
          logoUrl: formData.logoUrl || '',
          genres: contentGenreInput.split(',').map(g => g.trim()).filter(Boolean),
          cast: contentCastInput.split(',').map(c => c.trim()).filter(Boolean),
          contentType: formData.contentType,
          subtitles: subtitles,
          episodes: formData.contentType === 'tv' ? episodes.map((ep, idx) => ({
            ...ep,
            id: ep.id || `ep-${Date.now()}-${idx}`,
            number: ep.number || idx + 1
          })) : [],
          createdBy: auth.currentUser?.email || 'rahamansgmadil2@gmail.com'
        };

        const headers = await getAuthHeaders();
        const response = await axios.post('/api/admin/add-content', movieData, { 
          headers,
          withCredentials: true
        });
        
        console.log('Content saved successfully:', response.data.id);
        setShowSuccess(true);
        
        // Reset form after success
        setTimeout(() => {
          setShowSuccess(false);
          setFormData({
            title: '',
            description: '',
            thumbnailUrl: '',
            bannerUrl: '',
            videoUrl: '',
            year: '2024',
            rating: 'PG-13',
            duration: '',
            trailerUrl: '',
            logoUrl: '',
            genres: [],
            cast: [],
            contentType: type,
            episodes: []
          });
          setEpisodes([]);
          setSubtitles([]);
          setContentGenreInput('');
          setContentCastInput('');
          onClose();
        }, 1500);
      } catch (error: any) {
        console.error("Error adding movie:", error);
        const serverError = error.response?.data?.error || error.message;
        setErrors({ submit: `Failed to save content: ${serverError}` });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 md:p-8 overflow-y-auto"
    >
      <div className="relative w-full max-w-6xl bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
        
        {/* Form Section */}
        <div className="flex-1 p-8 md:p-12 overflow-y-auto max-h-[80vh] md:max-h-none">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Add New {type === 'movie' ? 'Movie' : 'TV Show'}</h2>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Title</label>
                <input 
                  type="text"
                  placeholder={formData.contentType === 'movie' ? "e.g. Inception" : "e.g. Stranger Things"}
                  className={cn(
                    "w-full bg-zinc-800/50 border-b-2 border-transparent px-4 py-3 text-white outline-none focus:border-netflix-red transition-all duration-300 rounded-t",
                    errors.title && "border-red-500"
                  )}
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
                {errors.title && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.title}</p>}
              </div>

              {/* Year & Rating */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Year</label>
                  <input 
                    type="number"
                    className="w-full bg-zinc-800/50 border-b-2 border-transparent px-4 py-3 text-white outline-none focus:border-netflix-red transition-all duration-300 rounded-t"
                    value={formData.year}
                    onChange={e => setFormData({ ...formData, year: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Rating</label>
                  <select 
                    className="w-full bg-zinc-800/50 border-b-2 border-transparent px-4 py-3 text-white outline-none focus:border-netflix-red transition-all duration-300 rounded-t appearance-none"
                    value={formData.rating}
                    onChange={e => setFormData({ ...formData, rating: e.target.value })}
                  >
                    <option value="G">G</option>
                    <option value="PG">PG</option>
                    <option value="PG-13">PG-13</option>
                    <option value="R">R</option>
                    <option value="TV-MA">TV-MA</option>
                    <option value="TV-14">TV-14</option>
                  </select>
                </div>
              </div>

              {/* Movie-only: Video URL */}
              {formData.contentType === 'movie' && (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Video URL (.m3u8, .mp4, .mkv, Google Drive)</label>
                  <input 
                    type="text"
                    placeholder="https://drive.google.com/uc?export=download&id=..."
                    className={cn(
                      "w-full bg-zinc-800/50 border-b-2 border-transparent px-4 py-3 text-white outline-none focus:border-netflix-red transition-all duration-300 rounded-t",
                      errors.videoUrl && "border-red-500"
                    )}
                    value={formData.videoUrl}
                    onChange={e => setFormData({ ...formData, videoUrl: e.target.value })}
                  />
                  <AnimatePresence>
                    {isMkvDetected && (
                      <motion.p 
                        key="mkv-warning"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-amber-500 text-[10px] flex items-center gap-1 font-bold uppercase tracking-wider"
                      >
                        <AlertCircle size={10} /> MKV format detected. Note: This format may require backend transcoding for universal browser playback.
                      </motion.p>
                    )}
                    {isDriveDetected && (
                      <motion.p 
                        key="drive-warning"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-blue-500 text-[10px] flex items-center gap-1 font-bold uppercase tracking-wider"
                      >
                        <Check size={10} /> Google Drive detected. Using backend proxy for seamless streaming.
                      </motion.p>
                    )}
                  </AnimatePresence>
                  {errors.videoUrl && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.videoUrl}</p>}
                </div>
              )}

              {/* TV-only: Episode Management */}
              {formData.contentType === 'tv' && (
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Episodes ({episodes.length})</label>
                    <div className="flex flex-col gap-3">
                      {currentTmdbId && (
                        <div className="flex flex-wrap items-center gap-3 bg-zinc-800/30 p-3 rounded-lg border border-zinc-700/50">
                          {/* Single Season Import */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Season</span>
                            <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded overflow-hidden">
                              <input 
                                type="number"
                                min="1"
                                className="w-12 bg-transparent text-xs text-white px-2 py-1 outline-none font-bold text-center"
                                value={seasonToFetch}
                                onChange={e => setSeasonToFetch(parseInt(e.target.value) || 1)}
                              />
                              <button
                                type="button"
                                onClick={() => fetchSeason(seasonToFetch)}
                                disabled={isFetchingSeason}
                                className="px-3 py-1 bg-zinc-800 text-white text-[10px] font-bold hover:bg-zinc-700 transition-colors disabled:opacity-50 border-l border-zinc-700"
                              >
                                {isFetchingSeason ? <Loader2 size={10} className="animate-spin" /> : 'Get'}
                              </button>
                            </div>
                          </div>

                          <div className="h-4 w-[1px] bg-zinc-700" />

                          {/* Multi-Season Import */}
                          <div className="flex items-center gap-2 flex-grow">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bulk Import</span>
                            <div className="flex flex-grow items-center bg-zinc-900 border border-zinc-700 rounded overflow-hidden">
                              <input 
                                type="text"
                                placeholder='e.g. "1-5" or "1,2,4"'
                                className="flex-grow bg-transparent text-xs text-white px-3 py-1 outline-none placeholder:text-zinc-600"
                                value={multiSeasonInput}
                                onChange={e => setMultiSeasonInput(e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={fetchMultipleSeasons}
                                disabled={isFetchingSeason || !multiSeasonInput.trim()}
                                className="px-4 py-1 bg-netflix-red text-white text-[10px] font-bold hover:bg-red-600 transition-colors disabled:opacity-30 border-l border-zinc-700"
                              >
                                {isFetchingSeason ? <Loader2 size={10} className="animate-spin" /> : 'Import All'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-end">
                        <button 
                          type="button"
                          onClick={() => setShowEpisodeForm(!showEpisodeForm)}
                          className="text-netflix-red text-xs font-bold uppercase tracking-widest flex items-center gap-1 hover:underline px-2 py-1"
                        >
                          {showEpisodeForm ? <ChevronUp size={14} /> : <Plus size={14} />} 
                          {showEpisodeForm ? 'Close manual form' : 'Add Single Episode Manually'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {showEpisodeForm && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-zinc-800/30 p-6 rounded-lg border border-zinc-700 space-y-4 overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Episode Title</label>
                          <input 
                            type="text"
                            placeholder="e.g. Chapter One: The Vanishing..."
                            className="w-full bg-zinc-900 px-3 py-2 text-sm text-white outline-none border border-transparent focus:border-netflix-red rounded transition-all"
                            value={newEpisode.title}
                            onChange={e => setNewEpisode({ ...newEpisode, title: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Episode URL</label>
                          <input 
                            type="text"
                            placeholder="Direct Video URL"
                            className="w-full bg-zinc-900 px-3 py-2 text-sm text-white outline-none border border-transparent focus:border-netflix-red rounded transition-all"
                            value={newEpisode.videoUrl}
                            onChange={e => setNewEpisode({ ...newEpisode, videoUrl: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Duration</label>
                          <input 
                            type="text"
                            placeholder="e.g. 45m"
                            className="w-full bg-zinc-900 px-3 py-2 text-sm text-white outline-none border border-transparent focus:border-netflix-red rounded transition-all"
                            value={newEpisode.duration}
                            onChange={e => setNewEpisode({ ...newEpisode, duration: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Episode Number</label>
                          <input 
                            type="number"
                            className="w-full bg-zinc-900 px-3 py-2 text-sm text-white outline-none border border-transparent focus:border-netflix-red rounded transition-all"
                            value={newEpisode.number}
                            onChange={e => setNewEpisode({ ...newEpisode, number: parseInt(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Season Number</label>
                          <input 
                            type="number"
                            min="1"
                            className="w-full bg-zinc-900 px-3 py-2 text-sm text-white outline-none border border-transparent focus:border-netflix-red rounded transition-all"
                            value={newEpisode.seasonNumber}
                            onChange={e => setNewEpisode({ ...newEpisode, seasonNumber: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Summary</label>
                          <textarea 
                            rows={2}
                            placeholder="Brief episode description..."
                            className="w-full bg-zinc-900 px-3 py-2 text-sm text-white outline-none border border-transparent focus:border-netflix-red rounded transition-all resize-none"
                            value={newEpisode.description}
                            onChange={e => setNewEpisode({ ...newEpisode, description: e.target.value })}
                          />
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          if (newEpisode.title && newEpisode.videoUrl) {
                            const episodeId = `ep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                            setEpisodes([...episodes, { ...newEpisode, id: episodeId }]);
                            setNewEpisode({ 
                              title: '', 
                              description: '', 
                              videoUrl: '', 
                              duration: '', 
                              number: (newEpisode.number || 0) + 1,
                              seasonNumber: newEpisode.seasonNumber || 1
                            });
                            if (episodes.length > 0) setShowEpisodeForm(false);
                          }
                        }}
                        className="w-full py-2 bg-white text-black font-bold uppercase text-[10px] tracking-widest rounded hover:bg-gray-200 transition-colors"
                      >
                        Add to Episode List
                      </button>
                    </motion.div>
                  )}

                    <div className="space-y-3">
                      {episodes.map((ep, idx) => (
                        <div key={ep.id} className="p-4 bg-zinc-800/40 rounded-lg border border-zinc-700/50 hover:border-zinc-500/50 transition-all space-y-3 group">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-netflix-red font-black text-base w-6">{ep.number}</span>
                              <div className="flex-1">
                                <h4 className="text-sm font-bold text-white group-hover:text-netflix-red transition-colors">{ep.title} {ep.seasonNumber && <span className="text-[10px] text-gray-500 ml-2">(S{ep.seasonNumber})</span>}</h4>
                                <p className="text-[10px] text-gray-500 line-clamp-1 max-w-xs">{ep.description || 'No description provided'}</p>
                              </div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => setEpisodes(episodes.filter((_, i) => i !== idx))}
                              className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                              title="Remove Episode"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          
                          <div className="pl-9 space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Video URL for Episode {ep.number}</label>
                            <div className="relative">
                              <Play size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                              <input 
                                type="text"
                                placeholder="Paste direct link or embed URL..."
                                className="w-full bg-black/60 border border-zinc-700 px-8 py-2 text-[11px] text-white outline-none focus:border-netflix-red rounded-md transition-all placeholder:text-zinc-600"
                                value={ep.videoUrl || ''}
                                onChange={e => {
                                  const updatedEpisodes = [...episodes];
                                  updatedEpisodes[idx] = { ...updatedEpisodes[idx], videoUrl: e.target.value };
                                  setEpisodes(updatedEpisodes);
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {errors.episodes && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.episodes}</p>}
                    </div>
                </div>
              )}

              {/* Subtitles Section */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Captions size={14} className="text-netflix-red" /> Subtitles ({subtitles.length})
                  </label>
                  <button 
                    type="button"
                    onClick={() => setShowSubtitleForm(!showSubtitleForm)}
                    className="text-netflix-red text-xs font-bold uppercase tracking-widest flex items-center gap-1 hover:underline"
                  >
                    {showSubtitleForm ? <ChevronUp size={14} /> : <Plus size={14} />} 
                    {showSubtitleForm ? 'Close' : 'Add Subtitle'}
                  </button>
                </div>

                {showSubtitleForm && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-zinc-800/30 p-6 rounded-lg border border-zinc-700 space-y-4 overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Label</label>
                        <input 
                          type="text"
                          placeholder="e.g. English"
                          className="w-full bg-zinc-900 px-3 py-2 text-sm text-white outline-none border border-transparent focus:border-netflix-red rounded transition-all"
                          value={newSubtitle.label}
                          onChange={e => setNewSubtitle({ ...newSubtitle, label: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Language Code</label>
                        <input 
                          type="text"
                          placeholder="e.g. en"
                          className="w-full bg-zinc-900 px-3 py-2 text-sm text-white outline-none border border-transparent focus:border-netflix-red rounded transition-all"
                          value={newSubtitle.lang}
                          onChange={e => setNewSubtitle({ ...newSubtitle, lang: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subtitle URL (.vtt / .srt)</label>
                        <input 
                          type="text"
                          placeholder="Direct Link or GDrive Link"
                          className="w-full bg-zinc-900 px-3 py-2 text-sm text-white outline-none border border-transparent focus:border-netflix-red rounded transition-all"
                          value={newSubtitle.src}
                          onChange={e => setNewSubtitle({ ...newSubtitle, src: e.target.value })}
                        />
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        if (newSubtitle.label && newSubtitle.src) {
                          setSubtitles([...subtitles, newSubtitle]);
                          setNewSubtitle({ label: '', src: '', lang: 'en' });
                          setShowSubtitleForm(false);
                        }
                      }}
                      className="w-full py-2 bg-white text-black font-bold uppercase text-[10px] tracking-widest rounded hover:bg-gray-200 transition-colors"
                    >
                      Add Subtitle Track
                    </button>
                  </motion.div>
                )}

                <div className="space-y-2">
                  {subtitles.map((sub, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded border border-white/5 group hover:border-white/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="px-2 py-0.5 bg-zinc-700 rounded text-[10px] font-bold text-gray-300 uppercase shrink-0">
                          {sub.lang}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{sub.label}</h4>
                          <p className="text-[10px] text-gray-500 truncate max-w-[200px] md:max-w-md">{sub.src}</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setSubtitles(subtitles.filter((_, i) => i !== idx))}
                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Thumbnail Image URL</label>
                <input 
                  type="text"
                  placeholder="Poster URL"
                  className={cn(
                    "w-full bg-zinc-800/50 border-b-2 border-transparent px-4 py-3 text-white outline-none focus:border-netflix-red transition-all duration-300 rounded-t",
                    errors.thumbnailUrl && "border-red-500"
                  )}
                  value={formData.thumbnailUrl}
                  onChange={e => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Banner Image URL</label>
                <input 
                  type="text"
                  placeholder="Hero Image URL"
                  className={cn(
                    "w-full bg-zinc-800/50 border-b-2 border-transparent px-4 py-3 text-white outline-none focus:border-netflix-red transition-all duration-300 rounded-t",
                    errors.bannerUrl && "border-red-500"
                  )}
                  value={formData.bannerUrl}
                  onChange={e => setFormData({ ...formData, bannerUrl: e.target.value })}
                />
              </div>

              <div className="space-y-4 md:col-span-2 bg-zinc-800/20 p-4 rounded-lg border border-white/5">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                      <Play size={12} className="text-netflix-red" /> Trailer URL (Optional)
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. YouTube link or direct video URL"
                      className="w-full bg-zinc-800/50 border-b-2 border-transparent px-4 py-3 text-white outline-none focus:border-netflix-red transition-all duration-300 rounded-t"
                      value={formData.trailerUrl}
                      onChange={e => setFormData({ ...formData, trailerUrl: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Synopsis</label>
                <textarea 
                  rows={3}
                  className={cn(
                    "w-full bg-zinc-800/50 border-b-2 border-transparent px-4 py-3 text-white outline-none focus:border-netflix-red transition-all duration-300 rounded-t resize-none",
                    errors.description && "border-red-500"
                  )}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Genres & Cast */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Genres (comma separated)</label>
                <input 
                  type="text"
                  placeholder="Action, Sci-Fi"
                  className="w-full bg-zinc-800/50 border-b-2 border-transparent px-4 py-3 text-white outline-none focus:border-netflix-red transition-all duration-300 rounded-t"
                  value={contentGenreInput}
                  onChange={e => setContentGenreInput(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">{formData.contentType === 'movie' ? 'Duration' : 'Total Seasons / Info'}</label>
                <input 
                  type="text"
                  placeholder={formData.contentType === 'movie' ? "e.g. 2h 15m" : "e.g. 3 Seasons"}
                  className="w-full bg-zinc-800/50 border-b-2 border-transparent px-4 py-3 text-white outline-none focus:border-netflix-red transition-all duration-300 rounded-t"
                  value={formData.duration}
                  onChange={e => setFormData({ ...formData, duration: e.target.value })}
                />
              </div>
            </div>

            {/* TMDB Search Integration */}
            <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/50">
              <label className="text-[10px] font-bold text-netflix-red uppercase tracking-[0.2em] mb-2 block">Quick Import from TMDB</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input 
                    type="text"
                    placeholder="Search movie or TV show title..."
                    className="w-full bg-black/40 border border-zinc-700/50 pl-10 pr-4 py-2 text-white outline-none focus:border-netflix-red rounded-lg transition-all"
                    value={tmdbSearch}
                    onChange={e => setTmdbSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleTmdbSearch())}
                  />
                </div>
                <button 
                  type="button"
                  onClick={handleTmdbSearch}
                  disabled={isSearchingTmdb || !tmdbSearch.trim()}
                  className="px-6 bg-white text-black font-black uppercase text-xs tracking-widest rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50"
                >
                  {isSearchingTmdb ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
                </button>
              </div>

              {/* TMDB Search Results Dropdown */}
              <AnimatePresence>
                {tmdbResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-2 bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden shadow-2xl max-h-64 overflow-y-auto"
                  >
                    {tmdbResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectTmdbItem(item)}
                        className="w-full p-3 flex items-center gap-4 hover:bg-zinc-800 border-b border-zinc-800 last:border-0 transition-colors text-left"
                      >
                        {item.poster_path ? (
                          <img src={`https://image.tmdb.org/t/p/w92${item.poster_path}`} className="w-10 h-14 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-14 bg-zinc-800 rounded flex items-center justify-center"><Play size={12} /></div>
                        )}
                        <div>
                          <h4 className="font-bold text-white text-sm line-clamp-1">{item.title || item.name}</h4>
                          <p className="text-[10px] text-gray-500 uppercase font-black tracking-tighter">
                            {item.media_type || (type === 'movie' ? 'movie' : 'TV')} • {(item.release_date || item.first_air_date || '').split('-')[0]}
                          </p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              {!tmdbApiKey && (
                <p className="text-[10px] text-amber-500/80 mt-2 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Info size={12}/> Configure VITE_TMDB_API_KEY in settings to enable quick import
                </p>
              )}
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-netflix-red hover:bg-[#ff0a16] text-white font-black uppercase tracking-widest rounded-md transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                 <Loader2 className="animate-spin" size={24} />
              ) : showSuccess ? (
                <>
                  <Check size={24} /> Movie Added!
                </>
              ) : (
                <>
                  <Upload size={20} className="group-hover:scale-110 transition-transform" /> Publish Content
                </>
              )}
            </button>
            {errors.submit && <p className="text-red-500 text-center text-xs font-bold uppercase tracking-wider">{errors.submit}</p>}
          </form>
        </div>

        {/* Live Preview Section */}
        <div className="w-full md:w-[400px] bg-black p-8 flex flex-col items-center justify-center border-l border-zinc-800">
          <div className="text-center mb-8">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-2">Live Storefront Preview</h3>
            <div className="h-0.5 w-12 bg-netflix-red mx-auto"></div>
          </div>
          
          <div className="space-y-12 w-full">
            {/* Mini Row Preview */}
            <div className="space-y-4">
              <span className="text-[10px] text-gray-600 font-bold uppercase">Carousel Card</span>
              <div className="w-full h-40 bg-zinc-900 rounded overflow-hidden relative group cursor-pointer border border-white/10">
                {formData.thumbnailUrl ? (
                  <img src={formData.thumbnailUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700">
                    <Plus size={40} strokeWidth={1} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                <div className="absolute inset-x-0 bottom-0 p-3 z-20">
                  <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">{formData.title || 'Movie Title'}</h3>
                </div>
              </div>
            </div>

            {/* Banner Preview */}
            <div className="space-y-4">
              <span className="text-[10px] text-gray-600 font-bold uppercase">Hero Banner Style</span>
              <div className="w-full h-48 bg-zinc-900 rounded overflow-hidden relative border border-white/10">
                {formData.bannerUrl ? (
                  <img src={formData.bannerUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700">
                    <Info size={40} strokeWidth={1} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent z-10" />
                <div className="absolute inset-x-0 bottom-0 p-4 z-20 space-y-2">
                  <h3 className="text-lg font-bold text-white leading-tight">{formData.title || 'Epic Feature'}</h3>
                  <div className="flex gap-2">
                    <div className="w-8 h-3 bg-white/20 rounded"></div>
                    <div className="w-12 h-3 bg-gray-500/30 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <p className="mt-12 text-[10px] text-gray-500 text-center uppercase tracking-widest leading-relaxed">
            Content will be processed for HLS streaming automatically after upload.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default AddMovieForm;
