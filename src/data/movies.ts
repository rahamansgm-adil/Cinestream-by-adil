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

export interface UserProgress {
  id: string;
  movieId: string;
  userId: string;
  progress: number; // current time in seconds
  duration: number; // total duration in seconds
  lastWatched: any; // timestamp
  episodeId?: string;
  contentType?: 'movie' | 'tv';
}

export const MOVIES: Movie[] = [
  {
    id: "374720",
    title: "Dunkirk",
    description: "The story of the miraculous evacuation of Allied soldiers from Belgium, Britain, Canada, and France, who were cut off and surrounded by the German army from the beaches and harbor of Dunkirk, France, during the Battle of France in World War II.",
    thumbnailUrl: "https://image.tmdb.org/t/p/w500/ebSnODmB92NcnzUtnvIbsrTMZv9.jpg",
    bannerUrl: "https://image.tmdb.org/t/p/original/6v7S7zD9eXpD8bNOfP2R3HkFvMv.jpg",
    videoUrl: "https://www.vidking.net/embed/movie/374720",
    duration: "106m",
    year: "2017",
    rating: "8.1",
    genres: ["War", "Action", "Drama"],
    cast: ["Fionn Whitehead", "Tom Glynn-Carney", "Jack Lowden", "Harry Styles", "Aneurin Barnard"],
    contentType: 'movie'
  }
];

export const CATEGORIES: any[] = [
  {
    id: "trending",
    title: "Trending Now",
    movieIds: ["374720"]
  },
  {
    id: "war",
    title: "War Movies",
    movieIds: ["374720"]
  }
];
