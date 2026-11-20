import type { AppLanguage, Cinema, CityId, Movie } from '../types/cinema';

export interface UiStrings {
  cityNames: Record<CityId, string>;
  inCinemas: string;
  comingSoon: string;
  programme: string;
  maisons: string;
  map: string;
  myLocation: string;
  nearPrefix: string;
  folio: string;
  sessionSingular: string;
  sessionPlural: string;
  premiereSingular: string;
  premierePlural: string;
  heroTitlePrefix: string;
  heroTitleEmphasis: string;
  heroTitleSuffix: string;
  heroFindClosest: (cityName: string) => string;
  heroChangeLocation: (shortLabel: string) => string;
  allChains: string;
  favorites: (count: number) => string;
  allCity: (cityName: string) => string;
  makeItFilterLabel: string;
  makeItFilterTitle: string;
  dealsLabel: (isShanghai: boolean) => string;
  shareLink: string;
  linkCopied: string;
  reset: (count: number) => string;
  worksInProjection: (count: number) => string;
  cinemasScreening: (count: number) => string;
  watchTrailer: string;
  trailer: string;
  maisonsScreening: (count: number) => string;
  favorite: string;
  favorited: string;
  directions: string;
  googleMaps: string;
  googleCalendar: string;
  appleIcs: string;
  pinToCompare: string;
  pinnedInShortlist: string;
  bookAt: (cinemaName: string) => string;
  doubleFeatureTitle: string;
  doubleFeatureSub: string;
  doubleFeatureEmpty: string;
  pinBothToFolio: string;
  pinnedBoth: string;
  viewSession: string;
  sameVenue: string;
  shortlistTitle: (count: number) => string;
  shareFolioLink: string;
  folioLinkCopied: string;
  copyVoteReply: string;
  voteReplyCopied: string;
  saveShareCard: string;
  shareCardSaved: string;
  copyTextSummary: string;
  copiedTextLink: string;
  clearAll: string;
  vote: (votes: number) => string;
  book: string;
  groupFavourite: string;
  bestValue: string;
  signatureFormat: string;
  topCriticPick: string;
}

const EN_STRINGS: UiStrings = {
  cityNames: {
    melbourne: 'Melbourne',
    sydney: 'Sydney',
    shanghai: 'Shanghai',
  },
  inCinemas: 'In Cinemas',
  comingSoon: 'Coming Soon',
  programme: 'Programme',
  maisons: 'Maisons',
  map: 'Map',
  myLocation: 'MY LOCATION',
  nearPrefix: 'NEAR',
  folio: 'FOLIO',
  sessionSingular: 'session',
  sessionPlural: 'sessions',
  premiereSingular: 'premiere',
  premierePlural: 'premieres',
  heroTitlePrefix: 'Cinema, ',
  heroTitleEmphasis: 'curated',
  heroTitleSuffix: ' evening.',
  heroFindClosest: (cityName) => `Find Closest ${cityName} Cinemas Around Me`,
  heroChangeLocation: (shortLabel) => `My Location: ${shortLabel} · Change`,
  allChains: 'All Chains',
  favorites: (count) => `Favorites (${count})`,
  allCity: (cityName) => `All ${cityName}`,
  makeItFilterLabel: 'Can Make It Now',
  makeItFilterTitle:
    'Show today’s screenings you can still reach based on estimated transit time from My Location',
  dealsLabel: (isShanghai) => (isShanghai ? 'VIP & Tue Deals (特惠)' : 'Salon Deals (Mon & Tue)'),
  shareLink: 'Share Link',
  linkCopied: 'Link Copied',
  reset: (count) => `Reset (${count})`,
  worksInProjection: (count) => `${count} ${count === 1 ? 'Work' : 'Works'} in Projection`,
  cinemasScreening: (count) => `${count} ${count === 1 ? 'Cinema' : 'Cinemas'} Screening`,
  watchTrailer: 'Watch Trailer',
  trailer: 'Trailer',
  maisonsScreening: (count) => `${count} ${count === 1 ? 'MAISON' : 'MAISONS'} SCREENING`,
  favorite: 'Favorite',
  favorited: 'Favorited',
  directions: 'Directions',
  googleMaps: 'Google Maps',
  googleCalendar: 'Google Calendar',
  appleIcs: 'Apple / .ics',
  pinToCompare: 'Pin to Compare',
  pinnedInShortlist: 'Pinned in Shortlist',
  bookAt: (cinemaName) => `Book at ${cinemaName}`,
  doubleFeatureTitle: 'Pair a Double Feature',
  doubleFeatureSub: 'Back-to-back films starting 10–75 min after credits (same or nearby venue)',
  doubleFeatureEmpty: 'No nearby second-feature handoffs fit this finish window today.',
  pinBothToFolio: 'Pin Both to Folio',
  pinnedBoth: 'Both in Folio ✓',
  viewSession: 'Inspect',
  sameVenue: 'Same cinema',
  shortlistTitle: (count) => `Shortlist & Side-by-Side Comparison (${count})`,
  shareFolioLink: 'Share Folio Link',
  folioLinkCopied: 'Folio Link Copied ✓',
  copyVoteReply: 'Copy My Vote Reply',
  voteReplyCopied: 'Vote Reply Copied ✓',
  saveShareCard: 'Share Card PNG',
  shareCardSaved: 'Saved Card PNG ✓',
  copyTextSummary: 'Copy Text Summary',
  copiedTextLink: 'Copied Text + Link!',
  clearAll: 'Clear All',
  vote: (votes) => `Vote (${votes})`,
  book: 'Book',
  groupFavourite: 'Group Favourite',
  bestValue: 'Best Value',
  signatureFormat: 'Signature Format',
  topCriticPick: 'Top Critic Pick',
};

