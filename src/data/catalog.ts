import type {
  CalendarDayOption,
  Cinema,
  CityId,
  CityMeta,
  FormatType,
  Movie,
  ScreeningSession,
} from '../types/cinema';
import { getLocalTodayIso } from '../utils/formatters';

export const CITIES: Record<CityId, CityMeta> = {
  melbourne: {
    id: 'melbourne',
    name: 'Melbourne',
    stateCode: 'VIC',
    currency: 'AUD',
    timeZone: 'Australia/Melbourne',
    tagline: 'From the world’s largest 1.43:1 IMAX screen to Collins & Lygon Street arthouse salons.',
    editorialNote:
      '19 flagship & independent venues across Hoyts, Village, Reading, Palace, IMAX, Cinema Nova, Lido, Classic, Sun Theatre & The Astor',
  },
  sydney: {
    id: 'sydney',
    name: 'Sydney',
    stateCode: 'NSW',
    currency: 'AUD',
    timeZone: 'Australia/Sydney',
    tagline: '1935 Art Deco picture palaces, inner-west indie houses & harbourfront Laser IMAX.',
    editorialNote:
      '16 flagship & independent venues across Event, Hoyts, Reading, United, Palace, Dendy, Hayden Orpheum, Ritz Randwick & Golden Age',
  },
  shanghai: {
    id: 'shanghai',
    name: 'Shanghai',
    stateCode: 'SH',
    currency: 'CNY',
    timeZone: 'Asia/Shanghai',
    tagline: 'From 1928 Hudec Art Deco landmarks to Huaihai Road Laser IMAX & SIFF premiere halls.',
    editorialNote:
      '15 iconic & major-circuit venues across Grand Cinema (大光明), Shanghai Film Art Center (上海影城 SHO), Cathay (国泰), Palace iapm (百丽宫), MOViE MOViE, SFC, Wanda IMAX, UME Xintiandi & CGV',
  },
};

