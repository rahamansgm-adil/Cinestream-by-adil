import axios from 'axios';
import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const tmdbKey = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;
  
  if (!tmdbKey) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'TMDB API Key missing in Netlify environment variables.' })
    };
  }

  // Path is everything after /.netlify/functions/tmdb/
  // But redirects might change this.
  // We use the full path and extract what we need.
  const fullPath = event.path;
  const pathParts = fullPath.split('/tmdb/');
  const tmdbPath = pathParts.length > 1 ? pathParts[1] : '';

  if (!tmdbPath) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing TMDB path' })
    };
  }

  const query = event.queryStringParameters || {};
  const effectiveKey = tmdbKey.trim();
  const isBearer = effectiveKey.length > 40 || effectiveKey.startsWith('ey');

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
      timeout: 10000 
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response.data)
    };
  } catch (error: any) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    return {
      statusCode: status,
      body: JSON.stringify(errorData)
    };
  }
};
