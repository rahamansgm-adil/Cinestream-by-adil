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
    name: 'Sky Sports Main Event',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/fa/Sky_Sports_Main_Event.svg/1200px-Sky_Sports_Main_Event.svg.png',
    group: 'Sky Sports'
  },
  {
    name: 'Sky Sports Premier League',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/07/Sky_Sports_Premier_League.svg/1200px-Sky_Sports_Premier_League.svg.png',
    group: 'Sky Sports'
  },
  {
    name: 'Sky Sports Football',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/91/Sky_Sports_Football.svg/1200px-Sky_Sports_Football.svg.png',
    group: 'Sky Sports'
  },
  {
    name: 'Sky Sports Cricket',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/be/Sky_Sports_Cricket.svg/1200px-Sky_Sports_Cricket.svg.png',
    group: 'Sky Sports'
  },
  {
    name: 'Sky Sports Golf',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/52/Sky_Sports_Golf.svg/1200px-Sky_Sports_Golf.svg.png',
    group: 'Sky Sports'
  },
  {
    name: 'Sky Sports F1',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/7/77/Sky_Sports_F1.svg/1200px-Sky_Sports_F1.svg.png',
    group: 'Sky Sports'
  },
  {
    name: 'Sky Sports Action',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/87/Sky_Sports_Action.svg/1200px-Sky_Sports_Action.svg.png',
    group: 'Sky Sports'
  },
  {
    name: 'Sky Sports Arena',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/07/Sky_Sports_Arena.svg/1200px-Sky_Sports_Arena.svg.png',
    group: 'Sky Sports'
  },
  {
    name: 'Sky Sports News',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4e/Sky_Sports_News.svg/1200px-Sky_Sports_News.svg.png',
    group: 'Sky Sports'
  },
  {
    name: 'Sky Sports Racing',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e9/Sky_Sports_Racing.svg/1200px-Sky_Sports_Racing.svg.png',
    group: 'Sky Sports'
  },
  {
    name: 'Sky Sports Mix',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a2/Sky_Sports_Mix.svg/1200px-Sky_Sports_Mix.svg.png',
    group: 'Sky Sports'
  },
  {
    name: 'Sky Sports Tennis',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/91/Sky_Sports_Tennis.svg/1200px-Sky_Sports_Tennis.svg.png',
    group: 'Sky Sports'
  },
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
