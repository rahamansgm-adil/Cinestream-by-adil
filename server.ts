import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import axios from "axios";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import fs from "fs";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth as getAdminAuth } from "firebase-admin/auth";

// Load configuration from firebase-applet-config.json
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

// Initialize Firebase Admin
let adminApp: any;
let adminDb: any;
let adminAuth: any;

try {
  if (getApps().length === 0) {
    adminApp = initializeApp({
      projectId: firebaseConfig.projectId || "gen-lang-client-0142261778"
    });
  } else {
    adminApp = getApps()[0];
  }
  
  // Target specific database if possible, otherwise use default
  const DB_ID = firebaseConfig.firestoreDatabaseId || "ai-studio-e0e42522-df9a-41a3-aa8c-a2951e43c281";
  adminDb = getFirestore(adminApp, DB_ID);
  adminAuth = getAdminAuth(adminApp);
  console.log(`[Admin] Init with DB ID: ${DB_ID}`);
} catch (err) {
  console.error("[Admin] Firebase Admin initialization failed:", err);
}

// Middleware to verify Firebase ID Token (Bypass for owner)
const verifyAdminToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    console.error(`[Admin] No token provided for ${req.method} ${req.path}`);
    return res.status(401).json({ error: "Unauthorized: Admin privileges required" });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userEmail = decodedToken.email?.toLowerCase();
    
    // Explicitly allow the owner's email
    if (userEmail === 'rahamansgmadil2@gmail.com') {
      return next();
    }
    
    console.warn(`[Admin] Access denied for user: ${userEmail}`);
  } catch (err: any) {
    console.error(`[Admin] Token verification failed:`, err.message);
  }

  res.status(401).json({ error: "Unauthorized: Invalid admin token" });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log("[EnvCheck] PROJECT_ID:", process.env.GOOGLE_CLOUD_PROJECT);
  console.log("[EnvCheck] FIREBASE_CONFIG:", process.env.FIREBASE_CONFIG ? "Exists" : "Missing");
  console.log("[EnvCheck] TMDB_API_KEY:", process.env.TMDB_API_KEY ? `Present (length: ${process.env.TMDB_API_KEY.length})` : "Missing");

  // Advanced CORS Configuration for Media Streaming
  app.use(cors({
    origin: (origin, callback) => {
      // In development/AI Studio, we often allow all for convenience, but can be restricted
      callback(null, true);
    },
    credentials: true,
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type']
  }));

  // Security Headers using Helmet - Configured for Media/CORS 
  app.use(helmet({
    contentSecurityPolicy: false, // Temporarily disable to fix Firebase "network-request-failed" errors
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
  }));

  // We still want to allow the app to be framed by AI Studio and Google Services
  app.use((req, res, next) => {
    res.setHeader("X-Frame-Options", "ALLOWALL");
    next();
  });

  app.use(express.json());
  app.use(cookieParser());

  // API Route for admin to add content
  app.post("/api/admin/add-content", verifyAdminToken, async (req, res) => {
    console.log(`[Admin] Attempting to add: ${req.body?.title}`);
    const authHeader = req.headers.authorization;
    
    try {
      // Helper to convert to Firestore REST format
      const toFirestoreValue = (val: any): any => {
        if (val === null || val === undefined) return { nullValue: null };
        if (typeof val === 'string') return { stringValue: val };
        if (typeof val === 'number') {
          // Firestore REST expects integers as strings for high precision
          if (Number.isInteger(val)) return { integerValue: val.toString() };
          return { doubleValue: val };
        }
        if (typeof val === 'boolean') return { booleanValue: val };
        if (val instanceof Date) return { timestampValue: val.toISOString() };
        
        if (Array.isArray(val)) {
          return { arrayValue: { values: val.map(v => toFirestoreValue(v)) } };
        }
        
        if (typeof val === 'object') {
          const fields: any = {};
          for (const key in val) {
            if (val.hasOwnProperty(key) && val[key] !== undefined) {
              fields[key] = toFirestoreValue(val[key]);
            }
          }
          return { mapValue: { fields } };
        }
        
        return { stringValue: String(val) };
      };

      const fields: any = {};
      const body = { 
        ...req.body, 
        createdAt: new Date().toISOString(),
        // Ensure arrays are initialized if missing to avoid errors in mapping
        genres: req.body.genres || [],
        cast: req.body.cast || [],
        subtitles: req.body.subtitles || [],
        episodes: req.body.episodes || []
      };
      
      for (const key in body) {
        if (body[key] !== undefined) {
          fields[key] = toFirestoreValue(body[key]);
        }
      }

      const contentData = { fields };
      
      const projectId = "gen-lang-client-0142261778";
      const databaseId = "ai-studio-e0e42522-df9a-41a3-aa8c-a2951e43c281";
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/movies`;
      
      console.log(`[Admin] Proxying to Firestore REST API: ${firestoreUrl}`);
      
      const response = await axios.post(firestoreUrl, contentData, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      
      const docPath = response.data.name;
      const docId = docPath.split('/').pop();
      
      console.log(`[Admin] Saved successfully via REST! ID: ${docId}`);
      res.json({ success: true, id: docId });
    } catch (error: any) {
      console.error("[Admin] REST API attempt failed:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ 
        error: error.response?.data?.error?.message || error.message,
        details: "Firestore REST API error. This bypasses Server IAM by using the User's own token."
      });
    }
  });

  // Redirect /admin to home page since we removed the admin login panel
  app.get("/admin", (req, res) => {
    res.redirect("/");
  });

  // API Route for Google Drive Streaming Proxy
  app.get("/api/stream", async (req, res) => {
    const fileId = req.query.id as string;
    if (!fileId) {
      return res.status(400).send("File ID is required");
    }

    let driveUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    try {
      const range = req.headers.range;
      const headers: any = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      };
      
      // First, try a GET request but with responseType: 'stream' to avoid loading large files into memory
      const initialResponse = await axios.get(driveUrl, { 
        headers: headers,
        maxRedirects: 5,
        responseType: 'stream'
      });

      // If Google returns an HTML page, it might be the virus scan warning
      const contentTypeCheck = initialResponse.headers['content-type'] as string | undefined;
      if (contentTypeCheck?.includes('text/html')) {
        // Read just enough of the start to find the confirm token
        let text = "";
        try {
          for await (const chunk of initialResponse.data) {
            text += chunk.toString();
            const confirmMatch = text.match(/confirm=([a-zA-Z0-9\-_]+)/);
            if (confirmMatch && confirmMatch[1]) {
              driveUrl += `&confirm=${confirmMatch[1]}`;
              console.log(`[Stream] Found confirm token for ${fileId}: ${confirmMatch[1]}`);
              break;
            }
            if (text.length > 1024 * 50) break; // 50KB limit
          }
        } catch (e) {
          console.warn("Stream read error:", e);
        }
      }
      if (initialResponse.data) initialResponse.data.destroy();

      if (range) {
        headers['Range'] = range;
      }

      const driveResponse = await axios({
        method: 'get',
        url: driveUrl,
        responseType: 'stream',
        headers: headers,
        timeout: 30000
      });

      const contentType = driveResponse.headers['content-type'];
      const contentLength = driveResponse.headers['content-length'];
      const contentRange = driveResponse.headers['content-range'];
      const acceptRanges = (driveResponse.headers['accept-ranges'] as string) || 'bytes';
      const outgoingContentType = contentType && contentType !== 'application/octet-stream' 
        ? contentType 
        : (driveUrl.includes('.vtt') ? 'text/vtt' : (driveUrl.includes('.srt') ? 'text/plain' : 'video/mp4'));

      res.status(driveResponse.status);
      res.setHeader('Content-Type', String(outgoingContentType));
      res.setHeader('Content-Disposition', 'inline');
      if (contentLength) res.setHeader('Content-Length', String(contentLength));
      if (contentRange) res.setHeader('Content-Range', String(contentRange));
      res.setHeader('Accept-Ranges', String(acceptRanges));
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Access-Control-Allow-Origin', '*'); 

      console.log(`[Stream] Streaming file ${fileId}`);
      console.log(`[Stream] Status: ${driveResponse.status}, Content-Type: ${outgoingContentType}`);
      console.log(`[Stream] Range: ${range || 'none'}`);

      // Handle client disconnects to prevent memory leaks or hanging streams
      req.on('close', () => {
        if (driveResponse.data && !driveResponse.data.destroyed) {
          driveResponse.data.destroy();
        }
      });

      driveResponse.data.pipe(res);
    } catch (error: any) {
      console.error("Streaming error:", error.message);
      res.status(500).send("Error streaming from Google Drive. Ensure the file is shared as 'Anyone with the link can view'.");
    }
  });

  // Admin Verification Route
  app.get("/api/admin/verify", async (req, res) => {
    const authHeader = req.headers.authorization;
    
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.json({ isAdmin: false });
    }

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      if (decodedToken.email?.toLowerCase() === 'rahamansgmadil2@gmail.com') {
        return res.json({ isAdmin: true });
      }
      res.json({ isAdmin: false });
    } catch (err: any) {
      console.error(`[Admin] Verify failed:`, err.message);
      res.json({ isAdmin: false });
    }
  });

  // API Route for TMDB Proxy
  app.get("/api/tmdb/*", async (req, res) => {
    const tmdbKey = process.env.TMDB_API_KEY;
    const viteTmdbKey = process.env.VITE_TMDB_API_KEY;
    
    // Trim and sanitize key
    let effectiveKey = (tmdbKey || viteTmdbKey || "").trim();
    
    if (!effectiveKey) {
      console.warn("[TMDB] Attempted fetch without API key");
      return res.status(401).json({ 
        error: "TMDB API Key missing", 
        message: "Please set TMDB_API_KEY in the environment variables (Settings > Secrets)." 
      });
    }

    const path = req.params[0];
    if (!path) {
      return res.status(400).json({ error: "Missing TMDB path" });
    }

    const query = req.query;
    
    try {
      // TMDB v3 keys are exactly 32 hex chars. v4 tokens are much longer.
      const isBearer = effectiveKey.length > 40 || effectiveKey.startsWith('ey');
      const headers: any = {
        'Accept': 'application/json',
        'User-Agent': 'CineStream-App'
      };
      
      let url = `https://api.themoviedb.org/3/${path}`;
      
      if (isBearer) {
        // Use v4 Bearer Token auth
        const token = effectiveKey.replace(/^Bearer\s+/i, '');
        headers['Authorization'] = `Bearer ${token}`;
        const queryString = new URLSearchParams(query as any).toString();
        if (queryString) url += `?${queryString}`;
      } else {
        // Use v3 api_key query param
        const queryString = new URLSearchParams({
          ...query as any,
          api_key: effectiveKey
        }).toString();
        url += `?${queryString}`;
      }

      console.log(`[TMDB] Proxying: ${path} | Type: ${isBearer ? 'Bearer' : 'V3 API Key'} | Key Length: ${effectiveKey.length}`);

      const response = await axios.get(url, { 
        headers,
        timeout: 30000 // Increased timeout to 30s for slower networks
      });
      
      res.json(response.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const data = error.response?.data || { error: "Failed to fetch from TMDB", details: error.message };
      
      console.error(`[TMDB] Error fetching ${path} (Status ${status}):`, data);
      res.status(status).json(data);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Explicitly handle index.html for SPA fallback in dev
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) return next();
      
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    fs.writeFileSync(path.join(process.cwd(), 'server_heartbeat.txt'), `Started at ${new Date().toISOString()}`);
    console.log(`[Server] CINEMATIC STREAMING SERVER STARTED`);
    console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
    console.log(`[Server] Mode: ${process.env.NODE_ENV || 'development'}`);
  });
}

console.log("[Server] Attempting to start Cinnamon server...");
startServer().catch((err) => {
  console.error("Critical server failure:", err);
  process.exit(1);
});
