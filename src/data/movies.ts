export interface Subtitle {
  label: string;
  src: string;
  lang: string;
}

export interface Episode {
  id: string;
  number: number;
  seasonNumber?: number;
  title: string;
  description: string;
  videoUrl: string;
  duration: string;
  thumbnailUrl?: string;
  subtitles?: Subtitle[];
}

export interface Movie {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  bannerUrl: string;
  logoUrl?: string;
  videoUrl: string;
  trailerUrl?: string;
  duration: string;
  year: string;
  rating: string;
  genres: string[];
  cast: string[];
  contentType?: 'movie' | 'tv';
  episodes?: Episode[];
  subtitles?: Subtitle[];
}

export const MOVIES: Movie[] = [];

export const CATEGORIES: any[] = [];
