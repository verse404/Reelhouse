import { useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, LocateFixed } from 'lucide-react';
import type { AppLanguage, CityId, CityMeta, Movie } from '../types/cinema';
import { getDisplayMovieTitle, getUiText } from '../utils/i18n';
import type { UserLocationOrigin } from '../utils/proximity';

interface CityPhotoPlate {
  src: string;
  alt: string;
  plateLabel: string;
  plateLabelZh: string;
  specLabel: string;
  specLabelZh: string;
}

const CITY_LEAD_ZH: Record<CityId, string> = {
  melbourne:
    '从全球最大的 1.43:1 IMAX 银幕到柯林斯街与莱贡街独立艺术影院，实时汇总墨尔本 19 家旗舰与经典影院的排片、评分与票价（Hoyts、Village、Reading、Palace、IMAX、Cinema Nova、Lido、Classic、Sun Theatre 与 The Astor）。',
  sydney:
    '从达令港双机激光 IMAX、海顿奥芬百年影宫到 Surry Hills 与 Newtown 独立影厅，一站式对比悉尼 16 家精选影院今日场次、评分与特惠票价。',
  shanghai:
    '从南京西路大光明电影院、上海影城 SHO 杜比剧场到淮海路国泰与百丽宫 iapm，汇聚上海 15 家地标影城实时排片、猫眼参考价与三平台口碑评分。',
};

const CITY_GALLERY_PLATES: Record<CityId, CityPhotoPlate[]> = {
  melbourne: [
    {
      src: './cities/melbourne-cinema-dusk.jpg',
      alt: 'Illuminated 1930s Art Deco Melbourne cinema marquee reflecting on rain-slicked bluestone beside a classic green-and-gold Route 19 tram at dusk',
      plateLabel: 'PLATE 01 — MELBOURNE RAIN & ART DECO NEON',
      plateLabelZh: '图版 01 — 墨尔本雨夜与装饰艺术霓虹',
      specLabel: 'SWANSTON & CARLTON · 35MM · 1.43:1 IMAX',
      specLabelZh: '斯旺斯顿与卡尔顿 · 35毫米胶片 · 1.43:1 IMAX',
    },
    {
      src: './cities/melbourne-flinders-night.jpg',
      alt: 'Long-exposure evening photograph of a Melbourne tram gliding past the illuminated dome of Flinders Street Station',
      plateLabel: 'PLATE 02 — FLINDERS STREET EVENING CORRIDOR',
      plateLabelZh: '图版 02 — 弗林德斯街夜色电车走廊',
      specLabel: 'CBD PARIS END · SOUTHBANK · FITZROY',
      specLabelZh: '市中心东端 · 南岸 · 菲茨罗伊',
    },
    {
      src: './cities/melbourne-astor-1936.jpg',
      alt: 'Archival 1936 monochrome photograph of The Astor Theatre dress circle and proscenium curtain in St Kilda, Melbourne',
      plateLabel: 'PLATE 03 — THE ASTOR THEATRE ARCHIVE (1936)',
      plateLabelZh: '图版 03 — 圣基尔达阿斯特影宫档案 (1936)',
      specLabel: 'ST KILDA · SINGLE-SCREEN 70MM PALACE',
      specLabelZh: '圣基尔达 · 单厅 70毫米胶片百年影宫',
    },
  ],
  sydney: [
    {
      src: './cities/sydney-cinema-twilight.jpg',
      alt: 'Glowing golden and turquoise Art Deco neon marquee of an iconic 1930s Sydney picture palace framed by palm trees at deep sapphire twilight',
      plateLabel: 'PLATE 01 — SYDNEY ART DECO PICTURE PALACE',
      plateLabelZh: '图版 01 — 悉尼装饰艺术经典影宫',
      specLabel: 'CREMORNE · RANDWICK · SURRY HILLS',
      specLabelZh: '克雷莫恩 · 兰德威克 · 萨里山',
    },
    {
      src: './cities/sydney-orpheum-interior.jpg',
      alt: 'Interior auditorium of Sydney’s 1935 Hayden Orpheum Picture Palace showing its gold Art Deco sunburst dome and crimson velvet stage curtain',
      plateLabel: 'PLATE 02 — HAYDEN ORPHEUM DRESS CIRCLE (1935)',
      plateLabelZh: '图版 02 — 海顿奥芬影宫大厅 (1935)',
      specLabel: 'WURLITZER ORGAN · 35MM & 70MM PRINTS',
      specLabelZh: '百年管风琴 · 35毫米与70毫米胶片放映',
    },
    {
      src: './cities/sydney-darling-harbour.jpg',
      alt: 'Nighttime skyline reflections shimmering across Darling Harbour outside the IMAX Sydney waterfront cinema district',
      plateLabel: 'PLATE 03 — DARLING HARBOUR WATERFRONT',
      plateLabelZh: '图版 03 — 达令港海滨夜色',
      specLabel: 'DUAL 4K LASER IMAX · GEORGE ST CBD',
      specLabelZh: '双机 4K 激光 IMAX · 乔治街市中心',
    },
  ],
  shanghai: [
    {
      src: './cities/shanghai-cinema-night.jpg',
      alt: 'Stepped translucent amber Art Deco glass tower of Shanghai’s historic Cathay Theatre glowing behind autumn sycamore trees on rain-wet Huaihai Road',
      plateLabel: 'PLATE 01 — CATHAY THEATRE · 淮海路国泰电影院',
      plateLabelZh: '图版 01 — 淮海路国泰电影院 (1930)',
      specLabel: '1930 ART DECO · FORMER FRENCH CONCESSION',
      specLabelZh: '装饰艺术地标 · 衡复风貌区',
    },
    {
      src: './cities/shanghai-bund-night.jpg',
      alt: 'Panoramic night skyline of Lujiazui and the Oriental Pearl Tower shimmering in neon reflections across Shanghai’s Huangpu River',
      plateLabel: 'PLATE 02 — HUANGPU & NORTH BUND · 外滩夜色',
      plateLabelZh: '图版 02 — 黄浦江与北外滩夜色',
      specLabel: 'PALACE LUXE · CGV BUND · QIANTAN',
      specLabelZh: '百丽宫 LUXE · 北外滩 CGV · 前滩太古里',
    },
    {
      src: './cities/shanghai-grand-cinema.jpg',
      alt: 'László Hudec’s 1928 modernist Art Deco facade and vertical sign tower of Grand Cinema on Nanjing West Road, People’s Square, Shanghai',
      plateLabel: 'PLATE 03 — GRAND CINEMA (1928) · 大光明电影院',
      plateLabelZh: '图版 03 — 邬达克大光明电影院 (1928)',
      specLabel: 'LÁSZLÓ HUDEC · SIFF PREMIERE PALACE',
      specLabelZh: '南京西路人民广场 · 上影节主会场',
    },
  ],
};

