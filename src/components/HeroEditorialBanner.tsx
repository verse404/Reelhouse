import { useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, LocateFixed } from 'lucide-react';
import type { CityId, CityMeta, Movie } from '../types/cinema';
import type { UserLocationOrigin } from '../utils/proximity';

interface CityPhotoPlate {
  src: string;
  alt: string;
  plateLabel: string;
  specLabel: string;
}

const CITY_GALLERY_PLATES: Record<CityId, CityPhotoPlate[]> = {
  melbourne: [
    {
      src: '/cities/melbourne-cinema-dusk.jpg',
      alt: 'Illuminated 1930s Art Deco Melbourne cinema marquee reflecting on rain-slicked bluestone beside a classic green-and-gold Route 19 tram at dusk',
      plateLabel: 'PLATE 01 — MELBOURNE RAIN & ART DECO NEON',
      specLabel: 'SWANSTON & CARLTON · 35MM · 1.43:1 IMAX',
    },
    {
      src: '/cities/melbourne-flinders-night.jpg',
      alt: 'Long-exposure evening photograph of a Melbourne tram gliding past the illuminated dome of Flinders Street Station',
      plateLabel: 'PLATE 02 — FLINDERS STREET EVENING CORRIDOR',
      specLabel: 'CBD PARIS END · SOUTHBANK · FITZROY',
    },
    {
      src: '/cities/melbourne-astor-1936.jpg',
      alt: 'Archival 1936 monochrome photograph of The Astor Theatre dress circle and proscenium curtain in St Kilda, Melbourne',
      plateLabel: 'PLATE 03 — THE ASTOR THEATRE ARCHIVE (1936)',
      specLabel: 'ST KILDA · SINGLE-SCREEN 70MM PALACE',
    },
  ],
  sydney: [
    {
      src: '/cities/sydney-cinema-twilight.jpg',
      alt: 'Glowing golden and turquoise Art Deco neon marquee of an iconic 1930s Sydney picture palace framed by palm trees at deep sapphire twilight',
      plateLabel: 'PLATE 01 — SYDNEY ART DECO PICTURE PALACE',
      specLabel: 'CREMORNE · RANDWICK · SURRY HILLS',
    },
    {
      src: '/cities/sydney-orpheum-interior.jpg',
      alt: 'Interior auditorium of Sydney’s 1935 Hayden Orpheum Picture Palace showing its gold Art Deco sunburst dome and crimson velvet stage curtain',
      plateLabel: 'PLATE 02 — HAYDEN ORPHEUM DRESS CIRCLE (1935)',
      specLabel: 'WURLITZER ORGAN · 35MM & 70MM PRINTS',
    },
    {
      src: '/cities/sydney-darling-harbour.jpg',
      alt: 'Nighttime skyline reflections shimmering across Darling Harbour outside the IMAX Sydney waterfront cinema district',
      plateLabel: 'PLATE 03 — DARLING HARBOUR WATERFRONT',
      specLabel: 'DUAL 4K LASER IMAX · GEORGE ST CBD',
    },
  ],
  shanghai: [
    {
      src: '/cities/shanghai-cinema-night.jpg',
      alt: 'Stepped translucent amber Art Deco glass tower of Shanghai’s historic Cathay Theatre glowing behind autumn sycamore trees on rain-wet Huaihai Road',
      plateLabel: 'PLATE 01 — CATHAY THEATRE · 淮海路国泰电影院',
      specLabel: '1930 ART DECO · FORMER FRENCH CONCESSION',
    },
    {
      src: '/cities/shanghai-bund-night.jpg',
      alt: 'Panoramic night skyline of Lujiazui and the Oriental Pearl Tower shimmering in neon reflections across Shanghai’s Huangpu River',
      plateLabel: 'PLATE 02 — HUANGPU & NORTH BUND · 外滩夜色',
      specLabel: 'PALACE LUXE · CGV BUND · QIANTAN',
    },
    {
      src: '/cities/shanghai-grand-cinema.jpg',
      alt: 'László Hudec’s 1928 modernist Art Deco facade and vertical sign tower of Grand Cinema on Nanjing West Road, People’s Square, Shanghai',
      plateLabel: 'PLATE 03 — GRAND CINEMA (1928) · 大光明电影院',
      specLabel: 'LÁSZLÓ HUDEC · SIFF PREMIERE PALACE',
    },
  ],
};

interface HeroEditorialBannerProps {
  cityMeta: CityMeta;
  userOrigin: UserLocationOrigin;
  featuredMovies: Movie[];
  activeSearchQuery: string;
  onFocusMovieTitle: (title: string) => void;
  onOpenLocationModal: () => void;
}

const ROMAN_PLATES = ['I', 'II', 'III', 'IV'];

export function HeroEditorialBanner({
  cityMeta,
  userOrigin,
  featuredMovies,
  activeSearchQuery,
  onFocusMovieTitle,
  onOpenLocationModal,
}: HeroEditorialBannerProps) {
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
            Cinema, <em>curated</em> for the {cityMeta.name} evening.
          </h1>

          <p className="editorial-masthead__lead">
            {cityMeta.tagline} {cityMeta.editorialNote}.
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
                  ? `My Location: ${userOrigin.shortLabel} · Change`
                  : `Find Closest ${cityMeta.name} Cinemas Around Me`}
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
            <span>{activePlate.plateLabel}</span>
            <span>{activePlate.specLabel}</span>
          </figcaption>
        </figure>
      </div>

      {/* Curator's Triptych Lookbook Strip */}
      <div className="curated-triptych" aria-label="La Sélection — Curator highlights">
        <div className="curated-triptych__label-col">
          <span className="curated-triptych__kicker">LA SÉLECTION</span>
          <span className="curated-triptych__sub">Essential Works Tonight</span>
        </div>

        <div className="curated-triptych__plates">
          {featuredMovies.map((movie, idx) => {
            const isFocused =
              activeSearchQuery.trim().toLowerCase() === movie.title.toLowerCase();
            const displayTitle =
              cityMeta.id === 'shanghai' &&
              movie.ratings.douban.chineseTitle &&
              movie.ratings.douban.chineseTitle !== movie.title
                ? `${movie.title} · ${movie.ratings.douban.chineseTitle}`
                : movie.title;
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
