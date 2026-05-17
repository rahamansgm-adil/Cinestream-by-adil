import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
// You MUST use the firestoreDatabaseId from the firebase-applet-config.json file
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const signInWithGithub = async () => {
  try {
    const result = await signInWithPopup(auth, githubProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Github", error);
    throw error;
  }
};

export const signInGuest = async () => {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error("Error signing in as Guest", error);
    throw error;
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection strictly as per guidelines
async function testConnection() {
  const MAX_RETRIES = 2;
  let attempt = 0;
  
  const tryConnect = async () => {
    try {
      // Use a slightly longer timeout for the initial connection check
      await getDocFromServer(doc(db, 'test', 'connection'));
      console.log("[Firebase] Successfully connected to Firestore.");
    } catch (error: any) {
      attempt++;
      if (attempt <= MAX_RETRIES && (error.message.includes('the client is offline') || error.message.includes('unavailable') || error.code === 'deadline-exceeded')) {
        console.warn(`[Firebase] Connection attempt ${attempt} failed, retrying in 2s...`);
        setTimeout(tryConnect, 2000);
        return;
      }

      if(error instanceof Error) {
        if (error.message.includes('the client is offline') || error.message.includes('unavailable')) {
          console.error("Firebase connection error: The backend is unavailable or the client is offline. Please ensure the Firestore database is provisioned and your Firebase project is healthy.");
          console.error("Technical Details:", error.message);
        } else {
          console.error("Firebase Connection Warning:", error.message);
        }
      }
    }
  };
  
  tryConnect();
}
testConnection();
