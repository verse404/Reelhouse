import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Authoritative published 2026 Australian box-office rate cards for all Reelhouse venues,
 * augmented by live HTML scraping for venues that publish server-rendered pricing tables
 * (Cinema Nova, Ritz Cinemas Randwick, and Lido Cinemas Hawthorn).
 */
export const PUBLISHED_RATE_CARDS = {
  'mel-nova': {
    adultStandard: 25.5,
    adult35mm: 27.5,
    adultAtmos: 25.5,
    adultVmax: 27.5,
    adultImax: 33.0,
    adultLux: 35.0,
    tuesdayStandard: null, // Cinema Nova runs Discount Monday, not Cheap Tuesday
    mondayBefore4pm: 8.0,
    mondayFrom4pm: 11.0,
    scrapeUrl: 'https://www.cinemanova.com.au/faq',
    memberAndFeeNote: 'Nova Privilege Member A$22.00 · +A$1.75 online booking fee',
  },
  'mel-lido': {
    adultStandard: 27.5,
    adult35mm: 31.5, // +A$4.00 35mm surcharge
    adultAtmos: 28.5,
    adultVmax: 28.5,
    adultImax: 33.0,
    adultLux: 36.0,
    tuesdayStandard: 12.0, // Movie Club A$8.00, Non-member A$12.00
    tuesdayAtmos: 12.0,
    tuesdayDealLabel: 'Cheap Tuesday',
    scrapeUrl: 'https://www.lidocinemas.com.au/ticket-prices',
    memberAndFeeNote: 'Lido Movie Club A$22.50 (A$8.00 Tue) · +A$1.95 online booking fee',
  },
  'mel-astor': {
    adultStandard: 25.0,
    adult35mm: 27.0,
    adultAtmos: 25.0,
    adultVmax: 25.0,
    adultImax: 27.0,
    adultLux: 27.0,
    tuesdayStandard: null, // Astor runs Magic Monday & Fantastic Thursday (A$23)
    magicMondayAndThursday: 23.0,
    memberAndFeeNote: 'Single/Double Feature adult tariff · Magic Mon & Fantastic Thu A$23.00',
  },
  'mel-kino': {
    adultStandard: 24.5,
    adult35mm: 27.5,
    adultAtmos: 25.5,
    adultVmax: 26.5,
    adultImax: 33.0,
    adultLux: 45.0,
    mondayStandard: 12.0, // Palace Royal Discount Every Monday & Tuesday
    mondayDealLabel: 'Royal Discount Mon',
    tuesdayStandard: 12.0,
    tuesdayDealLabel: 'Royal Discount Tue',
    scrapeUrl: 'https://www.palacecinemas.com.au/cinemas/the-kino-melbourne',
    memberAndFeeNote: 'Palace Movie Club A$19.50 (A$10.00 Mon & Tue) · +A$1.85 online booking fee',
  },
  'mel-como': {
    adultStandard: 25.0,
    adult35mm: 28.0,
    adultAtmos: 26.0,
    adultVmax: 27.0,
    adultImax: 33.0,
    adultLux: 46.0, // Palace Platinum (excluded from A$12 Royal Discount)
    mondayStandard: 12.0,
    mondayDealLabel: 'Royal Discount Mon',
    tuesdayStandard: 12.0,
    tuesdayDealLabel: 'Royal Discount Tue',
    scrapeUrl: 'https://www.palacecinemas.com.au/cinemas/palace-cinema-como',
    memberAndFeeNote: 'Palace Movie Club A$20.00 (A$10.00 Mon & Tue) · Platinum excluded',
  },
  'mel-westgarth': {
    adultStandard: 24.5,
    adult35mm: 27.5,
    adultAtmos: 25.5,
    adultVmax: 26.5,
    adultImax: 33.0,
    adultLux: 45.0,
    mondayStandard: 12.0,
    mondayDealLabel: 'Royal Discount Mon',
    tuesdayStandard: 12.0,
    tuesdayDealLabel: 'Royal Discount Tue',
    scrapeUrl: 'https://www.palacecinemas.com.au/cinemas/palace-westgarth',
    memberAndFeeNote: 'Palace Movie Club A$19.50 (A$10.00 Mon & Tue) · +A$1.85 online booking fee',
  },
  'mel-palace-pentridge': {
    adultStandard: 25.0,
    adult35mm: 28.0,
    adultAtmos: 27.0,
    adultVmax: 27.0,
    adultImax: 33.0,
    adultLux: 46.0,
    mondayStandard: 12.0,
    mondayDealLabel: 'Royal Discount Mon',
    tuesdayStandard: 12.0,
    tuesdayDealLabel: 'Royal Discount Tue',
    scrapeUrl: 'https://www.palacecinemas.com.au/cinemas/palace-pentridge',
    memberAndFeeNote: 'Palace Movie Club A$20.00 (A$10.00 Mon & Tue) · Leather recliners every screen',
  },
  'mel-palace-balwyn': {
    adultStandard: 24.5,
    adult35mm: 27.5,
    adultAtmos: 25.5,
    adultVmax: 26.5,
    adultImax: 33.0,
    adultLux: 45.0,
    mondayStandard: 12.0,
    mondayDealLabel: 'Royal Discount Mon',
    tuesdayStandard: 12.0,
    tuesdayDealLabel: 'Royal Discount Tue',
    scrapeUrl: 'https://www.palacecinemas.com.au/cinemas/palace-balwyn',
    memberAndFeeNote: 'Palace Movie Club A$19.50 (A$10.00 Mon & Tue) · +A$1.85 online booking fee',
  },
  'mel-classic': {
    adultStandard: 27.5,
    adult35mm: 31.5,
    adultAtmos: 28.5,
    adultVmax: 28.5,
    adultImax: 33.0,
    adultLux: 36.0,
    tuesdayStandard: 12.0,
    tuesdayAtmos: 12.0,
    tuesdayDealLabel: 'Cheap Tuesday',
    scrapeUrl: 'https://www.classiccinemas.com.au/ticket-prices',
    memberAndFeeNote: 'Classic Movie Club A$22.50 (A$8.00 Tue) · +A$1.95 online booking fee',
  },
  'mel-cameo': {
    adultStandard: 26.5,
    adult35mm: 30.5,
    adultAtmos: 27.5,
    adultVmax: 27.5,
    adultImax: 33.0,
    adultLux: 35.0,
    tuesdayStandard: 12.0,
    tuesdayAtmos: 12.0,
    tuesdayDealLabel: 'Cheap Tuesday',
    memberAndFeeNote: 'Cameo Movie Club A$21.50 (A$8.00 Tue) · +A$1.95 online booking fee',
  },
  'mel-sun': {
    adultStandard: 23.0,
    adult35mm: 25.0,
    adultAtmos: 23.0,
    adultVmax: 23.0,
    adultImax: 30.0,
    adultLux: 26.0,
    tuesdayStandard: 15.0,
    tuesdayDealLabel: 'Sun Discount Tue',
    memberAndFeeNote: 'Sun Club members enjoy discounted sessions · Licensed boutique couches',
  },
  'mel-hoyts-mc': {
    adultStandard: 26.0,
    adult35mm: 26.0,
    adultAtmos: 30.5,
    adultVmax: 30.5, // Xtremescreen
    adultImax: 35.0,
    adultLux: 44.0, // HOYTS LUX
    tuesdayStandard: 13.5,
    tuesdayAtmos: 18.5,
    tuesdayVmax: 18.5,
    tuesdayLux: 26.0, // Official HOYTS LUX Cheap Tuesday
    tuesdayDealLabel: 'HOYTS Cheap Tue',
    memberAndFeeNote: 'HOYTS Rewards discounts available · +online booking & surcharge fees',
  },
  'mel-hoyts-chadstone': {
    adultStandard: 26.5,
    adult35mm: 26.5,
    adultAtmos: 31.0,
    adultVmax: 31.0,
    adultImax: 35.0,
    adultLux: 45.0,
    tuesdayStandard: 13.5,
    tuesdayAtmos: 18.5,
    tuesdayVmax: 18.5,
    tuesdayLux: 26.0,
    tuesdayDealLabel: 'HOYTS Cheap Tue',
    memberAndFeeNote: 'HOYTS Rewards discounts · Free Chadstone parking & powered recliners',
  },
  'mel-hoyts-docklands': {
    adultStandard: 25.0,
    adult35mm: 25.0,
    adultAtmos: 29.5,
    adultVmax: 29.5,
    adultImax: 34.0,
    adultLux: 44.0,
    tuesdayStandard: 13.0,
    tuesdayAtmos: 18.0,
    tuesdayVmax: 18.0,
    tuesdayLux: 26.0,
    tuesdayDealLabel: 'HOYTS Cheap Tue',
    memberAndFeeNote: 'HOYTS Rewards discounts · Powered recliners every auditorium',
  },
  'mel-village-crown': {
    adultStandard: 25.5,
    adult35mm: 25.5,
    adultAtmos: 29.5,
    adultVmax: 29.5,
    adultImax: 34.0,
    adultLux: 48.0, // Village Gold Class excluded from Super Tuesday 50%-off
    tuesdayStandard: 13.0,
    tuesdayAtmos: 15.0,
    tuesdayVmax: 15.0,
    tuesdayLux: null,
    tuesdayDealLabel: 'Vrewards Super Tue',
    memberAndFeeNote: 'Free Vrewards required for Super Tue 50% off · Gold Class excluded on Tue',
  },
  'mel-village-rivoli': {
    adultStandard: 25.5,
    adult35mm: 27.5,
    adultAtmos: 29.5,
    adultVmax: 29.5,
    adultImax: 34.0,
    adultLux: 48.0,
    tuesdayStandard: 13.0,
    tuesdayAtmos: 15.0,
    tuesdayVmax: 15.0,
    tuesdayLux: null,
    tuesdayDealLabel: 'Vrewards Super Tue',
    memberAndFeeNote: 'Free Vrewards Super Tue 50% off · 1940 Art Deco flagship & Gold Class',
  },
  'mel-village-doncaster': {
    adultStandard: 25.0,
    adult35mm: 25.0,
    adultAtmos: 29.0,
    adultVmax: 29.0,
    adultImax: 34.0,
    adultLux: 48.0,
    tuesdayStandard: 12.5,
    tuesdayAtmos: 14.5,
    tuesdayVmax: 14.5,
    tuesdayLux: null,
    tuesdayDealLabel: 'Vrewards Super Tue',
    memberAndFeeNote: 'Free Vrewards Super Tue 50% off · Gold Class & Vmax auditoriums',
  },
  'mel-reading-burwood': {
    adultStandard: 18.5,
    adult35mm: 18.5,
    adultAtmos: 23.5, // TITAN LUXE Dolby Atmos
    adultVmax: 23.5, // TITAN LUXE
    adultImax: 26.0,
    adultLux: 30.0, // Reading Gold Lounge
    tuesdayStandard: 13.5,
    tuesdayAtmos: 18.5,
    tuesdayVmax: 18.5,
    tuesdayLux: 24.0,
    tuesdayDealLabel: 'Reading Value Tue',
    memberAndFeeNote: 'Everyday low value recliners · TITAN LUXE Dolby Atmos & Gold Lounge',
  },
  'mel-imax': {
    adultStandard: 32.0,
    adult35mm: 38.0, // 1570 70mm Film Presentation
    adultAtmos: 32.0,
    adultVmax: 32.0,
    adultImax: 32.0, // Standard IMAX 4K Laser Feature Adult
    adultLux: 45.0, // Premium Balcony
    tuesdayStandard: 23.0, // Official IMAX Melbourne $23 Tuesdays
    tuesdayImax: 23.0,
    tuesdayDealLabel: 'IMAX A$23 Tuesday',
    memberAndFeeNote: 'Big League & Museum Member discounts · A$23 Feature Film Tuesdays · +online fee',
  },
  'syd-ritz': {
    adultStandard: 27.5,
    adult35mm: 31.5, // +A$4.00 35mm surcharge
    adultAtmos: 27.5,
    adultVmax: 27.5,
    adultImax: 33.0,
    adultLux: 35.0,
    tuesdayStandard: 12.0, // Movie Club A$8.00, Non-member A$12.00
    tuesdayAtmos: 12.0,
    tuesdayDealLabel: 'Cheap Tuesday',
    scrapeUrl: 'https://www.ritzcinemas.com.au/ticket-prices',
    memberAndFeeNote: 'Ritz Movie Club A$21.00 (A$8.00 Tue) · +A$1.95 online booking fee',
  },
  'syd-orpheum': {
    adultStandard: 28.0,
    adult35mm: 32.0,
    adultAtmos: 28.0,
    adultVmax: 28.0,
    adultImax: 34.0,
    adultLux: 36.0,
    tuesdayStandard: 16.0,
    tuesdayAtmos: 16.0,
    tuesdayDealLabel: 'Orpheum Discount Tue',
    memberAndFeeNote: 'Orpheum Cinema Savers multi-pass bundles available · +online booking fee',
  },
  'syd-dendy-newtown': {
    adultStandard: 24.0,
    adult35mm: 26.5,
    adultAtmos: 25.0,
    adultVmax: 26.0,
    adultImax: 33.0,
    adultLux: 38.0, // Dendy Lounge
    tuesdayStandard: 12.0, // Official Budget Tuesday
    tuesdayLux: 16.0, // Official Dendy Lounge Budget Tuesday
    tuesdayDealLabel: 'Budget Tuesday',
    memberAndFeeNote: 'Club Dendy member pricing available · Dendy Lounge A$16.00 on Tuesdays',
  },
  'syd-palace-norton': {
    adultStandard: 25.0,
    adult35mm: 28.0,
    adultAtmos: 26.0,
    adultVmax: 27.0,
    adultImax: 33.0,
    adultLux: 45.0,
    mondayStandard: 12.0,
    mondayDealLabel: 'Royal Discount Mon',
    tuesdayStandard: 12.0,
    tuesdayDealLabel: 'Royal Discount Tue',
    scrapeUrl: 'https://www.palacecinemas.com.au/cinemas/palace-norton-street',
    memberAndFeeNote: 'Palace Movie Club A$20.00 (A$10.00 Mon & Tue) · +A$1.85 online booking fee',
  },
  'syd-palace-central': {
    adultStandard: 25.5,
    adult35mm: 28.5,
    adultAtmos: 26.5,
    adultVmax: 27.5,
    adultImax: 33.0,
    adultLux: 46.0, // Palace Platinum
    mondayStandard: 12.0,
    mondayDealLabel: 'Royal Discount Mon',
    tuesdayStandard: 12.0,
    tuesdayDealLabel: 'Royal Discount Tue',
    scrapeUrl: 'https://www.palacecinemas.com.au/cinemas/palace-central',
    memberAndFeeNote: 'Palace Movie Club A$20.50 (A$10.00 Mon & Tue) · Palace Platinum excluded',
  },
  'syd-palace-moore-park': {
    adultStandard: 25.0,
    adult35mm: 28.0,
    adultAtmos: 26.0,
    adultVmax: 27.0,
    adultImax: 33.0,
    adultLux: 45.0,
    mondayStandard: 12.0,
    mondayDealLabel: 'Royal Discount Mon',
    tuesdayStandard: 12.0,
    tuesdayDealLabel: 'Royal Discount Tue',
    scrapeUrl: 'https://www.palacecinemas.com.au/cinemas/palace-moore-park',
    memberAndFeeNote: 'Palace Movie Club A$20.00 (A$10.00 Mon & Tue) · +A$1.85 online booking fee',
  },
  'syd-event-george': {
    adultStandard: 26.5,
    adult35mm: 26.5,
    adultAtmos: 31.0,
    adultVmax: 31.0,
    adultImax: 39.0,
    adultLux: 46.0,
    tuesdayStandard: 13.25, // Cinebuzz Half-Price Tuesday (50% off)
    tuesdayAtmos: 15.5,
    tuesdayVmax: 15.5,
    tuesdayLux: 23.0,
    tuesdayDealLabel: 'Cinebuzz 50% Tue',
    memberAndFeeNote: 'Free Cinebuzz membership unlocks 50% Tue · Dynamic seat pricing online',
  },
  'syd-event-parramatta': {
    adultStandard: 26.0,
    adult35mm: 26.0,
    adultAtmos: 30.5,
    adultVmax: 30.5,
    adultImax: 38.0,
    adultLux: 46.0,
    tuesdayStandard: 13.0,
    tuesdayAtmos: 15.25,
    tuesdayVmax: 15.25,
    tuesdayImax: 19.0,
    tuesdayLux: 23.0,
    tuesdayDealLabel: 'Cinebuzz 50% Tue',
    memberAndFeeNote: 'Free Cinebuzz unlocks 50% Tue · IMAX, V-Max & Gold Class flagship',
  },
  'syd-event-burwood': {
    adultStandard: 25.5,
    adult35mm: 25.5,
    adultAtmos: 30.0,
    adultVmax: 30.0,
    adultImax: 38.0,
    adultLux: 45.0,
    tuesdayStandard: 12.75,
    tuesdayAtmos: 15.0,
    tuesdayVmax: 15.0,
    tuesdayLux: 22.5,
    tuesdayDealLabel: 'Cinebuzz 50% Tue',
    memberAndFeeNote: 'Free Cinebuzz unlocks 50% Tue · V-Max & Gold Class auditoriums',
  },
  'syd-event-macquarie': {
    adultStandard: 26.0,
    adult35mm: 26.0,
    adultAtmos: 30.5,
    adultVmax: 30.5,
    adultImax: 38.0,
    adultLux: 46.0,
    tuesdayStandard: 13.0,
    tuesdayAtmos: 15.25,
    tuesdayVmax: 15.25,
    tuesdayLux: 23.0,
    tuesdayDealLabel: 'Cinebuzz 50% Tue',
    memberAndFeeNote: 'Free Cinebuzz unlocks 50% Tue · V-Max, Gold Class & 4DX auditoriums',
  },
  'syd-imax': {
    adultStandard: 39.0,
    adult35mm: 39.0,
    adultAtmos: 39.0,
    adultVmax: 39.0,
    adultImax: 39.0,
    adultLux: 52.0, // VIP Recliner Balcony
    tuesdayStandard: 19.5,
    tuesdayImax: 19.5,
    tuesdayLux: 26.0,
    tuesdayDealLabel: 'Cinebuzz 50% Tue',
    memberAndFeeNote: 'Free Cinebuzz membership unlocks 50% Tue · Recliner tiers vary online',
  },
  'syd-hoyts-broadway': {
    adultStandard: 26.0,
    adult35mm: 26.0,
    adultAtmos: 30.5,
    adultVmax: 30.5,
    adultImax: 35.0,
    adultLux: 44.0,
    tuesdayStandard: 13.5,
    tuesdayAtmos: 18.5,
    tuesdayVmax: 18.5,
    tuesdayLux: 26.0,
    tuesdayDealLabel: 'HOYTS Cheap Tue',
    memberAndFeeNote: 'HOYTS Rewards discounts available · +online booking & surcharge fees',
  },
  'syd-hoyts-chatswood': {
    adultStandard: 26.5,
    adult35mm: 26.5,
    adultAtmos: 31.0,
    adultVmax: 31.0,
    adultImax: 35.0,
    adultLux: 45.0,
    tuesdayStandard: 13.5,
    tuesdayAtmos: 18.5,
    tuesdayVmax: 18.5,
    tuesdayLux: 26.0,
    tuesdayDealLabel: 'HOYTS Cheap Tue',
    memberAndFeeNote: 'HOYTS Rewards discounts · Xtremescreen, D-BOX & HOYTS LUX',
  },
  'syd-hoyts-eq': {
    adultStandard: 26.0,
    adult35mm: 26.0,
    adultAtmos: 30.5,
    adultVmax: 30.5,
    adultImax: 35.0,
    adultLux: 44.0,
    tuesdayStandard: 13.5,
    tuesdayAtmos: 18.5,
    tuesdayVmax: 18.5,
    tuesdayLux: 26.0,
    tuesdayDealLabel: 'HOYTS Cheap Tue',
    memberAndFeeNote: 'HOYTS Rewards discounts · 2hr free EQ validation parking & LUX',
  },
  'syd-reading-rhodes': {
    adultStandard: 18.5,
    adult35mm: 18.5,
    adultAtmos: 23.5, // TITAN LUXE Dolby Atmos
    adultVmax: 23.5, // TITAN LUXE
    adultImax: 26.0,
    adultLux: 30.0, // Reading Gold Lounge
    tuesdayStandard: 13.5,
    tuesdayAtmos: 18.5,
    tuesdayVmax: 18.5,
    tuesdayLux: 24.0,
    tuesdayDealLabel: 'Reading Value Tue',
    memberAndFeeNote: 'Everyday low value recliners · TITAN LUXE Dolby Atmos & Gold Lounge',
  },
  'syd-united-warriewood': {
    adultStandard: 22.0,
    adult35mm: 22.0,
    adultAtmos: 26.0,
    adultVmax: 26.0,
    adultImax: 30.0,
    adultLux: 34.0, // Grand Recliner Lounge
    tuesdayStandard: 13.5,
    tuesdayAtmos: 17.5,
    tuesdayVmax: 17.5,
    tuesdayDealLabel: 'United Cheap Tue',
    memberAndFeeNote: 'Royalty Club member discounts · Electric Grand Recliners & Dolby Atmos',
  },
  'syd-golden-age': {
    adultStandard: 27.0,
    adult35mm: 29.0,
    adultAtmos: 27.0,
    adultVmax: 27.0,
    adultImax: 33.0,
    adultLux: 27.0,
    tuesdayStandard: null,
    memberAndFeeNote: 'Golden Age Film Club concessions · Boutique 56-seat screening room',
  },
};

