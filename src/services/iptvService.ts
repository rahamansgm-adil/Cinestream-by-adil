import axios from 'axios';

export interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export interface XtreamStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string;
  added: string;
  category_id: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
  thumbnail?: string;
  container_extension?: string;
}

export interface XtreamVOD {
  num: number;
  name: string;
  stream_id: number;
  stream_icon: string;
  rating: string;
  rating_5count: number;
  added: string;
  category_id: string;
  container_extension: string;
  custom_sid: string;
  direct_source: string;
}

export interface IPTVProvider {
  id: string;
  name: string;
  type: 'm3u' | 'xtream';
  url: string;
  username?: string;
  password?: string;
  lastUsed?: number;
}

class IPTVService {
  private currentProvider: IPTVProvider | null = null;

  setProvider(provider: IPTVProvider) {
    this.currentProvider = provider;
  }

  async fetchXtream(action: 'get_live_categories' | 'get_live_streams' | 'get_vod_categories' | 'get_vod_streams' | 'get_series_categories' | 'get_series', categoryId?: string) {
    if (!this.currentProvider || this.currentProvider.type !== 'xtream') {
      throw new Error('No active Xtream provider');
    }

    const { url, username, password } = this.currentProvider;
    const params: any = {
      host: url,
      username,
      password,
      action
    };

    if (categoryId) {
      params.category_id = categoryId;
    }

    const response = await axios.get('/api/iptv/xtream', { params });
    return response.data;
  }

  generateXtreamUrl(streamId: number | string, type: 'live' | 'movie' | 'series' = 'live', extension: string = 'm3u8') {
    if (!this.currentProvider) return '';
    const { url, username, password } = this.currentProvider;
    
    let path = '';
    if (type === 'live') path = `${streamId}.${extension}`;
    else if (type === 'movie') path = `movie/${username}/${password}/${streamId}.${extension}`;
    else path = `series/${username}/${password}/${streamId}.${extension}`;

    // Note: Live streams usually follow: http://host:port/live/user/pass/streamid.m3u8
    if (type === 'live') {
        return `${url}/live/${username}/${password}/${streamId}.${extension}`;
    }
    
    return `${url}/${path}`;
  }
}

export const iptvService = new IPTVService();
