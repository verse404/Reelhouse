import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enrichMoviesWithTrueRatings } from './ratingsEngine.mjs';
import { computeVenueSessionPricing, getLiveScrapedVenueOverrides } from './venuePricing.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, '..');
export const CACHE_DIR = path.join(__dirname, 'cache');
export const CACHE_FILE = path.join(CACHE_DIR, 'live_catalog.json');

/**
 * Safely parses `~/cinema-guide/.env` without external dependencies and without logging values.
 */
export async function loadDotEnvFile() {
  const envPath = path.join(PROJECT_ROOT, '.env');
  const out = {};
  try {
    const raw = await fs.readFile(envPath, 'utf-8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx <= 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1).trim();
      }
      out[key] = val;
    }
  } catch {
    // .env not created yet
  }
  return out;
}

export async function getApiConfig() {
  const fileEnv = await loadDotEnvFile();
  const pick = (k) => (process.env[k] ?? fileEnv[k] ?? '').trim();

  const ttlHoursRaw = Number.parseFloat(pick('CACHE_TTL_HOURS') || '24');
  const ratingsTtlHoursRaw = Number.parseFloat(pick('RATINGS_TTL_HOURS') || '24');

  return {
    tmdbApiKey: pick('TMDB_API_KEY'),
    omdbApiKey: pick('OMDB_API_KEY'),
    mdblistApiKey: pick('MDBLIST_API_KEY'),
    serpapiApiKey: pick('SERPAPI_API_KEY'),
    cacheTtlHours: Number.isFinite(ttlHoursRaw) ? Math.max(1, ttlHoursRaw) : 24,
    ratingsTtlHours: Number.isFinite(ratingsTtlHoursRaw)
      ? Math.max(1, ratingsTtlHoursRaw)
      : 24,
  };
}

const POSTER_THEMES = [
  'dune-amber',
  'coastal-noir',
  'mood-crimson',
  'glass-nocturne',
  'kyoto-clock',
  'velvet-static',
  'orbital-grid',
  'echo-ivory',
  'bathurst-carbon',
  'saltwater-sun',
  'cambon-silk',
  'mirror-monolith',
  'cicada-jade',
  'tasman-storm',
  'orpheus-velvet',
  'cradle-mist',
];

/**
 * All 35 iconic & flagship Melbourne (19) and Sydney (16) cinema houses across all 8 major circuits.
 */
