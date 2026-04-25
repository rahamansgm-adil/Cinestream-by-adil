import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import axios from "axios";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth as getAdminAuth } from "firebase-admin/auth";

// Initialize Firebase Admin
let adminApp;
if (getApps().length === 0) {
  adminApp = initializeApp({
    projectId: "gen-lang-client-0142261778"
  });
} else {
  adminApp = getApps()[0];
}

// Target specific database if possible, otherwise use default
const DB_ID = "ai-studio-e0e42522-df9a-41a3-aa8c-a2951e43c281";
let adminDb = getFirestore(adminApp, DB_ID);
const adminAuth = getAdminAuth(adminApp);

console.log(`[Admin] Init with DB ID: ${DB_ID}`);

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

  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json());
  app.use(cookieParser());

  // API Route for admin to add content
  app.post("/api/admin/add-content", verifyAdminToken, async (req, res) => {
    console.log(`[Admin] Attempting to add: ${req.body?.title}`);
    const authHeader = req.headers.authorization;
    
    try {
      const contentData = {
        fields: {
          title: { stringValue: req.body.title },
          videoUrl: { stringValue: req.body.videoUrl },
          thumbnailUrl: { stringValue: req.body.thumbnailUrl },
          createdBy: { stringValue: req.body.createdBy },
          createdAt: { timestampValue: new Date().toISOString() },
          description: { stringValue: req.body.description || "" },
          duration: { stringValue: req.body.duration || "" },
          year: { stringValue: req.body.year || "" },
          rating: { stringValue: req.body.rating || "" },
          trailerUrl: { stringValue: req.body.trailerUrl || "" },
          logoUrl: { stringValue: req.body.logoUrl || "" }
        }
      };
      
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
      const outgoingContentType = contentType && contentType !== 'application/octet-stream' ? contentType : 'video/mp4';

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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical server failure:", err);
  process.exit(1);
});
