import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());

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
