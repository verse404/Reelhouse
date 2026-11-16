import type { CityId } from '../types/cinema';
import type { GeocodedPlaceResult } from '../components/MyLocationModal';

interface GazetteerEntry {
  keys: string[];
  city: CityId;
  label: string;
  shortLabel: string;
  lat: number;
  lng: number;
}

const LOCAL_GAZETTEER: GazetteerEntry[] = [
  // Melbourne
  { keys: ['3000', 'melbourne cbd', 'flinders street', 'bourke street', 'collins street', 'fed square'], city: 'melbourne', label: 'Melbourne CBD, VIC 3000', shortLabel: 'Melbourne CBD', lat: -37.8136, lng: 144.9631 },
  { keys: ['3053', 'carlton', 'lygon street', 'melbourne uni', 'unimelb', 'parkville', '3052'], city: 'melbourne', label: 'Carlton / Parkville, VIC 3053', shortLabel: 'Carlton', lat: -37.7988, lng: 144.9672 },
  { keys: ['3065', 'fitzroy', 'collingwood', '3066', 'brunswick street', 'smith street'], city: 'melbourne', label: 'Fitzroy / Collingwood, VIC 3065', shortLabel: 'Fitzroy', lat: -37.7984, lng: 144.9786 },
  { keys: ['3006', 'southbank', 'south wharf', 'crown'], city: 'melbourne', label: 'Southbank, VIC 3006', shortLabel: 'Southbank', lat: -37.8238, lng: 144.9612 },
  { keys: ['3008', 'docklands', 'southern cross'], city: 'melbourne', label: 'Docklands, VIC 3008', shortLabel: 'Docklands', lat: -37.8148, lng: 144.9462 },
  { keys: ['3141', 'south yarra', 'chapel street', 'toorak', '3142', 'prahran', '3181'], city: 'melbourne', label: 'South Yarra / Prahran, VIC 3141', shortLabel: 'South Yarra', lat: -37.8405, lng: 144.9952 },
  { keys: ['3121', 'richmond', 'cremorne vic', 'swan street', 'bridge road'], city: 'melbourne', label: 'Richmond, VIC 3121', shortLabel: 'Richmond', lat: -37.8183, lng: 144.9985 },
  { keys: ['3182', 'st kilda', 'balaclava', '3183'], city: 'melbourne', label: 'St Kilda, VIC 3182', shortLabel: 'St Kilda', lat: -37.864, lng: 144.982 },
  { keys: ['3185', 'elsternwick', 'caulfield', '3162', 'brighton', '3186'], city: 'melbourne', label: 'Elsternwick / Caulfield, VIC 3185', shortLabel: 'Elsternwick', lat: -37.8842, lng: 145.0022 },
  { keys: ['3122', 'hawthorn', 'glenferrie', 'swinburne', 'kew', '3101'], city: 'melbourne', label: 'Hawthorn / Kew, VIC 3122', shortLabel: 'Hawthorn', lat: -37.8218, lng: 145.0358 },
  { keys: ['3124', 'camberwell', '3123', 'hawthorn east', 'malvern', '3144'], city: 'melbourne', label: 'Camberwell, VIC 3124', shortLabel: 'Camberwell', lat: -37.8312, lng: 145.0565 },
  { keys: ['3103', 'balwyn', 'surrey hills', '3127', 'box hill', '3128'], city: 'melbourne', label: 'Balwyn / Box Hill, VIC 3103', shortLabel: 'Box Hill/Balwyn', lat: -37.8165, lng: 145.102 },
  { keys: ['3108', 'doncaster', 'templestowe'], city: 'melbourne', label: 'Doncaster, VIC 3108', shortLabel: 'Doncaster', lat: -37.7848, lng: 145.1252 },
  { keys: ['3151', 'burwood', 'burwood east', '3125', 'deakin', 'mount waverley', 'glen waverley', '3150'], city: 'melbourne', label: 'Burwood / Glen Waverley, VIC 3151', shortLabel: 'Burwood/Waverley', lat: -37.856, lng: 145.128 },
  { keys: ['3148', 'chadstone', 'clayton', '3168', 'monash', 'oakleigh', '3166'], city: 'melbourne', label: 'Chadstone / Clayton, VIC 3148', shortLabel: 'Chadstone/Clayton', lat: -37.896, lng: 145.098 },
  { keys: ['3070', 'northcote', 'thornbury', '3071', 'preston', '3072'], city: 'melbourne', label: 'Northcote / Thornbury, VIC 3070', shortLabel: 'Northcote', lat: -37.771, lng: 144.999 },
  { keys: ['3056', 'brunswick', '3058', 'coburg', 'pentridge'], city: 'melbourne', label: 'Brunswick / Coburg, VIC 3058', shortLabel: 'Coburg/Brunswick', lat: -37.756, lng: 144.966 },
  { keys: ['3013', 'yarraville', 'footscray', '3011', 'seddon', 'williamstown', '3016'], city: 'melbourne', label: 'Yarraville / Footscray, VIC 3013', shortLabel: 'Yarraville', lat: -37.812, lng: 144.893 },
  { keys: ['3039', 'moonee ponds', 'essendon', '3040', 'ascot vale'], city: 'melbourne', label: 'Moonee Ponds / Essendon, VIC 3039', shortLabel: 'Moonee Ponds', lat: -37.765, lng: 144.92 },
  { keys: ['3160', 'belgrave', 'ferntree gully', 'ringwood', '3134'], city: 'melbourne', label: 'Belgrave / Dandenong Ranges, VIC 3160', shortLabel: 'Belgrave', lat: -37.9089, lng: 145.3542 },

  // Sydney
  { keys: ['2000', 'sydney cbd', 'town hall', 'george street', 'martin place', 'circular quay', 'wynyard'], city: 'sydney', label: 'Sydney CBD, NSW 2000', shortLabel: 'Sydney CBD', lat: -33.8715, lng: 151.2065 },
  { keys: ['darling harbour', 'barangaroo', 'pyrmont', '2009'], city: 'sydney', label: 'Darling Harbour / Pyrmont, NSW 2009', shortLabel: 'Darling Harbour', lat: -33.872, lng: 151.198 },
  { keys: ['2010', 'surry hills', 'darlinghurst', 'oxford street', 'central station'], city: 'sydney', label: 'Surry Hills / Darlinghurst, NSW 2010', shortLabel: 'Surry Hills', lat: -33.8825, lng: 151.2125 },
  { keys: ['2008', 'chippendale', '2007', 'ultimo', 'broadway', 'uts', 'usyd', 'glebe', '2037'], city: 'sydney', label: 'Chippendale / Ultimo / Glebe, NSW 2008', shortLabel: 'Chippendale', lat: -33.8842, lng: 151.1985 },
  { keys: ['2015', 'alexandria', 'waterloo', '2017', 'zetland', 'redfern', '2016', 'green square'], city: 'sydney', label: 'Redfern / Zetland / Green Square, NSW 2017', shortLabel: 'Zetland/Redfern', lat: -33.901, lng: 151.206 },
  { keys: ['2042', 'newtown', 'enmore', 'erskineville', 'marrickville', '2204'], city: 'sydney', label: 'Newtown / Marrickville, NSW 2042', shortLabel: 'Newtown', lat: -33.898, lng: 151.178 },
  { keys: ['2040', 'leichhardt', 'norton street', 'annandale', 'balmain', '2041'], city: 'sydney', label: 'Leichhardt / Balmain, NSW 2040', shortLabel: 'Leichhardt', lat: -33.883, lng: 151.158 },
  { keys: ['2021', 'paddington', 'moore park', 'centennial park', 'entertainment quarter'], city: 'sydney', label: 'Paddington / Moore Park, NSW 2021', shortLabel: 'Moore Park', lat: -33.8895, lng: 151.226 },
  { keys: ['2022', 'bondi junction', 'bondi', '2026', 'double bay', '2028'], city: 'sydney', label: 'Bondi / Bondi Junction, NSW 2022', shortLabel: 'Bondi', lat: -33.8915, lng: 151.253 },
  { keys: ['2031', 'randwick', 'unsw', 'kensington', '2033', 'coogee', '2034'], city: 'sydney', label: 'Randwick / UNSW / Coogee, NSW 2031', shortLabel: 'Randwick', lat: -33.9175, lng: 151.238 },
  { keys: ['2060', 'north sydney', 'kirribilli', 'neutral bay', '2089', 'cremorne', '2090', 'mosman', '2088'], city: 'sydney', label: 'Cremorne / North Sydney / Mosman, NSW 2090', shortLabel: 'Cremorne/North Syd', lat: -33.832, lng: 151.221 },
  { keys: ['2067', 'chatswood', 'artarmon', 'st leonards', 'lane cove', '2066'], city: 'sydney', label: 'Chatswood, NSW 2067', shortLabel: 'Chatswood', lat: -33.7969, lng: 151.1834 },
  { keys: ['2113', 'macquarie park', 'macquarie uni', 'north ryde', 'epping', '2121', 'eastwood', '2122'], city: 'sydney', label: 'Macquarie Park / Eastwood, NSW 2113', shortLabel: 'Macquarie Park', lat: -33.7785, lng: 151.121 },
  { keys: ['2134', 'burwood nsw', 'strathfield', '2135', 'ashfield', '2131'], city: 'sydney', label: 'Burwood / Strathfield, NSW 2134', shortLabel: 'Burwood', lat: -33.877, lng: 151.104 },
  { keys: ['2138', 'rhodes', 'wentworth point', 'olympic park', '2127'], city: 'sydney', label: 'Rhodes / Sydney Olympic Park, NSW 2138', shortLabel: 'Rhodes', lat: -33.8323, lng: 151.086 },
  { keys: ['2150', 'parramatta', 'westmead', 'harris park'], city: 'sydney', label: 'Parramatta, NSW 2150', shortLabel: 'Parramatta', lat: -33.8176, lng: 151.0025 },
  { keys: ['2095', 'manly', 'dee why', '2099', 'brookvale', 'warriewood', '2102', 'mona vale'], city: 'sydney', label: 'Manly / Warriewood (Northern Beaches), NSW', shortLabel: 'Northern Beaches', lat: -33.742, lng: 151.288 },

  // Shanghai · 上海
  { keys: ['人民广场', '南京东路', '南京西路', '黄浦', '黄浦区', 'peoples square', 'nanjing road', 'huangpu'], city: 'shanghai', label: 'People’s Square / Nanjing Rd · 黄浦区人民广场', shortLabel: '人民广场 People’s Sq', lat: 31.2325, lng: 121.4737 },
  { keys: ['新天地', '外滩', '老西门', '豫园', 'xintiandi', 'the bund', 'bund'], city: 'shanghai', label: 'Xintiandi / The Bund · 新天地/外滩', shortLabel: '新天地 Xintiandi', lat: 31.221, lng: 121.478 },
  { keys: ['淮海中路', '淮海路', '陕西南路', 'iapm', '环贸', '衡山路', '法租界', 'huaihai', 'french concession'], city: 'shanghai', label: 'Huaihai Middle Rd / iapm · 淮海中路/陕西南路', shortLabel: '淮海中路 Huaihai', lat: 31.216, lng: 121.4585 },
  { keys: ['静安寺', '静安', '静安区', '嘉里中心', '南京西路静安', 'jingan', 'jing an'], city: 'shanghai', label: 'Jing’an Temple · 静安寺/南京西路', shortLabel: '静安寺 Jing’an', lat: 31.2237, lng: 121.4488 },
  { keys: ['徐家汇', '徐汇', '徐汇区', '港汇', '美罗城', '交通大学', '新华路', 'xujiahui', 'xuhui'], city: 'shanghai', label: 'Xujiahui / Xinhua Rd · 徐家汇/新华路', shortLabel: '徐家汇 Xujiahui', lat: 31.1965, lng: 121.4365 },
  { keys: ['陆家嘴', '世纪大道', '浦东', '浦东新区', '国金', '世纪汇', '八佰伴', 'lujiazui', 'century avenue', 'pudong'], city: 'shanghai', label: 'Lujiazui / Century Ave · 浦东陆家嘴/世纪大道', shortLabel: '陆家嘴 Lujiazui', lat: 31.231, lng: 121.515 },
  { keys: ['前滩', '太古里', '东方体育中心', '世博', '博荟', 'qiantan', 'taikoo li'], city: 'shanghai', label: 'Qiantan Taikoo Li · 浦东前滩太古里', shortLabel: '前滩 Qiantan', lat: 31.1525, lng: 121.4825 },
  { keys: ['北外滩', '虹口', '虹口区', '白玉兰', '提篮桥', '四川北路', 'north bund', 'hongkou'], city: 'shanghai', label: 'North Bund · 虹口北外滩', shortLabel: '北外滩 North Bund', lat: 31.251, lng: 121.502 },
  { keys: ['天山', '长宁', '长宁区', '中山公园', '娄山关路', '古北', '虹桥', 'changning', 'hongqiao', 'gubei', 'zhongshan park'], city: 'shanghai', label: 'Changning / Tianshan / Hongqiao · 长宁天山/虹桥', shortLabel: '天山/虹桥 Hongqiao', lat: 31.2115, lng: 121.408 },
  { keys: ['五角场', '杨浦', '杨浦区', '复旦', '同济', '大学路', 'wujiaochang', 'yangpu', 'fudan'], city: 'shanghai', label: 'Wujiaochang · 杨浦五角场/大学路', shortLabel: '五角场 Wujiaochang', lat: 31.3012, lng: 121.5134 },
  { keys: ['普陀', '普陀区', '环球港', '长寿路', 'putuo', 'global harbor'], city: 'shanghai', label: 'Putuo / Global Harbor · 普陀环球港', shortLabel: '普陀 Putuo', lat: 31.233, lng: 121.412 },
  { keys: ['闵行', '闵行区', '七宝', '莘庄', '万象城', 'minhang', 'qibao', 'xinzhuang'], city: 'shanghai', label: 'Minhang / Qibao · 闵行七宝/万象城', shortLabel: '闵行 Minhang', lat: 31.155, lng: 121.385 },
];

export function searchLocalGazetteer(rawQuery: string, preferredCity: CityId): GeocodedPlaceResult[] {
  const qLower = rawQuery.trim().toLowerCase();
  if (!qLower) return [];
  const hits: GeocodedPlaceResult[] = [];
  for (const item of LOCAL_GAZETTEER) {
    if (item.keys.some((k) => k === qLower || k.includes(qLower) || qLower.includes(k))) {
      hits.push({
        label: item.label,
        shortLabel: item.shortLabel,
        city: item.city,
        lat: item.lat,
        lng: item.lng,
      });
    }
  }
  hits.sort((a, b) => (b.city === preferredCity ? 1 : 0) - (a.city === preferredCity ? 1 : 0));
  return hits.slice(0, 6);
}
