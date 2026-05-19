
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

async function runFix() {
  const CONFIG_PATH = path.join(process.cwd(), "firebase-applet-config.json");
  let firebaseConfig: any = {};

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      firebaseConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
      console.log(`[Config] Loaded Firebase config for project: ${firebaseConfig.projectId}`);
    }
  } catch (err) {
    console.error("[Config] Error loading firebase-applet-config.json:", err);
  }

  // Initialize Firebase Admin (minimal init for server-side scripts in this env)
  if (getApps().length === 0) {
    initializeApp({
      projectId: firebaseConfig.projectId
    });
  }

  const DB_ID = firebaseConfig.firestoreDatabaseId || "ai-studio-e0e42522-df9a-41a3-aa8c-a2951e43c281";
  const db = getFirestore(undefined, DB_ID);

  console.log(`Checking 'movies' collection in DB: ${DB_ID}`);
  
  const snapshot = await db.collection('movies').get();
  console.log(`Found ${snapshot.size} documents.`);

  for (const doc of snapshot.docs) {
    const data = doc.data();
    let updated = false;
    let movieUpdate: any = {};

    // 1. Fix main videoUrl
    if (data.videoUrl && data.videoUrl.includes('vidking.net') && !data.videoUrl.includes('autoPlay=')) {
      const separator = data.videoUrl.includes('?') ? '&' : '?';
      movieUpdate.videoUrl = `${data.videoUrl}${separator}autoPlay=true&nextEpisode=true&episodeSelector=true`;
      updated = true;
    }

    // 2. Fix episodes videoUrls
    if (Array.isArray(data.episodes)) {
      let episodesUpdated = false;
      const newEpisodes = data.episodes.map((ep: any) => {
        if (ep.videoUrl && ep.videoUrl.includes('vidking.net') && !ep.videoUrl.includes('autoPlay=')) {
          const separator = ep.videoUrl.includes('?') ? '&' : '?';
          episodesUpdated = true;
          return { ...ep, videoUrl: `${ep.videoUrl}${separator}autoPlay=true&nextEpisode=true&episodeSelector=true` };
        }
        return ep;
      });

      if (episodesUpdated) {
        movieUpdate.episodes = newEpisodes;
        updated = true;
      }
    }

    if (updated) {
      console.log(`Updating document ${doc.id} (${data.title})`);
      await doc.ref.update(movieUpdate);
    }
  }

  console.log("Database update complete.");
}

runFix().catch(console.error);