const ZH_STRINGS: UiStrings = {
  cityNames: {
    melbourne: '墨尔本 Melbourne',
    sydney: '悉尼 Sydney',
    shanghai: '上海 Shanghai',
  },
  inCinemas: '正在热映',
  comingSoon: '即将上映',
  programme: '按影片排片',
  maisons: '按影院浏览',
  map: '影院地图',
  myLocation: '我的位置',
  nearPrefix: '附近',
  folio: '对比清单',
  sessionSingular: '场排片',
  sessionPlural: '场排片',
  premiereSingular: '部新片',
  premierePlural: '部新片',
  heroTitlePrefix: '',
  heroTitleEmphasis: '今晚银幕精选',
  heroTitleSuffix: ' · 排片与比价',
  heroFindClosest: (cityName) => `定位我附近最近的${cityName}影院`,
  heroChangeLocation: (shortLabel) => `当前坐标：${shortLabel} · 更改位置`,
  allChains: '全部院线',
  favorites: (count) => `收藏影院 (${count})`,
  allCity: () => '全城区域',
  makeItFilterLabel: '现在出发赶得上',
  makeItFilterTitle: '结合“我的位置”估算通勤时间，仅显示今天还能赶上的场次',
  dealsLabel: (isShanghai) => (isShanghai ? 'VIP / 特惠低价场' : '周一 / 周二特惠场'),
  shareLink: '分享当前筛选',
  linkCopied: '链接已复制',
  reset: (count) => `重置 (${count})`,
  worksInProjection: (count) => `共 ${count} 部影片正在放映`,
  cinemasScreening: (count) => `共 ${count} 家影院今日排片`,
  watchTrailer: '观看预告片',
  trailer: '预告片',
  maisonsScreening: (count) => `${count} 家影院有排片`,
  favorite: '收藏影院',
  favorited: '已收藏',
  directions: '路线导航',
  googleMaps: '地图定位',
  googleCalendar: '谷歌日历',
  appleIcs: '苹果日历 .ics',
  pinToCompare: '加入对比清单',
  pinnedInShortlist: '已在对比清单',
  bookAt: (cinemaName) => `前往 ${cinemaName} 购票`,
  doubleFeatureTitle: '连看第二场推荐 (Double Feature)',
  doubleFeatureSub: '散场后 10–75 分钟衔接开映，同影院或 3km 内可步行/短途抵达',
  doubleFeatureEmpty: '该场次散场后暂无合适的连场衔接排片。',
  pinBothToFolio: '两场一起加入对比',
  pinnedBoth: '已全部加入 ✓',
  viewSession: '查看该场',
  sameVenue: '同影院换厅直连',
  shortlistTitle: (count) => `好友拼单对比清单 (${count})`,
  shareFolioLink: '复制分享链接',
  folioLinkCopied: '已复制分享链接 ✓',
  copyVoteReply: '复制我的投票回复',
  voteReplyCopied: '已复制带票数回复 ✓',
  saveShareCard: '导出海报卡片 PNG',
  shareCardSaved: '已保存图片卡片 ✓',
  copyTextSummary: '复制微信文本摘要',
  copiedTextLink: '文本+链接已复制!',
  clearAll: '清空',
  vote: (votes) => `投一票 (${votes})`,
  book: '去购票',
  groupFavourite: '最多人想看',
  bestValue: '性价比最高',
  signatureFormat: '顶级银幕规格',
  topCriticPick: '评分最高',
};

export function getUiText(lang: AppLanguage): UiStrings {
  return lang === 'zh' ? ZH_STRINGS : EN_STRINGS;
}

export function getDisplayMovieTitle(
  movie: Movie,
  lang: AppLanguage,
  isShanghaiContext: boolean
): string {
  const zh = movie.ratings.douban.chineseTitle?.trim();
  if (!zh || zh === movie.title) return movie.title;
  if (lang === 'zh') {
    return `${zh} · ${movie.title}`;
  }
  return isShanghaiContext ? `${movie.title} · ${zh}` : movie.title;
}

export function getDisplayMovieTagline(movie: Movie, lang: AppLanguage): string {
  if (lang === 'zh' && movie.chineseTagline && movie.chineseTagline.trim().length > 0) {
    return movie.chineseTagline;
  }
  return movie.tagline;
}

export function getDisplayMovieSynopsis(movie: Movie, lang: AppLanguage): string {
  if (lang === 'zh' && movie.chineseSynopsis && movie.chineseSynopsis.trim().length > 0) {
    return movie.chineseSynopsis;
  }
  return movie.synopsis;
}

export function getDisplayCinemaName(cinema: Cinema, lang: AppLanguage): string {
  if (lang !== 'zh') return cinema.name;
  // Shanghai cinemas already store "English Name · 中文影城名"
  const parts = cinema.name.split(' · ');
  if (parts.length === 2 && /[\u4e00-\u9fff]/.test(parts[1])) {
    return `${parts[1]} · ${parts[0]}`;
  }
  return cinema.name;
}
