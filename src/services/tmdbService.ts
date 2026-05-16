import axios from 'axios';
import { Movie } from '../data/movies';

export const tmdbService = {
  async fetchFromProxy(path: string, params: Record<string, string | number> = {}) {
    try {
      // Check if we are on Netlify or similar
      const isNetlify = window.location.hostname.includes('netlify.app');
      const apiBase = isNetlify ? '/.netlify/functions/tmdb' : '/api/tmdb';
      
      const response = await axios.get(`${apiBase}/${path}`, { 
        params,
        // Add a retry mechanism or timeout
        timeout: 15000 
      });
      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      const errorMsg = error.response?.data?.message || error.message;
      
      console.error(`[TMDB Error] ${path}:`, errorMsg);
      
      if (status === 401) {
        console.error("TMDB API Key unauthorized. Check your API key.");
      }
      
      return null;
    }
  },

  mapToMovie(tmdbItem: any, type: 'movie' | 'tv' = 'movie'): Movie {
    const isTV = type === 'tv';
    return {
      id: String(tmdbItem.id),
      title: tmdbItem.title || tmdbItem.name || 'Untitled',
      description: tmdbItem.overview || 'No description available.',
      thumbnailUrl: tmdbItem.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbItem.poster_path}` : 'https://via.placeholder.com/500x750',
      bannerUrl: tmdbItem.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdbItem.backdrop_path}` : 'https://via.placeholder.com/1920x1080',
      videoUrl: isTV ? `https://www.vidking.net/embed/tv/${tmdbItem.id}/1/1` : `https://www.vidking.net/embed/movie/${tmdbItem.id}`,
      duration: isTV ? 'Series' : 'Feature',
      year: (tmdbItem.release_date || tmdbItem.first_air_date || '').split('-')[0] || 'Unknown',
      rating: String(tmdbItem.vote_average || 'NR'),
      genres: [], // Will be populated if needed
      cast: [],
      contentType: type
    };
  },

  async getTrending(type: 'movie' | 'tv' | 'all' = 'all') {
    const data = await this.fetchFromProxy(`trending/${type}/week`);
    if (!data || !data.results) return [];
    return data.results.map((item: any) => this.mapToMovie(item, item.media_type || (type === 'all' ? 'movie' : type)));
  },

  async getPopular(type: 'movie' | 'tv' = 'movie') {
    const data = await this.fetchFromProxy(`${type}/popular`);
    if (!data || !data.results) return [];
    return data.results.map((item: any) => this.mapToMovie(item, type));
  },

  async search(query: string) {
    const data = await this.fetchFromProxy('search/multi', { query });
    if (!data || !data.results) return [];
    return data.results
      .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
      .map((item: any) => this.mapToMovie(item, item.media_type));
  },

  async getNetflixOriginals() {
    // TMDB Network ID for Netflix is 213
    const data = await this.fetchFromProxy('discover/tv', { with_networks: 213, sort_by: 'popularity.desc' });
    if (!data || !data.results) return [];
    return data.results.map((item: any) => this.mapToMovie(item, 'tv'));
  },

  async getLatestRelease() {
    const data = await this.fetchFromProxy('movie/now_playing');
    if (!data || !data.results) return [];
    return data.results.map((item: any) => this.mapToMovie(item, 'movie'));
  },

  async getTopRated(type: 'movie' | 'tv' = 'movie') {
    const data = await this.fetchFromProxy(`${type}/top_rated`);
    if (!data || !data.results) return [];
    return data.results.map((item: any) => this.mapToMovie(item, type));
  },

  async getByGenre(genreId: number, type: 'movie' | 'tv' = 'movie') {
    const data = await this.fetchFromProxy(`discover/${type}`, { with_genres: genreId });
    if (!data || !data.results) return [];
    return data.results.map((item: any) => this.mapToMovie(item, type));
  },

  async getByProvider(providerIds: string, networkIds: string = '', type: 'movie' | 'tv' = 'movie', region: string = 'IN') {
    // Try with region and providers first
    let data = await this.fetchFromProxy(`discover/${type}`, { 
      with_watch_providers: providerIds, 
      watch_region: region,
      sort_by: 'popularity.desc'
    });
    
    // Fallback 1: Try with network IDs if provided (often more reliable for "Originals")
    if ((!data || !data.results || data.results.length < 5) && networkIds) {
      console.log(`[TMDB] Low results for ${providerIds} in ${region}, trying highlights from networks ${networkIds}...`);
      const networkData = await this.fetchFromProxy(`discover/${type}`, { 
        with_networks: networkIds,
        sort_by: 'popularity.desc'
      });
      if (networkData && networkData.results && networkData.results.length > 0) {
        data = networkData;
      }
    }
    
    // Fallback 2: Try without region if still low results
    if (!data || !data.results || data.results.length === 0) {
      console.log(`[TMDB] No results for ${providerIds} in ${region}, trying global...`);
      data = await this.fetchFromProxy(`discover/${type}`, { 
        with_watch_providers: providerIds,
        sort_by: 'popularity.desc'
      });
    }

    if (!data || !data.results) return [];
    return data.results.map((item: any) => this.mapToMovie(item, type));
  },

  async getJioHotstarContent() {
    // 122: Disney+ Hotstar, 220: JioCinema, 337: Disney Plus
    // Networks: 2739 (Disney+), 4474 (JioCinema)
    const movies = await this.getByProvider('122|220|337', '2739|4474', 'movie');
    const tv = await this.getByProvider('122|220|337', '2739|4474', 'tv');
    
    const combined = [...movies, ...tv];
    return combined
      .sort((a, b) => {
        const r1 = a.rating === 'NR' ? 0 : parseFloat(a.rating);
        const r2 = b.rating === 'NR' ? 0 : parseFloat(b.rating);
        return r2 - r1;
      })
      .slice(0, 40);
  },

  async getAmazonPrimeContent() {
    // 119: Amazon Prime Video, 9: Amazon
    // Networks: 1024 (Amazon)
    const movies = await this.getByProvider('119|9', '1024', 'movie');
    const tv = await this.getByProvider('119|9', '1024', 'tv');
    
    const combined = [...movies, ...tv];
    return combined
      .sort((a, b) => {
        const r1 = a.rating === 'NR' ? 0 : parseFloat(a.rating);
        const r2 = b.rating === 'NR' ? 0 : parseFloat(b.rating);
        return r2 - r1;
      })
      .slice(0, 40);
  },

  async getTVSeasonDetails(tvId: string, seasonNumber: number) {
    const data = await this.fetchFromProxy(`tv/${tvId}/season/${seasonNumber}`);
    if (!data || !data.episodes) return [];
    
    return data.episodes.map((ep: any) => ({
      id: String(ep.id),
      number: ep.episode_number,
      seasonNumber: ep.season_number,
      title: ep.name,
      description: ep.overview,
      duration: ep.runtime ? `${ep.runtime}m` : '45m',
      thumbnailUrl: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : null,
      videoUrl: `https://www.vidking.net/embed/tv/${tvId}/${ep.season_number}/${ep.episode_number}`
    }));
  },

  async getMovieDetails(id: string, type: 'movie' | 'tv' = 'movie') {
    const data = await this.fetchFromProxy(`${type}/${id}`, { append_to_response: 'credits,videos,recommendations' });
    if (!data) return null;
    
    const movie = this.mapToMovie(data, type);
    movie.genres = (data.genres || []).map((g: any) => g.name);
    movie.cast = (data.credits?.cast || []).slice(0, 10).map((c: any) => c.name);
    movie.duration = type === 'tv' 
      ? `${data.number_of_seasons} Season${data.number_of_seasons > 1 ? 's' : ''}`
      : `${data.runtime} min`;
    
    if (type === 'tv' && data.seasons && data.seasons.length > 0) {
      // Fetch episodes for the first season by default
      const firstSeason = data.seasons.find((s: any) => s.season_number > 0) || data.seasons[0];
      movie.episodes = await this.getTVSeasonDetails(id, firstSeason.season_number);
      // Store all seasons info for UI to switch
      (movie as any).seasons = data.seasons.map((s: any) => ({
        number: s.season_number,
        name: s.name,
        episodeCount: s.episode_count,
        id: s.id
      }));
    }

    // Find a trailer
    const trailer = data.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
    if (trailer) {
      movie.trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
    }

    return movie;
  }
};