interface HeroEditorialBannerProps {
  cityMeta: CityMeta;
  lang?: AppLanguage;
  userOrigin: UserLocationOrigin;
  featuredMovies: Movie[];
  activeSearchQuery: string;
  onFocusMovieTitle: (title: string) => void;
  onOpenLocationModal: () => void;
}

const ROMAN_PLATES = ['I', 'II', 'III', 'IV'];

export function HeroEditorialBanner({
  cityMeta,
  lang = 'en',
  userOrigin,
  featuredMovies,
  activeSearchQuery,
  onFocusMovieTitle,
  onOpenLocationModal,
}: HeroEditorialBannerProps) {
  const t = getUiText(lang);
  const displayCityName = t.cityNames[cityMeta.id] ?? cityMeta.name;
  const [plateState, setPlateState] = useState<{
    city: CityId;
    idx: number;
    imgError: boolean;
  }>({ city: cityMeta.id, idx: 0, imgError: false });

  const plateIdx = plateState.city === cityMeta.id ? plateState.idx : 0;
  const imageError = plateState.city === cityMeta.id ? plateState.imgError : false;

  const plates = CITY_GALLERY_PLATES[cityMeta.id] ?? CITY_GALLERY_PLATES.melbourne;
  const activePlate = plates[plateIdx % plates.length] ?? plates[0];

  return (
    <section className="editorial-masthead" aria-labelledby="page-hero-heading">
      <div className="editorial-masthead__grid">
        <div className="editorial-masthead__copy">
          <div className="masthead-colophon">
            <span>CAHIER N° XII</span>
            <span className="masthead-colophon__dot" aria-hidden="true" />
            <span>
              {cityMeta.name.toUpperCase()}, {cityMeta.stateCode}
            </span>
          </div>

          <h1 id="page-hero-heading" className="editorial-masthead__title">
            {lang === 'zh' ? (
              <>
                <em>{t.heroTitleEmphasis}</em>
                <br />
                {`${displayCityName.split(' ')[0]}${t.heroTitleSuffix}`}
              </>
            ) : (
              <>
                {t.heroTitlePrefix}
                <em>{t.heroTitleEmphasis}</em>
                {` for the ${cityMeta.name}${t.heroTitleSuffix}`}
              </>
            )}
          </h1>

          <p className="editorial-masthead__lead">
            {lang === 'zh'
              ? CITY_LEAD_ZH[cityMeta.id] ?? `${cityMeta.tagline} ${cityMeta.editorialNote}.`
              : `${cityMeta.tagline} ${cityMeta.editorialNote}.`}
          </p>

          <div className="masthead-location-cta-row">
            <button
              type="button"
              id="hero-my-location-btn"
              className={`masthead-location-btn ${
                userOrigin.isCustomOrigin ? 'masthead-location-btn--active' : ''
              }`}
              onClick={onOpenLocationModal}
            >
              <LocateFixed size={14} aria-hidden="true" />
              <span>
                {userOrigin.isCustomOrigin
                  ? t.heroChangeLocation(userOrigin.shortLabel)
                  : t.heroFindClosest(displayCityName)}
              </span>
            </button>
          </div>
        </div>

        {/* City-Specific Interactive 3-Plate Photography Frame */}
        <figure className="salon-visual-frame">
          <div className="salon-visual-frame__plate">
            {!imageError ? (
              <img
                key={activePlate.src}
                src={activePlate.src}
                alt={activePlate.alt}
                className="salon-visual-frame__img salon-visual-frame__img--city"
                onError={() =>
                  setPlateState({ city: cityMeta.id, idx: plateIdx, imgError: true })
                }
              />
            ) : (
              <div className="salon-visual-frame__abstract" aria-hidden="true" />
            )}

            <div className="salon-plate-switcher" role="group" aria-label={`${cityMeta.name} visual plates`}>
              <button
                type="button"
                className="salon-plate-arrow"
                onClick={() =>
                  setPlateState({
                    city: cityMeta.id,
                    idx: (plateIdx - 1 + plates.length) % plates.length,
                    imgError: false,
                  })
                }
                aria-label="Previous city photograph"
              >
                <ChevronLeft size={13} />
              </button>
              {plates.map((p, i) => (
                <button
                  key={p.src}
                  type="button"
                  className={`salon-plate-dot ${i === plateIdx ? 'salon-plate-dot--active' : ''}`}
                  onClick={() =>
                    setPlateState({ city: cityMeta.id, idx: i, imgError: false })
                  }
                  aria-label={`View ${cityMeta.name} plate ${i + 1}`}
                  aria-pressed={i === plateIdx}
                >
                  0{i + 1}
                </button>
              ))}
              <button
                type="button"
                className="salon-plate-arrow"
                onClick={() =>
                  setPlateState({
                    city: cityMeta.id,
                    idx: (plateIdx + 1) % plates.length,
                    imgError: false,
                  })
                }
                aria-label="Next city photograph"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
          <figcaption className="salon-visual-frame__caption">
            <span>{lang === 'zh' ? activePlate.plateLabelZh : activePlate.plateLabel}</span>
            <span>{lang === 'zh' ? activePlate.specLabelZh : activePlate.specLabel}</span>
          </figcaption>
        </figure>
      </div>

      {/* Curator's Triptych Lookbook Strip */}
      <div className="curated-triptych" aria-label="La Sélection — Curator highlights">
        <div className="curated-triptych__label-col">
          <span className="curated-triptych__kicker">LA SÉLECTION</span>
          <span className="curated-triptych__sub">
            {lang === 'zh' ? '今晚精选必看影片' : 'Essential Works Tonight'}
          </span>
        </div>

        <div className="curated-triptych__plates">
          {featuredMovies.map((movie, idx) => {
            const isFocused =
              activeSearchQuery.trim().toLowerCase() === movie.title.toLowerCase();
            const displayTitle = getDisplayMovieTitle(
              movie,
              lang,
              cityMeta.id === 'shanghai'
            );
            return (
              <button
                key={movie.id}
                type="button"
                id={`featured-pick-${movie.id}`}
                className={`triptych-plate ${isFocused ? 'triptych-plate--active' : ''}`}
                onClick={() => onFocusMovieTitle(isFocused ? '' : movie.title)}
              >
                <span className="triptych-plate__roman">{ROMAN_PLATES[idx] ?? 'I'}</span>
                <div className="triptych-plate__body">
                  <span className="triptych-plate__title">{displayTitle}</span>
                  <span className="triptych-plate__meta">
                    {movie.director} · {movie.classification}
                  </span>
                </div>
                <ArrowUpRight size={14} className="triptych-plate__arrow" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