export const TARGET_VENUES = [
  // ================= MELBOURNE (19 VENUES) =================
  {
    id: 'mel-imax',
    city: 'melbourne',
    serpQuery: 'IMAX Melbourne Museum showtimes',
    flicksSlug: 'imax-melbourne',
    name: 'IMAX Melbourne',
    chain: 'IMAX',
    suburb: 'Carlton',
    address: 'Rathdowne St, Melbourne Museum Precinct, Carlton VIC 3053',
    lat: -37.8033,
    lng: 144.9714,
    distanceFromCbdKm: 1.6,
    transitNote: 'Tram 86 or 96 to Stop 11 (Melbourne Museum)',
    vibe: 'Grand Format',
    supportedFormats: ['IMAX', '35mm / 70mm'],
    barAndFoodNote: 'Melbourne Museum forecourt espresso, craft beer & handmade choc-tops',
    dealHighlight: 'World’s largest 1.43:1 screen · IMAX 1570 70mm & A$23 Feature Film Tuesdays',
    bookingDomainUrl: 'https://imaxmelbourne.com.au',
    screenCount: 1,
  },
  {
    id: 'mel-lido',
    city: 'melbourne',
    serpQuery: 'Lido Cinemas Hawthorn showtimes',
    name: 'Lido Cinemas',
    chain: 'Independent',
    suburb: 'Hawthorn',
    address: '675 Glenferrie Rd, Hawthorn VIC 3122',
    lat: -37.8213,
    lng: 145.0359,
    distanceFromCbdKm: 5.8,
    transitNote: 'Glenferrie Station (2 min walk) or Tram 16 along Glenferrie Rd',
    vibe: 'Boutique Luxury',
    supportedFormats: ['Standard', '35mm / 70mm', 'Dolby Atmos'],
    barAndFoodNote: 'Rooftop cinema bar, underground jazz room & handmade artisan gelato',
    dealHighlight: 'Tightly curated arthouse programme · Cheap Tuesday A$12 & rooftop screenings',
    bookingDomainUrl: 'https://www.lidocinemas.com.au',
    screenCount: 8,
  },
  {
    id: 'mel-nova',
    city: 'melbourne',
    serpQuery: 'Cinema Nova Carlton showtimes',
    name: 'Cinema Nova',
    chain: 'Independent',
    suburb: 'Carlton',
    address: '380 Lygon St, Carlton VIC 3053',
    lat: -37.7982,
    lng: 144.9673,
    distanceFromCbdKm: 1.8,
    transitNote: 'Tram 1 or 6 along Swanston/Lygon St to Elgin St',
    vibe: 'Indie & Arthouse',
    supportedFormats: ['Standard', '35mm / 70mm', 'Gold Class / LUX'],
    barAndFoodNote: 'Nova Bar cocktails, Lygon St espresso & Nova Deluxe tapas',
    dealHighlight: 'Iconic Discount Monday: A$8 before 4 pm / A$11 from 4 pm (Adult reg. A$25.50)',
    bookingDomainUrl: 'https://www.cinemanova.com.au',
    screenCount: 16,
  },
  {
    id: 'mel-classic',
    city: 'melbourne',
    serpQuery: 'Classic Cinemas Elsternwick showtimes',
    name: 'Classic Cinemas',
    chain: 'Independent',
    suburb: 'Elsternwick',
    address: '9 Gordon St, Elsternwick VIC 3185',
    lat: -37.8842,
    lng: 145.0022,
    distanceFromCbdKm: 8.8,
    transitNote: 'Elsternwick Station (2 min walk) or Tram 67 along Glen Huntly Rd',
    vibe: 'Heritage Palace',
    supportedFormats: ['Standard', '35mm / 70mm', 'Dolby Atmos'],
    barAndFoodNote: 'Classic Rooftop bar, Classic Southside live music lounge & artisan choc-tops',
    dealHighlight: '1911 bayside institution · Cheap Tuesday A$12 GA / A$8 Movie Club',
    bookingDomainUrl: 'https://www.classiccinemas.com.au',
    screenCount: 10,
  },
  {
    id: 'mel-sun',
    city: 'melbourne',
    serpQuery: 'Sun Theatre Yarraville showtimes',
    name: 'Sun Theatre',
    chain: 'Independent',
    suburb: 'Yarraville',
    address: '8 Ballarat St, Yarraville VIC 3013',
    lat: -37.8161,
    lng: 144.8906,
    distanceFromCbdKm: 6.4,
    transitNote: 'Yarraville Station (1 min walk into pedestrianised Yarraville Village)',
    vibe: 'Heritage Palace',
    supportedFormats: ['Standard', '35mm / 70mm', 'Gold Class / LUX'],
    barAndFoodNote: '1938 Art Deco foyer wine bar, plush leather club couches & handmade choc-tops',
    dealHighlight: 'Restored 1938 Art Deco icon · A$15 Discount Tuesdays & licensed boutique salons',
    bookingDomainUrl: 'https://suntheatre.com.au',
    screenCount: 8,
  },
  {
    id: 'mel-cameo',
    city: 'melbourne',
    serpQuery: 'Cameo Cinemas Belgrave showtimes',
    name: 'Cameo Cinemas',
    chain: 'Independent',
    suburb: 'Belgrave',
    address: '1628 Burwood Hwy, Belgrave VIC 3160',
    lat: -37.9089,
    lng: 145.3542,
    distanceFromCbdKm: 35.8,
    transitNote: 'Belgrave Station & Puffing Billy terminus (3 min walk)',
    vibe: 'Indie & Arthouse',
    supportedFormats: ['Standard', 'Dolby Atmos', '35mm / 70mm'],
    barAndFoodNote: 'Dandenong Ranges beer garden, seasonal outdoor cinema & local Yarra Valley wines',
    dealHighlight: '1935 hills landmark · Cheap Tuesday A$12 GA / A$8 Movie Club',
    bookingDomainUrl: 'https://www.cameocinemas.com.au',
    screenCount: 8,
  },
  {
    id: 'mel-astor',
    city: 'melbourne',
    serpQuery: 'The Astor Theatre St Kilda showtimes',
    name: 'The Astor Theatre',
    chain: 'Palace Cinemas',
    suburb: 'St Kilda',
    address: '1 Chapel St, St Kilda VIC 3182',
    lat: -37.8573,
    lng: 144.9912,
    distanceFromCbdKm: 6.2,
    transitNote: 'Tram 5, 64 or 78 to Chapel St / Windsor Station',
    vibe: 'Heritage Palace',
    supportedFormats: ['35mm / 70mm', 'Standard'],
    barAndFoodNote: '1936 Art Deco dress-circle lounge & handmade Astor choc-tops',
    dealHighlight: 'Single & double features A$25 · Magic Mon & Fantastic Thu A$23',
    bookingDomainUrl: 'https://www.astortheatre.net.au',
    screenCount: 1,
  },
  {
    id: 'mel-kino',
    city: 'melbourne',
    serpQuery: 'Palace Kino Cinema Collins St Melbourne showtimes',
    name: 'Palace Kino',
    chain: 'Palace Cinemas',
    suburb: 'Melbourne CBD',
    address: 'Collins Place, 45 Collins St, Melbourne VIC 3000',
    lat: -37.8142,
    lng: 144.9722,
    distanceFromCbdKm: 0.4,
    transitNote: 'Parliament Station (2 min walk) or Tram 11, 12, 48 & 109 to Collins/Exhibition St',
    vibe: 'Indie & Arthouse',
    supportedFormats: ['Standard', '35mm / 70mm'],
    barAndFoodNote: 'Licensed Collins Place subterranean wine bar, Lavazza espresso & antipasti',
    dealHighlight: 'Royal Discount Every Mon & Tue: A$12 GA / A$10 Palace Movie Club',
    bookingDomainUrl: 'https://www.palacecinemas.com.au/cinemas/the-kino-melbourne',
    screenCount: 7,
  },
  {
    id: 'mel-como',
    city: 'melbourne',
    serpQuery: 'Palace Cinema Como South Yarra showtimes',
    name: 'Palace Cinema Como',
    chain: 'Palace Cinemas',
    suburb: 'South Yarra',
    address: 'Level 1, Como Centre, Toorak Rd & Chapel St, South Yarra VIC 3141',
    lat: -37.8385,
    lng: 144.9956,
    distanceFromCbdKm: 4.1,
    transitNote: 'South Yarra Station (5 min walk) or Tram 58 / 78',
    vibe: 'Boutique Luxury',
    supportedFormats: ['Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'Victorian Pinot Noir list, cheese platters & Lavazza bar',
    dealHighlight: 'Royal Discount Every Mon & Tue: A$12 GA / A$10 Palace Movie Club',
    bookingDomainUrl: 'https://www.palacecinemas.com.au/cinemas/palace-cinema-como/',
    screenCount: 9,
  },
  {
    id: 'mel-westgarth',
    city: 'melbourne',
    serpQuery: 'Palace Westgarth Northcote showtimes',
    name: 'Palace Westgarth',
    chain: 'Palace Cinemas',
    suburb: 'Northcote',
    address: '89 High St, Northcote VIC 3070',
    lat: -37.7801,
    lng: 144.9978,
    distanceFromCbdKm: 5.4,
    transitNote: 'Westgarth Station (3 min walk) or Tram 86 Stop 29',
    vibe: 'Heritage Palace',
    supportedFormats: ['Standard', '35mm / 70mm'],
    barAndFoodNote: 'Courtyard wine garden inside a restored 1921 landmark',
    dealHighlight: 'Royal Discount Every Mon & Tue: A$12 GA / A$10 Palace Movie Club',
    bookingDomainUrl: 'https://www.palacecinemas.com.au/cinemas/palace-westgarth/',
    screenCount: 5,
  },
  {
    id: 'mel-palace-pentridge',
    city: 'melbourne',
    serpQuery: 'Palace Pentridge Cinema Coburg showtimes',
    name: 'Palace Pentridge',
    chain: 'Palace Cinemas',
    suburb: 'Coburg',
    address: '1 Champ St (Pentridge Piazza), Coburg VIC 3058',
    lat: -37.7418,
    lng: 144.9708,
    distanceFromCbdKm: 8.1,
    transitNote: 'Tram 19 along Sydney Rd to Stop 36 or Coburg / Batman Station',
    vibe: 'Boutique Luxury',
    supportedFormats: ['Dolby Atmos', 'Standard', 'Gold Class / LUX'],
    barAndFoodNote: 'Full leather recliners in all 15 auditoriums & curated Pentridge wine bar',
    dealHighlight: 'Royal Discount Every Mon & Tue: A$12 GA / A$10 Movie Club (recliners included)',
    bookingDomainUrl: 'https://www.palacecinemas.com.au/cinemas/palace-pentridge/',
    screenCount: 15,
  },
  {
    id: 'mel-palace-balwyn',
    city: 'melbourne',
    serpQuery: 'Palace Balwyn Cinema Whitehorse Road showtimes',
    name: 'Palace Balwyn',
    chain: 'Palace Cinemas',
    suburb: 'Balwyn',
    address: '231 Whitehorse Rd, Balwyn VIC 3103',
    lat: -37.8127,
    lng: 145.0785,
    distanceFromCbdKm: 10.2,
    transitNote: 'Tram 109 along Whitehorse Rd directly outside cinema entrance',
    vibe: 'Heritage Palace',
    supportedFormats: ['Standard', '35mm / 70mm'],
    barAndFoodNote: '1930 heritage foyer bar, espresso & classic European festival seasons',
    dealHighlight: 'Royal Discount Every Mon & Tue: A$12 GA / A$10 Palace Movie Club',
    bookingDomainUrl: 'https://www.palacecinemas.com.au/cinemas/palace-balwyn/',
    screenCount: 5,
  },
  {
    id: 'mel-hoyts-mc',
    city: 'melbourne',
    serpQuery: 'Hoyts Melbourne Central showtimes',
    name: 'Hoyts Melbourne Central',
    chain: 'Hoyts',
    suburb: 'Melbourne CBD',
    address: 'Level 3, Melbourne Central, Swanston & La Trobe St, Melbourne VIC 3000',
    lat: -37.8103,
    lng: 144.9629,
    distanceFromCbdKm: 0.2,
    transitNote: 'Direct elevator access above Melbourne Central City Loop Station',
    vibe: 'Major Multiplex',
    supportedFormats: ['Vmax / Xtremescreen', 'Dolby Atmos', 'Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'Hoyts LUX lounge dining & powered recliners every auditorium',
    dealHighlight: 'HOYTS Cheap Tuesday recliner tickets & morning Saver sessions',
    bookingDomainUrl: 'https://www.hoyts.com.au/cinemas/melbourne-central',
    screenCount: 11,
  },
  {
    id: 'mel-hoyts-chadstone',
    city: 'melbourne',
    serpQuery: 'Hoyts Chadstone Melbourne showtimes',
    name: 'Hoyts Chadstone',
    chain: 'Hoyts',
    suburb: 'Chadstone',
    address: '1341 Dandenong Rd, Chadstone Shopping Centre, Chadstone VIC 3148',
    lat: -37.8858,
    lng: 145.083,
    distanceFromCbdKm: 14.5,
    transitNote: 'Free Chadstone Express shuttle from Fed Square or Hughesdale / Oakleigh Stations',
    vibe: 'Major Multiplex',
    supportedFormats: ['Vmax / Xtremescreen', 'Dolby Atmos', 'Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'Flagship HOYTS LUX bar, Artie’s Bar & Café + Chadstone Dining Terrace',
    dealHighlight: 'Flagship 13-screen Xtremescreen & LUX · HOYTS Cheap Tuesday A$13.50',
    bookingDomainUrl: 'https://www.hoyts.com.au/cinemas/chadstone',
    screenCount: 13,
  },
  {
    id: 'mel-hoyts-docklands',
    city: 'melbourne',
    serpQuery: 'Hoyts The District Docklands Melbourne showtimes',
    name: 'Hoyts Docklands',
    chain: 'Hoyts',
    suburb: 'Docklands',
    address: 'Level 1, The District Docklands, Star Cres, Docklands VIC 3008',
    lat: -37.8124,
    lng: 144.9383,
    distanceFromCbdKm: 2.2,
    transitNote: 'Free Tram Zone — Tram 70, 86 or 35 right to The District Docklands',
    vibe: 'Major Multiplex',
    supportedFormats: ['Vmax / Xtremescreen', 'Dolby Atmos', 'Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'HOYTS LUX dine-in lounge & waterfront brewery precinct below',
    dealHighlight: 'Free Tram Zone access · Powered recliners & Cheap Tuesday A$13',
    bookingDomainUrl: 'https://www.hoyts.com.au/cinemas/docklands',
    screenCount: 8,
  },
  {
    id: 'mel-village-crown',
    city: 'melbourne',
    serpQuery: 'Village Cinemas Crown Southbank showtimes',
    name: 'Village Cinemas Crown',
    chain: 'Village Cinemas',
    suburb: 'Southbank',
    address: '8 Whiteman St, Southbank VIC 3006',
    lat: -37.824,
    lng: 144.9583,
    distanceFromCbdKm: 1.3,
    transitNote: 'Tram 96, 109 or 12 from Flinders/Southern Cross to Casino East',
    vibe: 'Major Multiplex',
    supportedFormats: ['Gold Class / LUX', 'Vmax / Xtremescreen', 'Dolby Atmos', 'Standard'],
    barAndFoodNote: 'Flagship Gold Class lounge & Yarra promenade dining',
    dealHighlight: 'Vrewards Super Tuesday 50% off & Vmax Dolby Atmos blockbusters',
    bookingDomainUrl: 'https://villagecinemas.com.au/cinemas/crown',
    screenCount: 13,
  },
  {
    id: 'mel-village-rivoli',
    city: 'melbourne',
    serpQuery: 'Village Cinemas Rivoli Camberwell showtimes',
    name: 'Village Cinemas Rivoli',
    chain: 'Village Cinemas',
    suburb: 'Camberwell',
    address: '200 Camberwell Rd, Hawthorn East VIC 3123',
    lat: -37.8312,
    lng: 145.0558,
    distanceFromCbdKm: 8.5,
    transitNote: 'Camberwell Station (7 min walk) or Tram 70 / 75 to Camberwell Junction',
    vibe: 'Heritage Palace',
    supportedFormats: ['Gold Class / LUX', 'Standard', '35mm / 70mm'],
    barAndFoodNote: '1940 Streamline Moderne rooftop cocktail bar & Gold Class lounge',
    dealHighlight: 'Heritage-listed 1940 Art Deco jewel · Vrewards Super Tuesday A$13',
    bookingDomainUrl: 'https://villagecinemas.com.au/cinemas/rivoli-cinemas',
    screenCount: 8,
  },
  {
    id: 'mel-village-doncaster',
    city: 'melbourne',
    serpQuery: 'Village Cinemas Westfield Doncaster showtimes',
    name: 'Village Cinemas Doncaster',
    chain: 'Village Cinemas',
    suburb: 'Doncaster',
    address: 'Westfield Doncaster, 619 Doncaster Rd, Doncaster VIC 3108',
    lat: -37.7848,
    lng: 145.1252,
    distanceFromCbdKm: 14.8,
    transitNote: 'Express 907 / 902 bus via Eastern Fwy from CBD directly to Westfield Doncaster',
    vibe: 'Major Multiplex',
    supportedFormats: ['Vmax / Xtremescreen', 'Dolby Atmos', 'Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'Gold Class dining lounge & Westfield rooftop restaurant deck',
    dealHighlight: 'Vrewards Super Tuesday 50% off (A$12.50) & Vmax Dolby Atmos',
    bookingDomainUrl: 'https://villagecinemas.com.au/cinemas/doncaster',
    screenCount: 9,
  },
  {
    id: 'mel-reading-burwood',
    city: 'melbourne',
    serpQuery: 'Reading Cinemas Burwood Brickworks Melbourne showtimes',
    name: 'Reading Cinemas Burwood',
    chain: 'Reading Cinemas',
    suburb: 'Burwood',
    address: 'Burwood Brickworks, 70 Middleborough Rd, Burwood East VIC 3151',
    lat: -37.8519,
    lng: 145.1116,
    distanceFromCbdKm: 13.6,
    transitNote: 'Tram 75 along Burwood Hwy directly to Stop 63 (Middleborough Rd)',
    vibe: 'Major Multiplex',
    supportedFormats: ['Dolby Atmos', 'Vmax / Xtremescreen', 'Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'Reading Gold Lounge dine-in bar & urban rooftop farm restaurant precinct',
    dealHighlight: 'Everyday low value A$18.50 recliners · TITAN LUXE Dolby Atmos & A$13.50 Tue',
    bookingDomainUrl: 'https://readingcinemas.com.au/locations/theatre/burwood',
    screenCount: 6,
  },

  // ================= SYDNEY (16 VENUES) =================
  {
    id: 'syd-imax',
    city: 'sydney',
    serpQuery: 'Event Cinemas IMAX Sydney Darling Harbour showtimes',
    name: 'IMAX Sydney',
    chain: 'Event Cinemas',
    suburb: 'Darling Harbour',
    address: '31 Wheat Rd (The Ribbon), Darling Harbour NSW 2000',
    lat: -33.8732,
    lng: 151.2012,
    distanceFromCbdKm: 0.9,
    transitNote: 'Town Hall Station (8 min walk) or Pyrmont Bay Light Rail',
    vibe: 'Grand Format',
    supportedFormats: ['IMAX', 'Dolby Atmos', 'Gold Class / LUX'],
    barAndFoodNote: 'Harbour-view mezzanine bar & reclining VIP balcony',
    dealHighlight: 'Dual 4K Laser projection, 12-channel IMAX sound & Cinebuzz 50% Tue',
    bookingDomainUrl: 'https://www.eventcinemas.com.au/Cinema/IMAX-Sydney',
    screenCount: 1,
  },
  {
    id: 'syd-orpheum',
    city: 'sydney',
    serpQuery: 'Hayden Orpheum Cremorne showtimes',
    name: 'Hayden Orpheum Picture Palace',
    chain: 'Independent',
    suburb: 'Cremorne',
    address: '380 Military Rd, Cremorne NSW 2090',
    lat: -33.829,
    lng: 151.2274,
    distanceFromCbdKm: 5.9,
    transitNote: 'Express B-Line / 100 bus from Wynyard Station (12 min across Harbour Bridge)',
    vibe: 'Heritage Palace',
    supportedFormats: ['35mm / 70mm', 'Standard', 'Dolby Atmos'],
    barAndFoodNote: '1935 Art Deco piano bar, champagne lounge & iconic Wurlitzer theatre organ',
    dealHighlight: 'Restored 1935 Art Deco jewel · 70mm classics & Orpheum A$16 Tuesday',
    bookingDomainUrl: 'https://www.orpheum.com.au',
    screenCount: 6,
  },
  {
    id: 'syd-ritz',
    city: 'sydney',
    serpQuery: 'Ritz Cinemas Randwick showtimes',
    name: 'Ritz Cinemas',
    chain: 'Independent',
    suburb: 'Randwick',
    address: '45 St Pauls St (The Spot), Randwick NSW 2031',
    lat: -33.9195,
    lng: 151.2422,
    distanceFromCbdKm: 6.4,
    transitNote: 'L2 Randwick Light Rail to High St + 5 min walk to The Spot',
    vibe: 'Heritage Palace',
    supportedFormats: ['35mm / 70mm', 'Dolby Atmos', 'Standard'],
    barAndFoodNote: 'Heritage Art Deco balcony cocktail bar at The Spot',
    dealHighlight: 'Sydney’s 1937 Art Deco icon · Cheap Tuesday A$12 GA / A$8 Movie Club',
    bookingDomainUrl: 'https://www.ritzcinemas.com.au',
    screenCount: 6,
  },
  {
    id: 'syd-golden-age',
    city: 'sydney',
    serpQuery: 'Golden Age Cinema and Bar Surry Hills showtimes',
    name: 'Golden Age Cinema & Bar',
    chain: 'Independent',
    suburb: 'Surry Hills',
    address: 'Paramount House, 80 Commonwealth St, Surry Hills NSW 2010',
    lat: -33.8794,
    lng: 151.2111,
    distanceFromCbdKm: 1.2,
    transitNote: 'Central Station or Museum Station (5 min walk into Surry Hills)',
    vibe: 'Boutique Luxury',
    supportedFormats: ['Standard', '35mm / 70mm'],
    barAndFoodNote: 'Subterranean cocktail lounge inside historic 1940 Paramount Pictures building',
    dealHighlight: 'Intimate 56-seat screening room · Cult classics, indie premieres & bespoke cocktails',
    bookingDomainUrl: 'https://www.ourgoldenage.com.au',
    screenCount: 1,
  },
  {
    id: 'syd-event-george',
    city: 'sydney',
    serpQuery: 'Event Cinemas George Street Sydney showtimes',
    name: 'Event Cinemas George Street',
    chain: 'Event Cinemas',
    suburb: 'Sydney CBD',
    address: '505 George St, Sydney NSW 2000',
    lat: -33.8748,
    lng: 151.2065,
    distanceFromCbdKm: 0.3,
    transitNote: 'Right at Town Hall Station & QVB Light Rail stops',
    vibe: 'Major Multiplex',
    supportedFormats: ['Vmax / Xtremescreen', 'Dolby Atmos', 'Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'Gold Class dining lounge & daybeds in V-Max',
    dealHighlight: 'Cinebuzz 50% Half-Price Tuesday & V-Max Dolby Atmos flagship screens',
    bookingDomainUrl: 'https://www.eventcinemas.com.au/Cinema/George-Street',
    screenCount: 17,
  },
  {
    id: 'syd-event-parramatta',
    city: 'sydney',
    serpQuery: 'Event Cinemas Parramatta Sydney showtimes',
    name: 'Event Cinemas Parramatta',
    chain: 'Event Cinemas',
    suburb: 'Parramatta',
    address: 'Level 5, Westfield Parramatta, 159–175 Church St, Parramatta NSW 2150',
    lat: -33.8176,
    lng: 151.0025,
    distanceFromCbdKm: 19.6,
    transitNote: 'Parramatta Train & Light Rail Interchange (2 min covered walk into Westfield)',
    vibe: 'Major Multiplex',
    supportedFormats: ['IMAX', 'Vmax / Xtremescreen', 'Dolby Atmos', 'Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'Gold Class dining lounge, V-Max daybeds & IMAX Laser auditorium',
    dealHighlight: 'Western Sydney flagship · Cinebuzz 50% Half-Price Tuesday',
    bookingDomainUrl: 'https://www.eventcinemas.com.au/Cinema/Parramatta',
    screenCount: 11,
  },
  {
    id: 'syd-event-macquarie',
    city: 'sydney',
    serpQuery: 'Event Cinemas Macquarie Sydney showtimes',
    name: 'Event Cinemas Macquarie',
    chain: 'Event Cinemas',
    suburb: 'Macquarie Park',
    address: 'Macquarie Centre, Herring & Waterloo Rd, Macquarie Park NSW 2113',
    lat: -33.7772,
    lng: 151.1213,
    distanceFromCbdKm: 12.8,
    transitNote: 'Macquarie University Metro Station (direct entrance into Macquarie Centre)',
    vibe: 'Major Multiplex',
    supportedFormats: ['Vmax / Xtremescreen', 'Dolby Atmos', 'Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'Gold Class lounge, 4DX motion cinema & Macquarie dining gallery',
    dealHighlight: '16-screen North-West flagship · Cinebuzz 50% Half-Price Tuesday',
    bookingDomainUrl: 'https://www.eventcinemas.com.au/Cinema/Macquarie',
    screenCount: 16,
  },
  {
    id: 'syd-dendy-newtown',
    city: 'sydney',
    serpQuery: 'Dendy Cinemas Newtown showtimes',
    name: 'Dendy Cinemas Newtown',
    chain: 'Dendy Cinemas',
    suburb: 'Newtown',
    address: '261–263 King St, Newtown NSW 2042',
    lat: -33.897,
    lng: 151.1792,
    distanceFromCbdKm: 4.3,
    transitNote: 'Newtown Station (3 min walk north along vibrant King St)',
    vibe: 'Indie & Arthouse',
    supportedFormats: ['Standard', 'Gold Class / LUX', '35mm / 70mm'],
    barAndFoodNote: 'Dendy Lounge in-cinema service + King St dining',
    dealHighlight: 'Inner West indie favourite · A$12 Budget Tuesday (Dendy Lounge A$16)',
    bookingDomainUrl: 'https://newtown.dendy.com.au/',
    screenCount: 10,
  },
  {
    id: 'syd-palace-norton',
    city: 'sydney',
    serpQuery: 'Palace Norton Street Leichhardt showtimes',
    name: 'Palace Norton Street',
    chain: 'Palace Cinemas',
    suburb: 'Leichhardt',
    address: '99 Norton St, Leichhardt NSW 2040',
    lat: -33.8856,
    lng: 151.1569,
    distanceFromCbdKm: 5.5,
    transitNote: 'Bus 440 from Central/Town Hall right to Norton St Piazza',
    vibe: 'Indie & Arthouse',
    supportedFormats: ['Standard', 'Gold Class / LUX'],
    barAndFoodNote: 'Italian espresso bar, Campari spritzes & woodfired pizza nearby',
    dealHighlight: 'Royal Discount Every Mon & Tue: A$12 GA / A$10 Palace Movie Club',
    bookingDomainUrl: 'https://www.palacecinemas.com.au/cinemas/palace-norton-street/',
    screenCount: 8,
  },
  {
    id: 'syd-palace-central',
    city: 'sydney',
    serpQuery: 'Palace Central Cinema Chippendale Sydney showtimes',
    name: 'Palace Central',
    chain: 'Palace Cinemas',
    suburb: 'Chippendale',
    address: 'Level 3, Central Park Mall, 28 Broadway, Chippendale NSW 2008',
    lat: -33.8845,
    lng: 151.2007,
    distanceFromCbdKm: 1.8,
    transitNote: 'Central Station (5 min walk across Broadway to Central Park Mall)',
    vibe: 'Boutique Luxury',
    supportedFormats: ['Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'Palace Platinum dine-in lounge, champagne bar & Spice Alley downstairs',
    dealHighlight: 'Royal Discount Every Mon & Tue: A$12 GA / A$10 Palace Movie Club',
    bookingDomainUrl: 'https://www.palacecinemas.com.au/cinemas/palace-central/',
    screenCount: 13,
  },
  {
    id: 'syd-event-burwood',
    city: 'sydney',
    serpQuery: 'Event Cinemas Burwood Sydney showtimes',
    name: 'Event Cinemas Burwood',
    chain: 'Event Cinemas',
    suburb: 'Burwood',
    address: 'Westfield Burwood, 100 Burwood Rd, Burwood NSW 2134',
    lat: -33.8748,
    lng: 151.1046,
    distanceFromCbdKm: 10.2,
    transitNote: 'Burwood Station on T1/T2/T9 Lines (4 min walk along Burwood Rd)',
    vibe: 'Major Multiplex',
    supportedFormats: ['Vmax / Xtremescreen', 'Dolby Atmos', 'Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'Gold Class cocktail lounge + Burwood Chinatown night market strip nearby',
    dealHighlight: 'Inner West multiplex hub · Cinebuzz 50% Half-Price Tuesday',
    bookingDomainUrl: 'https://www.eventcinemas.com.au/Cinema/Burwood',
    screenCount: 10,
  },
  {
    id: 'syd-hoyts-broadway',
    city: 'sydney',
    serpQuery: 'Hoyts Broadway Sydney showtimes',
    name: 'Hoyts Broadway',
    chain: 'Hoyts',
    suburb: 'Ultimo',
    address: 'Level 2, Broadway Sydney, Bay & Grose St, Ultimo NSW 2007',
    lat: -33.8835,
    lng: 151.1948,
    distanceFromCbdKm: 1.9,
    transitNote: '10 min walk from Central Station along Broadway',
    vibe: 'Major Multiplex',
    supportedFormats: ['Vmax / Xtremescreen', 'Dolby Atmos', 'Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'Powered leather recliners in every auditorium + Hoyts LUX',
    dealHighlight: 'Student & HOYTS Cheap Tuesday A$13.50 with Xtremescreen sound',
    bookingDomainUrl: 'https://www.hoyts.com.au/cinemas/broadway',
    screenCount: 12,
  },
  {
    id: 'syd-hoyts-chatswood',
    city: 'sydney',
    serpQuery: 'Hoyts Chatswood Westfield Sydney showtimes',
    name: 'Hoyts Chatswood Westfield',
    chain: 'Hoyts',
    suburb: 'Chatswood',
    address: 'Level 7, Westfield Chatswood, 1 Anderson St, Chatswood NSW 2067',
    lat: -33.7969,
    lng: 151.1834,
    distanceFromCbdKm: 8.4,
    transitNote: 'Chatswood Metro & Train Interchange (4 min walk along Victoria Ave)',
    vibe: 'Major Multiplex',
    supportedFormats: ['Vmax / Xtremescreen', 'Dolby Atmos', 'Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'HOYTS LUX cocktail lounge + Hawker Lane Asian dining precinct below',
    dealHighlight: 'North Shore flagship · Xtremescreen, D-BOX & Cheap Tuesday A$13.50',
    bookingDomainUrl: 'https://www.hoyts.com.au/cinemas/chatswood-westfield',
    screenCount: 7,
  },
  {
    id: 'syd-hoyts-eq',
    city: 'sydney',
    serpQuery: 'Hoyts Entertainment Quarter Moore Park Sydney showtimes',
    name: 'Hoyts Entertainment Quarter',
    chain: 'Hoyts',
    suburb: 'Moore Park',
    address: 'Building 202, Bent St, Entertainment Quarter, Moore Park NSW 2021',
    lat: -33.8919,
    lng: 151.2256,
    distanceFromCbdKm: 3.1,
    transitNote: 'L2 / L3 Light Rail to Moore Park Stop + short stroll through EQ',
    vibe: 'Major Multiplex',
    supportedFormats: ['Vmax / Xtremescreen', 'Dolby Atmos', 'Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'HOYTS LUX bar & Bavarian / EQ courtyard dining precinct',
    dealHighlight: 'Historic studio cinema hub · Xtremescreen & Cheap Tuesday A$13.50',
    bookingDomainUrl: 'https://www.hoyts.com.au/cinemas/entertainment-quarter',
    screenCount: 12,
  },
  {
    id: 'syd-reading-rhodes',
    city: 'sydney',
    serpQuery: 'Reading Cinemas Rhodes Sydney showtimes',
    name: 'Reading Cinemas Rhodes',
    chain: 'Reading Cinemas',
    suburb: 'Rhodes',
    address: 'Rhodes Waterside, 1 Rider Blvd, Rhodes NSW 2138',
    lat: -33.8323,
    lng: 151.086,
    distanceFromCbdKm: 12.1,
    transitNote: 'Rhodes Station on T9 Northern Line (5 min walk to Waterside)',
    vibe: 'Major Multiplex',
    supportedFormats: ['Dolby Atmos', 'Vmax / Xtremescreen', 'Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'Reading Gold Lounge licensed dining & Parramatta River waterfront',
    dealHighlight: 'Everyday low value A$18.50 recliners · TITAN LUXE Dolby Atmos & A$13.50 Tue',
    bookingDomainUrl: 'https://readingcinemas.com.au/locations/theatre/rhodes',
    screenCount: 8,
  },
  {
    id: 'syd-united-warriewood',
    city: 'sydney',
    serpQuery: 'United Cinemas Warriewood Sydney showtimes',
    name: 'United Cinemas Warriewood',
    chain: 'United Cinemas',
    suburb: 'Warriewood',
    address: '4 Vuko Pl, Warriewood NSW 2102',
    lat: -33.6946,
    lng: 151.3005,
    distanceFromCbdKm: 21.2,
    transitNote: 'B-Line B1 Express Bus from Wynyard Station to Warriewood',
    vibe: 'Major Multiplex',
    supportedFormats: ['Dolby Atmos', 'Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'Grand Recliner Lounge, Italian gelato bar & Northern Beaches piazza',
    dealHighlight: 'Northern Beaches icon · Electric Grand Recliners & A$13.50 Cheap Tuesday',
    bookingDomainUrl: 'https://www.unitedcinemas.com.au/session-times?location=warriewood',
    screenCount: 7,
  },

  // ================= SHANGHAI · 上海 (15 VENUES) =================
  {
    id: 'sha-grand',
    city: 'shanghai',
    maoyanId: 228,
    name: 'Grand Cinema · 大光明电影院',
    chain: 'SFC 上影',
    suburb: 'People’s Square · 人民广场',
    address: '216 Nanjing West Rd, Huangpu District, Shanghai (黄浦区南京西路216号)',
    lat: 31.2331,
    lng: 121.471,
    distanceFromCbdKm: 0.4,
    transitNote: 'Metro Line 1 / 2 / 8 People’s Square Station Exit 8 (人民广场站8号口步行2分钟)',
    vibe: 'Heritage Palace',
    supportedFormats: ['Vmax / Xtremescreen', 'Dolby Atmos', '35mm / 70mm', 'Standard'],
    barAndFoodNote: '1928 László Hudec Art Deco rotunda, historical cinema exhibition & salon café',
    dealHighlight: '1928 “First Cinema of the Far East” · 1,300-seat LUXE Hall #1 & SIFF premieres',
    bookingDomainUrl: 'https://www.maoyan.com/cinema/228',
    screenCount: 6,
  },
  {
    id: 'sha-sho',
    city: 'shanghai',
    maoyanId: 227,
    name: 'Shanghai Film Art Center · 上海影城 SHO',
    chain: 'SFC 上影',
    suburb: 'Xinhua Rd · 新华路',
    address: '160 Xinhua Rd, Changning District, Shanghai (长宁区新华路160号)',
    lat: 31.2025,
    lng: 121.4295,
    distanceFromCbdKm: 5.2,
    transitNote: 'Metro Line 10 / 11 Jiaotong University Station Exit 5 (交通大学站5号口)',
    vibe: 'Grand Format',
    supportedFormats: ['Dolby Atmos', 'Vmax / Xtremescreen', 'Gold Class / LUX', 'Standard'],
    barAndFoodNote: '1,008-seat Shanghai Dolby Theatre foyer bar & Xinhua Rd sycamore cafés',
    dealHighlight: 'Official main palace of Shanghai International Film Festival (SIFF) · Dolby Premiere Hall',
    bookingDomainUrl: 'https://www.maoyan.com/cinema/227',
    screenCount: 6,
  },
  {
    id: 'sha-cathay',
    city: 'shanghai',
    maoyanId: 229,
    name: 'Cathay Theatre · 国泰电影院',
    chain: 'SFC 上影',
    suburb: 'Huaihai Rd · 淮海中路',
    address: '870 Huaihai Middle Rd, Huangpu District, Shanghai (黄浦区淮海中路870号)',
    lat: 31.2182,
    lng: 121.4614,
    distanceFromCbdKm: 1.8,
    transitNote: 'Metro Line 13 Middle Huaihai Rd Station Exit 3 or Line 1 South Shaanxi Rd',
    vibe: 'Heritage Palace',
    supportedFormats: ['Dolby Atmos', 'Standard', '35mm / 70mm'],
    barAndFoodNote: 'Restored 1930 Art Deco stepped-tower façade & Huaihai patisseries',
    dealHighlight: '1930 Former French Concession Art Deco jewel · Restored boutique halls',
    bookingDomainUrl: 'https://www.maoyan.com/cinema/229',
    screenCount: 3,
  },
  {
    id: 'sha-peace',
    city: 'shanghai',
    maoyanId: 234,
    name: 'Peace Cinema · 和平影都',
    chain: 'SFC 上影',
    suburb: 'People’s Square · 人民广场',
    address: '290 Xizang Middle Rd, Huangpu District, Shanghai (黄浦区西藏中路290号)',
    lat: 31.2326,
    lng: 121.4763,
    distanceFromCbdKm: 0.3,
    transitNote: 'Metro Line 1 / 2 / 8 People’s Square Station Exit 14 (来福士广场旁)',
    vibe: 'Grand Format',
    supportedFormats: ['IMAX', 'Dolby Atmos', 'Standard'],
    barAndFoodNote: 'Raffles City & Nanjing Rd pedestrian promenade dining right outside',
    dealHighlight: 'Shanghai’s original commercial IMAX landmark at People’s Square',
    bookingDomainUrl: 'https://www.maoyan.com/cinema/234',
    screenCount: 7,
  },
  {
    id: 'sha-palace-iapm',
    city: 'shanghai',
    maoyanId: 6217,
    name: 'Palace Cinema iapm · 百丽宫（环贸iapm店）',
    chain: 'Palace 百丽宫',
    suburb: 'Huaihai Rd · 淮海中路',
    address: 'L6, iapm Mall, 999 Huaihai Middle Rd, Xuhui District (徐汇区淮海中路999号环贸iapm L6)',
    lat: 31.2155,
    lng: 121.4575,
    distanceFromCbdKm: 2.2,
    transitNote: 'Direct access from Metro Line 1 / 10 / 12 South Shaanxi Rd Station (陕西南路站)',
    vibe: 'Boutique Luxury',
    supportedFormats: ['IMAX', 'Dolby Atmos', 'Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'iapm rooftop fine dining, specialty hand-drip coffee & gourmet caramel popcorn',
    dealHighlight: 'Flagship Laser IMAX & Shanghai’s favourite luxury date-night cinema',
    bookingDomainUrl: 'https://www.maoyan.com/cinema/6217',
    screenCount: 6,
  },
  {
    id: 'sha-palace-raffles',
    city: 'shanghai',
    maoyanId: 37252,
    name: 'Palace North Bund · 百丽宫（北外滩来福士店）',
    chain: 'Palace 百丽宫',
    suburb: 'North Bund · 北外滩',
    address: '3F, Raffles City The Bund, 999 Dongdaming Rd, Hongkou (虹口区东大名路999号北外滩来福士3层)',
    lat: 31.2532,
    lng: 121.5071,
    distanceFromCbdKm: 3.9,
    transitNote: 'Metro Line 12 Tilanqiao Station Exit 3 (提篮桥站直达)',
    vibe: 'Boutique Luxury',
    supportedFormats: ['Vmax / Xtremescreen', 'Dolby Atmos', 'Standard'],
    barAndFoodNote: 'Retro 1990s Shanghai City Mart food hall & panoramic Lujiazui skyline promenade',
    dealHighlight: 'RealD LUXE giant screen & plush wide leather seating overlooking the Bund',
    bookingDomainUrl: 'https://www.maoyan.com/cinema/37252',
    screenCount: 9,
  },
  {
    id: 'sha-palace-oneeast',
    city: 'shanghai',
    maoyanId: 36914,
    name: 'Palace One East · 百丽宫（博荟广场IMAX店）',
    chain: 'Palace 百丽宫',
    suburb: 'Huangpu Riverside · 黄浦滨江',
    address: 'B1–B2, One East, 788 Zhongshan South 1st Rd, Huangpu (黄浦区中山南一路788号博荟广场)',
    lat: 31.1967,
    lng: 121.4795,
    distanceFromCbdKm: 3.8,
    transitNote: 'Metro Line 13 World Expo Museum Station or Line 4 Luban Rd Station',
    vibe: 'Grand Format',
    supportedFormats: ['IMAX', 'Dolby Atmos', 'Vmax / Xtremescreen', 'Standard'],
    barAndFoodNote: 'One East late-night bistro courtyard & craft cocktail bars',
    dealHighlight: 'Next-gen Laser IMAX & LUXE auditoriums with generous Maoyan member pricing',
    bookingDomainUrl: 'https://www.maoyan.com/cinema/36914',
    screenCount: 10,
  },
  {
    id: 'sha-premiere-kerry',
    city: 'shanghai',
    maoyanId: 7890,
    name: 'Broadway Moviemax · 百美汇（静安嘉里中心店）',
    chain: 'Palace 百丽宫',
    suburb: 'Jing’an Temple · 静安寺',
    address: '4F North Zone, Jing An Kerry Centre, 1515 Nanjing West Rd (静安嘉里中心北区4层)',
    lat: 31.2237,
    lng: 121.4488,
    distanceFromCbdKm: 2.5,
    transitNote: 'Metro Line 2 / 7 / 14 Jing’an Temple Station (静安寺站直达)',
    vibe: 'Indie & Arthouse',
    supportedFormats: ['Dolby Atmos', 'Standard', 'Gold Class / LUX'],
    barAndFoodNote: 'Jing An Kerry Centre wine bars, bakeries & international festival salon',
    dealHighlight: 'Curated international arthouse & Broadway Circuit premiere engagements',
    bookingDomainUrl: 'https://www.maoyan.com/cinema/7890',
    screenCount: 5,
  },
  {
    id: 'sha-moviemovie-taikoo',
    city: 'shanghai',
    maoyanId: 37534,
    name: 'MOViE MOViE · 前滩太古里影城',
    chain: 'Palace 百丽宫',
    suburb: 'Qiantan · 前滩',
    address: 'L3 Stone Zone, Taikoo Li Qiantan, 500 Dongyu Rd, Pudong (浦东新区前滩太古里石区L3)',
    lat: 31.1523,
    lng: 121.4826,
    distanceFromCbdKm: 8.7,
    transitNote: 'Metro Line 6 / 8 / 11 Oriental Sports Center Station (东方体育中心站)',
    vibe: 'Indie & Arthouse',
    supportedFormats: ['Dolby Atmos', 'Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'Curated cinema bookstore gallery, art exhibitions & open-air Taikoo Li terraces',
    dealHighlight: 'Cultural lifestyle cinema curating European, Japanese & SIFF arthouse works',
    bookingDomainUrl: 'https://www.maoyan.com/cinema/37534',
    screenCount: 8,
  },
  {
    id: 'sha-sfc-grandgateway',
    city: 'shanghai',
    maoyanId: 235,
    name: 'SFC Grand Gateway 66 · 上影（港汇永华IMAX店）',
    chain: 'SFC 上影',
    suburb: 'Xujiahui · 徐家汇',
    address: '6F, Grand Gateway 66, 1 Hongqiao Rd, Xuhui District (徐汇区虹桥路1号港汇恒隆广场6楼)',
    lat: 31.195,
    lng: 121.4365,
    distanceFromCbdKm: 5.3,
    transitNote: 'Metro Line 1 / 9 / 11 Xujiahui Station Exit 12 (徐家汇站直通港汇恒隆)',
    vibe: 'Major Multiplex',
    supportedFormats: ['IMAX', 'Dolby Atmos', 'Vmax / Xtremescreen', 'Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'Grand Gateway 66 luxury dining deck, RealD Cinema Hall & 4DX auditorium',
    dealHighlight: 'Xujiahui’s flagship 11-screen Laser IMAX & RealD Cinema powerhouse',
    bookingDomainUrl: 'https://www.maoyan.com/cinema/235',
    screenCount: 11,
  },
  {
    id: 'sha-sfc-century',
    city: 'shanghai',
    maoyanId: 41760,
    name: 'SFC Century Link · 上影永华（世纪汇店）',
    chain: 'SFC 上影',
    suburb: 'Pudong Century Ave · 世纪大道',
    address: '5F–6F, Century Link Mall, 1192 Century Ave, Pudong (浦东新区世纪大道1192号世纪汇广场5层)',
    lat: 31.2274,
    lng: 121.5267,
    distanceFromCbdKm: 5.0,
    transitNote: 'Metro Line 2 / 4 / 6 / 9 Century Avenue Interchange Station (世纪大道站直达)',
    vibe: 'Major Multiplex',
    supportedFormats: ['Dolby Atmos', 'Vmax / Xtremescreen', 'Standard'],
    barAndFoodNote: '1192 Old Shanghai retro street food avenue & Pudong cocktail lounges',
    dealHighlight: 'Pudong’s 4-line Metro hub multiplex · All-laser projection & Tuesday deals',
    bookingDomainUrl: 'https://www.maoyan.com/cinema/41760',
    screenCount: 9,
  },
  {
    id: 'sha-ume-xintiandi',
    city: 'shanghai',
    maoyanId: 230,
    name: 'UME Xintiandi · 新天地UME国际影城',
    chain: 'UME 国际影城',
    suburb: 'Xintiandi · 新天地',
    address: '5F, Xintiandi Style I, Lane 123 Xingye Rd, Huangpu (黄浦区兴业路123弄新天地时尚I五楼)',
    lat: 31.219,
    lng: 121.4755,
    distanceFromCbdKm: 1.3,
    transitNote: 'Metro Line 10 / 13 Site of the First CPC National Congress · Xintiandi Station',
    vibe: 'Boutique Luxury',
    supportedFormats: ['Vmax / Xtremescreen', 'Gold Class / LUX', 'Dolby Atmos', 'Standard'],
    barAndFoodNote: 'Xintiandi Shikumen wine terraces, Samsung Onyx 4K Cinema LED & VIP lounge',
    dealHighlight: 'Historic Shikumen dining precinct · Onyx 4K LED screen & celebrity premieres',
    bookingDomainUrl: 'https://www.maoyan.com/cinema/230',
    screenCount: 9,
  },
  {
    id: 'sha-wanda-wujiaochang',
    city: 'shanghai',
    maoyanId: 226,
    name: 'Wanda Wujiaochang · 万达影城（五角场激光IMAX店）',
    chain: 'Wanda 万达影城',
    suburb: 'Wujiaochang · 五角场',
    address: '3F Bldg B, Wanda Plaza, 58 Guobin Rd, Yangpu District (杨浦区国宾路58号五角场万达广场3楼)',
    lat: 31.3012,
    lng: 121.5134,
    distanceFromCbdKm: 8.7,
    transitNote: 'Metro Line 10 Jiangwan Stadium / Wujiaochang Station (五角场站步行3分钟)',
    vibe: 'Major Multiplex',
    supportedFormats: ['IMAX', 'Dolby Atmos', 'Vmax / Xtremescreen', 'Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'Dolby Cinema + Laser IMAX + Wanda PRIME lounge in Shanghai’s university hub',
    dealHighlight: 'One of China’s top-grossing multiplexes · Both Laser IMAX & Dolby Cinema under one roof',
    bookingDomainUrl: 'https://www.maoyan.com/cinema/226',
    screenCount: 12,
  },
  {
    id: 'sha-cgv-magnolia',
    city: 'shanghai',
    maoyanId: 24843,
    name: 'CGV North Bund · 白玉兰广场IMAX店',
    chain: 'CGV 影城',
    suburb: 'North Bund · 北外滩',
    address: '3F, Sinar Mas Plaza, 588 Dongchangzhi Rd, Hongkou (虹口区东长治路588号白玉兰广场3层)',
    lat: 31.2496,
    lng: 121.4989,
    distanceFromCbdKm: 3.1,
    transitNote: 'Metro Line 12 International Cruise Terminal Station Exit 3 (国际客运中心站)',
    vibe: 'Major Multiplex',
    supportedFormats: ['IMAX', 'Gold Class / LUX', 'Vmax / Xtremescreen', 'Standard'],
    barAndFoodNote: 'W Shanghai / Sinar Mas Bund observation bars & CGV Gold Class recliners',
    dealHighlight: 'Industrial-chic North Bund flagship · IMAX, ScreenX & Gold Class lounges',
    bookingDomainUrl: 'https://www.maoyan.com/cinema/24843',
    screenCount: 8,
  },
  {
    id: 'sha-tianshan',
    city: 'shanghai',
    maoyanId: 16011,
    name: 'Tianshan Cinema · 天山电影院（虹桥艺术中心旗舰店）',
    chain: 'SFC 上影',
    suburb: 'Hongqiao · 天山虹桥',
    address: '888 Tianshan Rd, Changning District, Shanghai (长宁区天山路888号虹桥艺术中心)',
    lat: 31.2115,
    lng: 121.4043,
    distanceFromCbdKm: 6.9,
    transitNote: 'Metro Line 2 Loushanguan Rd Station Exit 4 (娄山关路站4号口直达)',
    vibe: 'Indie & Arthouse',
    supportedFormats: ['Dolby Atmos', 'Vmax / Xtremescreen', '35mm / 70mm', 'Standard'],
    barAndFoodNote: 'Hongqiao Art Centre gallery foyer & Japanese izakaya dining along Gubei/Tianshan',
    dealHighlight: 'Shanghai Art Cinema Alliance (艺术电影联盟) core house · 30+ curated films weekly',
    bookingDomainUrl: 'https://www.maoyan.com/cinema/16011',
    screenCount: 7,
  },
];

function normalizeClassification(rawCert) {
  const up = (rawCert || '').toUpperCase().trim();
  if (up === 'G') return 'G';
  if (up === 'PG') return 'PG';
  if (up === 'MA15+' || up === 'MA 15+' || up === 'R18+' || up === 'R 18+') return 'MA15+';
  return 'M';
}

function normalizeFormat(rawType, venueDefaultFormat) {
  const t = (rawType || '').toLowerCase();
  if (t.includes('imax')) return 'IMAX';
  if (t.includes('35mm') || t.includes('70mm') || t.includes('胶片')) return '35mm / 70mm';
  if (t.includes('atmos') || t.includes('titan luxe') || t.includes('杜比')) return 'Dolby Atmos';
  if (
    t.includes('gold class') ||
    t.includes('gold lounge') ||
    t.includes('grand recliner') ||
    t.includes('lux') ||
    t.includes('platinum') ||
    t.includes('boutique') ||
    t.includes('deluxe') ||
    t.includes('lounge') ||
    t.includes('vip') ||
    t.includes('头等舱') ||
    t.includes('cine & living')
  ) {
    // Note: RealD LUXE giant screen ('luxe') is large-format unless explicitly LUX dine-in
    if (t.includes('reald luxe') || t.includes('luxe巨幕') || t.includes('luxe厅')) {
      return 'Vmax / Xtremescreen';
    }
    return 'Gold Class / LUX';
  }
  if (
    t.includes('vmax') ||
    t.includes('v-max') ||
    t.includes('xtreme') ||
    t.includes('titan') ||
    t.includes('4dx') ||
    t.includes('cinity') ||
    t.includes('onyx') ||
    t.includes('screenx') ||
    t.includes('巨幕')
  ) {
    return 'Vmax / Xtremescreen';
  }
  return venueDefaultFormat || 'Standard';
}

function parseShowtimeStringToMinutes(timeStr) {
  const cleaned = String(timeStr || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(am|pm)?$/);
  if (!match) return null;
  let hours = Number.parseInt(match[1], 10);
  const mins = Number.parseInt(match[2], 10);
  const meridiem = match[3];
  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  return {
    minutesFromMidnight: hours * 60 + mins,
    startTime24: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`,
  };
}

function getLocalTodayIso(timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const m = parts.find((p) => p.type === 'month')?.value ?? '11';
  const d = parts.find((p) => p.type === 'day')?.value ?? '13';
  return `${y}-${m}-${d}`;
}

function addDaysIso(baseIso, offsetDays) {
  const [y, m, d] = baseIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + offsetDays, 2, 0, 0));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
    dt.getUTCDate()
  ).padStart(2, '0')}`;
}

/**
 * Resolves a SerpApi day block (`day: "Today" | "Tomorrow" | "Sun"`, `date: "Nov 15"`)
 * into an exact YYYY-MM-DD ISO string within the 7-day city calendar.
 */
function resolveDayBlockDateIso(dayBlock, todayIso) {
  const dayLabel = String(dayBlock.day || '').trim().toLowerCase();
  if (dayLabel === 'today') return todayIso;
  if (dayLabel === 'tomorrow') return addDaysIso(todayIso, 1);

  const rawDate = String(dayBlock.date || '').trim().toLowerCase();
  for (let offset = 0; offset < 7; offset++) {
    const candidateIso = addDaysIso(todayIso, offset);
    const [cy, cm, cd] = candidateIso.split('-').map(Number);
    const dt = new Date(Date.UTC(cy, cm - 1, cd, 2, 0, 0));
    const monShort = dt.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toLowerCase();
    const wkShort = dt.toLocaleString('en-US', { weekday: 'short', timeZone: 'UTC' }).toLowerCase();
    if (rawDate && (rawDate === `${monShort} ${cd}` || rawDate === `${cd} ${monShort}`)) {
      return candidateIso;
    }
    if (!rawDate && dayLabel.startsWith(wkShort)) {
      return candidateIso;
    }
  }
  return null;
}

function normalizeMovieKey(rawTitle) {
  return String(rawTitle || '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, ' ')
    .trim()
    .toLowerCase();
}

async function fetchJsonSafe(url, headers = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(28000) });
  if (!res.ok) {
    throw new Error(`Upstream HTTP ${res.status}`);
  }
  return res.json();
}

export function pickBestYoutubeTrailerKey(videosList) {
  if (!Array.isArray(videosList) || videosList.length === 0) return undefined;
  const valid = videosList.filter(
    (v) =>
      v &&
      v.site === 'YouTube' &&
      typeof v.key === 'string' &&
      /^[A-Za-z0-9_-]{8,16}$/.test(v.key)
  );
  if (valid.length === 0) return undefined;

  const rankVideo = (v) => {
    const type = String(v.type || '');
    const official = Boolean(v.official);
    if (type === 'Trailer' && official) return 5;
    if (type === 'Trailer') return 4;
    if (type === 'Teaser' && official) return 3;
    if (type === 'Teaser') return 2;
    if (type === 'Clip') return 1;
    return 0;
  };

  valid.sort((a, b) => rankVideo(b) - rankVideo(a));
  return valid[0]?.key;
}

async function fetchTmdbMovieFullById(tmdbId, apiKey, posterIndex, releaseStatus) {
  const url = new URL(`https://api.themoviedb.org/3/movie/${tmdbId}`);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('language', 'en-AU');
  url.searchParams.set(
    'append_to_response',
    'credits,release_dates,translations,external_ids,videos'
  );
  url.searchParams.set('include_video_language', 'en,null,ja,zh,es,fr,ko');

  const d = await fetchJsonSafe(url.toString());

  let auCert = 'M';
  let auReleaseDate = d.release_date || '2026-12-01';
  const releaseResults = d.release_dates?.results || [];
  const auEntry = releaseResults.find((r) => r.iso_3166_1 === 'AU');
  if (auEntry && Array.isArray(auEntry.release_dates)) {
    const withCert = auEntry.release_dates.find((x) => x.certification);
    if (withCert) auCert = normalizeClassification(withCert.certification);
    const theatrical = auEntry.release_dates.find((x) => x.type === 3 || x.type === 2);
    if (theatrical?.release_date) {
      auReleaseDate = theatrical.release_date.slice(0, 10);
    }
  }

  const crew = d.credits?.crew || [];
  const directorObj = crew.find((c) => c.job === 'Director');
  const director = directorObj?.name || 'Acclaimed Filmmaker';
  const castLead = (d.credits?.cast || []).slice(0, 4).map((c) => c.name);

  const translations = d.translations?.translations || [];
  const zhEntry =
    translations.find((t) => t.iso_639_1 === 'zh' && t.iso_3166_1 === 'CN') ||
    translations.find((t) => t.iso_639_1 === 'zh');
  const chineseTitle = zhEntry?.data?.title || d.original_title || d.title;

  const imdbId = d.external_ids?.imdb_id || '';

  const genres = (d.genres || []).slice(0, 3).map((g) => g.name);
  if (genres.length === 0) genres.push('Drama');

  const countries = (d.production_countries || []).slice(0, 2).map((c) => c.name);

  const imdbUrl = imdbId
    ? `https://www.imdb.com/title/${imdbId}/`
    : `https://www.imdb.com/find/?q=${encodeURIComponent(d.title)}&s=tt`;
  const rtUrl = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(d.title)}`;
  const doubanUrl = `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(
    imdbId || chineseTitle || d.title
  )}&cat=1002`;

  return {
    id: `tmdb-${d.id}`,
    imdbId,
    title: d.title,
    director,
    releaseYear: Number((d.release_date || '2026').slice(0, 4)) || 2026,
    releaseStatus,
    releaseDateIso: auReleaseDate,
    runtimeMinutes: Number(d.runtime) > 30 ? Number(d.runtime) : 115,
    classification: auCert,
    genres,
    criticScorePercent: 0,
    audienceScorePercent: 0,
    posterUrl: d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : undefined,
    trailerYoutubeKey: pickBestYoutubeTrailerKey(d.videos?.results),
    ratings: {
      imdb: {
        score: null,
        votes: 0,
        url: imdbUrl,
      },
      rottenTomatoes: {
        tomatometerPercent: null,
        audiencePercent: null,
        criticReviews: 0,
        badge: 'Awaiting Reviews',
        url: rtUrl,
      },
      douban: {
        score: null,
        votes: 0,
        chineseTitle,
        starBreakdownPercent: null,
        consensusNote: `《${chineseTitle}》 — 正在同步豆瓣电影条目…`,
        url: doubanUrl,
      },
    },
    countryOrigin: countries.join(' / ') || 'International',
    languageNote: d.spoken_languages?.[0]?.english_name || 'English',
    tagline: d.tagline || `Directed by ${director}.`,
    synopsis: d.overview || 'Now screening in Melbourne and Sydney cinemas.',
    isFeaturedMarquee: posterIndex < 3 && releaseStatus === 'in_cinemas',
    posterTheme: POSTER_THEMES[posterIndex % POSTER_THEMES.length],
    castLead: castLead.length > 0 ? castLead : ['Ensemble Cast'],
  };
}

function createFallbackMovieRecord(rawTitle, posterIndex, hintMeta = null) {
  const asciiSlug = normalizeMovieKey(rawTitle)
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  const hexSuffix = Buffer.from(String(rawTitle)).toString('hex').slice(0, 10);
  const slug = asciiSlug || `cn-${hexSuffix}` || `film-${posterIndex}`;
  const isChinese = /[\u4e00-\u9fff]/.test(String(rawTitle));
  const dur = hintMeta?.runtimeMinutes && hintMeta.runtimeMinutes > 30 ? hintMeta.runtimeMinutes : 118;
  const genres =
    Array.isArray(hintMeta?.genres) && hintMeta.genres.length > 0
      ? hintMeta.genres
      : [isChinese ? 'Drama' : 'Cinema Event'];
  const castLead =
    Array.isArray(hintMeta?.castLead) && hintMeta.castLead.length > 0
      ? hintMeta.castLead
      : ['Theatrical Cast'];

  return {
    id: `live-film-${slug}`,
    imdbId: '',
    title: rawTitle,
    director: hintMeta?.director || 'Theatrical Presentation',
    releaseYear: 2026,
    releaseStatus: 'in_cinemas',
    runtimeMinutes: dur,
    classification: 'M',
    genres,
    criticScorePercent: 0,
    audienceScorePercent: 0,
    ratings: {
      imdb: {
        score: null,
        votes: 0,
        url: `https://www.imdb.com/find/?q=${encodeURIComponent(rawTitle)}&s=tt`,
      },
      rottenTomatoes: {
        tomatometerPercent: null,
        audiencePercent: null,
        criticReviews: 0,
        badge: 'Awaiting Reviews',
        url: `https://www.rottentomatoes.com/search?search=${encodeURIComponent(rawTitle)}`,
      },
      douban: {
        score: null,
        votes: 0,
        chineseTitle: rawTitle,
        starBreakdownPercent: null,
        consensusNote: `院线热映影片《${rawTitle}》，点击下方链接可在豆瓣电影查看观众评价。`,
        url: `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(
          rawTitle
        )}&cat=1002`,
      },
    },
    countryOrigin: isChinese ? 'China' : 'International',
    languageNote: isChinese ? 'Mandarin / Original' : 'Original Language',
    tagline: isChinese ? '上海院线热映佳作 · Now Screening in Shanghai.' : 'Special theatrical engagement.',
    synopsis: isChinese
      ? `Currently screening across Shanghai cinemas (${genres.join(' · ')}). Select any session time for hall details and live Maoyan box-office pricing.`
      : `Currently screening in cinemas. Select a session time for auditorium details and official venue booking.`,
    isFeaturedMarquee: posterIndex < 3,
    posterTheme: POSTER_THEMES[posterIndex % POSTER_THEMES.length],
    castLead,
  };
}

async function resolveMovieViaTmdb(rawTitle, tmdbApiKey, posterIndex, hintMeta = null) {
  const isChineseRaw = /[\u4e00-\u9fff]/.test(String(rawTitle));
  const cleanSearchTitle = String(rawTitle)
    .replace(/\b(4K|35mm|70mm|IMAX|Restoration|Preview|Q&A|Anniversary|Re-release)\b/gi, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/（[^）]*）/g, '')
    .trim();

  try {
    const searchUrl = new URL('https://api.themoviedb.org/3/search/movie');
    searchUrl.searchParams.set('api_key', tmdbApiKey);
    searchUrl.searchParams.set('query', cleanSearchTitle || rawTitle);
    searchUrl.searchParams.set('language', isChineseRaw ? 'en-US' : 'en-AU');

    const searchData = await fetchJsonSafe(searchUrl.toString());
    const candidates = (searchData.results || []).slice(0, 4);
    let chosenHit = candidates[0];

    // If Maoyan supplied exact runtimeMinutes (e.g. 102m John Wick vs 169m John Wick 4), pick closest match!
    if (candidates.length > 1 && hintMeta?.runtimeMinutes > 40) {
      const fullCandidates = await Promise.all(
        candidates.slice(0, 3).map((c) =>
          fetchTmdbMovieFullById(c.id, tmdbApiKey, posterIndex, 'in_cinemas').catch(() => null)
        )
      );
      let bestFull = null;
      let bestDiff = Infinity;
      for (const fc of fullCandidates) {
        if (!fc) continue;
        const diff = Math.abs((fc.runtimeMinutes || 115) - hintMeta.runtimeMinutes);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestFull = fc;
        }
      }
      if (bestFull) {
        if (isChineseRaw) {
          bestFull.ratings.douban.chineseTitle = rawTitle;
        } else {
          bestFull.title = rawTitle;
        }
        return bestFull;
      }
    }

    if (chosenHit?.id) {
      const full = await fetchTmdbMovieFullById(chosenHit.id, tmdbApiKey, posterIndex, 'in_cinemas');
      if (isChineseRaw) {
        // Keep clean English/international title on `full.title` so cross-city films unify cleanly,
        // and guarantee exact Chinese cinema billing title on `ratings.douban.chineseTitle`!
        full.ratings.douban.chineseTitle = rawTitle;
      } else {
        full.title = rawTitle;
      }
      return full;
    }
  } catch {
    // Fall through to fallback movie record
  }
  return createFallbackMovieRecord(rawTitle, posterIndex, hintMeta);
}

/**
 * Queries SerpApi by Cinema (`Cinema Nova Carlton showtimes`, `Event Cinemas George Street showtimes`, etc.)
 * which returns up to 7 days of real-time movies & session times per venue in just 14 total queries!
 */
const SERP_VENUE_CACHE_DIR = path.join(CACHE_DIR, 'serp_venues');

function decodeHtmlEntities(str) {
  return String(str || '')
    .replace(/&#8217;/g, '’')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim();
}

function toSmartTitleCase(raw) {
  const trimmed = raw.trim();
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  const minor = new Set(['a', 'an', 'and', 'at', 'for', 'in', 'of', 'on', 'or', 'the', 'to']);
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word, idx) => {
      if (word === '3d' || word === '4k' || word === 'imax') return word.toUpperCase();
      if (idx > 0 && minor.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Directly scrapes IMAX Melbourne's official server-rendered timetable (`https://imaxmelbourne.com.au/html/movie_sessions/`)
 * since Google Showtimes does not ingest IMAX Melbourne's independent museum feed.
 */
async function fetchImaxMelbourneDaysHtml() {
  const res = await fetch('https://imaxmelbourne.com.au/html/movie_sessions/', {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return [];
  const html = await res.text();

  // Map dayKey -> { day, date, moviesMap: Map<movieName, Map<showingType, string[]>> }
  const dayGroups = new Map();

  const movieSectionRegex =
    /<h3\s+class="movie">([\s\S]*?)<\/h3>\s*<\/a>\s*<ol\s+class="session-list">([\s\S]*?)<\/ol>/gi;
  let sectionMatch;
  while ((sectionMatch = movieSectionRegex.exec(html)) !== null) {
    const rawHeading = decodeHtmlEntities(sectionMatch[1].replace(/<[^>]+>/g, ''));
    const listHtml = sectionMatch[2];
    if (!rawHeading || /theatre hire|group bookings/i.test(rawHeading)) continue;

    const is70mm = /\b(70mm|1570|35mm)\b/i.test(rawHeading);
    const showingType = is70mm ? 'IMAX 1570 70mm Film' : 'IMAX 4K Laser';

    const withoutRating = rawHeading.replace(/\s*\[[^\]]*\]\s*$/, '').trim();
    const cleanedTitle = toSmartTitleCase(
      withoutRating
        .replace(/\s*-\s*(?:IMAX\s*)?(?:70MM|1570|4K\s*LASER|LASER|3D)[\s\S]*$/i, '')
        .replace(/\s+3D$/i, '')
        .trim()
    );
    if (!cleanedTitle) continue;

    const blockRegex =
      /<span\s+class="date">([\s\S]*?)<\/span>[\s\S]*?<div\s+class="times">([\s\S]*?)<\/div>/gi;
    let blockMatch;
    while ((blockMatch = blockRegex.exec(listHtml)) !== null) {
      const rawDateLabel = blockMatch[1].replace(/<[^>]+>/g, '').trim();
      const timesHtml = blockMatch[2];

      const times = [];
      const timeRegex = /<span\s+class="label-time">([\s\S]*?)<\/span>/gi;
      let tMatch;
      while ((tMatch = timeRegex.exec(timesHtml)) !== null) {
        const tVal = tMatch[1].replace(/\s+/g, '').toLowerCase();
        if (tVal) times.push(tVal);
      }
      if (times.length === 0) continue;

      let dayField = '';
      let dateField = '';
      if (/^today$/i.test(rawDateLabel)) {
        dayField = 'Today';
      } else if (/^tomorrow$/i.test(rawDateLabel)) {
        dayField = 'Tomorrow';
      } else {
        const mDate = rawDateLabel.match(
          /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})/i
        );
        if (!mDate) continue;
        dateField = `${mDate[1].slice(0, 3)} ${Number.parseInt(mDate[2], 10)}`;
      }

      const dayKey = dayField || dateField;
      if (!dayGroups.has(dayKey)) {
        dayGroups.set(dayKey, { day: dayField, date: dateField, moviesMap: new Map() });
      }
      const grp = dayGroups.get(dayKey);
      if (!grp.moviesMap.has(cleanedTitle)) {
        grp.moviesMap.set(cleanedTitle, new Map());
      }
      const typeMap = grp.moviesMap.get(cleanedTitle);
      const prevTimes = typeMap.get(showingType) || [];
      typeMap.set(showingType, [...prevTimes, ...times]);
    }
  }

  return Array.from(dayGroups.values()).map((grp) => ({
    day: grp.day,
    date: grp.date,
    movies: Array.from(grp.moviesMap.entries()).map(([name, typeMap]) => ({
      name,
      showing: Array.from(typeMap.entries()).map(([type, time]) => ({ type, time })),
    })),
  }));
}

/**
 * Directly scrapes Golden Age Cinema & Bar's server-rendered Surry Hills schedule
 * (`https://www.ourgoldenage.com.au/now-showing`) at zero SerpApi cost.
 */
async function fetchGoldenAgeSydneyDaysHtml(todayIso) {
  const res = await fetch('https://www.ourgoldenage.com.au/now-showing', {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return [];
  const html = await res.text();

  // Map exact ("WeekdayShort DayNum") within the next 14 days to ISO date (e.g. "Tue 24" -> "2026-11-24")
  const wkDayToIso = new Map();
  for (let offset = 0; offset < 14; offset++) {
    const candidateIso = addDaysIso(todayIso, offset);
    const [cy, cm, cd] = candidateIso.split('-').map(Number);
    const dt = new Date(Date.UTC(cy, cm - 1, cd, 2, 0, 0));
    const wkShort = dt.toLocaleString('en-US', { weekday: 'short', timeZone: 'UTC' }).toLowerCase();
    wkDayToIso.set(`${wkShort} ${cd}`, candidateIso);
  }

  const dayGroups = new Map();
  const cardRegex =
    /__title">([^<]+)<\/div>[\s\S]{0,600}?__eventDate">([^<]+)(?:<span>([^<]+)<\/span>)?<\/div>/gi;
  let m;
  while ((m = cardRegex.exec(html)) !== null) {
    const rawTitle = decodeHtmlEntities(m[1]);
    if (!rawTitle || rawTitle.length > 90) continue;
    if (/private event|film trivia|venue hire|gift card/i.test(rawTitle)) continue;

    const rawDateTime = `${m[2] || ''}${m[3] || ''}`.replace(/\s+/g, ' ').trim();
    // Example: "Sat 14 3:05pm"
    const dtMatch = rawDateTime.match(/^([A-Za-z]{3})\s+(\d{1,2})\s+(\d{1,2}:\d{2}\s*(?:am|pm))$/i);
    if (!dtMatch) continue;
    const wkKey = `${dtMatch[1].toLowerCase()} ${Number.parseInt(dtMatch[2], 10)}`;
    const timeVal = dtMatch[3].replace(/\s+/g, '').toLowerCase();
    const matchedIso = wkDayToIso.get(wkKey);
    if (!matchedIso) continue;

    const showingType = /\b35mm\b/i.test(rawTitle) ? '35mm Paramount Room' : 'Paramount Screening Room';
    const cleanedTitle = rawTitle.replace(/\s*\(35mm\)/i, '').trim();

    if (!dayGroups.has(matchedIso)) {
      dayGroups.set(matchedIso, { isoDate: matchedIso, day: '', date: matchedIso, moviesMap: new Map() });
    }
    const grp = dayGroups.get(matchedIso);
    if (!grp.moviesMap.has(cleanedTitle)) {
      grp.moviesMap.set(cleanedTitle, new Map());
    }
    const typeMap = grp.moviesMap.get(cleanedTitle);
    const prevTimes = typeMap.get(showingType) || [];
    typeMap.set(showingType, [...prevTimes, timeVal]);
  }

  return Array.from(dayGroups.values()).map((grp) => ({
    isoDate: grp.isoDate,
    day: grp.day,
    date: grp.date,
    movies: Array.from(grp.moviesMap.entries()).map(([name, typeMap]) => ({
      name,
      showing: Array.from(typeMap.entries()).map(([type, time]) => ({ type, time })),
    })),
  }));
}

const MOVING_STORY_BASE_URLS = {
  'mel-lido': 'https://www.lidocinemas.com.au',
  'mel-classic': 'https://www.classiccinemas.com.au',
  'mel-cameo': 'https://www.cameocinemas.com.au',
  'syd-ritz': 'https://www.ritzcinemas.com.au',
};

/**
 * Directly scrapes 14 days of timetables for Lido Hawthorn, Classic Elsternwick,
 * Cameo Belgrave, and Ritz Randwick (`/now-showing/YYYY-MM-DD`) at zero SerpApi cost.
 */
async function fetchMovingStoryVenueDaysHtml(baseUrl, todayIso) {
  const dateIsos = [];
  for (let offset = 0; offset < 14; offset++) {
    dateIsos.push(addDaysIso(todayIso, offset));
  }

  const outDays = [];
  const BATCH = 5;
  for (let i = 0; i < dateIsos.length; i += BATCH) {
    const slice = dateIsos.slice(i, i + BATCH);
    const batch = await Promise.all(
      slice.map(async (isoDate) => {
        try {
          const res = await fetch(`${baseUrl}/now-showing/${isoDate}`, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml',
            },
            signal: AbortSignal.timeout(12000),
          });
          if (!res.ok) return null;
          const html = await res.text();
          const moviesMap = new Map();
          const linkRegex =
            /<a\s+class="Link sessions-link"[^>]*data-name="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
          let m;
          while ((m = linkRegex.exec(html)) !== null) {
            const rawTitle = decodeHtmlEntities(m[1]);
            if (!rawTitle || /gift card|venue hire|trivia/i.test(rawTitle)) continue;
            const inner = m[2];
            const tMatch = inner.match(/<span\s+class="Time">([^<]+)<\/span>/i);
            if (!tMatch) continue;
            const timeVal = tMatch[1].replace(/\s+/g, '').toLowerCase();
            const attrMatches = [...inner.matchAll(/<span\s+class="Attribute">([^<]+)<\/span>/gi)]
              .map((x) => decodeHtmlEntities(x[1]))
              .join(' ');
            const showingType = /\b(35mm|70mm)\b/i.test(`${rawTitle} ${attrMatches}`)
              ? '35mm / 70mm Print'
              : /\b(atmos|dolby)\b/i.test(attrMatches)
                ? 'Dolby Atmos'
                : /\brooftop\b/i.test(attrMatches)
                  ? 'Rooftop Cinema'
                  : 'Standard';
            const cleanedTitle = rawTitle.replace(/\s*\((?:35mm|70mm)\)/i, '').trim();
            if (!moviesMap.has(cleanedTitle)) moviesMap.set(cleanedTitle, new Map());
            const fmtMap = moviesMap.get(cleanedTitle);
            fmtMap.set(showingType, [...(fmtMap.get(showingType) || []), timeVal]);
          }
          if (moviesMap.size === 0) return null;
          return {
            isoDate,
            day: '',
            date: isoDate,
            movies: Array.from(moviesMap.entries()).map(([name, fmtMap]) => ({
              name,
              showing: Array.from(fmtMap.entries()).map(([type, time]) => ({ type, time })),
            })),
          };
        } catch {
          return null;
        }
      })
    );
    for (const item of batch) {
      if (item) outDays.push(item);
    }
  }
  return outDays;
}

async function findRecentVenueCache(venueId, fallbackTodayIso, maxAgeHours = 24) {
  try {
    const files = await fs.readdir(SERP_VENUE_CACHE_DIR);
    const prefix = `${venueId}_`;
    let best = null;
    for (const file of files) {
      if (!file.startsWith(prefix) || !file.endsWith('.json')) continue;
      const fullPath = path.join(SERP_VENUE_CACHE_DIR, file);
      const stat = await fs.stat(fullPath);
      if (Date.now() - stat.mtimeMs < maxAgeHours * 3_600_000) {
        const cachedDays = JSON.parse(await fs.readFile(fullPath, 'utf-8'));
        const isValid =
          (Array.isArray(cachedDays) && cachedDays.length > 0) ||
          (cachedDays && Array.isArray(cachedDays.movies) && cachedDays.movies.length > 0);
        if (isValid) {
          const anchorMatch = file.match(/_(\d{4}-\d{2}-\d{2})\.json$/);
          if (!best || stat.mtimeMs > best.mtimeMs) {
            best = {
              mtimeMs: stat.mtimeMs,
              anchorIso: anchorMatch ? anchorMatch[1] : fallbackTodayIso,
              days: cachedDays,
            };
          }
        }
      }
    }
    return best;
  } catch {
    // Directory missing or unreadable
  }
  return null;
}

/**
 * Directly fetches real-time Shanghai multi-day cinema showtimes & CNY prices from Maoyan H5
 * (`https://m.maoyan.com/ajax/cinemaDetail?cinemaId=...`) at zero SerpApi cost.
 */
const CN_GENRE_TO_EN = {
  剧情: 'Drama',
  喜剧: 'Comedy',
  动作: 'Action',
  爱情: 'Romance',
  科幻: 'Science Fiction',
  动画: 'Animation',
  悬疑: 'Mystery',
  犯罪: 'Crime',
  惊悚: 'Thriller',
  恐怖: 'Horror',
  奇幻: 'Fantasy',
  冒险: 'Adventure',
  纪录片: 'Documentary',
  传记: 'History',
  历史: 'History',
  战争: 'War',
  音乐: 'Music',
  歌舞: 'Music',
  家庭: 'Family',
};

async function fetchMaoyanShanghaiVenueData(venue, todayIso) {
  const cached = await findRecentVenueCache(venue.id, todayIso, 24);
  if (cached && cached.days && !Array.isArray(cached.days) && Array.isArray(cached.days.movies)) {
    return { venue, todayIso, maoyanPayload: cached.days };
  }

  const venueCacheFile = path.join(SERP_VENUE_CACHE_DIR, `${venue.id}_${todayIso}.json`);
  const url = `https://m.maoyan.com/ajax/cinemaDetail?cinemaId=${encodeURIComponent(venue.maoyanId)}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        Referer: 'https://m.maoyan.com/',
        Cookie: 'ci=10%2C%E4%B8%8A%E6%B5%B7',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const json = await res.json();
      const movies = json?.showData?.movies || [];
      if (movies.length > 0) {
        const compactPayload = { movies };
        await fs.mkdir(SERP_VENUE_CACHE_DIR, { recursive: true });
        await fs.writeFile(venueCacheFile, JSON.stringify(compactPayload), 'utf-8');
        return { venue, todayIso, maoyanPayload: compactPayload };
      }
    }
  } catch {
    // Fall through to cache fallback
  }

  const fallback = await findRecentVenueCache(venue.id, todayIso, 120);
  if (fallback && fallback.days?.movies) {
    return { venue, todayIso, maoyanPayload: fallback.days };
  }
  return { venue, todayIso, maoyanPayload: { movies: [] } };
}

function getTimeZoneForCity(city) {
  if (city === 'shanghai') return 'Asia/Shanghai';
  if (city === 'sydney') return 'Australia/Sydney';
  return 'Australia/Melbourne';
}

// SerpApi Free Plan protection: 33 AU SerpApi venues refreshed every 84h (~3.5 days)
// uses ~235 searches/month (safely under 250/mo free cap), while refreshing early if < 3 days remain!
// Direct scrapers (Shanghai Maoyan 15 venues, IMAX Melbourne, Golden Age Sydney) refresh daily (24h) at 0 cost.
const SERP_AU_CACHE_TTL_HOURS = Number.parseFloat(process.env.SERP_AU_TTL_HOURS || '84') || 84;

function countFutureDaysInBlocks(days, anchorIso, realTodayIso) {
  if (!Array.isArray(days)) return 0;
  const futureSet = new Set();
  for (const b of days) {
    const dIso = b.isoDate || resolveDayBlockDateIso(b, anchorIso);
    if (dIso && dIso >= realTodayIso) futureSet.add(dIso);
  }
  return futureSet.size;
}

async function fetchCinemaShowtimesViaSerpApi(venue, serpKey, prevVenueDays = null) {
  const locationLabel =
    venue.city === 'melbourne'
      ? 'Melbourne, Victoria, Australia'
      : 'Sydney, New South Wales, Australia';
  const timeZone = getTimeZoneForCity(venue.city);
  const todayIso = getLocalTodayIso(timeZone);

  if (venue.city === 'shanghai' && venue.maoyanId) {
    return fetchMaoyanShanghaiVenueData(venue, todayIso);
  }

  const venueCacheFile = path.join(SERP_VENUE_CACHE_DIR, `${venue.id}_${todayIso}.json`);

  // Direct 14-day HTML scrapers (0 SerpApi cost) always refresh daily (20h TTL)
  const isMovingStoryVenue = Boolean(MOVING_STORY_BASE_URLS[venue.id]);
  if (venue.id === 'mel-imax' || venue.id === 'syd-golden-age' || isMovingStoryVenue) {
    const directRecent = await findRecentVenueCache(venue.id, todayIso, 20);
    if (
      directRecent &&
      countFutureDaysInBlocks(directRecent.days, directRecent.anchorIso, todayIso) >= 8
    ) {
      return {
        venue,
        todayIso: directRecent.anchorIso,
        realTodayIso: todayIso,
        days: directRecent.days,
        usedSerpCredit: false,
      };
    }

    const directDays =
      venue.id === 'mel-imax'
        ? await fetchImaxMelbourneDaysHtml()
        : venue.id === 'syd-golden-age'
          ? await fetchGoldenAgeSydneyDaysHtml(todayIso)
          : await fetchMovingStoryVenueDaysHtml(MOVING_STORY_BASE_URLS[venue.id], todayIso);
    if (directDays.length > 0) {
      await fs.mkdir(SERP_VENUE_CACHE_DIR, { recursive: true });
      await fs.writeFile(venueCacheFile, JSON.stringify(directDays), 'utf-8');
      return { venue, todayIso, realTodayIso: todayIso, days: directDays, usedSerpCredit: false };
    }
  }

  // SerpApi-backed AU venues: reuse cache within 84h window as long as >= 3 upcoming days remain
  const recentCache = await findRecentVenueCache(venue.id, todayIso, SERP_AU_CACHE_TTL_HOURS);
  if (
    recentCache &&
    countFutureDaysInBlocks(recentCache.days, recentCache.anchorIso, todayIso) >= 3
  ) {
    return {
      venue,
      todayIso: recentCache.anchorIso,
      realTodayIso: todayIso,
      days: recentCache.days,
      usedSerpCredit: false,
    };
  }

  // Stateless container carry-forward: if live_catalog.json already holds fresh (< 84h) upcoming
  // schedules (>= 3 future days) for this venue, preserve them without burning SerpApi quota.
  if (prevVenueDays && prevVenueDays.fresh && prevVenueDays.futureDateCount >= 3) {
    return {
      venue,
      todayIso,
      realTodayIso: todayIso,
      days: prevVenueDays.days,
      usedSerpCredit: false,
    };
  }

  if (serpKey) {
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google');
    url.searchParams.set('q', venue.serpQuery);
    url.searchParams.set('location', locationLabel);
    url.searchParams.set('hl', 'en');
    url.searchParams.set('gl', 'au');
    url.searchParams.set('api_key', serpKey);

    try {
      const payload = await fetchJsonSafe(url.toString());
      const days = Array.isArray(payload.showtimes) ? payload.showtimes : [];
      if (days.length > 0) {
        await fs.mkdir(SERP_VENUE_CACHE_DIR, { recursive: true });
        await fs.writeFile(venueCacheFile, JSON.stringify(days), 'utf-8');
        return { venue, todayIso, realTodayIso: todayIso, days, usedSerpCredit: true };
      }
    } catch {
      // Fall through to multi-day cache grace fallback below
    }
  }

  // Resilient fallback: if an upstream query times out, hits monthly quota, or runs without SerpApi key,
  // reuse any recent multi-day cache file (< 120h) or remaining future sessions from live_catalog.json!
  const fallbackCache = await findRecentVenueCache(venue.id, todayIso, 120);
  if (fallbackCache) {
    return {
      venue,
      todayIso: fallbackCache.anchorIso,
      realTodayIso: todayIso,
      days: fallbackCache.days,
      usedSerpCredit: false,
    };
  }
  if (prevVenueDays && prevVenueDays.futureDateCount >= 1) {
    return {
      venue,
      todayIso,
      realTodayIso: todayIso,
      days: prevVenueDays.days,
      usedSerpCredit: false,
    };
  }
  return { venue, todayIso, realTodayIso: todayIso, days: [], usedSerpCredit: false };
}

export async function syncLiveCatalog() {
  const cfg = await getApiConfig();
  if (!cfg.tmdbApiKey) {
    return {
      mode: 'curated',
      reason: 'TMDB_API_KEY is not set in .env yet',
      configuredApis: {
        tmdb: false,
        omdb: Boolean(cfg.omdbApiKey),
        serpapi: Boolean(cfg.serpapiApiKey),
      },
    };
  }

  const cinemas = TARGET_VENUES.map((venue) => {
    const copy = {
      ...venue,
      supportedFormats: [...venue.supportedFormats],
    };
    delete copy.serpQuery;
    delete copy.flicksSlug;
    delete copy.maoyanId;
    return copy;
  });
  const cinemaMap = new Map(cinemas.map((c) => [c.id, c]));

  const rawDiscoveredMovieTitles = new Map(); // normalizedKey -> displayTitle
  const rawMovieHints = new Map(); // normalizedKey -> { runtimeMinutes, genres, castLead }
  const pendingRawSessions = [];

  // Scrape live public pricing pages (Cinema Nova, Lido, Classic, Ritz, Palace) with 24h local cache
  const scrapedPriceOverrides = await getLiveScrapedVenueOverrides(CACHE_DIR);

  // 1a. Fetch all Shanghai venues directly from Maoyan H5 (always live, 0 SerpApi cost!)
  const shanghaiVenues = TARGET_VENUES.filter((v) => v.city === 'shanghai');
  const auVenues = TARGET_VENUES.filter((v) => v.city !== 'shanghai');

  const shanghaiTodayIso = getLocalTodayIso('Asia/Shanghai');
  const shanghaiMaxIso = addDaysIso(shanghaiTodayIso, 13);
  const shanghaiResults = await Promise.all(
    shanghaiVenues.map((v) =>
      fetchMaoyanShanghaiVenueData(v, shanghaiTodayIso).catch(() => ({
        venue: v,
        todayIso: shanghaiTodayIso,
        maoyanPayload: { movies: [] },
      }))
    )
  );

  for (const { venue, maoyanPayload } of shanghaiResults) {
    const mvList = Array.isArray(maoyanPayload?.movies) ? maoyanPayload.movies : [];
    for (const mv of mvList) {
      const rawName = String(mv.nm || '').trim();
      if (!rawName) continue;
      const normKey = normalizeMovieKey(rawName);
      if (!normKey) continue;
      if (!rawDiscoveredMovieTitles.has(normKey)) {
        rawDiscoveredMovieTitles.set(normKey, rawName);
      }
      if (!rawMovieHints.has(normKey)) {
        // Parse Maoyan desc: "140分钟 | 犯罪 | 张译,马丽,陈明昊"
        const descParts = String(mv.desc || '')
          .split('|')
          .map((s) => s.trim());
        const genreRaw = descParts[1] || '';
        const castRaw = descParts[2] || '';
        const mappedGenres = genreRaw
          .split(/[,/、\s]+/)
          .map((g) => CN_GENRE_TO_EN[g] || '')
          .filter(Boolean);
        const castList = castRaw
          .split(/[,，/]+/)
          .map((c) => c.trim())
          .filter(Boolean)
          .slice(0, 4);
        rawMovieHints.set(normKey, {
          runtimeMinutes: Number(mv.dur) || 0,
          genres: mappedGenres,
          castLead: castList,
        });
      }

      const shows = Array.isArray(mv.shows) ? mv.shows : [];
      for (const shDay of shows) {
        const plist = Array.isArray(shDay.plist) ? shDay.plist : [];
        for (const p of plist) {
          const dateIso = String(p.dt || shDay.showDate || '').trim();
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) continue;
          if (dateIso < shanghaiTodayIso || dateIso > shanghaiMaxIso) continue;

          const parsed = parseShowtimeStringToMinutes(p.tm);
          if (!parsed) continue;

          const [y, m, d] = dateIso.split('-').map(Number);
          const dow = new Date(Date.UTC(y, m - 1, d, 2, 0, 0)).getUTCDay();

          const hallRaw = String(p.th || '').replace(/[-（(]?儿童需购票[)）]?/g, '').trim();
          const tpRaw = `${p.tp || ''} ${hallRaw}`;
          const format = normalizeFormat(tpRaw, 'Standard');
          const cinemaRef = cinemaMap.get(venue.id);
          if (cinemaRef && !cinemaRef.supportedFormats.includes(format)) {
            cinemaRef.supportedFormats.push(format);
          }

          const langNote = p.lang ? ` · ${p.lang}${p.tp || ''}` : '';
          const audName = `${hallRaw || 'Screening Hall'}${langNote}`;
          const livePriceCny = Number.parseFloat(p.vipPrice || '');

          pendingRawSessions.push({
            normKey,
            cinemaId: venue.id,
            city: 'shanghai',
            dateIso,
            dow,
            startTime24: parsed.startTime24,
            startMinutesFromMidnight: parsed.minutesFromMidnight,
            auditoriumName: audName,
            format,
            livePriceCny: Number.isFinite(livePriceCny) && livePriceCny > 0 ? livePriceCny : null,
          });
        }
      }
    }
  }

  // 1b. Fetch real-time multi-day schedules across all 35 Melbourne & Sydney cinemas
  // (direct HTML scrapers run daily; SerpApi venues use 84h smart TTL + stateless live_catalog carry-forward).
  let prevSerpSyncedAtIso = null;
  const prevVenueDaysMap = new Map();
  try {
    const prevRaw = JSON.parse(await fs.readFile(CACHE_FILE, 'utf-8'));
    prevSerpSyncedAtIso = prevRaw.serpSyncedAtIso || prevRaw.syncedAtIso || null;
    const serpAgeHours = prevSerpSyncedAtIso
      ? (Date.now() - Date.parse(prevSerpSyncedAtIso)) / 3_600_000
      : Infinity;
    const prevTitleMap = new Map((prevRaw.movies || []).map((m) => [m.id, m.title]));

    const byVenueDate = new Map();
    for (const s of prevRaw.sessions || []) {
      if (s.city === 'shanghai') continue;
      const tz = getTimeZoneForCity(s.city);
      const vToday = getLocalTodayIso(tz);
      if (!s.dateIso || s.dateIso < vToday) continue;
      const mTitle = prevTitleMap.get(s.movieId);
      if (!mTitle) continue;

      if (!byVenueDate.has(s.cinemaId)) byVenueDate.set(s.cinemaId, new Map());
      const dateMap = byVenueDate.get(s.cinemaId);
      if (!dateMap.has(s.dateIso)) dateMap.set(s.dateIso, new Map());
      const mvMap = dateMap.get(s.dateIso);
      if (!mvMap.has(mTitle)) mvMap.set(mTitle, new Map());
      const fmtMap = mvMap.get(mTitle);
      if (!fmtMap.has(s.format)) fmtMap.set(s.format, []);
      fmtMap.get(s.format).push(s.startTime24);
    }

    for (const [cid, dateMap] of byVenueDate.entries()) {
      const days = Array.from(dateMap.entries()).map(([isoDate, mvMap]) => ({
        isoDate,
        day: '',
        date: isoDate,
        movies: Array.from(mvMap.entries()).map(([name, fmtMap]) => ({
          name,
          showing: Array.from(fmtMap.entries()).map(([type, time]) => ({ type, time })),
        })),
      }));
      prevVenueDaysMap.set(cid, {
        fresh: serpAgeHours < SERP_AU_CACHE_TTL_HOURS,
        futureDateCount: dateMap.size,
        days,
      });
    }
  } catch {
    // No previous live_catalog.json yet
  }

  let anyUsedSerpCredit = false;
  {
    const venueResults = [];
    const BATCH_SIZE = 6;
    for (let i = 0; i < auVenues.length; i += BATCH_SIZE) {
      const slice = auVenues.slice(i, i + BATCH_SIZE);
      const batchOut = await Promise.all(
        slice.map((v) =>
          fetchCinemaShowtimesViaSerpApi(
            v,
            cfg.serpapiApiKey,
            prevVenueDaysMap.get(v.id) || null
          ).catch(() => {
            const tz = getTimeZoneForCity(v.city);
            const tIso = getLocalTodayIso(tz);
            return { venue: v, todayIso: tIso, realTodayIso: tIso, days: [], usedSerpCredit: false };
          })
        )
      );
      venueResults.push(...batchOut);
    }

    for (const { venue, todayIso, realTodayIso, days, usedSerpCredit } of venueResults) {
      if (usedSerpCredit) anyUsedSerpCredit = true;
      const venueDefaultFormat = venue.id.includes('imax') ? 'IMAX' : 'Standard';
      const minDateIso = realTodayIso || todayIso;

      for (const dayBlock of days) {
        const dateIso = dayBlock.isoDate || resolveDayBlockDateIso(dayBlock, todayIso);
        if (!dateIso || dateIso < minDateIso) continue;

        const [y, m, d] = dateIso.split('-').map(Number);
        const dow = new Date(Date.UTC(y, m - 1, d, 2, 0, 0)).getUTCDay();

        const moviesInDay = Array.isArray(dayBlock.movies) ? dayBlock.movies : [];
        for (const mv of moviesInDay) {
          const rawName = String(mv.name || '').trim();
          if (!rawName) continue;
          const normKey = normalizeMovieKey(rawName);
          if (!normKey) continue;
          if (!rawDiscoveredMovieTitles.has(normKey)) {
            rawDiscoveredMovieTitles.set(normKey, rawName);
          }

          const showings = Array.isArray(mv.showing) ? mv.showing : [];
          for (const sh of showings) {
            const format = normalizeFormat(sh.type, venueDefaultFormat);
            const cinemaRef = cinemaMap.get(venue.id);
            if (cinemaRef && !cinemaRef.supportedFormats.includes(format)) {
              cinemaRef.supportedFormats.push(format);
            }

            const times = Array.isArray(sh.time) ? sh.time : [];
            for (const tStr of times) {
              const parsed = parseShowtimeStringToMinutes(tStr);
              if (!parsed) continue;

              pendingRawSessions.push({
                normKey,
                cinemaId: venue.id,
                city: venue.city,
                dateIso,
                dow,
                startTime24: parsed.startTime24,
                startMinutesFromMidnight: parsed.minutesFromMidnight,
                auditoriumName: sh.type ? `${sh.type} Auditorium` : `${venue.name} Auditorium`,
                format,
              });
            }
          }
        }
      }
    }
  }

  // 2. Resolve top Now-Showing movies (either discovered live from Melbourne & Sydney cinemas, or from TMDB AU now_playing)
  const movies = [];
  const normKeyToMovie = new Map();

  if (rawDiscoveredMovieTitles.size > 0) {
    // Guarantee every single venue's top films are included first (protects repertory/boutique cinemas),
    // then fill up to 36 total films ordered by total Melbourne & Sydney session frequency.
    const counts = new Map();
    const perVenueCounts = new Map();
    for (const s of pendingRawSessions) {
      counts.set(s.normKey, (counts.get(s.normKey) || 0) + 1);
      if (!perVenueCounts.has(s.cinemaId)) {
        perVenueCounts.set(s.cinemaId, new Map());
      }
      const vc = perVenueCounts.get(s.cinemaId);
      vc.set(s.normKey, (vc.get(s.normKey) || 0) + 1);
    }

    const selectedKeysSet = new Set();
    for (const [cid, vc] of perVenueCounts.entries()) {
      const perVenueKeep =
        cid === 'syd-golden-age' ||
        cid === 'mel-astor' ||
        cid === 'mel-imax' ||
        cid === 'sha-grand' ||
        cid === 'sha-sho' ||
        cid === 'sha-tianshan'
          ? 14
          : 6;
      const venueTop = Array.from(vc.keys())
        .sort((a, b) => (vc.get(b) || 0) - (vc.get(a) || 0))
        .slice(0, perVenueKeep);
      for (const k of venueTop) selectedKeysSet.add(k);
    }

    const overallSorted = Array.from(rawDiscoveredMovieTitles.keys()).sort(
      (a, b) => (counts.get(b) || 0) - (counts.get(a) || 0)
    );
    for (const k of overallSorted) {
      if (selectedKeysSet.size >= 115) break;
      selectedKeysSet.add(k);
    }

    const topKeys = Array.from(selectedKeysSet).sort(
      (a, b) => (counts.get(b) || 0) - (counts.get(a) || 0)
    );

    const resolvedList = await Promise.all(
      topKeys.map((k, idx) =>
        resolveMovieViaTmdb(
          rawDiscoveredMovieTitles.get(k),
          cfg.tmdbApiKey,
          idx,
          rawMovieHints.get(k) || null
        )
      )
    );

    // Deduplicate if two slightly different raw titles resolved to the same TMDB movie ID
    const byMovieId = new Map();
    topKeys.forEach((k, idx) => {
      const m = resolvedList[idx];
      if (!byMovieId.has(m.id)) {
        byMovieId.set(m.id, m);
        movies.push(m);
      }
      normKeyToMovie.set(k, byMovieId.get(m.id));
    });
  } else {
    // Fallback if SerpApi key wasn't added yet: pull TMDB Australia now_playing
    const nowPlayingUrl = `https://api.themoviedb.org/3/movie/now_playing?api_key=${encodeURIComponent(
      cfg.tmdbApiKey
    )}&language=en-AU&region=AU&page=1`;
    const nowPlayingRes = await fetchJsonSafe(nowPlayingUrl);
    const nowIds = (nowPlayingRes.results || []).slice(0, 10).map((m) => m.id);
    for (let i = 0; i < nowIds.length; i++) {
      const full = await fetchTmdbMovieFullById(nowIds[i], cfg.tmdbApiKey, i, 'in_cinemas');
      movies.push(full);
    }
  }

  // Mark top 3 highest-session / featured titles for La Sélection Triptych
  movies.forEach((m, idx) => {
    m.isFeaturedMarquee = idx < 3;
  });

  // Build deduplicated ScreeningSession list
  const seenSessionIds = new Set();
  const liveSessions = [];
  for (const raw of pendingRawSessions) {
    const movie = normKeyToMovie.get(raw.normKey);
    if (!movie) continue;
    const cleanTime = raw.startTime24.replace(':', '');
    const fmtTag = raw.format.replace(/[^a-z0-9]/gi, '').slice(0, 4).toLowerCase();
    const id = `${raw.cinemaId}_${movie.id}_${raw.dateIso}_${cleanTime}_${fmtTag}`.replace(
      /[^a-z0-9_-]/gi,
      ''
    );
    if (seenSessionIds.has(id)) continue;
    seenSessionIds.add(id);

    const pricing = computeVenueSessionPricing({
      cinemaId: raw.cinemaId,
      city: raw.city,
      format: raw.format,
      auditoriumName: raw.auditoriumName,
      runtimeMinutes: movie.runtimeMinutes,
      dayOfWeekUtc: raw.dow,
      minutesFromMidnight: raw.startMinutesFromMidnight,
      livePriceCny: raw.livePriceCny ?? null,
      scrapedOverrides: scrapedPriceOverrides,
    });

    liveSessions.push({
      id,
      movieId: movie.id,
      cinemaId: raw.cinemaId,
      city: raw.city,
      currency: pricing.currency || (raw.city === 'shanghai' ? 'CNY' : 'AUD'),
      dateIso: raw.dateIso,
      startTime24: raw.startTime24,
      startMinutesFromMidnight: raw.startMinutesFromMidnight,
      auditoriumName: raw.auditoriumName,
      format: raw.format,
      priceAud: pricing.priceAud,
      regularPriceAud: pricing.regularPriceAud,
      isDealSession: pricing.isDealSession,
      dealLabel: pricing.dealLabel,
      priceBasis: pricing.priceBasis,
      priceNote: pricing.priceNote,
      accessibilityTags: [],
      seatsRemainingLevel:
        raw.startMinutesFromMidnight >= 18 * 60 && raw.startMinutesFromMidnight <= 21 * 60
          ? 'filling'
          : 'plenty',
    });
  }
  liveSessions.sort((a, b) => a.startMinutesFromMidnight - b.startMinutesFromMidnight);

  // 3. Fetch live Australian + Mainland China (Shanghai) Coming Soon movies via TMDB /movie/upcoming
  const upcomingUrlAu = `https://api.themoviedb.org/3/movie/upcoming?api_key=${encodeURIComponent(
    cfg.tmdbApiKey
  )}&language=en-AU&region=AU&page=1`;
  const upcomingUrlCn = `https://api.themoviedb.org/3/movie/upcoming?api_key=${encodeURIComponent(
    cfg.tmdbApiKey
  )}&language=en-US&region=CN&page=1`;

  const [upcomingResAu, upcomingResCn] = await Promise.all([
    fetchJsonSafe(upcomingUrlAu).catch(() => ({ results: [] })),
    fetchJsonSafe(upcomingUrlCn).catch(() => ({ results: [] })),
  ]);

  const inCinemaIds = new Set(movies.map((m) => m.id));
  const auUpcomingIds = (upcomingResAu.results || [])
    .map((m) => m.id)
    .filter((id) => !inCinemaIds.has(`tmdb-${id}`))
    .slice(0, 8);
  const cnUpcomingIds = (upcomingResCn.results || [])
    .map((m) => m.id)
    .filter((id) => !inCinemaIds.has(`tmdb-${id}`))
    .slice(0, 8);

  const auUpcomingSet = new Set(auUpcomingIds);
  const cnUpcomingSet = new Set(cnUpcomingIds);
  // If CN upcoming has fewer than 6 unique titles, also project top global upcoming tentpoles onto Shanghai houses
  for (const id of auUpcomingIds.slice(0, 5)) {
    if (cnUpcomingSet.size >= 8) break;
    cnUpcomingSet.add(id);
  }

  const combinedUpcomingIds = Array.from(new Set([...auUpcomingIds, ...cnUpcomingSet]));

  const comingSoonMovies = await Promise.all(
    combinedUpcomingIds.map(async (id, j) => {
      const full = await fetchTmdbMovieFullById(id, cfg.tmdbApiKey, 10 + j, 'coming_soon');
      const venues = [];
      if (auUpcomingSet.has(id)) {
        venues.push(
          {
            cinemaId: 'mel-imax',
            city: 'melbourne',
            format: 'IMAX',
            previewNote: `IMAX Melbourne 1.43:1 Opening — ${full.releaseDateIso}`,
          },
          {
            cinemaId: 'mel-kino',
            city: 'melbourne',
            format: 'Standard',
            previewNote: `Paris End CBD Premiere — ${full.releaseDateIso}`,
          },
          {
            cinemaId: 'mel-nova',
            city: 'melbourne',
            format: 'Standard',
            previewNote: `Carlton Season Opening — ${full.releaseDateIso}`,
          },
          {
            cinemaId: 'mel-classic',
            city: 'melbourne',
            format: 'Dolby Atmos',
            previewNote: `Elsternwick Gala Engagement — ${full.releaseDateIso}`,
          },
          {
            cinemaId: 'mel-hoyts-chadstone',
            city: 'melbourne',
            format: 'Vmax / Xtremescreen',
            previewNote: `Chadstone Xtremescreen Opening — ${full.releaseDateIso}`,
          },
          {
            cinemaId: 'mel-village-rivoli',
            city: 'melbourne',
            format: 'Gold Class / LUX',
            previewNote: `Rivoli Camberwell Gold Class — ${full.releaseDateIso}`,
          },
          {
            cinemaId: 'mel-reading-burwood',
            city: 'melbourne',
            format: 'Dolby Atmos',
            previewNote: `Burwood TITAN LUXE Atmos — ${full.releaseDateIso}`,
          },
          {
            cinemaId: 'syd-imax',
            city: 'sydney',
            format: 'IMAX',
            previewNote: `IMAX Sydney Laser Opening — ${full.releaseDateIso}`,
          },
          {
            cinemaId: 'syd-event-george',
            city: 'sydney',
            format: 'Vmax / Xtremescreen',
            previewNote: `George St Flagship Opening — ${full.releaseDateIso}`,
          },
          {
            cinemaId: 'syd-event-parramatta',
            city: 'sydney',
            format: 'Gold Class / LUX',
            previewNote: `Parramatta Gold Class — ${full.releaseDateIso}`,
          },
          {
            cinemaId: 'syd-ritz',
            city: 'sydney',
            format: 'Standard',
            previewNote: `Randwick Premiere — ${full.releaseDateIso}`,
          },
          {
            cinemaId: 'syd-palace-central',
            city: 'sydney',
            format: 'Gold Class / LUX',
            previewNote: `Chippendale Salon Engagement — ${full.releaseDateIso}`,
          },
          {
            cinemaId: 'syd-dendy-newtown',
            city: 'sydney',
            format: 'Standard',
            previewNote: `Newtown Season Engagement — ${full.releaseDateIso}`,
          },
          {
            cinemaId: 'syd-reading-rhodes',
            city: 'sydney',
            format: 'Dolby Atmos',
            previewNote: `Rhodes TITAN LUXE Atmos — ${full.releaseDateIso}`,
          }
        );
      }
      if (cnUpcomingSet.has(id)) {
        venues.push(
          {
            cinemaId: 'sha-grand',
            city: 'shanghai',
            format: 'Vmax / Xtremescreen',
            previewNote: `大光明 LUXE 首映礼 · Grand Cinema Opening — ${full.releaseDateIso}`,
          },
          {
            cinemaId: 'sha-sho',
            city: 'shanghai',
            format: 'Dolby Atmos',
            previewNote: `上海影城 1号杜比剧场首映 — ${full.releaseDateIso}`,
          },
          {
            cinemaId: 'sha-palace-iapm',
            city: 'shanghai',
            format: 'IMAX',
            previewNote: `环贸 iapm 激光 IMAX 零点场/首映 — ${full.releaseDateIso}`,
          },
          {
            cinemaId: 'sha-sfc-grandgateway',
            city: 'shanghai',
            format: 'IMAX',
            previewNote: `徐家汇港汇永华 IMAX 激光首映 — ${full.releaseDateIso}`,
          },
          {
            cinemaId: 'sha-moviemovie-taikoo',
            city: 'shanghai',
            format: 'Dolby Atmos',
            previewNote: `前滩太古里 MOViE MOViE 特别放映 — ${full.releaseDateIso}`,
          },
          {
            cinemaId: 'sha-wanda-wujiaochang',
            city: 'shanghai',
            format: 'IMAX',
            previewNote: `五角场万达 IMAX 激光/杜比影院 — ${full.releaseDateIso}`,
          }
        );
      }
      full.upcomingVenues = venues;
      return full;
    })
  );

  // 4. Enrich ALL movies (In-Cinemas + Coming Soon) with TRUE ratings (Official IMDb + MDBList RT + Live Douban)
  await enrichMoviesWithTrueRatings([...movies, ...comingSoonMovies], {
    omdbApiKey: cfg.omdbApiKey,
    mdblistApiKey: cfg.mdblistApiKey,
    cacheDir: CACHE_DIR,
  });

  const nowIso = new Date().toISOString();
  const snapshot = {
    mode: 'live',
    syncedAtIso: nowIso,
    serpSyncedAtIso: anyUsedSerpCredit ? nowIso : prevSerpSyncedAtIso || nowIso,
    ratingsSyncedAtIso: nowIso,
    configuredApis: {
      tmdb: true,
      omdb: Boolean(cfg.omdbApiKey),
      mdblist: Boolean(cfg.mdblistApiKey),
      serpapi: Boolean(cfg.serpapiApiKey),
    },
    hasLiveSessions: liveSessions.length > 0,
    cinemas,
    movies,
    comingSoonMovies,
    sessions: liveSessions,
  };

  await fs.mkdir(CACHE_DIR, { recursive: true });
  const serializedSnapshot = JSON.stringify(snapshot, null, 2);
  await fs.writeFile(CACHE_FILE, serializedSnapshot, 'utf-8');

  // Keep static public/live_catalog.json synchronized for standalone static deployments
  try {
    const publicCatalogPath = path.join(PROJECT_ROOT, 'public', 'live_catalog.json');
    await fs.writeFile(publicCatalogPath, serializedSnapshot, 'utf-8');
  } catch {
    // Ignore if public/ is absent in minimal runtime containers
  }
  return snapshot;
}

// Allow running directly via `npm run sync`
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  syncLiveCatalog()
    .then((result) => {
      if (result.mode === 'curated') {
        console.log(`[Reelhouse Sync] ${result.reason}. Add keys to ~/cinema-guide/.env first.`);
      } else {
        console.log(
          `[Reelhouse Sync] Success at ${result.syncedAtIso}: ${result.movies.length} In-Cinemas films, ${result.comingSoonMovies.length} Coming-Soon films, ${result.sessions.length} live sessions cached.`
        );
      }
    })
    .catch((err) => {
      console.error(
        '[Reelhouse Sync] Failed:',
        err instanceof Error ? err.message : 'Unknown error'
      );
      process.exitCode = 1;
    });
}
