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
}

export const MOVIES: Movie[] = [];

export const CATEGORIES: any[] = [];
