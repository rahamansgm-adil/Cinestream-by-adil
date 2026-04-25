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
if (getApps().length === 0) {
  initializeApp({
    projectId: "gen-lang-client-0142261778"
  });
}

const adminDb = getFirestore("ai-studio-e0e42522-df9a-41a3-aa8c-a2951e43c281");
const adminAuth = getAdminAuth();

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-dev";
const ADMIN_USER = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASS = process.env.ADMIN_PASSWORD || "password123";

// Middleware to verify Admin JWT or Firebase ID Token
const verifyAdminToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies.admin_token;
  
  let token = cookieToken;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    console.warn(`[Admin] Token missing for ${req.method} ${req.path}`);
    return res.status(401).json({ error: "Unauthorized" });
  }

  // 1. Try verifying as manual Admin JWT
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.role === 'admin') {
      return next();
    }
  } catch (err) {
    // If JWT verification fails, try Firebase fallback
  }

  // 2. Try verifying as Firebase ID Token (Bypass for owner)
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    // Explicitly allow the owner's email
    if (decodedToken.email === 'rahamansgmadil2@gmail.com' && decodedToken.email_verified) {
      console.log(`[Admin] Owner bypassed login via Firebase token: ${decodedToken.email}`);
      return next();
    }
  } catch (err) {
    console.error(`[Admin] Token invalid for ${req.method} ${req.path}: token was not a valid admin JWT or Firebase ID token.`);
  }

  res.status(401).json({ error: "Invalid or expired token" });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json());
  app.use(cookieParser());

  // API Route for admin to add content
  app.post("/api/admin/add-content", verifyAdminToken, async (req, res) => {
    try {
      const contentData = {
        ...req.body,
        createdAt: FieldValue.serverTimestamp(),
      };
      
      const docRef = await adminDb.collection("movies").add(contentData);
      res.json({ success: true, id: docRef.id });
    } catch (error) {
      console.error("Error adding content via admin API:", error);
      res.status(500).json({ error: "Failed to add content" });
    }
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
      if (contentTypeCheck?.includes('text/html') && initialResponse.data) {
        // Read just enough of the start to find the confirm token
        const chunks: any[] = [];
        try {
          for await (const chunk of initialResponse.data) {
            chunks.push(chunk);
            const text = Buffer.concat(chunks).toString();
            const confirmMatch = text.match(/confirm=([a-zA-Z0-9\-_]+)/);
            if (confirmMatch && confirmMatch[1]) {
              driveUrl += `&confirm=${confirmMatch[1]}`;
              console.log(`Found confirm token for drive file ${fileId}`);
              break;
            }
            if (text.length > 1024 * 100) break; // Don't read more than 100KB of HTML
          }
        } catch (iterError) {
          console.warn("Error reading confirmation stream:", iterError);
        }
      }
      if (initialResponse.data) initialResponse.data.destroy(); // Close the stream from the check

      if (range) {
        headers['Range'] = range;
      }

      const driveResponse = await axios({
        method: 'get',
        url: driveUrl,
        responseType: 'stream',
        headers: headers,
        maxRedirects: 10 // Increase max redirects for safety
      });

      // Pass through headers from Google
      const contentType = driveResponse.headers['content-type'];
      const contentLength = driveResponse.headers['content-length'];
      const contentRange = driveResponse.headers['content-range'];
      const acceptRanges = (driveResponse.headers['accept-ranges'] as string) || 'bytes';

      // If Google doesn't provide a content-type or if it's application/octet-stream,
      // we can try to be more helpful for the video player
      let outgoingContentType = contentType as string;
      if (!outgoingContentType || outgoingContentType === 'application/octet-stream') {
        outgoingContentType = 'video/mp4'; 
      }

      // Set status code based on whether it's a partial content response
      res.status(driveResponse.status);
      
      res.setHeader('Content-Type', outgoingContentType);
      if (contentLength) res.setHeader('Content-Length', contentLength as string);
      if (contentRange) res.setHeader('Content-Range', contentRange as string);
      res.setHeader('Accept-Ranges', acceptRanges);
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Access-Control-Allow-Origin', '*'); // Ensure CORS is open for the stream

      console.log(`[Stream] Streaming file ${fileId}`);
      console.log(`[Stream] URL: ${driveUrl}`);
      console.log(`[Stream] Status: ${driveResponse.status}`);
      console.log(`[Stream] Content-Type: ${outgoingContentType}`);
      console.log(`[Stream] Range: ${range || 'None'}`);

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

  // Admin Authentication Route
  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USER && password === ADMIN_PASS) {
      const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
      
      console.log(`[Admin] Login successful for user: ${username}`);
      res.cookie("admin_token", token, {
        httpOnly: true,
        secure: false, // Set to false for dev/proxy compatibility
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return res.json({ success: true, isAdmin: true, token });
    }

    console.warn(`[Admin] Login failed for user: ${username}`);
    res.status(401).json({ success: false, message: "Invalid credentials" });
  });

  // Admin Verification Route
  app.get("/api/admin/verify", async (req, res) => {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies.admin_token;
    
    let token = cookieToken;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.json({ isAdmin: false });
    }

    try {
      // Check Admin JWT first
      try {
        jwt.verify(token, JWT_SECRET);
        return res.json({ isAdmin: true });
      } catch (e) {}

      // Check Firebase Token as fallback
      const decodedToken = await adminAuth.verifyIdToken(token);
      if (decodedToken.email === 'rahamansgmadil2@gmail.com' && decodedToken.email_verified) {
        return res.json({ isAdmin: true });
      }
      
      res.json({ isAdmin: false });
    } catch (err) {
      res.json({ isAdmin: false });
    }
  });

  // Admin Logout Route
  app.post("/api/admin/logout", (req, res) => {
    res.clearCookie("admin_token");
    res.json({ success: true });
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
