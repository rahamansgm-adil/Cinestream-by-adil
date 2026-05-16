import axios from 'axios';
import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const tmdbKey = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;
  
  if (!tmdbKey) {
    console.error("[TMDB Function] API Key Missing");
    return {
      statusCode: 401,
      body: JSON.stringify({ 
        error: 'TMDB API Key missing in Netlify environment variables.',
        message: 'Please add TMDB_API_KEY to your Netlify Site Configuration (Build & Deploy > Environment).' 
      })
    };
  }

  const fullPath = event.path;
  // Handle different path patterns
  const tmdbBase = '/.netlify/functions/tmdb';
  const tmdbPath = fullPath.startsWith(tmdbBase) 
    ? fullPath.substring(tmdbBase.length).replace(/^\//, '')
    : fullPath.split('/tmdb/').pop() || '';

  if (!tmdbPath) {
    console.warn("[TMDB Function] Missing path in request:", fullPath);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing TMDB path' })
    };
  }

  const query = event.queryStringParameters || {};
  const effectiveKey = tmdbKey.trim();
  const isBearer = effectiveKey.length > 40 || effectiveKey.startsWith('ey');

  console.log(`[TMDB Function] Requesting: ${tmdbPath} | Auth: ${isBearer ? 'Bearer' : 'V3 API Key'}`);

  try {
    const headers: any = {
      'Accept': 'application/json',
      'User-Agent': 'CineStream-Netlify-Proxy'
    };

    let url = `https://api.themoviedb.org/3/${tmdbPath}`;
    const params = { ...query };

    if (isBearer) {
      const token = effectiveKey.replace(/^Bearer\s+/i, '');
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      params['api_key'] = effectiveKey;
    }

    const response = await axios.get(url, { 
      headers, 
      params,
      timeout: 12000 
    });

    console.log(`[TMDB Function] Success: ${tmdbPath} (${response.status})`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify(response.data)
    };
  } catch (error: any) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    console.error(`[TMDB Function] Error ${status}:`, errorData);
    
    return {
      statusCode: status,
      body: JSON.stringify(errorData)
    };
  }
};