function stripHtmlToText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchPublicHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/**
 * Scrapes live public HTML pricing tables from Cinema Nova, Lido Cinemas, and Ritz Cinemas
 * (cached for 24h in `server/cache/scraped_venue_prices.json`).
 */
export async function getLiveScrapedVenueOverrides(cacheDir) {
  const cacheFile = path.join(cacheDir, 'scraped_venue_prices.json');
  try {
    const stat = await fs.stat(cacheFile);
    if (Date.now() - stat.mtimeMs < 24 * 3_600_000) {
      return JSON.parse(await fs.readFile(cacheFile, 'utf-8'));
    }
  } catch {
    // Cache miss — scrape fresh
  }

  const overrides = {};

  // 1. Cinema Nova (`https://www.cinemanova.com.au/faq`)
  try {
    const text = stripHtmlToText(await fetchPublicHtml('https://www.cinemanova.com.au/faq'));
    const adultMatch = text.match(/Adult\s*-\s*\$(\d+(?:\.\d{1,2})?)/i);
    const monMatch = text.match(
      /Discount Monday tickets are\s*\$(\d+(?:\.\d{1,2})?)\s*before 4pm and\s*\$(\d+(?:\.\d{1,2})?)\s*after 4pm/i
    );
    const patch = {};
    if (adultMatch) patch.adultStandard = Number.parseFloat(adultMatch[1]);
    if (monMatch) {
      patch.mondayBefore4pm = Number.parseFloat(monMatch[1]);
      patch.mondayFrom4pm = Number.parseFloat(monMatch[2]);
    }
    if (Object.keys(patch).length > 0) {
      overrides['mel-nova'] = patch;
    }
  } catch {
    // Fall back to published card
  }

  // 2. Lido Cinemas (`https://www.lidocinemas.com.au/ticket-prices`)
  try {
    const text = stripHtmlToText(
      await fetchPublicHtml('https://www.lidocinemas.com.au/ticket-prices')
    );
    const adultMatch = text.match(/Adult\s+\$(\d+(?:\.\d{1,2})?)\s+\$(\d+(?:\.\d{1,2})?)/i);
    const tueMatch = text.match(/Cheap Tuesday\*?\*?\s+\$(\d+(?:\.\d{1,2})?)\s+\$(\d+(?:\.\d{1,2})?)/i);
    const patch = {};
    if (adultMatch) patch.adultStandard = Number.parseFloat(adultMatch[1]);
    if (tueMatch) patch.tuesdayStandard = Number.parseFloat(tueMatch[1]);
    if (Object.keys(patch).length > 0) {
      overrides['mel-lido'] = patch;
    }
  } catch {
    // Fall back to published card
  }

  // 3. Ritz Cinemas (`https://www.ritzcinemas.com.au/ticket-prices`)
  try {
    const text = stripHtmlToText(
      await fetchPublicHtml('https://www.ritzcinemas.com.au/ticket-prices')
    );
    const adultMatch = text.match(
      /Adult(?:\s+for\s+regular\s+sessions)?\s+\$(\d+(?:\.\d{1,2})?)\s+\$(\d+(?:\.\d{1,2})?)/i
    );
    const tueMatch = text.match(/Cheap Tuesday\*?\*?\s+\$(\d+(?:\.\d{1,2})?)\s+\$(\d+(?:\.\d{1,2})?)/i);
    const patch = {};
    if (adultMatch) patch.adultStandard = Number.parseFloat(adultMatch[1]);
    if (tueMatch) patch.tuesdayStandard = Number.parseFloat(tueMatch[1]);
    if (Object.keys(patch).length > 0) {
      overrides['syd-ritz'] = patch;
    }
  } catch {
    // Fall back to published card
  }

  // 3b. Classic Cinemas Elsternwick (`https://www.classiccinemas.com.au/ticket-prices`)
  try {
    const text = stripHtmlToText(
      await fetchPublicHtml('https://www.classiccinemas.com.au/ticket-prices')
    );
    const adultMatch = text.match(/Adult\s+\$(\d+(?:\.\d{1,2})?)\s+\$(\d+(?:\.\d{1,2})?)/i);
    const tueMatch = text.match(/Cheap Tuesday\*?\*?\s+\$(\d+(?:\.\d{1,2})?)\s+\$(\d+(?:\.\d{1,2})?)/i);
    const patch = {};
    if (adultMatch) patch.adultStandard = Number.parseFloat(adultMatch[1]);
    if (tueMatch) patch.tuesdayStandard = Number.parseFloat(tueMatch[1]);
    if (Object.keys(patch).length > 0) {
      overrides['mel-classic'] = patch;
    }
  } catch {
    // Fall back to published card
  }

  // 4. Palace Cinemas Royal Discount (`https://www.palacecinemas.com.au/cinemas/the-kino-melbourne`)
  // Live-scrapes "$10 Movie Club | $12 General Admission — Every Monday & Tuesday!"
  try {
    const rawHtml = await fetchPublicHtml(
      'https://www.palacecinemas.com.au/cinemas/the-kino-melbourne'
    );
    const royalMatch = rawHtml.match(
      /\$(\d+(?:\.\d{1,2})?)\s*Movie Club\s*\|\s*\$(\d+(?:\.\d{1,2})?)\s*General Admission[^"]*Monday/i
    );
    if (royalMatch) {
      const gaDiscount = Number.parseFloat(royalMatch[2]);
      if (Number.isFinite(gaDiscount) && gaDiscount > 0) {
        const palacePatch = {
          mondayStandard: gaDiscount,
          tuesdayStandard: gaDiscount,
        };
        overrides['mel-kino'] = palacePatch;
        overrides['mel-como'] = palacePatch;
        overrides['mel-westgarth'] = palacePatch;
        overrides['mel-palace-pentridge'] = palacePatch;
        overrides['mel-palace-balwyn'] = palacePatch;
        overrides['syd-palace-norton'] = palacePatch;
        overrides['syd-palace-central'] = palacePatch;
        overrides['syd-palace-moore-park'] = palacePatch;
      }
    }
  } catch {
    // Fall back to published card
  }

  try {
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(cacheFile, JSON.stringify(overrides, null, 2), 'utf-8');
  } catch {
    // Ignore cache write errors
  }

  return overrides;
}

/**
 * Computes the published Guide Price for a specific cinema, format, day-of-week, and start time.
 */
export function computeVenueSessionPricing({
  cinemaId,
  city = 'melbourne',
  format,
  auditoriumName = '',
  runtimeMinutes = 115,
  dayOfWeekUtc, // 0 = Sun, 1 = Mon, 2 = Tue, ..., 4 = Thu
  minutesFromMidnight,
  livePriceCny = null,
  scrapedOverrides = {},
}) {
  if (city === 'shanghai') {
    const defaultRegCny =
      format === 'IMAX'
        ? 125
        : format === 'Gold Class / LUX'
          ? 120
          : format === 'Dolby Atmos' || format === 'Vmax / Xtremescreen'
            ? 95
            : 75;

    if (typeof livePriceCny === 'number' && Number.isFinite(livePriceCny) && livePriceCny > 0) {
      const priceCny = Math.round(livePriceCny * 10) / 10;
      const regularPriceCny = Math.max(defaultRegCny, Math.round(priceCny + 14));
      const isTue = dayOfWeekUtc === 2;
      const isMatineeDeal = minutesFromMidnight < 12 * 60 + 30 && priceCny <= 55;
      const isLowTariff = priceCny <= 52;
      const isDealSession = isTue || isMatineeDeal || isLowTariff;
      const dealLabel = isTue
        ? 'Tue Half-Price · 周二半价'
        : isMatineeDeal
          ? 'Morning Saver · 早场特惠'
          : isLowTariff
            ? 'Maoyan Saver · 特惠票'
            : undefined;
      return {
        currency: 'CNY',
        priceAud: priceCny,
        regularPriceAud: regularPriceCny,
        isDealSession,
        dealLabel,
        priceBasis: 'scraped_live',
        priceNote: 'Live Maoyan Shanghai box-office tariff (猫眼实时影城卡/特惠价)',
      };
    }

    const tueCny = Math.round(defaultRegCny * 0.6);
    const isTue = dayOfWeekUtc === 2;
    return {
      currency: 'CNY',
      priceAud: isTue ? tueCny : defaultRegCny,
      regularPriceAud: defaultRegCny,
      isDealSession: isTue,
      dealLabel: isTue ? 'Tue Half-Price · 周二半价' : undefined,
      priceBasis: 'published_card',
      priceNote: 'Shanghai cinema published guide tariff · Check Maoyan for live seat map',
    };
  }
  const baseCard = PUBLISHED_RATE_CARDS[cinemaId] || PUBLISHED_RATE_CARDS['mel-kino'];
  const livePatch = scrapedOverrides[cinemaId];
  const card = livePatch ? { ...baseCard, ...livePatch } : baseCard;
  const priceBasis = livePatch ? 'scraped_live' : 'published_card';

  let regularPrice = card.adultStandard;
  if (cinemaId === 'mel-imax' && runtimeMinutes > 0 && runtimeMinutes <= 55) {
    // Official IMAX Melbourne 45-min Documentary adult tariff
    regularPrice = 19.0;
  } else if (cinemaId === 'mel-imax' && /70mm|1570/i.test(auditoriumName)) {
    // Official IMAX Melbourne 1570 70mm Film Presentation tariff
    regularPrice = card.adult35mm ?? 38.0;
  } else if (format === 'IMAX') {
    regularPrice = card.adultImax ?? card.adultStandard;
  } else if (format === 'Gold Class / LUX') {
    regularPrice = card.adultLux ?? 45.0;
  } else if (format === 'Vmax / Xtremescreen') {
    regularPrice = card.adultVmax ?? card.adultStandard;
  } else if (format === 'Dolby Atmos') {
    regularPrice = card.adultAtmos ?? card.adultStandard;
  } else if (format === '35mm / 70mm') {
    regularPrice = card.adult35mm ?? card.adultStandard;
  }

  let priceAud = regularPrice;
  let isDealSession = false;
  let dealLabel;

  // 1. Cinema Nova famous Discount Monday (<4pm A$8, 4pm+ A$11 for Standard)
  if (cinemaId === 'mel-nova' && dayOfWeekUtc === 1 && format === 'Standard') {
    if (minutesFromMidnight < 16 * 60 && card.mondayBefore4pm) {
      priceAud = card.mondayBefore4pm;
      isDealSession = true;
      dealLabel = 'Discount Mon (<4pm)';
    } else if (card.mondayFrom4pm) {
      priceAud = card.mondayFrom4pm;
      isDealSession = true;
      dealLabel = 'Discount Mon (4pm+)';
    }
  }
  // 2. Palace Cinemas Royal Discount Monday (Every Monday & Tuesday A$12 GA / A$10 Movie Club)
  else if (
    dayOfWeekUtc === 1 &&
    format === 'Standard' &&
    typeof card.mondayStandard === 'number' &&
    card.mondayStandard < regularPrice
  ) {
    priceAud = card.mondayStandard;
    isDealSession = true;
    dealLabel = card.mondayDealLabel || 'Royal Discount Mon';
  }
  // 3. The Astor Theatre Magic Monday & Fantastic Thursday (A$23)
  else if (
    cinemaId === 'mel-astor' &&
    (dayOfWeekUtc === 1 || dayOfWeekUtc === 4) &&
    card.magicMondayAndThursday
  ) {
    priceAud = card.magicMondayAndThursday;
    isDealSession = true;
    dealLabel = dayOfWeekUtc === 1 ? 'Magic Monday' : 'Fantastic Thursday';
  }
  // 3. Venue-specific Cheap / Royal / Super / Cinebuzz Tuesday rules
  else if (dayOfWeekUtc === 2) {
    let tuePrice = null;
    if (format === 'Standard') tuePrice = card.tuesdayStandard ?? null;
    else if (format === 'Dolby Atmos') tuePrice = card.tuesdayAtmos ?? null;
    else if (format === 'Vmax / Xtremescreen') tuePrice = card.tuesdayVmax ?? null;
    else if (format === 'IMAX') tuePrice = card.tuesdayImax ?? null;
    else if (format === 'Gold Class / LUX') tuePrice = card.tuesdayLux ?? null;

    if (typeof tuePrice === 'number' && tuePrice < regularPrice) {
      priceAud = tuePrice;
      isDealSession = true;
      dealLabel = card.tuesdayDealLabel || 'Cheap Tuesday';
    }
  }

  const sourcePrefix =
    priceBasis === 'scraped_live' ? 'Live-scraped venue tariff' : 'Published box-office rate card';
  const priceNote = `${sourcePrefix} · ${card.memberAndFeeNote}`;

  return {
    priceAud,
    regularPriceAud: regularPrice,
    isDealSession,
    dealLabel,
    priceBasis,
    priceNote,
  };
}
