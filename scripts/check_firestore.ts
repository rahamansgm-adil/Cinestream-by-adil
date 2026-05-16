
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkMovies() {
  try {
    const snapshot = await getDocs(collection(db, 'movies'));
    const movies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Firestore Movies:', JSON.stringify(movies, null, 2));
  } catch (error) {
    console.error('Error fetching movies:', error);
  }
}

checkMovies();
