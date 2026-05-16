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
  },
  {
    id: "273240",
    title: "Off Campus",
    description: "Hannah Wells tutors hockey captain Garrett Graham to win over her crush. Their deal becomes real connection as they face their pasts. Friends Logan, Dean, Tucker, and Allie navigate college life and love.",
    thumbnailUrl: "https://image.tmdb.org/t/p/w500/gtoV2udbEnUgkMuCNX8zJrEwm7N.jpg",
    bannerUrl: "https://image.tmdb.org/t/p/original/cdD0InWMH4e6AxceQs93fQRYsfO.jpg",
    videoUrl: "https://www.vidking.net/embed/tv/273240/1/1",
    duration: "1 Season",
    year: "2026",
    rating: "8.8",
    genres: ["Drama"],
    cast: ["Ella Bright", "Belmont Cameli", "Mika Abdalla", "Stephen Kalyn", "Antonio Cipriano"],
    contentType: 'tv',
    episodes: [
      { id: "e1", title: "The Deal", description: "A hockey-averse music major and Briar U's womanizing star center strike an unlikely deal to get her crush's attention and his grades up.", duration: "53m", number: 1, seasonNumber: 1, videoUrl: "https://www.vidking.net/embed/tv/273240/1/1" },
      { id: "e2", title: "The Practice", description: "Hannah and Garrett's faux relationship is put to the test as they are forced to share a room at an overnight house party.", duration: "50m", number: 2, seasonNumber: 1, videoUrl: "https://www.vidking.net/embed/tv/273240/1/2" },
      { id: "e3", title: "The Orgasm", description: "Just as Hannah and Garrett's deal begins working like a charm, Hannah ups the stakes by redefining the terms.", duration: "46m", number: 3, seasonNumber: 1, videoUrl: "https://www.vidking.net/embed/tv/273240/1/3" },
      { id: "e4", title: "The Breakup", description: "Hannah and Garrett get closer than either anticipated and things get messy when they're forced to confront their feelings at Drunk Shakespeare.", duration: "54m", number: 4, seasonNumber: 1, videoUrl: "https://www.vidking.net/embed/tv/273240/1/4" },
      { id: "e5", title: "The Cold Turkey", description: "Garrett brings Hannah home for Thanksgiving while Tucker hosts an epic Friendsgiving at the Off Campus house.", duration: "47m", number: 5, seasonNumber: 1, videoUrl: "https://www.vidking.net/embed/tv/273240/1/5" },
      { id: "e6", title: "The Breakaway", description: "At a hockey fundraiser, Garrett and Logan butt heads, Hannah and Justin's musical collaboration encounters its biggest hurdle, and romance simmers.", duration: "55m", number: 6, seasonNumber: 1, videoUrl: "https://www.vidking.net/embed/tv/273240/1/6" },
      { id: "e7", title: "The Faceoff", description: "Hannah confronts her past while Garrett faces the most challenging game of his season and Allie meets her hero.", duration: "54m", number: 7, seasonNumber: 1, videoUrl: "https://www.vidking.net/embed/tv/273240/1/7" },
      { id: "e8", title: "The Line Change", description: "As the semester ends, fallout from the St. Anthony's game rattles the Hawks, and Hannah strives to find her voice.", duration: "56m", number: 8, seasonNumber: 1, videoUrl: "https://www.vidking.net/embed/tv/273240/1/8" }
    ]
  }
];

export const CATEGORIES: any[] = [
  {
    id: "trending",
    title: "Trending Now",
    movieIds: ["374720", "273240"]
  },
  {
    id: "drama",
    title: "Dramas",
    movieIds: ["374720", "273240"]
  },
  {
    id: "war",
    title: "War Movies",
    movieIds: ["374720"]
  }
];
