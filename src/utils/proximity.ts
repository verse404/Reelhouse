import type { Cinema, CityId } from '../types/cinema';

export interface CityLocationHub {
  id: string;
  label: string;
  shortLabel: string;
  lat: number;
  lng: number;
}

export interface UserLocationOrigin {
  id: string; // 'cbd' | 'gps' | hub id
  label: string;
  shortLabel: string;
  lat: number;
  lng: number;
  isCustomOrigin: boolean;
}

export const CITY_LOCATION_HUBS: Record<CityId, CityLocationHub[]> = {
  melbourne: [
    {
      id: 'cbd',
      label: 'Melbourne CBD (Default)',
      shortLabel: 'CBD',
      lat: -37.8136,
      lng: 144.9631,
    },
    {
      id: 'carlton-fitzroy',
      label: 'Carlton / Fitzroy / Collingwood',
      shortLabel: 'Carlton/Fitzroy',
      lat: -37.7995,
      lng: 144.978,
    },
    {
      id: 'south-yarra-prahran',
      label: 'South Yarra / Prahran / Toorak',
      shortLabel: 'South Yarra',
      lat: -37.8442,
      lng: 144.9945,
    },
    {
      id: 'st-kilda-elsternwick',
      label: 'St Kilda / Elsternwick / Bayside',
      shortLabel: 'St Kilda/Bayside',
      lat: -37.873,
      lng: 144.991,
    },
    {
      id: 'hawthorn-camberwell',
      label: 'Hawthorn / Camberwell / Kew',
      shortLabel: 'Hawthorn/Camberwell',
      lat: -37.825,
      lng: 145.048,
    },
    {
      id: 'northcote-coburg',
      label: 'Northcote / Brunswick / Coburg',
      shortLabel: 'Northcote/Coburg',
      lat: -37.765,
      lng: 144.982,
    },
    {
      id: 'yarraville-footscray',
      label: 'Yarraville / Footscray / Inner West',
      shortLabel: 'Inner West',
      lat: -37.8105,
      lng: 144.894,
    },
    {
      id: 'docklands-southbank',
      label: 'Docklands / Southbank / Port Melb',
      shortLabel: 'Docklands/Southbank',
      lat: -37.822,
      lng: 144.948,
    },
    {
      id: 'chadstone-clayton',
      label: 'Chadstone / Caulfield / Monash',
      shortLabel: 'Chadstone/Monash',
      lat: -37.886,
      lng: 145.083,
    },
    {
      id: 'burwood-box-hill',
      label: 'Burwood / Box Hill / Glen Waverley',
      shortLabel: 'Burwood/Box Hill',
      lat: -37.845,
      lng: 145.122,
    },
    {
      id: 'doncaster-balwyn',
      label: 'Balwyn / Doncaster / Manningham',
      shortLabel: 'Balwyn/Doncaster',
      lat: -37.798,
      lng: 145.102,
    },
  ],
  sydney: [
    {
      id: 'cbd',
      label: 'Sydney CBD (Default)',
      shortLabel: 'CBD',
      lat: -33.8688,
      lng: 151.2093,
    },
    {
      id: 'surry-hills-chippendale',
      label: 'Surry Hills / Chippendale / Redfern',
      shortLabel: 'Surry Hills',
      lat: -33.8845,
      lng: 151.2085,
    },
    {
      id: 'newtown-inner-west',
      label: 'Newtown / Marrickville / Leichhardt',
      shortLabel: 'Inner West',
      lat: -33.8945,
      lng: 151.172,
    },
    {
      id: 'bondi-eastern',
      label: 'Bondi / Paddington / Double Bay',
      shortLabel: 'Bondi/East',
      lat: -33.8895,
      lng: 151.256,
    },
    {
      id: 'randwick-coogee',
      label: 'Randwick / Coogee / UNSW',
      shortLabel: 'Randwick',
      lat: -33.9185,
      lng: 151.246,
    },
    {
      id: 'cremorne-lower-north',
      label: 'Cremorne / Mosman / Neutral Bay',
      shortLabel: 'Lower North Shore',
      lat: -33.8305,
      lng: 151.2255,
    },
    {
      id: 'chatswood-north-shore',
      label: 'Chatswood / Lane Cove / North Sydney',
      shortLabel: 'Chatswood',
      lat: -33.7975,
      lng: 151.1835,
    },
    {
      id: 'macquarie-ryde',
      label: 'Macquarie Park / Ryde / Epping',
      shortLabel: 'Macquarie/Ryde',
      lat: -33.781,
      lng: 151.1215,
    },
    {
      id: 'rhodes-parramatta',
      label: 'Rhodes / Burwood / Parramatta',
      shortLabel: 'Rhodes/Inner West',
      lat: -33.835,
      lng: 151.086,
    },
    {
      id: 'northern-beaches',
      label: 'Manly / Dee Why / Warriewood',
      shortLabel: 'Northern Beaches',
      lat: -33.745,
      lng: 151.288,
    },
  ],
  shanghai: [
    {
      id: 'cbd',
      label: 'People’s Square / Nanjing Rd (人民广场 · Default)',
      shortLabel: 'People’s Sq',
      lat: 31.2304,
      lng: 121.4737,
    },
    {
      id: 'huaihai-ffc',
      label: 'Huaihai Rd / Former French Concession (淮海中路)',
      shortLabel: 'Huaihai Rd',
      lat: 31.2165,
      lng: 121.459,
    },
    {
      id: 'jingan',
      label: 'Jing’an Temple / Nanjing West (静安寺)',
      shortLabel: 'Jing’an',
      lat: 31.2237,
      lng: 121.4488,
    },
    {
      id: 'xintiandi-bund',
      label: 'Xintiandi / The Bund (新天地 / 外滩)',
      shortLabel: 'Xintiandi',
      lat: 31.2195,
      lng: 121.4755,
    },
    {
      id: 'xujiahui-xinhua',
      label: 'Xujiahui / Xinhua Rd (徐家汇 / 新华路)',
      shortLabel: 'Xujiahui',
      lat: 31.1965,
      lng: 121.4365,
    },
    {
      id: 'lujiazui-century',
      label: 'Lujiazui / Century Ave (陆家嘴 / 世纪大道)',
      shortLabel: 'Lujiazui',
      lat: 31.2355,
      lng: 121.5065,
    },
    {
      id: 'north-bund',
      label: 'North Bund / Hongkou (北外滩 / 虹口)',
      shortLabel: 'North Bund',
      lat: 31.2515,
      lng: 121.503,
    },
    {
      id: 'qiantan-expo',
      label: 'Qiantan / Huangpu Riverside (前滩 / 滨江)',
      shortLabel: 'Qiantan',
      lat: 31.166,
      lng: 121.481,
    },
    {
      id: 'hongqiao-tianshan',
      label: 'Tianshan / Hongqiao / Gubei (天山 / 虹桥古北)',
      shortLabel: 'Hongqiao',
      lat: 31.2095,
      lng: 121.404,
    },
    {
      id: 'wujiaochang',
      label: 'Wujiaochang / Yangpu (五角场 / 杨浦)',
      shortLabel: 'Wujiaochang',
      lat: 31.3012,
      lng: 121.5134,
    },
  ],
};

