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
        timeout: 40000 // Increased to 40s to allow server proxy time to respond
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

  genreMap: {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
    99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
    27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
    10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
    10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
    10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics'
  },

  uniqueById<T extends { id: string }>(items: T[]): T[] {
    if (!items) return [];
    // Only keep items with a valid, non-empty id, and ensure they are unique
    const uniqueMap = new Map<string, T>();
    items.forEach(item => {
      if (item && item.id && item.id !== 'undefined' && item.id !== 'null') {
        uniqueMap.set(item.id, item);
      }
    });
    return Array.from(uniqueMap.values());
  },

  mapToMovie(tmdbItem: any, type: 'movie' | 'tv' = 'movie'): Movie {
    const isTV = type === 'tv';
    let genres = (tmdbItem.genre_ids || []).map((id: number) => (this as any).genreMap[id]).filter(Boolean);
    
    // Check for RomCom
    if (genres.includes('Romance') && genres.includes('Comedy')) {
      genres.push('RomCom');
    }

    genres = Array.from(new Set(genres));

    return {
      id: String(tmdbItem.id),
      title: tmdbItem.title || tmdbItem.name || 'Untitled',
      description: tmdbItem.overview || 'No description available.',
      thumbnailUrl: tmdbItem.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbItem.poster_path}` : 'https://via.placeholder.com/500x750',
      bannerUrl: tmdbItem.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdbItem.backdrop_path}` : 'https://via.placeholder.com/1920x1080',
      videoUrl: isTV 
        ? `https://vidlink.pro/tv/${tmdbItem.id}/1/1?primaryColor=63b8bc&secondaryColor=a2a2a2&iconColor=eefdec&icons=default&player=jw&title=true&poster=true&autoplay=true&nextbutton=true` 
        : `https://vidlink.pro/movie/${tmdbItem.id}?primaryColor=63b8bc&secondaryColor=a2a2a2&iconColor=eefdec&icons=default&player=jw&title=true&poster=true&autoplay=true&nextbutton=true`,
      duration: isTV ? 'Series' : 'Feature',
      year: (tmdbItem.release_date || tmdbItem.first_air_date || '').split('-')[0] || 'Unknown',
      rating: String(tmdbItem.vote_average || 'NR'),
      genres: genres,
      cast: [],
      contentType: type
    };
  },

  async getTrending(type: 'movie' | 'tv' | 'all' = 'all') {
    const pages = [1, 2, 3];
    const results = await Promise.all(pages.map(page => this.fetchFromProxy(`trending/${type}/week`, { page })));
    const combined = results.flatMap(data => (data?.results || []));
    if (combined.length === 0) return [];
    const movies = combined.map((item: any) => this.mapToMovie(item, item.media_type || (type === 'all' ? 'movie' : type)));
    return this.uniqueById(movies);
  },

  async getPopular(type: 'movie' | 'tv' = 'movie') {
    const pages = [1, 2, 3];
    const results = await Promise.all(pages.map(page => this.fetchFromProxy(`${type}/popular`, { page })));
    const combined = results.flatMap(data => (data?.results || []));
    if (combined.length === 0) return [];
    const movies = combined.map((item: any) => this.mapToMovie(item, type));
    return this.uniqueById(movies);
  },

  async search(query: string) {
    const data = await this.fetchFromProxy('search/multi', { query });
    if (!data || !data.results) return [];
    const movies = data.results
      .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
      .map((item: any) => this.mapToMovie(item, item.media_type));
    return this.uniqueById(movies);
  },

  async getNetflixOriginals() {
    // TMDB Network ID for Netflix is 213
    const pages = [1, 2, 3];
    const results = await Promise.all(pages.map(page => this.fetchFromProxy('discover/tv', { with_networks: 213, sort_by: 'popularity.desc', page })));
    const combined = results.flatMap(data => (data?.results || []));
    if (combined.length === 0) return [];
    const movies = combined.map((item: any) => this.mapToMovie(item, 'tv'));
    return this.uniqueById(movies);
  },

  async getLatestRelease() {
    const pages = [1, 2, 3];
    const results = await Promise.all(pages.map(page => this.fetchFromProxy('movie/now_playing', { page })));
    const combined = results.flatMap(data => (data?.results || []));
    if (combined.length === 0) return [];
    const movies = combined.map((item: any) => this.mapToMovie(item, 'movie'));
    return this.uniqueById(movies);
  },

  async getTopRated(type: 'movie' | 'tv' = 'movie') {
    const pages = [1, 2, 3];
    const results = await Promise.all(pages.map(page => this.fetchFromProxy(`${type}/top_rated`, { page })));
    const combined = results.flatMap(data => (data?.results || []));
    if (combined.length === 0) return [];
    const movies = combined.map((item: any) => this.mapToMovie(item, type));
    return this.uniqueById(movies);
  },

  async getByGenre(genreId: number, type: 'movie' | 'tv' = 'movie') {
    const pages = [1, 2, 3];
    const results = await Promise.all(pages.map(page => this.fetchFromProxy(`discover/${type}`, { with_genres: genreId, page })));
    const combined = results.flatMap(data => (data?.results || []));
    if (combined.length === 0) return [];
    const movies = combined.map((item: any) => this.mapToMovie(item, type));
    return this.uniqueById(movies);
  },

  async getByProvider(providerIds: string, networkIds: string = '', type: 'movie' | 'tv' = 'movie', region: string = 'IN') {
    const pages = [1, 2, 3];
    
    // Attempt to fetch from multiple pages to get 50-60 items
    const fetchPages = async (pIds: string, nIds: string, rgn: string) => {
      const results = await Promise.all(pages.map(page => 
        this.fetchFromProxy(`discover/${type}`, { 
          with_watch_providers: pIds, 
          watch_region: rgn,
          sort_by: 'popularity.desc',
          page,
          ...(nIds ? { with_networks: nIds } : {})
        })
      ));
      return results.flatMap(data => (data?.results || []));
    };

    let combinedResults = await fetchPages(providerIds, '', region);
    
    // Fallback 1: Try with network IDs if provided (often more reliable for "Originals")
    if ((combinedResults.length < 10) && networkIds) {
      console.log(`[TMDB] Low results for ${providerIds} in ${region}, trying highlights from networks ${networkIds}...`);
      const networkResults = await fetchPages('', networkIds, '');
      if (networkResults.length > combinedResults.length) {
        combinedResults = networkResults;
      }
    }
    
    // Fallback 2: Try without region if still low results
    if (combinedResults.length === 0) {
      console.log(`[TMDB] No results for ${providerIds} in ${region}, trying global...`);
      combinedResults = await fetchPages(providerIds, '', '');
    }

    const uniqueResults = Array.from(new Map(combinedResults.map(m => [m.id, m])).values());
    return uniqueResults.map((item: any) => this.mapToMovie(item, type));
  },

  async getJioHotstarContent() {
    // 122: Disney+ Hotstar, 220: JioCinema, 337: Disney Plus
    // Networks: 2739 (Disney+), 4474 (JioCinema)
    const movies = await this.getByProvider('122|220|337', '2739|4474', 'movie');
    const tv = await this.getByProvider('122|220|337', '2739|4474', 'tv');
    
    const combined = [...movies, ...tv];
    return this.uniqueById(combined)
      .sort((a, b) => {
        const r1 = a.rating === 'NR' ? 0 : parseFloat(a.rating);
        const r2 = b.rating === 'NR' ? 0 : parseFloat(b.rating);
        return r2 - r1;
      })
      .slice(0, 80);
  },

  async getAmazonPrimeContent() {
    // 119: Amazon Prime Video, 9: Amazon
    // Networks: 1024 (Amazon)
    const movies = await this.getByProvider('119|9', '1024', 'movie');
    const tv = await this.getByProvider('119|9', '1024', 'tv');
    
    const combined = [...movies, ...tv];
    return this.uniqueById(combined)
      .sort((a, b) => {
        const r1 = a.rating === 'NR' ? 0 : parseFloat(a.rating);
        const r2 = b.rating === 'NR' ? 0 : parseFloat(b.rating);
        return r2 - r1;
      })
      .slice(0, 80);
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
      videoUrl: `https://vidlink.pro/tv/${tvId}/${ep.season_number}/${ep.episode_number}?primaryColor=63b8bc&secondaryColor=a2a2a2&iconColor=eefdec&icons=default&player=jw&title=true&poster=true&autoplay=true&nextbutton=true`
    }));
  },

  async getMovieDetails(id: string, type: 'movie' | 'tv' = 'movie') {
    const data = await this.fetchFromProxy(`${type}/${id}`, { append_to_response: 'credits,videos,recommendations,images', include_image_language: 'en,null' });
    if (!data) return null;
    
    const movie = this.mapToMovie(data, type);
    
    // Extract Logo
    if (data.images && data.images.logos && data.images.logos.length > 0) {
      // Prefer English logo
      const englishLogo = data.images.logos.find((l: any) => l.iso_639_1 === 'en');
      const logo = englishLogo || data.images.logos[0];
      movie.logoUrl = `https://image.tmdb.org/t/p/original${logo.file_path}`;
    }

    let rawGenres = (data.genres || []).map((g: any) => g.name);
    if (rawGenres.includes('Romance') && rawGenres.includes('Comedy')) {
      if (!rawGenres.includes('RomCom')) rawGenres.push('RomCom');
    }
    movie.genres = Array.from(new Set(rawGenres));
    movie.cast = (data.credits?.cast || []).slice(0, 10).map((c: any) => c.name);
    
    // Enrich with Cast Details (Images and Characters)
    movie.castDetails = (data.credits?.cast || []).slice(0, 12).map((c: any) => ({
      id: String(c.id),
      name: c.name,
      character: c.character,
      profileUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null
    }));

    // Find Director
    const director = data.credits?.crew?.find((c: any) => c.job === 'Director' || c.job === 'Executive Producer');
    if (director) {
      movie.director = {
        id: String(director.id),
        name: director.name,
        job: director.job,
        department: director.department,
        profileUrl: director.profile_path ? `https://image.tmdb.org/t/p/w185${director.profile_path}` : null,
        bio: '' // Bio requires another API call, we'll keep it simple for now or fetch if needed
      };
    }

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

    // Map recommendations
    if (data.recommendations && data.recommendations.results) {
      const recommendations = data.recommendations.results
        .slice(0, 15)
        .map((item: any) => this.mapToMovie(item, item.media_type || type));
      movie.recommendations = this.uniqueById(recommendations);
    }

    return movie;
  }
};
