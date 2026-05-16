
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";

// Constants from server.ts
const PROJECT_ID = "gen-lang-client-0142261778";
const DB_ID = "ai-studio-e0e42522-df9a-41a3-aa8c-a2951e43c281";
const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY;

if (!TMDB_API_KEY) {
  console.error("TMDB API Key (VITE_TMDB_API_KEY) is missing in environment.");
  process.exit(1);
}

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({ projectId: PROJECT_ID });
}

const db = getFirestore(getApps()[0], DB_ID);

async function addDunkirk() {
  const tmdbId = 374720; // Dunkirk (2017)
  const videoUrl = `https://www.vidking.net/embed/movie/${tmdbId}`;

  try {
    console.log(`Fetching data for Dunkirk (ID: ${tmdbId})...`);
    const movieResp = await axios.get(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos`);
    const data = movieResp.data;

    const movie = {
      title: data.title,
      description: data.overview,
      thumbnailUrl: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
      bannerUrl: `https://image.tmdb.org/t/p/original${data.backdrop_path}`,
      videoUrl: videoUrl,
      duration: `${data.runtime}m`,
      year: data.release_date.split('-')[0],
      rating: data.vote_average.toFixed(1),
      genres: data.genres.map((g: any) => g.name),
      cast: data.credits.cast.slice(0, 5).map((c: any) => c.name),
      contentType: 'movie',
      createdAt: new Date().toISOString(),
      createdBy: 'Gemini Agent'
    };

    console.log("Adding movie to Firestore...");
    const docRef = await db.collection("movies").add(movie);
    console.log(`Successfully added Dunkirk with ID: ${docRef.id}`);

  } catch (error: any) {
    console.error("Failed to add movie:", error.response?.data || error.message);
    process.exit(1);
  }
}

addDunkirk();