export function getDefaultOriginForCity(city: CityId): UserLocationOrigin {
  const cbd = CITY_LOCATION_HUBS[city][0];
  return {
    id: 'cbd',
    label: cbd.label,
    shortLabel: 'CBD',
    lat: cbd.lat,
    lng: cbd.lng,
    isCustomOrigin: false,
  };
}

export function resolveHubOrigin(city: CityId, hubId: string): UserLocationOrigin {
  const found = CITY_LOCATION_HUBS[city].find((h) => h.id === hubId);
  if (!found || found.id === 'cbd') {
    return getDefaultOriginForCity(city);
  }
  return {
    id: found.id,
    label: found.label,
    shortLabel: found.shortLabel,
    lat: found.lat,
    lng: found.lng,
    isCustomOrigin: true,
  };
}

/**
 * Computes great-circle distance in kilometres using the Haversine formula.
 * Zero external API calls or geolocation tracking costs.
 */
export function computeHaversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth mean radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Determines which of our 3 supported cities (Melbourne, Sydney, Shanghai) is closest
 * to arbitrary GPS coordinates.
 */
export function detectClosestSupportedCity(lat: number, lng: number): CityId | null {
  const anchors: Array<{ city: CityId; lat: number; lng: number }> = [
    { city: 'melbourne', lat: -37.8136, lng: 144.9631 },
    { city: 'sydney', lat: -33.8688, lng: 151.2093 },
    { city: 'shanghai', lat: 31.2304, lng: 121.4737 },
  ];
  let best: CityId | null = null;
  let minKm = Infinity;
  for (const a of anchors) {
    const km = computeHaversineKm(lat, lng, a.lat, a.lng);
    if (km < minKm) {
      minKm = km;
      best = a.city;
    }
  }
  return minKm <= 200 ? best : null;
}

export interface CinemaDistanceDisplay {
  km: number;
  compactSuffix: string; // e.g. "CBD" | "from you" | "from South Yarra"
  fullSuffix: string; // e.g. "from Melbourne CBD" | "from your location" | "from South Yarra"
}

export function getCinemaDistanceInfo(
  cinema: Cinema,
  origin: UserLocationOrigin
): CinemaDistanceDisplay {
  const defaultAnchorLabel =
    cinema.city === 'shanghai'
      ? 'People’s Sq'
      : cinema.city === 'melbourne'
        ? 'Melbourne CBD'
        : 'Sydney CBD';
  if (
    !origin.isCustomOrigin ||
    typeof cinema.lat !== 'number' ||
    typeof cinema.lng !== 'number'
  ) {
    return {
      km: cinema.distanceFromCbdKm,
      compactSuffix: cinema.city === 'shanghai' ? 'People’s Sq' : 'CBD',
      fullSuffix: `from ${defaultAnchorLabel}`,
    };
  }

  const km = computeHaversineKm(origin.lat, origin.lng, cinema.lat, cinema.lng);
  if (origin.id === 'gps') {
    return {
      km,
      compactSuffix: 'from you',
      fullSuffix: 'from your GPS location',
    };
  }
  return {
    km,
    compactSuffix: `from ${origin.shortLabel}`,
    fullSuffix: `from ${origin.shortLabel}`,
  };
}