export const CINEMAS: Cinema[] = [
  // ================= MELBOURNE =================
  {
    id: 'mel-imax',
    city: 'melbourne',
    name: 'IMAX Melbourne',
    chain: 'IMAX',
    suburb: 'Carlton',
    address: 'Rathdowne St, Melbourne Museum Precinct, Carlton VIC 3053',
    distanceFromCbdKm: 1.6,
    transitNote: 'Tram 86 or 96 to Stop 11 (Melbourne Museum)',
    vibe: 'Grand Format',
    supportedFormats: ['IMAX', '35mm / 70mm'],
    barAndFoodNote: 'Museum forecourt espresso, craft beer & glazedchoc-tops',
    dealHighlight: 'Museum member & student concessions every session',
    bookingDomainUrl: 'https://imaxmelbourne.com.au',
    screenCount: 1,
  },
  {
    id: 'mel-nova',
    city: 'melbourne',
    name: 'Cinema Nova',
    chain: 'Independent',
    suburb: 'Carlton',
    address: '380 Lygon St, Carlton VIC 3053',
    distanceFromCbdKm: 1.8,
    transitNote: 'Tram 1 or 6 along Swanston/Lygon St to Elgin St',
    vibe: 'Indie & Arthouse',
    supportedFormats: ['Standard', '35mm / 70mm', 'Gold Class / LUX'],
    barAndFoodNote: 'Nova Bar cocktails, Lygon St espresso & Nova Deluxe in-seat tapas',
    dealHighlight: 'Iconic Discount Monday & Cheap Tuesday sessions from A$12–A$14',
    bookingDomainUrl: 'https://www.cinemanova.com.au',
    screenCount: 16,
  },
  {
    id: 'mel-astor',
    city: 'melbourne',
    name: 'The Astor Theatre',
    chain: 'Palace Cinemas',
    suburb: 'St Kilda',
    address: '1 Chapel St (cnr Dandenong Rd), St Kilda VIC 3182',
    distanceFromCbdKm: 6.2,
    transitNote: 'Tram 5, 64 or 78 to Chapel St / Windsor Station (6 min walk)',
    vibe: 'Heritage Palace',
    supportedFormats: ['35mm / 70mm', 'Standard'],
    barAndFoodNote: '1936 Art Deco dress-circle lounge & handmade Astor choc-tops',
    dealHighlight: 'Single-screen 1936 grandeur · Double features & 35mm/70mm prints',
    bookingDomainUrl: 'https://www.astortheatre.net.au',
    screenCount: 1,
  },
  {
    id: 'mel-como',
    city: 'melbourne',
    name: 'Palace Cinema Como',
    chain: 'Palace Cinemas',
    suburb: 'South Yarra',
    address: 'Level 1, Como Centre, Toorak Rd & Chapel St, South Yarra VIC 3141',
    distanceFromCbdKm: 4.1,
    transitNote: 'South Yarra Station (5 min walk) or Tram 58 / 78',
    vibe: 'Boutique Luxury',
    supportedFormats: ['Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'Curated Victorian Pinot Noir list, cheese platters & Lavazza bar',
    dealHighlight: 'Golden Club Tuesday specials & afternoon prosecco matinees',
    bookingDomainUrl: 'https://www.palacecinemas.com.au/cinemas/palace-cinema-como/',
    screenCount: 9,
  },
  {
    id: 'mel-hoyts-mc',
    city: 'melbourne',
    name: 'Hoyts Melbourne Central',
    chain: 'Hoyts',
    suburb: 'Melbourne CBD',
    address: 'Level 3, Melbourne Central, Swanston & La Trobe St, Melbourne VIC 3000',
    distanceFromCbdKm: 0.2,
    transitNote: 'Direct elevator access above Melbourne Central City Loop Station',
    vibe: 'Major Multiplex',
    supportedFormats: ['Vmax / Xtremescreen', 'Dolby Atmos', 'Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'Hoyts LUX lounge dining, Artie’s Bar & powered recliners every auditorium',
    dealHighlight: 'Cheap Tuesday powered recliner tickets & morning Saver sessions',
    bookingDomainUrl: 'https://www.hoyts.com.au/cinemas/melbourne-central',
    screenCount: 11,
  },
  {
    id: 'mel-village-crown',
    city: 'melbourne',
    name: 'Village Cinemas Crown',
    chain: 'Village Cinemas',
    suburb: 'Southbank',
    address: '8 Whiteman St, Southbank VIC 3006',
    distanceFromCbdKm: 1.3,
    transitNote: 'Tram 96, 109 or 12 from Southern Cross / Flinders St to Casino East',
    vibe: 'Major Multiplex',
    supportedFormats: ['Gold Class / LUX', 'Vmax / Xtremescreen', 'Dolby Atmos', 'Standard'],
    barAndFoodNote: 'Flagship Gold Class lounge & Yarra promenade late-night dining',
    dealHighlight: 'Half-price Vrewards Tuesday & Vmax Dolby Atmos blockbusters',
    bookingDomainUrl: 'https://villagecinemas.com.au/cinemas/crown',
    screenCount: 13,
  },
  {
    id: 'mel-kino',
    city: 'melbourne',
    name: 'Palace Kino',
    chain: 'Palace Cinemas',
    suburb: 'Melbourne CBD',
    address: 'Collins Place, 45 Collins St, Melbourne VIC 3000',
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
    id: 'mel-westgarth',
    city: 'melbourne',
    name: 'Palace Westgarth',
    chain: 'Palace Cinemas',
    suburb: 'Northcote',
    address: '89 High St, Northcote VIC 3070',
    distanceFromCbdKm: 5.4,
    transitNote: 'Westgarth Station (Mernda Line, 3 min walk) or Tram 86 Stop 29',
    vibe: 'Heritage Palace',
    supportedFormats: ['Standard', '35mm / 70mm'],
    barAndFoodNote: 'Leafy courtyard wine garden inside a restored 1921 Jungle-deco landmark',
    dealHighlight: 'Cheap Tuesday arthouse picks & Sunday twilight courtyard sessions',
    bookingDomainUrl: 'https://www.palacecinemas.com.au/cinemas/palace-westgarth/',
    screenCount: 5,
  },

  // ================= SYDNEY =================
  {
    id: 'syd-imax',
    city: 'sydney',
    name: 'IMAX Sydney',
    chain: 'Event Cinemas',
    suburb: 'Darling Harbour',
    address: '31 Wheat Rd (The Ribbon), Darling Harbour NSW 2000',
    distanceFromCbdKm: 0.9,
    transitNote: 'Town Hall Station (8 min walk via Druitt St) or Pyrmont Bay Light Rail',
    vibe: 'Grand Format',
    supportedFormats: ['IMAX', 'Dolby Atmos', 'Gold Class / LUX'],
    barAndFoodNote: 'Harbour-view mezzanine bar & reclining VIP balcony',
    dealHighlight: 'Dual 4K Laser projection & next-gen 12-channel IMAX sound',
    bookingDomainUrl: 'https://www.eventcinemas.com.au/Cinema/IMAX-Sydney',
    screenCount: 1,
  },
  {
    id: 'syd-golden-age',
    city: 'sydney',
    name: 'Golden Age Cinema & Bar',
    chain: 'Independent',
    suburb: 'Surry Hills',
    address: 'Paramount House, 80 Commonwealth St, Surry Hills NSW 2010',
    distanceFromCbdKm: 1.1,
    transitNote: 'Central Station North Concourse (5 min walk) or Surry Hills Light Rail',
    vibe: 'Boutique Luxury',
    supportedFormats: ['Standard', '35mm / 70mm'],
    barAndFoodNote: 'Signature bespoke cocktails, toasted ruebens & 1940s velvet screening room',
    dealHighlight: 'Intimate 56-seat subterranean cinema in historic Paramount Pictures HQ',
    bookingDomainUrl: 'https://www.ourgoldenage.com.au',
    screenCount: 1,
  },
  {
    id: 'syd-ritz',
    city: 'sydney',
    name: 'Ritz Cinemas',
    chain: 'Independent',
    suburb: 'Randwick',
    address: '45 St Pauls St (The Spot), Randwick NSW 2031',
    distanceFromCbdKm: 6.4,
    transitNote: 'L2 Randwick Light Rail to High St + 5 min stroll to The Spot',
    vibe: 'Heritage Palace',
    supportedFormats: ['35mm / 70mm', 'Dolby Atmos', 'Standard'],
    barAndFoodNote: 'Heritage balcony cocktail bar surrounded by The Spot’s bistro strip',
    dealHighlight: 'Sydney’s last surviving 1937 Art Deco cinema · Legendary Cheap Tuesday',
    bookingDomainUrl: 'https://www.ritzcinemas.com.au',
    screenCount: 6,
  },
  {
    id: 'syd-event-george',
    city: 'sydney',
    name: 'Event Cinemas George Street',
    chain: 'Event Cinemas',
    suburb: 'Sydney CBD',
    address: '505 George St, Sydney NSW 2000',
    distanceFromCbdKm: 0.3,
    transitNote: 'Right at Town Hall Station & QVB / Bathurst St Light Rail stops',
    vibe: 'Major Multiplex',
    supportedFormats: ['Vmax / Xtremescreen', 'Dolby Atmos', 'Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'Gold Class dining lounge, parlour lanes & daybeds in V-Max',
    dealHighlight: 'Cinebuzz Cheap Tuesday & V-Max Dolby Atmos flagship screens',
    bookingDomainUrl: 'https://www.eventcinemas.com.au/Cinema/George-Street',
    screenCount: 17,
  },
  {
    id: 'syd-dendy-newtown',
    city: 'sydney',
    name: 'Dendy Cinemas Newtown',
    chain: 'Dendy Cinemas',
    suburb: 'Newtown',
    address: '261–263 King St, Newtown NSW 2042',
    distanceFromCbdKm: 4.3,
    transitNote: 'Newtown Station (3 min walk north along vibrant King St)',
    vibe: 'Indie & Arthouse',
    supportedFormats: ['Standard', 'Gold Class / LUX', '35mm / 70mm'],
    barAndFoodNote: 'Dendy Lounge in-cinema service + King St late-night Thai & gelato next door',
    dealHighlight: 'Inner West cult & indie favourite · Half-price Club Dendy Tuesdays',
    bookingDomainUrl: 'https://newtown.dendy.com.au/',
    screenCount: 10,
  },
  {
    id: 'syd-palace-norton',
    city: 'sydney',
    name: 'Palace Norton Street',
    chain: 'Palace Cinemas',
    suburb: 'Leichhardt',
    address: '99 Norton St, Leichhardt NSW 2040',
    distanceFromCbdKm: 5.5,
    transitNote: 'Bus 440 from Central/Town Hall right to Norton St Piazza',
    vibe: 'Indie & Arthouse',
    supportedFormats: ['Standard', 'Gold Class / LUX'],
    barAndFoodNote: 'Italian espresso bar, Campari spritzes & woodfired pizza across the street',
    dealHighlight: 'Home of international film festivals & Tuesday discount screenings',
    bookingDomainUrl: 'https://www.palacecinemas.com.au/cinemas/palace-norton-street/',
    screenCount: 8,
  },
  {
    id: 'syd-hoyts-broadway',
    city: 'sydney',
    name: 'Hoyts Broadway',
    chain: 'Hoyts',
    suburb: 'Ultimo',
    address: 'Level 2, Broadway Sydney, Bay & Grose St, Ultimo NSW 2007',
    distanceFromCbdKm: 1.9,
    transitNote: '10 min walk from Central Station along Broadway (or frequent Parramatta Rd buses)',
    vibe: 'Major Multiplex',
    supportedFormats: ['Vmax / Xtremescreen', 'Dolby Atmos', 'Gold Class / LUX', 'Standard'],
    barAndFoodNote: 'Powered leather recliners in every auditorium + Hoyts LUX',
    dealHighlight: 'Student & Cheap Tuesday favourites with massive Xtremescreen sound',
    bookingDomainUrl: 'https://www.hoyts.com.au/cinemas/broadway',
    screenCount: 12,
  },
];

export const MOVIES: Movie[] = [
  {
    id: 'mov-dune-messiah',
    title: 'Dune: Messiah',
    director: 'Denis Villeneuve',
    releaseYear: 2026,
    runtimeMinutes: 166,
    classification: 'M',
    genres: ['Sci-Fi', 'Drama', 'Adventure'],
    criticScorePercent: 94,
    audienceScorePercent: 95,
    ratings: {
      imdb: {
        score: 8.7,
        votes: 248000,
        url: 'https://www.imdb.com/find/?q=Dune+Messiah&s=tt',
      },
      rottenTomatoes: {
        tomatometerPercent: 94,
        audiencePercent: 95,
        criticReviews: 342,
        badge: 'Certified Fresh',
        url: 'https://www.rottentomatoes.com/search?search=Dune%20Messiah',
      },
      douban: {
        score: 8.5,
        votes: 192000,
        chineseTitle: '沙丘3：救世主',
        starBreakdownPercent: [48, 36, 13, 2, 1],
        consensusNote: '维伦纽瓦用1.43:1巨幕画幅完成了最具悲剧崇高感的太空歌剧终章。',
        url: 'https://search.douban.com/movie/subject_search?search_text=%E6%B2%99%E4%B8%98+%E6%95%91%E4%B8%96%E4%B8%BB&cat=1002',
      },
    },
    countryOrigin: 'USA / Canada',
    languageNote: 'English',
    tagline: 'Every empire casts a shadow across the sand.',
    synopsis:
      'Twelve years into Paul Atreides’ imperial reign, a web of Bene Gesserit intrigue and Arrakis prophecies forces an irreversible reckoning across worlds. Shot for full-height 1.43:1 IMAX and 70mm.',
    editorialPickReason: 'Essential in 1.43:1 Laser IMAX (Carlton / Darling Harbour) or 70mm.',
    isFeaturedMarquee: true,
    posterTheme: 'dune-amber',
    castLead: ['Timothée Chalamet', 'Zendaya', 'Florence Pugh', 'Anya Taylor-Joy'],
  },
  {
    id: 'mov-southern-crossings',
    title: 'Southern Crossings',
    director: 'Kitty Green',
    releaseYear: 2026,
    runtimeMinutes: 118,
    classification: 'M',
    genres: ['Drama', 'Mystery'],
    criticScorePercent: 92,
    audienceScorePercent: 88,
    ratings: {
      imdb: {
        score: 7.9,
        votes: 31400,
        url: 'https://www.imdb.com/find/?q=Kitty+Green&s=nm',
      },
      rottenTomatoes: {
        tomatometerPercent: 92,
        audiencePercent: 88,
        criticReviews: 164,
        badge: 'Certified Fresh',
        url: 'https://www.rottentomatoes.com/search?search=Kitty%20Green',
      },
      douban: {
        score: 8.1,
        votes: 18500,
        chineseTitle: '南十字暗流',
        starBreakdownPercent: [31, 47, 18, 3, 1],
        consensusNote: '冷冽克制的澳洲海岸悬疑佳作，莎拉·斯努克的眼神戏张力十足。',
        url: 'https://search.douban.com/movie/subject_search?search_text=Kitty+Green&cat=1002',
      },
    },
    countryOrigin: 'Australia',
    languageNote: 'English',
    tagline: 'Two coastlines. One vanished ferry log.',
    synopsis:
      'A marine hydrographer returning to wintery Bass Strait uncovers discrepancies in a decades-old shipping inquiry that bind a Melbourne maritime union to a quiet Eden harbour town.',
    editorialPickReason: 'Homegrown Melbourne/NSW coastal noir — electric ensemble acting.',
    isFeaturedMarquee: true,
    posterTheme: 'coastal-noir',
    castLead: ['Sarah Snook', 'Julia Garner', 'Bae Doona'],
  },
  {
    id: 'mov-in-the-mood',
    title: 'In the Mood for Love (35mm Restoration)',
    director: 'Wong Kar-wai',
    releaseYear: 2000,
    runtimeMinutes: 98,
    classification: 'PG',
    genres: ['Romance', 'Classic', 'Drama'],
    criticScorePercent: 99,
    audienceScorePercent: 96,
    ratings: {
      imdb: {
        score: 8.1,
        votes: 174000,
        url: 'https://www.imdb.com/title/tt0118694/',
      },
      rottenTomatoes: {
        tomatometerPercent: 99,
        audiencePercent: 94,
        criticReviews: 192,
        badge: 'Certified Fresh',
        url: 'https://www.rottentomatoes.com/m/in_the_mood_for_love',
      },
      douban: {
        score: 8.8,
        votes: 1185000,
        chineseTitle: '花样年华',
        starBreakdownPercent: [55, 33, 10, 1, 1],
        consensusNote: '豆瓣电影 Top 250 常青经典，35毫米胶片颗粒下的旗袍、雨夜与欲说还休。',
        url: 'https://movie.douban.com/subject/1291557/',
      },
    },
    countryOrigin: 'Hong Kong',
    languageNote: 'Cantonese with English subtitles',
    tagline: 'He remembers those vanished years as though looking through a dusty window pane.',
    synopsis:
      'Hong Kong, 1962. Neighbours Chow Mo-wan and Su Li-zhen suspect their spouses are having an affair, drawing them into an aching, rain-slicked ritual of restraint and longing.',
    editorialPickReason: 'Luminous 35mm celluloid prints screening at Astor, Ritz & Golden Age.',
    isFeaturedMarquee: true,
    posterTheme: 'mood-crimson',
    castLead: ['Tony Leung Chiu-wai', 'Maggie Cheung'],
  },
  {
    id: 'mov-nocturne-glass',
    title: 'Nocturne in Glass',
    director: 'Park Chan-wook',
    releaseYear: 2026,
    runtimeMinutes: 129,
    classification: 'MA15+',
    genres: ['Thriller', 'Mystery'],
    criticScorePercent: 91,
    audienceScorePercent: 89,
    ratings: {
      imdb: {
        score: 8.2,
        votes: 68200,
        url: 'https://www.imdb.com/find/?q=Park+Chan-wook&s=nm',
      },
      rottenTomatoes: {
        tomatometerPercent: 91,
        audiencePercent: 89,
        criticReviews: 215,
        badge: 'Certified Fresh',
        url: 'https://www.rottentomatoes.com/search?search=Park%20Chan-wook',
      },
      douban: {
        score: 8.4,
        votes: 114000,
        chineseTitle: '玻璃夜曲',
        starBreakdownPercent: [42, 41, 14, 2, 1],
        consensusNote: '朴赞郁式的精密视听迷宫，汤唯在冷调建筑空间中的每一次呼吸都暗藏锋芒。',
        url: 'https://search.douban.com/movie/subject_search?search_text=%E6%9C%B4%E8%B5%9E%E9%83%81&cat=1002',
      },
    },
    countryOrigin: 'South Korea / France',
    languageNote: 'Korean & English (Subtitled)',
    tagline: 'Every reflection has a witness.',
    synopsis:
      'An acoustic architect hired to soundproof a billionaire’s glass cliffside pavilion realises the blueprints conceal an elaborate auditory trap.',
    editorialPickReason: 'Reference-grade Dolby Atmos mix — razor-sharp suspense.',
    posterTheme: 'glass-nocturne',
    castLead: ['Tang Wei', 'Teo Yoo', 'Franz Rogowski'],
  },
  {
    id: 'mov-clockmaker-kyoto',
    title: 'The Clockmaker of Kyoto',
    director: 'Mamoru Hosoda',
    releaseYear: 2026,
    runtimeMinutes: 108,
    classification: 'PG',
    genres: ['Animation', 'Fantasy', 'Family'],
    criticScorePercent: 95,
    audienceScorePercent: 94,
    ratings: {
      imdb: {
        score: 8.3,
        votes: 45900,
        url: 'https://www.imdb.com/find/?q=Mamoru+Hosoda&s=nm',
      },
      rottenTomatoes: {
        tomatometerPercent: 95,
        audiencePercent: 94,
        criticReviews: 138,
        badge: 'Certified Fresh',
        url: 'https://www.rottentomatoes.com/search?search=Mamoru%20Hosoda',
      },
      douban: {
        score: 8.6,
        votes: 87300,
        chineseTitle: '京都修表匠与四季电车',
        starBreakdownPercent: [49, 37, 11, 2, 1],
        consensusNote: '久违的手绘水彩质感与温柔奇幻想象，适合全年龄观众的大银幕治愈之旅。',
        url: 'https://search.douban.com/movie/subject_search?search_text=%E7%BB%86%E7%94%B0%E5%AE%88&cat=1002',
      },
    },
    countryOrigin: 'Japan',
    languageNote: 'Japanese (Subtitled) & English Dubbed sessions',
    tagline: 'Mend the hour, wake the city.',
    synopsis:
      'When all mechanical clocks across Kyoto halt at 4:44 pm, a teen apprentice horologist discovers a hidden tramway running between forgotten seasons.',
    editorialPickReason: 'Hand-painted watercolours that glow on big screens — ideal all-ages pick.',
    posterTheme: 'kyoto-clock',
    castLead: ['Kaho Nakamura', 'Koji Yakusho'],
  },
  {
    id: 'mov-velvet-static',
    title: 'Velvet & Static',
    director: 'Celine Song',
    releaseYear: 2026,
    runtimeMinutes: 104,
    classification: 'M',
    genres: ['Comedy', 'Romance', 'Music'],
    criticScorePercent: 89,
    audienceScorePercent: 90,
    ratings: {
      imdb: {
        score: 7.8,
        votes: 52100,
        url: 'https://www.imdb.com/find/?q=Celine+Song&s=nm',
      },
      rottenTomatoes: {
        tomatometerPercent: 89,
        audiencePercent: 90,
        criticReviews: 204,
        badge: 'Certified Fresh',
        url: 'https://www.rottentomatoes.com/search?search=Celine%20Song',
      },
      douban: {
        score: 8.0,
        votes: 43600,
        chineseTitle: '丝绒与电流',
        starBreakdownPercent: [29, 46, 21, 3, 1],
        consensusNote: '午夜爵士电台的暧昧与幽默，台词轻盈敏锐，散场后让人想立刻去喝一杯。',
        url: 'https://search.douban.com/movie/subject_search?search_text=Celine+Song&cat=1002',
      },
    },
    countryOrigin: 'USA',
    languageNote: 'English',
    tagline: 'Live on air until sunrise.',
    synopsis:
      'Over one chaotic fundraising marathon at a cash-strapped community jazz and indie radio station, two former bandmates host the graveyard shift together for the first time in seven years.',
    editorialPickReason: 'Warm, funny crowd-pleaser — tailor-made for a wine bar cinema night.',
    posterTheme: 'velvet-static',
    castLead: ['Josh O’Connor', 'Ayo Edebiri', 'Greta Lee'],
  },
  {
    id: 'mov-glasshouse-protocol',
    title: 'Glasshouse Protocol',
    director: 'Alex Garland',
    releaseYear: 2026,
    runtimeMinutes: 134,
    classification: 'MA15+',
    genres: ['Sci-Fi', 'Thriller'],
    criticScorePercent: 86,
    audienceScorePercent: 84,
    ratings: {
      imdb: {
        score: 7.6,
        votes: 79400,
        url: 'https://www.imdb.com/find/?q=Alex+Garland&s=nm',
      },
      rottenTomatoes: {
        tomatometerPercent: 86,
        audiencePercent: 84,
        criticReviews: 248,
        badge: 'Certified Fresh',
        url: 'https://www.rottentomatoes.com/search?search=Alex%20Garland',
      },
      douban: {
        score: 7.7,
        votes: 39200,
        chineseTitle: '温室协议',
        starBreakdownPercent: [24, 43, 27, 5, 1],
        consensusNote: '幽闭生态舱里的硬核科幻心理战，声场设计与合成器配乐极具压迫感。',
        url: 'https://search.douban.com/movie/subject_search?search_text=Alex+Garland&cat=1002',
      },
    },
    countryOrigin: 'UK',
    languageNote: 'English',
    tagline: 'Zero latency. Zero exit.',
    synopsis:
      'Inside a sealed biosphere facility in the Scottish Highlands, six climate engineers run a 90-day atmospheric simulation—until external telemetry goes dark.',
    posterTheme: 'orbital-grid',
    castLead: ['Jessie Buckley', 'Dev Patel', 'Cailee Spaeny'],
  },
  {
    id: 'mov-anatomy-echo',
    title: 'Anatomy of an Echo',
    director: 'Justine Triet',
    releaseYear: 2026,
    runtimeMinutes: 142,
    classification: 'M',
    genres: ['Drama', 'Thriller'],
    criticScorePercent: 93,
    audienceScorePercent: 87,
    ratings: {
      imdb: {
        score: 8.0,
        votes: 41800,
        url: 'https://www.imdb.com/find/?q=Justine+Triet&s=nm',
      },
      rottenTomatoes: {
        tomatometerPercent: 93,
        audiencePercent: 87,
        criticReviews: 189,
        badge: 'Certified Fresh',
        url: 'https://www.rottentomatoes.com/search?search=Justine%20Triet',
      },
      douban: {
        score: 8.5,
        votes: 64100,
        chineseTitle: '回声的解剖',
        starBreakdownPercent: [44, 42, 12, 1, 1],
        consensusNote: '桑德拉·惠勒再度奉献教科书级庭审表演，拟音细节层层剥开真相。',
        url: 'https://search.douban.com/movie/subject_search?search_text=Justine+Triet&cat=1002',
      },
    },
    countryOrigin: 'France / Italy',
    languageNote: 'French & Italian with English subtitles',
    tagline: 'Truth is rarely recorded on the first take.',
    synopsis:
      'A celebrated Foley artist testifying at a high-profile Paris inquest notices a subtle background rhythm on a key piece of courtroom audio evidence.',
    posterTheme: 'echo-ivory',
    castLead: ['Sandra Hüller', 'Swann Arlaud', 'Alba Rohrwacher'],
  },
  {
    id: 'mov-apex-bathurst',
    title: 'Apex: Mount Panorama',
    director: 'George Miller',
    releaseYear: 2026,
    runtimeMinutes: 138,
    classification: 'M',
    genres: ['Action', 'Drama'],
    criticScorePercent: 88,
    audienceScorePercent: 93,
    ratings: {
      imdb: {
        score: 8.1,
        votes: 93500,
        url: 'https://www.imdb.com/find/?q=George+Miller&s=nm',
      },
      rottenTomatoes: {
        tomatometerPercent: 88,
        audiencePercent: 93,
        criticReviews: 226,
        badge: 'Certified Fresh',
        url: 'https://www.rottentomatoes.com/search?search=George%20Miller',
      },
      douban: {
        score: 8.2,
        votes: 51800,
        chineseTitle: '极速全景山：巴瑟斯特1000',
        starBreakdownPercent: [35, 45, 17, 2, 1],
        consensusNote: '乔治·米勒宝刀未老，引擎轰鸣与雨战剪辑让人肾上腺素飙升，必选杜比全景声。',
        url: 'https://search.douban.com/movie/subject_search?search_text=George+Miller&cat=1002',
      },
    },
    countryOrigin: 'Australia',
    languageNote: 'English',
    tagline: '1,000 kilometres. 23 corners. No margin.',
    synopsis:
      'A veteran race strategist and an unproven rookie wildcard team take on Mount Panorama across changing mountain weather in a kinetic symphony of steel and grit.',
    editorialPickReason: 'Thunderous sound design — built for Xtremescreen, Vmax & Dolby Atmos.',
    posterTheme: 'bathurst-carbon',
    castLead: ['Jacob Elordi', 'Kodi Smit-McPhee', 'Essie Davis'],
  },
  {
    id: 'mov-saltwater-summer',
    title: 'Saltwater Summer',
    director: 'Rachel Perkins',
    releaseYear: 2026,
    runtimeMinutes: 96,
    classification: 'G',
    genres: ['Comedy', 'Family'],
    criticScorePercent: 87,
    audienceScorePercent: 91,
    ratings: {
      imdb: {
        score: 7.4,
        votes: 19200,
        url: 'https://www.imdb.com/find/?q=Rachel+Perkins&s=nm',
      },
      rottenTomatoes: {
        tomatometerPercent: 87,
        audiencePercent: 91,
        criticReviews: 94,
        badge: 'Fresh',
        url: 'https://www.rottentomatoes.com/search?search=Rachel%20Perkins',
      },
      douban: {
        score: 7.6,
        votes: 12400,
        chineseTitle: '咸水盛夏',
        starBreakdownPercent: [22, 43, 30, 4, 1],
        consensusNote: '阳光海风般温暖治愈的澳洲公路家庭喜剧，笑点自然真挚。',
        url: 'https://search.douban.com/movie/subject_search?search_text=Rachel+Perkins&cat=1002',
      },
    },
    countryOrigin: 'Australia',
    languageNote: 'English',
    tagline: 'Three generations, one leaky caravan, twelve beaches.',
    synopsis:
      'A delightfully chaotic Christmas road trip from Wollongong down the Sapphire Coast to Mallacoota brings three stubborn generations together.',
    posterTheme: 'saltwater-sun',
    castLead: ['Deborah Mailman', 'Sam Neill', 'Angourie Rice'],
  },
];

export const COMING_SOON_MOVIES: Movie[] = [
  {
    id: 'mov-couturier-cambon',
    title: 'The Couturier of Rue Cambon',
    director: 'Sofia Coppola',
    releaseYear: 2026,
    releaseStatus: 'coming_soon',
    releaseDateIso: '2026-11-26',
    releaseOccasion: 'Advance 35mm Champagne Previews',
    runtimeMinutes: 131,
    classification: 'M',
    genres: ['Drama', 'History'],
    criticScorePercent: 93,
    audienceScorePercent: 90,
    ratings: {
      imdb: {
        score: 8.1,
        votes: 14800,
        url: 'https://www.imdb.com/find/?q=Sofia+Coppola&s=nm',
      },
      rottenTomatoes: {
        tomatometerPercent: 93,
        audiencePercent: 90,
        criticReviews: 118,
        badge: 'Certified Fresh',
        url: 'https://www.rottentomatoes.com/search?search=Sofia%20Coppola',
      },
      douban: {
        score: 8.4,
        votes: 22100,
        chineseTitle: '康朋街裁缝师',
        starBreakdownPercent: [41, 43, 13, 2, 1],
        consensusNote: '威尼斯电影节首映口碑惊艳，35毫米胶片拍尽巴黎高级定制工坊的丝绸光泽与孤独。',
        url: 'https://search.douban.com/movie/subject_search?search_text=Sofia+Coppola&cat=1002',
      },
    },
    countryOrigin: 'France / USA',
    languageNote: 'French & English (Subtitled)',
    tagline: 'Every seam conceals a confession.',
    synopsis:
      'Behind the mirrored staircase of a post-war Paris couture salon, a fiercely private head seamstress prepares one final winter collection as modernity reshapes the boulevard outside.',
    editorialPickReason: 'Shot on Kodak 35mm — champagne salon previews at Palace Como & Golden Age.',
    posterTheme: 'cambon-silk',
    castLead: ['Léa Seydoux', 'Kirsten Dunst', 'Louis Garrel'],
    upcomingVenues: [
      {
        cinemaId: 'mel-como',
        city: 'melbourne',
        format: 'Gold Class / LUX',
        previewNote: 'Champagne Salon Preview — Wed 25 Nov, 7:30 pm',
      },
      {
        cinemaId: 'mel-nova',
        city: 'melbourne',
        format: '35mm / 70mm',
        previewNote: '35mm Print Opening Night — Thu 26 Nov, 8:00 pm',
      },
      {
        cinemaId: 'mel-westgarth',
        city: 'melbourne',
        format: 'Standard',
        previewNote: 'Courtyard Gala — Thu 26 Nov, 7:15 pm',
      },
      {
        cinemaId: 'syd-golden-age',
        city: 'sydney',
        format: '35mm / 70mm',
        previewNote: 'Cocktail & 35mm Salon Preview — Wed 25 Nov, 8:15 pm',
      },
      {
        cinemaId: 'syd-palace-norton',
        city: 'sydney',
        format: 'Gold Class / LUX',
        previewNote: 'French Aperitivo Preview — Wed 25 Nov, 7:00 pm',
      },
    ],
  },
  {
    id: 'mov-mirror-horizon',
    title: 'Mirror Horizon',
    director: 'Alfonso Cuarón',
    releaseYear: 2026,
    releaseStatus: 'coming_soon',
    releaseDateIso: '2026-12-03',
    releaseOccasion: '1.43:1 Laser IMAX First Look',
    runtimeMinutes: 149,
    classification: 'M',
    genres: ['Sci-Fi', 'Mystery', 'Drama'],
    criticScorePercent: 96,
    audienceScorePercent: 94,
    ratings: {
      imdb: {
        score: 8.6,
        votes: 29400,
        url: 'https://www.imdb.com/find/?q=Alfonso+Cuaron&s=nm',
      },
      rottenTomatoes: {
        tomatometerPercent: 96,
        audiencePercent: 94,
        criticReviews: 152,
        badge: 'Certified Fresh',
        url: 'https://www.rottentomatoes.com/search?search=Alfonso%20Cuaron',
      },
      douban: {
        score: 8.7,
        votes: 34900,
        chineseTitle: '镜面地平线',
        starBreakdownPercent: [52, 35, 11, 1, 1],
        consensusNote: '阿方索·卡隆重返太空深空，长达19分钟的无剪辑失重调度堪比银幕神迹。',
        url: 'https://search.douban.com/movie/subject_search?search_text=Alfonso+Cuaron&cat=1002',
      },
    },
    countryOrigin: 'UK / Mexico',
    languageNote: 'English & Spanish',
    tagline: 'Beyond orbit, memory bends back toward Earth.',
    synopsis:
      'Stationed at a Lagrange-point solar observatory, two estranged astrophysicists intercept an optical reflection that appears to show Earth forty-eight hours ahead of schedule.',
    editorialPickReason: 'Composed natively for IMAX Melbourne & IMAX Sydney Dual 4K Laser.',
    posterTheme: 'mirror-monolith',
    castLead: ['Cate Blanchett', 'Gael García Bernal', 'Riz Ahmed'],
    upcomingVenues: [
      {
        cinemaId: 'mel-imax',
        city: 'melbourne',
        format: 'IMAX',
        previewNote: '1.43:1 Dual Laser Midnight Preview — Wed 2 Dec, 11:59 pm',
      },
      {
        cinemaId: 'mel-hoyts-mc',
        city: 'melbourne',
        format: 'Dolby Atmos',
        previewNote: 'Xtremescreen Atmos First Look — Wed 2 Dec, 7:30 pm',
      },
      {
        cinemaId: 'syd-imax',
        city: 'sydney',
        format: 'IMAX',
        previewNote: 'Harbour Laser IMAX Premiere — Wed 2 Dec, 7:45 pm',
      },
      {
        cinemaId: 'syd-event-george',
        city: 'sydney',
        format: 'Vmax / Xtremescreen',
        previewNote: 'V-Max Dolby Atmos Preview — Wed 2 Dec, 8:00 pm',
      },
    ],
  },
  {
    id: 'mov-summer-cicada',
    title: 'Summer of the Cicada',
    director: 'Hirokazu Kore-eda',
    releaseYear: 2026,
    releaseStatus: 'coming_soon',
    releaseDateIso: '2026-12-10',
    releaseOccasion: 'Festival Laureate Season',
    runtimeMinutes: 116,
    classification: 'PG',
    genres: ['Drama', 'Family'],
    criticScorePercent: 97,
    audienceScorePercent: 95,
    ratings: {
      imdb: {
        score: 8.4,
        votes: 18600,
        url: 'https://www.imdb.com/find/?q=Hirokazu+Koreeda&s=nm',
      },
      rottenTomatoes: {
        tomatometerPercent: 97,
        audiencePercent: 95,
        criticReviews: 129,
        badge: 'Certified Fresh',
        url: 'https://www.rottentomatoes.com/search?search=Kore-eda',
      },
      douban: {
        score: 8.9,
        votes: 76400,
        chineseTitle: '蝉鸣之夏',
        starBreakdownPercent: [56, 33, 9, 1, 1],
        consensusNote: '是枝裕和最温柔深邃的夏日家族物语，廊下西瓜与海风里藏着一生的告别。',
        url: 'https://search.douban.com/movie/subject_search?search_text=%E6%98%AF%E6%9E%9D%E8%A3%95%E5%92%8C&cat=1002',
      },
    },
    countryOrigin: 'Japan',
    languageNote: 'Japanese with English subtitles',
    tagline: 'What we leave unsaid lingers in the tatami.',
    synopsis:
      'Three adult siblings gather at their late grandmother’s coastal Kamakura timber house to catalogue her botanical notebooks before the property is sold.',
    editorialPickReason: 'Luminous humanism — opening across Melbourne & Sydney arthouse houses.',
    posterTheme: 'cicada-jade',
    castLead: ['Sakura Ando', 'Hidetoshi Nishijima', 'Haruka Ayase'],
    upcomingVenues: [
      {
        cinemaId: 'mel-nova',
        city: 'melbourne',
        format: 'Standard',
        previewNote: 'Japanese Tea & Arthouse Preview — Sun 6 Dec, 4:00 pm',
      },
      {
        cinemaId: 'mel-westgarth',
        city: 'melbourne',
        format: 'Standard',
        previewNote: 'Twilight Courtyard Screening — Thu 10 Dec, 6:45 pm',
      },
      {
        cinemaId: 'syd-dendy-newtown',
        city: 'sydney',
        format: 'Standard',
        previewNote: 'Club Dendy Advance Screening — Sun 6 Dec, 3:30 pm',
      },
      {
        cinemaId: 'syd-ritz',
        city: 'sydney',
        format: 'Standard',
        previewNote: 'Opening Night — Thu 10 Dec, 7:00 pm',
      },
    ],
  },
  {
    id: 'mov-tasman-gambit',
    title: 'The Tasman Gambit',
    director: 'Justin Kurzel',
    releaseYear: 2026,
    releaseStatus: 'coming_soon',
    releaseDateIso: '2026-12-26',
    releaseOccasion: 'Australian Boxing Day Gala Release',
    runtimeMinutes: 126,
    classification: 'MA15+',
    genres: ['Thriller', 'Drama'],
    criticScorePercent: 90,
    audienceScorePercent: 92,
    ratings: {
      imdb: {
        score: 8.0,
        votes: 9400,
        url: 'https://www.imdb.com/find/?q=Justin+Kurzel&s=nm',
      },
      rottenTomatoes: {
        tomatometerPercent: 90,
        audiencePercent: 92,
        criticReviews: 84,
        badge: 'Certified Fresh',
        url: 'https://www.rottentomatoes.com/search?search=Justin%20Kurzel',
      },
      douban: {
        score: 8.1,
        votes: 11200,
        chineseTitle: '塔斯曼狂澜',
        starBreakdownPercent: [33, 44, 19, 3, 1],
        consensusNote: '悉尼至霍巴特帆船赛实景拍摄，狂风巨浪中的密闭心理博弈令人窒息。',
        url: 'https://search.douban.com/movie/subject_search?search_text=Justin+Kurzel&cat=1002',
      },
    },
    countryOrigin: 'Australia',
    languageNote: 'English',
    tagline: 'Six hundred nautical miles. Nowhere to disembark.',
    synopsis:
      'As the Boxing Day fleet charges south from Sydney Heads into a ferocious Bass Strait gale, the navigator aboard a syndicate maxi-yacht discovers a billionaire backer has staged a disappearance.',
    editorialPickReason: 'Signature Australian Boxing Day tradition — includes Director Q&A previews.',
    posterTheme: 'tasman-storm',
    castLead: ['Paul Mescal', 'Elizabeth Debicki', 'Ben Mendelsohn'],
    upcomingVenues: [
      {
        cinemaId: 'mel-village-crown',
        city: 'melbourne',
        format: 'Gold Class / LUX',
        previewNote: 'Boxing Day Gala Opening — Sat 26 Dec',
      },
      {
        cinemaId: 'mel-astor',
        city: 'melbourne',
        format: 'Standard',
        previewNote: 'Advance Q&A w/ Justin Kurzel — Sun 20 Dec, 7:00 pm',
      },
      {
        cinemaId: 'syd-ritz',
        city: 'sydney',
        format: 'Dolby Atmos',
        previewNote: 'Sydney Cast & Crew Gala Q&A — Mon 21 Dec, 7:30 pm',
      },
      {
        cinemaId: 'syd-event-george',
        city: 'sydney',
        format: 'Vmax / Xtremescreen',
        previewNote: 'Boxing Day Flagship Engagement — Sat 26 Dec',
      },
    ],
  },
  {
    id: 'mov-orpheus-neon',
    title: 'Orpheus in Neon (70mm Roadshow)',
    director: 'Leos Carax',
    releaseYear: 2027,
    releaseStatus: 'coming_soon',
    releaseDateIso: '2027-01-02',
    releaseOccasion: 'New Year 70mm Roadshow Exclusive',
    runtimeMinutes: 136,
    classification: 'M',
    genres: ['Music', 'Romance', 'Drama'],
    criticScorePercent: 91,
    audienceScorePercent: 89,
    ratings: {
      imdb: {
        score: 7.9,
        votes: 12300,
        url: 'https://www.imdb.com/find/?q=Leos+Carax&s=nm',
      },
      rottenTomatoes: {
        tomatometerPercent: 91,
        audiencePercent: 89,
        criticReviews: 106,
        badge: 'Certified Fresh',
        url: 'https://www.rottentomatoes.com/search?search=Leos%20Carax',
      },
      douban: {
        score: 8.3,
        votes: 19800,
        chineseTitle: '霓虹奥菲斯',
        starBreakdownPercent: [43, 37, 15, 4, 1],
        consensusNote: '卡拉克斯癫狂浪漫的巴黎地下歌剧，70毫米胶片色彩浓烈如梦。',
        url: 'https://search.douban.com/movie/subject_search?search_text=Leos+Carax&cat=1002',
      },
    },
    countryOrigin: 'France',
    languageNote: 'French & English (Subtitled)',
    tagline: 'Do not look back until the curtain falls.',
    synopsis:
      'Across a single New Year’s Eve along the Seine, an avant-garde stage lighting designer pursues a vanished mezzo-soprano through subterranean cabarets and rooftops.',
    editorialPickReason: 'Exclusive 5-perf 70mm prints booked for The Astor Theatre & Ritz Randwick.',
    posterTheme: 'orpheus-velvet',
    castLead: ['Marion Cotillard', 'Adam Driver', 'Denis Lavant'],
    upcomingVenues: [
      {
        cinemaId: 'mel-astor',
        city: 'melbourne',
        format: '35mm / 70mm',
        previewNote: 'New Year’s Eve 70mm Countdown — Thu 31 Dec, 9:30 pm',
      },
      {
        cinemaId: 'mel-como',
        city: 'melbourne',
        format: 'Gold Class / LUX',
        previewNote: 'Season Premiere — Sat 2 Jan',
      },
      {
        cinemaId: 'syd-ritz',
        city: 'sydney',
        format: '35mm / 70mm',
        previewNote: '70mm Roadshow w/ Overture & Intermission — Sat 2 Jan',
      },
      {
        cinemaId: 'syd-golden-age',
        city: 'sydney',
        format: 'Standard',
        previewNote: 'Midnight Velvet Screening — Sat 2 Jan, 10:30 pm',
      },
    ],
  },
  {
    id: 'mov-cradle-mountain',
    title: 'Winter Light Over Cradle Mountain',
    director: 'Jennifer Peedom',
    releaseYear: 2027,
    releaseStatus: 'coming_soon',
    releaseDateIso: '2027-01-14',
    releaseOccasion: 'Symphonic Dolby Atmos & IMAX Event',
    runtimeMinutes: 94,
    classification: 'G',
    genres: ['Adventure', 'Music'],
    criticScorePercent: 94,
    audienceScorePercent: 93,
    ratings: {
      imdb: {
        score: 8.2,
        votes: 6800,
        url: 'https://www.imdb.com/find/?q=Jennifer+Peedom&s=nm',
      },
      rottenTomatoes: {
        tomatometerPercent: 94,
        audiencePercent: 93,
        criticReviews: 62,
        badge: 'Certified Fresh',
        url: 'https://www.rottentomatoes.com/search?search=Jennifer%20Peedom',
      },
      douban: {
        score: 8.6,
        votes: 9500,
        chineseTitle: '摇篮山冬日微光',
        starBreakdownPercent: [47, 40, 11, 1, 1],
        consensusNote: '沃伦·埃利斯与墨尔本交响乐团配乐，塔斯马尼亚冰川原野纯粹如诗。',
        url: 'https://search.douban.com/movie/subject_search?search_text=Jennifer+Peedom&cat=1002',
      },
    },
    countryOrigin: 'Australia',
    languageNote: 'Instrumental & English',
    tagline: 'Stillness has its own crescendo.',
    synopsis:
      'A meditative symphonic portrait of Tasmania’s ancient highland pencil pines and winter snowstorms, scored by Warren Ellis and the Melbourne Symphony Orchestra.',
    editorialPickReason: 'Pure visual & acoustic poetry — premiering in IMAX & Dolby Atmos.',
    posterTheme: 'cradle-mist',
    castLead: ['Melbourne Symphony Orchestra', 'Warren Ellis'],
    upcomingVenues: [
      {
        cinemaId: 'mel-imax',
        city: 'melbourne',
        format: 'IMAX',
        previewNote: 'Filmmaker & Composer Introduction — Wed 13 Jan, 7:00 pm',
      },
      {
        cinemaId: 'mel-nova',
        city: 'melbourne',
        format: 'Standard',
        previewNote: 'Season Opening — Thu 14 Jan',
      },
      {
        cinemaId: 'syd-imax',
        city: 'sydney',
        format: 'IMAX',
        previewNote: 'Special Harbour IMAX Event — Thu 14 Jan, 6:30 pm',
      },
      {
        cinemaId: 'syd-hoyts-broadway',
        city: 'sydney',
        format: 'Dolby Atmos',
        previewNote: 'Xtremescreen Atmos Engagement — Thu 14 Jan',
      },
    ],
  },
];

/**
 * Generates a 14-day rolling calendar (This Week + Next Week) starting from local Today in the chosen city.
 */
export function buildSevenDayCalendar(city: CityId): CalendarDayOption[] {
  const timeZone = CITIES[city].timeZone;
  const todayIso = getLocalTodayIso(timeZone);
  const [startYear, startMonth, startDay] = todayIso.split('-').map(Number);

  const days: CalendarDayOption[] = [];
  for (let offset = 0; offset < 14; offset++) {
    const dt = new Date(Date.UTC(startYear, startMonth - 1, startDay + offset, 2, 0, 0));
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dt.getUTCDate()).padStart(2, '0');
    const dateIso = `${y}-${m}-${d}`;
    const dow = dt.getUTCDay(); // 0=Sun, 1=Mon, 2=Tue...

    days.push({
      dateIso,
      dayOfWeekIndex: dow,
      isToday: offset === 0,
      isTomorrow: offset === 1,
      isCheapTuesday: dow === 2,
    });
  }
  return days;
}

interface VenueProgrammingBlueprint {
  cinemaId: string;
  entries: Array<{
    movieId: string;
    format: FormatType;
    auditoriumName: string;
    basePriceAud: number;
    tuesdayPriceAud: number;
    mondayDealPriceAud?: number;
    times24: string[];
    weekendExtraTime24?: string;
    accessibilityTags?: string[];
  }>;
}

const PROGRAMMING_BLUEPRINTS: VenueProgrammingBlueprint[] = [
  // ================= MELBOURNE VENUES =================
  {
    cinemaId: 'mel-imax',
    entries: [
      {
        movieId: 'mov-dune-messiah',
        format: 'IMAX',
        auditoriumName: 'IMAX 1.43:1 Dual Laser',
        basePriceAud: 33.0,
        tuesdayPriceAud: 25.0,
        times24: ['10:30', '14:15', '18:00', '21:35'],
        accessibilityTags: ['Assistive Listening'],
      },
      {
        movieId: 'mov-apex-bathurst',
        format: 'IMAX',
        auditoriumName: 'IMAX 1.43:1 Dual Laser',
        basePriceAud: 31.0,
        tuesdayPriceAud: 24.0,
        times24: ['12:00'],
        weekendExtraTime24: '23:45',
      },
    ],
  },
  {
    cinemaId: 'mel-nova',
    entries: [
      {
        movieId: 'mov-southern-crossings',
        format: 'Standard',
        auditoriumName: 'Cinema 1 (Lygon)',
        basePriceAud: 23.5,
        tuesdayPriceAud: 14.0,
        mondayDealPriceAud: 13.0,
        times24: ['11:15', '14:00', '18:30', '21:00'],
        accessibilityTags: ['Open Captions (14:00)'],
      },
      {
        movieId: 'mov-velvet-static',
        format: 'Gold Class / LUX',
        auditoriumName: 'Nova Deluxe Lounge',
        basePriceAud: 34.0,
        tuesdayPriceAud: 24.0,
        mondayDealPriceAud: 24.0,
        times24: ['17:45', '20:15'],
      },
      {
        movieId: 'mov-anatomy-echo',
        format: 'Standard',
        auditoriumName: 'Cinema 4',
        basePriceAud: 23.5,
        tuesdayPriceAud: 14.0,
        mondayDealPriceAud: 13.0,
        times24: ['13:10', '16:15', '19:30'],
        accessibilityTags: ['English Subtitles'],
      },
      {
        movieId: 'mov-nocturne-glass',
        format: 'Standard',
        auditoriumName: 'Cinema 3',
        basePriceAud: 23.5,
        tuesdayPriceAud: 14.0,
        mondayDealPriceAud: 13.0,
        times24: ['15:30', '20:45'],
        accessibilityTags: ['English Subtitles'],
      },
      {
        movieId: 'mov-clockmaker-kyoto',
        format: 'Standard',
        auditoriumName: 'Cinema 6',
        basePriceAud: 22.0,
        tuesdayPriceAud: 14.0,
        mondayDealPriceAud: 13.0,
        times24: ['11:45', '16:40'],
        accessibilityTags: ['Japanese w/ Subtitles'],
      },
    ],
  },
  {
    cinemaId: 'mel-astor',
    entries: [
      {
        movieId: 'mov-in-the-mood',
        format: '35mm / 70mm',
        auditoriumName: 'The Grand Auditorium (35mm Print)',
        basePriceAud: 22.0,
        tuesdayPriceAud: 16.0,
        times24: ['19:30'],
        weekendExtraTime24: '16:15',
        accessibilityTags: ['35mm Archival Print', 'Subtitled'],
      },
      {
        movieId: 'mov-dune-messiah',
        format: '35mm / 70mm',
        auditoriumName: 'The Grand Auditorium (70mm Print)',
        basePriceAud: 26.0,
        tuesdayPriceAud: 19.0,
        times24: ['14:00', '21:40'],
        accessibilityTags: ['5-Perf 70mm Celluloid'],
      },
    ],
  },
  {
    cinemaId: 'mel-como',
    entries: [
      {
        movieId: 'mov-southern-crossings',
        format: 'Standard',
        auditoriumName: 'Cinema 2',
        basePriceAud: 25.0,
        tuesdayPriceAud: 16.0,
        times24: ['12:30', '18:00', '20:35'],
      },
      {
        movieId: 'mov-anatomy-echo',
        format: 'Gold Class / LUX',
        auditoriumName: 'Como Platinum Suite',
        basePriceAud: 39.0,
        tuesdayPriceAud: 28.0,
        times24: ['15:00', '19:15'],
        accessibilityTags: ['English Subtitles'],
      },
      {
        movieId: 'mov-velvet-static',
        format: 'Standard',
        auditoriumName: 'Cinema 5',
        basePriceAud: 25.0,
        tuesdayPriceAud: 16.0,
        times24: ['11:00', '16:50', '21:10'],
      },
    ],
  },
  {
    cinemaId: 'mel-hoyts-mc',
    entries: [
      {
        movieId: 'mov-dune-messiah',
        format: 'Vmax / Xtremescreen',
        auditoriumName: 'Xtremescreen 1 (Atmos)',
        basePriceAud: 28.5,
        tuesdayPriceAud: 17.5,
        times24: ['11:00', '14:40', '18:20', '21:50'],
        accessibilityTags: ['Powered Recliners', 'Audio Description'],
      },
      {
        movieId: 'mov-apex-bathurst',
        format: 'Dolby Atmos',
        auditoriumName: 'Xtremescreen 2 (Atmos)',
        basePriceAud: 27.5,
        tuesdayPriceAud: 17.0,
        times24: ['12:50', '16:10', '19:40'],
        weekendExtraTime24: '22:30',
        accessibilityTags: ['Powered Recliners'],
      },
      {
        movieId: 'mov-glasshouse-protocol',
        format: 'Standard',
        auditoriumName: 'Cinema 6 (Recliners)',
        basePriceAud: 24.0,
        tuesdayPriceAud: 15.0,
        times24: ['13:30', '18:50', '21:45'],
      },
      {
        movieId: 'mov-clockmaker-kyoto',
        format: 'Standard',
        auditoriumName: 'Cinema 8 (Recliners)',
        basePriceAud: 23.0,
        tuesdayPriceAud: 15.0,
        times24: ['10:20', '15:15', '17:55'],
      },
      {
        movieId: 'mov-saltwater-summer',
        format: 'Standard',
        auditoriumName: 'Cinema 9 (Recliners)',
        basePriceAud: 23.0,
        tuesdayPriceAud: 15.0,
        times24: ['10:45', '13:05', '17:15'],
      },
    ],
  },
  {
    cinemaId: 'mel-village-crown',
    entries: [
      {
        movieId: 'mov-dune-messiah',
        format: 'Gold Class / LUX',
        auditoriumName: 'Gold Class 1',
        basePriceAud: 44.0,
        tuesdayPriceAud: 29.0,
        times24: ['13:15', '17:30', '21:00'],
      },
      {
        movieId: 'mov-nocturne-glass',
        format: 'Dolby Atmos',
        auditoriumName: 'Vmax 1 (Dolby Atmos)',
        basePriceAud: 28.0,
        tuesdayPriceAud: 16.5,
        times24: ['15:45', '19:00', '21:55'],
        accessibilityTags: ['English Subtitles'],
      },
      {
        movieId: 'mov-apex-bathurst',
        format: 'Vmax / Xtremescreen',
        auditoriumName: 'Vmax 2',
        basePriceAud: 28.0,
        tuesdayPriceAud: 16.5,
        times24: ['11:30', '18:15', '21:15'],
      },
      {
        movieId: 'mov-saltwater-summer',
        format: 'Standard',
        auditoriumName: 'Cinema 10',
        basePriceAud: 24.5,
        tuesdayPriceAud: 14.5,
        times24: ['11:05', '14:20'],
      },
    ],
  },
  {
    cinemaId: 'mel-kino',
    entries: [
      {
        movieId: 'mov-clockmaker-kyoto',
        format: 'Standard',
        auditoriumName: 'Kino Cinema 1',
        basePriceAud: 24.0,
        tuesdayPriceAud: 15.5,
        times24: ['11:15', '14:00', '18:30', '20:50'],
      },
      {
        movieId: 'mov-echo-chamber',
        format: 'Standard',
        auditoriumName: 'Kino Cinema 2',
        basePriceAud: 24.0,
        tuesdayPriceAud: 15.5,
        times24: ['12:30', '16:15', '19:15'],
      },
      {
        movieId: 'mov-in-the-mood',
        format: '35mm / 70mm',
        auditoriumName: 'Kino Cinema 3',
        basePriceAud: 25.0,
        tuesdayPriceAud: 16.0,
        times24: ['17:45', '20:30'],
      },
    ],
  },
  {
    cinemaId: 'mel-westgarth',
    entries: [
      {
        movieId: 'mov-velvet-static',
        format: 'Standard',
        auditoriumName: 'Heritage Auditorium 1',
        basePriceAud: 24.0,
        tuesdayPriceAud: 15.5,
        times24: ['14:30', '18:45', '21:05'],
      },
      {
        movieId: 'mov-southern-crossings',
        format: 'Standard',
        auditoriumName: 'Cinema 2',
        basePriceAud: 24.0,
        tuesdayPriceAud: 15.5,
        times24: ['11:50', '17:30', '20:10'],
      },
      {
        movieId: 'mov-in-the-mood',
        format: '35mm / 70mm',
        auditoriumName: 'Heritage Auditorium 1',
        basePriceAud: 24.0,
        tuesdayPriceAud: 16.0,
        times24: ['16:35'],
        weekendExtraTime24: '22:15',
      },
    ],
  },

  // ================= SYDNEY VENUES =================
  {
    cinemaId: 'syd-imax',
    entries: [
      {
        movieId: 'mov-dune-messiah',
        format: 'IMAX',
        auditoriumName: 'IMAX Dual 4K Laser Harbour',
        basePriceAud: 35.0,
        tuesdayPriceAud: 25.0,
        times24: ['10:40', '14:25', '18:10', '21:45'],
        accessibilityTags: ['12-Channel Sound', 'Assistive Listening'],
      },
      {
        movieId: 'mov-glasshouse-protocol',
        format: 'IMAX',
        auditoriumName: 'IMAX Dual 4K Laser Harbour',
        basePriceAud: 32.0,
        tuesdayPriceAud: 24.0,
        times24: ['12:15'],
        weekendExtraTime24: '23:50',
      },
    ],
  },
  {
    cinemaId: 'syd-golden-age',
    entries: [
      {
        movieId: 'mov-in-the-mood',
        format: '35mm / 70mm',
        auditoriumName: 'Paramount Screening Room',
        basePriceAud: 26.0,
        tuesdayPriceAud: 20.0,
        times24: ['18:15', '20:40'],
        accessibilityTags: ['Intimate 56-Seat Room', 'Subtitled'],
      },
      {
        movieId: 'mov-velvet-static',
        format: 'Standard',
        auditoriumName: 'Paramount Screening Room',
        basePriceAud: 26.0,
        tuesdayPriceAud: 20.0,
        times24: ['16:00'],
        weekendExtraTime24: '22:45',
      },
    ],
  },
  {
    cinemaId: 'syd-ritz',
    entries: [
      {
        movieId: 'mov-dune-messiah',
        format: '35mm / 70mm',
        auditoriumName: 'Cinema 1 (Heritage 70mm)',
        basePriceAud: 24.0,
        tuesdayPriceAud: 15.0,
        times24: ['13:30', '17:30', '21:10'],
        accessibilityTags: ['70mm Film Projection'],
      },
      {
        movieId: 'mov-in-the-mood',
        format: '35mm / 70mm',
        auditoriumName: 'Cinema 1 (35mm Print)',
        basePriceAud: 22.0,
        tuesdayPriceAud: 15.0,
        times24: ['11:15', '19:15'],
        accessibilityTags: ['35mm Print', 'Subtitled'],
      },
      {
        movieId: 'mov-southern-crossings',
        format: 'Standard',
        auditoriumName: 'Cinema 2',
        basePriceAud: 21.5,
        tuesdayPriceAud: 15.0,
        times24: ['12:10', '16:40', '20:20'],
      },
      {
        movieId: 'mov-clockmaker-kyoto',
        format: 'Standard',
        auditoriumName: 'Cinema 4',
        basePriceAud: 21.5,
        tuesdayPriceAud: 15.0,
        times24: ['10:50', '15:10', '18:00'],
      },
    ],
  },
  {
    cinemaId: 'syd-event-george',
    entries: [
      {
        movieId: 'mov-dune-messiah',
        format: 'Vmax / Xtremescreen',
        auditoriumName: 'V-Max 1 (Dolby Atmos)',
        basePriceAud: 29.5,
        tuesdayPriceAud: 17.5,
        times24: ['11:10', '14:50', '18:30', '22:00'],
        accessibilityTags: ['Daybeds Available', 'Audio Description'],
      },
      {
        movieId: 'mov-apex-bathurst',
        format: 'Dolby Atmos',
        auditoriumName: 'V-Max 2 (Dolby Atmos)',
        basePriceAud: 29.0,
        tuesdayPriceAud: 17.5,
        times24: ['12:40', '16:00', '19:20', '22:10'],
      },
      {
        movieId: 'mov-nocturne-glass',
        format: 'Gold Class / LUX',
        auditoriumName: 'Gold Class 2',
        basePriceAud: 45.0,
        tuesdayPriceAud: 30.0,
        times24: ['17:45', '20:50'],
        accessibilityTags: ['English Subtitles'],
      },
      {
        movieId: 'mov-saltwater-summer',
        format: 'Standard',
        auditoriumName: 'Cinema 9',
        basePriceAud: 24.5,
        tuesdayPriceAud: 15.0,
        times24: ['10:30', '13:15', '16:30'],
      },
    ],
  },
  {
    cinemaId: 'syd-dendy-newtown',
    entries: [
      {
        movieId: 'mov-southern-crossings',
        format: 'Standard',
        auditoriumName: 'Cinema 1 (King St)',
        basePriceAud: 23.0,
        tuesdayPriceAud: 14.0,
        times24: ['11:40', '14:30', '18:45', '21:15'],
        accessibilityTags: ['Open Captions (14:30)'],
      },
      {
        movieId: 'mov-velvet-static',
        format: 'Gold Class / LUX',
        auditoriumName: 'Dendy Lounge',
        basePriceAud: 35.0,
        tuesdayPriceAud: 24.0,
        times24: ['18:00', '20:30'],
      },
      {
        movieId: 'mov-nocturne-glass',
        format: 'Standard',
        auditoriumName: 'Cinema 3',
        basePriceAud: 23.0,
        tuesdayPriceAud: 14.0,
        times24: ['15:50', '19:10', '21:50'],
        accessibilityTags: ['English Subtitles'],
      },
      {
        movieId: 'mov-glasshouse-protocol',
        format: 'Standard',
        auditoriumName: 'Cinema 5',
        basePriceAud: 23.0,
        tuesdayPriceAud: 14.0,
        times24: ['13:20', '17:20', '21:00'],
      },
    ],
  },
  {
    cinemaId: 'syd-palace-norton',
    entries: [
      {
        movieId: 'mov-anatomy-echo',
        format: 'Standard',
        auditoriumName: 'Cinema 1 (Norton)',
        basePriceAud: 24.5,
        tuesdayPriceAud: 15.5,
        times24: ['12:00', '15:15', '18:30', '21:15'],
        accessibilityTags: ['English Subtitles'],
      },
      {
        movieId: 'mov-velvet-static',
        format: 'Standard',
        auditoriumName: 'Cinema 3',
        basePriceAud: 24.5,
        tuesdayPriceAud: 15.5,
        times24: ['14:00', '19:00'],
      },
      {
        movieId: 'mov-clockmaker-kyoto',
        format: 'Standard',
        auditoriumName: 'Cinema 4',
        basePriceAud: 23.0,
        tuesdayPriceAud: 15.5,
        times24: ['11:15', '16:30'],
      },
    ],
  },
  {
    cinemaId: 'syd-hoyts-broadway',
    entries: [
      {
        movieId: 'mov-apex-bathurst',
        format: 'Vmax / Xtremescreen',
        auditoriumName: 'Xtremescreen 1 (Atmos)',
        basePriceAud: 27.5,
        tuesdayPriceAud: 16.5,
        times24: ['11:20', '14:45', '18:15', '21:30'],
        accessibilityTags: ['Powered Recliners'],
      },
      {
        movieId: 'mov-glasshouse-protocol',
        format: 'Dolby Atmos',
        auditoriumName: 'Xtremescreen 2 (Atmos)',
        basePriceAud: 27.5,
        tuesdayPriceAud: 16.5,
        times24: ['13:00', '16:20', '19:45'],
        accessibilityTags: ['Powered Recliners'],
      },
      {
        movieId: 'mov-clockmaker-kyoto',
        format: 'Standard',
        auditoriumName: 'Cinema 5 (Recliners)',
        basePriceAud: 22.5,
        tuesdayPriceAud: 14.5,
        times24: ['10:35', '15:25', '18:05'],
      },
      {
        movieId: 'mov-dune-messiah',
        format: 'Gold Class / LUX',
        auditoriumName: 'Hoyts LUX 1',
        basePriceAud: 42.0,
        tuesdayPriceAud: 28.0,
        times24: ['17:15', '20:55'],
      },
    ],
  },
];

function parseMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Deterministically builds screening sessions across all 7 days for both Melbourne & Sydney.
 */
export function generateCuratedSessions(): ScreeningSession[] {
  const cinemaMap = new Map(CINEMAS.map((c) => [c.id, c]));
  const calendarsByCity: Record<CityId, CalendarDayOption[]> = {
    melbourne: buildSevenDayCalendar('melbourne'),
    sydney: buildSevenDayCalendar('sydney'),
    shanghai: buildSevenDayCalendar('shanghai'),
  };

  const sessions: ScreeningSession[] = [];

  for (const blueprint of PROGRAMMING_BLUEPRINTS) {
    const cinema = cinemaMap.get(blueprint.cinemaId);
    if (!cinema) continue;
    const calendarDays = calendarsByCity[cinema.city];

    for (const day of calendarDays) {
      const isWeekend = day.dayOfWeekIndex === 5 || day.dayOfWeekIndex === 6; // Fri or Sat
      const isMonday = day.dayOfWeekIndex === 1;
      const isTuesday = day.isCheapTuesday;

      for (const item of blueprint.entries) {
        const allTimes =
          isWeekend && item.weekendExtraTime24
            ? [...item.times24, item.weekendExtraTime24]
            : item.times24;

        for (let idx = 0; idx < allTimes.length; idx++) {
          const time24 = allTimes[idx];
          const startMins = parseMinutes(time24);
          const isMorningSaver = startMins < 12 * 60;

          let effectivePrice = item.basePriceAud;
          let isDealSession = false;
          let dealLabel: string | undefined;

          if (isTuesday) {
            effectivePrice = item.tuesdayPriceAud;
            isDealSession = true;
            dealLabel = 'Cheap Tuesday';
          } else if (isMonday && item.mondayDealPriceAud !== undefined) {
            effectivePrice = item.mondayDealPriceAud;
            isDealSession = true;
            dealLabel = 'Nova Discount Mon';
          } else if (isMorningSaver && item.format === 'Standard') {
            effectivePrice = Math.max(14.0, item.basePriceAud - 4.5);
            isDealSession = true;
            dealLabel = 'Morning Saver';
          }

          // Deterministic seat availability indicator
          const seed = (startMins + idx * 17 + day.dayOfWeekIndex * 11) % 10;
          const seatsRemainingLevel: ScreeningSession['seatsRemainingLevel'] =
            startMins >= 18 * 60 && startMins <= 21 * 60 && (isWeekend || isTuesday)
              ? seed < 4
                ? 'low'
                : 'filling'
              : seed === 0
                ? 'filling'
                : 'plenty';

          const cleanTimeKey = time24.replace(':', '');
          sessions.push({
            id: `${cinema.id}_${item.movieId}_${day.dateIso}_${cleanTimeKey}`,
            movieId: item.movieId,
            cinemaId: cinema.id,
            city: cinema.city,
            dateIso: day.dateIso,
            startTime24: time24,
            startMinutesFromMidnight: startMins,
            auditoriumName: item.auditoriumName,
            format: item.format,
            priceAud: effectivePrice,
            regularPriceAud: item.basePriceAud,
            isDealSession,
            dealLabel,
            accessibilityTags: item.accessibilityTags ?? [],
            seatsRemainingLevel,
          });
        }
      }
    }
  }

  sessions.sort((a, b) => a.startMinutesFromMidnight - b.startMinutesFromMidnight);
  return sessions;
}
