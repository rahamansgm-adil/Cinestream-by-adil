export interface Episode {
  id: string;
  number: number;
  title: string;
  description: string;
  videoUrl: string;
  duration: string;
  thumbnailUrl?: string;
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
}

export const MOVIES: Movie[] = [];

export const CATEGORIES: any[] = [];
