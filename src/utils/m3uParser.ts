import axios from 'axios';
import { parse } from 'iptv-playlist-parser';

export interface IPTVChannel {
  name: string;
  url: string;
  logo: string;
  group: string;
}

const CUSTOM_CHANNELS: IPTVChannel[] = [
  {
    name: 'Star Sports 1 HD (IPL Live)',
    url: 'https://www.mhdtvworld.com/live-tv/star-sports-1-hd/',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Star_Sports_logo.png',
    group: 'Sports / IPL'
  },
  {
    name: 'Star Sports Select 1 HD',
    url: 'https://www.mhdtvworld.com/live-tv/star-sports-select-1-hd/',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f7/Star_Sports_Select.svg/1200px-Star_Sports_Select.svg.png',
    group: 'Sports'
  },
  {
    name: 'Star Sports 2 (Live)',
    url: 'https://www.mhdtvworld.com/live-tv/star-sports-2/',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Star_Sports_logo.png',
    group: 'Sports'
  },
  {
    name: 'Star Sports 3 (Live)',
    url: 'https://www.mhdtvworld.com/live-tv/star-sports-3/',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Star_Sports_logo.png',
    group: 'Sports'
  }
];

export const fetchIPTVPlaylist = async (url: string = 'https://iptv-org.github.io/iptv/index.m3u'): Promise<IPTVChannel[]> => {
  try {
    const response = await axios.get(url);
    const result = parse(response.data);
    
    const parsedChannels = result.items.map(item => ({
      name: item.name || 'Unknown Channel',
      url: item.url,
      logo: item.tvg.logo || '',
      group: item.group.title || 'General'
    }));

    // Merge custom channels at the top
    return [...CUSTOM_CHANNELS, ...parsedChannels];
  } catch (error) {
    console.error('Error fetching IPTV playlist:', error);
    return CUSTOM_CHANNELS; // Return at least custom channels on error
  }
};
