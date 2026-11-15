import type { Movie } from '../types/cinema';
import { getSafePosterImageUrl } from '../utils/security';

interface MoviePosterProps {
  movie: Movie;
  size?: 'sm' | 'md' | 'lg';
}

interface CouturePosterPalette {
  matColor: string;
  canvasTop: string;
  canvasBottom: string;
  foilPrimary: string;
  foilSecondary: string;
  matInk: string;
  romanNumeral: string;
}

const COUTURE_PALETTES: Record<Movie['posterTheme'], CouturePosterPalette> = {
  'dune-amber': {
    matColor: '#EFE9DD',
    canvasTop: '#1A140E',
    canvasBottom: '#090705',
    foilPrimary: '#D8B377',
    foilSecondary: '#8E5A31',
    matInk: '#141210',
    romanNumeral: 'I',
  },
  'coastal-noir': {
    matColor: '#ECEAE4',
    canvasTop: '#101B21',
    canvasBottom: '#070B0E',
    foilPrimary: '#A8C2CC',
    foilSecondary: '#466370',
    matInk: '#121517',
    romanNumeral: 'II',
  },
  'mood-crimson': {
    matColor: '#F1E8DF',
    canvasTop: '#2E0C10',
    canvasBottom: '#110406',
    foilPrimary: '#D97B6C',
    foilSecondary: '#C9A46A',
    matInk: '#1B0D0F',
    romanNumeral: 'III',
  },
  'glass-nocturne': {
    matColor: '#EAECE9',
    canvasTop: '#111819',
    canvasBottom: '#070A0B',
    foilPrimary: '#B5CEC7',
    foilSecondary: '#516B66',
    matInk: '#111514',
    romanNumeral: 'IV',
  },
  'kyoto-clock': {
    matColor: '#F2ECE1',
    canvasTop: '#211B16',
    canvasBottom: '#0E0B0A',
    foilPrimary: '#DEC089',
    foilSecondary: '#A85F48',
    matInk: '#171310',
    romanNumeral: 'V',
  },
  'velvet-static': {
    matColor: '#EFE7DC',
    canvasTop: '#221412',
    canvasBottom: '#0C0807',
    foilPrimary: '#D69E72',
    foilSecondary: '#7D493A',
    matInk: '#181110',
    romanNumeral: 'VI',
  },
  'orbital-grid': {
    matColor: '#E9ECE8',
    canvasTop: '#101914',
    canvasBottom: '#070B09',
    foilPrimary: '#A3C4AA',
    foilSecondary: '#46684E',
    matInk: '#101612',
    romanNumeral: 'VII',
  },
  'echo-ivory': {
    matColor: '#F3EFE6',
    canvasTop: '#1E1B17',
    canvasBottom: '#0B0A08',
    foilPrimary: '#D8C8AE',
    foilSecondary: '#7D705C',
    matInk: '#151310',
    romanNumeral: 'VIII',
  },
  'bathurst-carbon': {
    matColor: '#EDE8E1',
    canvasTop: '#1D1210',
    canvasBottom: '#090706',
    foilPrimary: '#CF6E55',
    foilSecondary: '#CCA668',
    matInk: '#161110',
    romanNumeral: 'IX',
  },
  'saltwater-sun': {
    matColor: '#F2EDE2',
    canvasTop: '#152224',
    canvasBottom: '#091012',
    foilPrimary: '#DEC082',
    foilSecondary: '#649694',
    matInk: '#111718',
    romanNumeral: 'X',
  },
  'cambon-silk': {
    matColor: '#F5EFE7',
    canvasTop: '#1C1715',
    canvasBottom: '#0B0908',
    foilPrimary: '#E4D2B8',
    foilSecondary: '#9A8268',
    matInk: '#141110',
    romanNumeral: 'XI',
  },
  'mirror-monolith': {
    matColor: '#ECEEF0',
    canvasTop: '#0E151E',
    canvasBottom: '#05080D',
    foilPrimary: '#C8D6E5',
    foilSecondary: '#58708A',
    matInk: '#0E1318',
    romanNumeral: 'XII',
  },
  'cicada-jade': {
    matColor: '#EFF0E8',
    canvasTop: '#141E17',
    canvasBottom: '#080D09',
    foilPrimary: '#B8CFAF',
    foilSecondary: '#688764',
    matInk: '#111712',
    romanNumeral: 'XIII',
  },
  'tasman-storm': {
    matColor: '#EAECEE',
    canvasTop: '#111A22',
    canvasBottom: '#060A0E',
    foilPrimary: '#9DB8CC',
    foilSecondary: '#C87D58',
    matInk: '#0F151A',
    romanNumeral: 'XIV',
  },
  'orpheus-velvet': {
    matColor: '#F2E9E6',
    canvasTop: '#260E18',
    canvasBottom: '#0D0508',
    foilPrimary: '#DF8B9E',
    foilSecondary: '#D4B483',
    matInk: '#190B11',
    romanNumeral: 'XV',
  },
  'cradle-mist': {
    matColor: '#F0EFEA',
    canvasTop: '#1A1F20',
    canvasBottom: '#0B0E0F',
    foilPrimary: '#D8DDD9',
    foilSecondary: '#7B8D8E',
    matInk: '#121617',
    romanNumeral: 'XVI',
  },
};

/**
 * Avant-Garde Exhibition / A24 / Saint Laurent Productions Passe-Partout Film Print.
 * Features archival gallery matting, chiaroscuro geometric plates, and Didone typography.
 */
export function MoviePoster({ movie, size = 'md' }: MoviePosterProps) {
  const p = COUTURE_PALETTES[movie.posterTheme];
  const gradId = `couture-grad-${movie.id}-${size}`;
  const safeLivePosterUrl = getSafePosterImageUrl(movie.posterUrl);

  const shortTitle =
    movie.title.length > 20 ? `${movie.title.slice(0, 19).trim()}…` : movie.title;

  return (
    <div className={`movie-poster movie-poster--${size}`} aria-hidden="true">
      <svg
        viewBox="0 0 300 450"
        className="movie-poster__svg"
        role="img"
        aria-label={`${movie.title} exhibition print`}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0.15" y2="1">
            <stop offset="0%" stopColor={p.canvasTop} />
            <stop offset="100%" stopColor={p.canvasBottom} />
          </linearGradient>
        </defs>

        {/* Archival Museum Passe-Partout Paper Mat */}
        <rect width="300" height="450" fill={p.matColor} />
        <rect
          x="8"
          y="8"
          width="284"
          height="434"
          fill="none"
          stroke={p.matInk}
          strokeOpacity="0.18"
          strokeWidth="0.75"
        />

        {/* Top Exhibition Header on Mat */}
        <text
          x="24"
          y="29"
          fill={p.matInk}
          fillOpacity="0.68"
          fontSize="7.5"
          fontFamily="Google Sans Flex, sans-serif"
          fontWeight="500"
          letterSpacing="2.8"
        >
          COLLECTION REELHOUSE
        </text>
        <text
          x="276"
          y="29"
          textAnchor="end"
          fill={p.matInk}
          fillOpacity="0.75"
          fontSize="8.5"
          fontFamily="Bodoni Moda, Georgia, serif"
          fontStyle="italic"
        >
          {`N° ${p.romanNumeral}`}
        </text>

        {/* Inner Chiaroscuro Artwork Plate (Live TMDB Poster or Bespoke Geometric Print) */}
        <svg x="24" y="42" width="252" height="304" viewBox="0 0 252 304">
          <rect width="252" height="304" fill={`url(#${gradId})`} />

          {safeLivePosterUrl ? (
            <image
              href={safeLivePosterUrl}
              x="0"
              y="0"
              width="252"
              height="304"
              preserveAspectRatio="xMidYMid slice"
            />
          ) : (
            <>
          {movie.posterTheme === 'dune-amber' && (
            <g>
              <circle cx="126" cy="128" r="68" fill={p.foilPrimary} fillOpacity="0.9" />
              <circle cx="144" cy="118" r="62" fill={p.canvasTop} />
              <path
                d="M0 225 Q95 182 252 218 L252 304 L0 304 Z"
                fill={p.foilSecondary}
                fillOpacity="0.42"
              />
              <line
                x1="126"
                y1="20"
                x2="126"
                y2="284"
                stroke={p.foilPrimary}
                strokeOpacity="0.24"
                strokeWidth="0.75"
              />
            </g>
          )}

          {movie.posterTheme === 'coastal-noir' && (
            <g>
              <rect
                x="36"
                y="34"
                width="180"
                height="236"
                fill="none"
                stroke={p.foilPrimary}
                strokeOpacity="0.32"
                strokeWidth="0.8"
              />
              <line
                x1="36"
                y1="176"
                x2="216"
                y2="176"
                stroke={p.foilPrimary}
                strokeWidth="1.2"
                strokeOpacity="0.85"
              />
              <circle cx="126" cy="118" r="26" fill="none" stroke={p.foilPrimary} strokeWidth="1" />
              <path
                d="M56 212 L196 212 M76 228 L176 228"
                stroke={p.foilSecondary}
                strokeWidth="1"
              />
            </g>
          )}

          {movie.posterTheme === 'mood-crimson' && (
            <g>
              <rect
                x="48"
                y="28"
                width="156"
                height="248"
                rx="78"
                fill={p.foilPrimary}
                fillOpacity="0.22"
                stroke={p.foilSecondary}
                strokeOpacity="0.6"
                strokeWidth="0.9"
              />
              <line x1="96" y1="28" x2="96" y2="276" stroke={p.canvasBottom} strokeWidth="3" />
              <line x1="126" y1="28" x2="126" y2="276" stroke={p.canvasBottom} strokeWidth="3" />
              <line x1="156" y1="28" x2="156" y2="276" stroke={p.canvasBottom} strokeWidth="3" />
              <circle cx="126" cy="152" r="32" fill={p.foilPrimary} fillOpacity="0.72" />
            </g>
          )}

          {movie.posterTheme === 'glass-nocturne' && (
            <g>
              <rect
                x="42"
                y="40"
                width="112"
                height="172"
                fill={p.foilSecondary}
                fillOpacity="0.3"
                stroke={p.foilPrimary}
                strokeOpacity="0.55"
                strokeWidth="0.8"
              />
              <rect
                x="98"
                y="88"
                width="112"
                height="172"
                fill="none"
                stroke={p.foilPrimary}
                strokeOpacity="0.9"
                strokeWidth="1"
              />
              <line
                x1="42"
                y1="40"
                x2="210"
                y2="260"
                stroke={p.foilPrimary}
                strokeOpacity="0.35"
                strokeWidth="0.8"
              />
            </g>
          )}

          {movie.posterTheme === 'kyoto-clock' && (
            <g>
              <circle
                cx="126"
                cy="152"
                r="78"
                fill="none"
                stroke={p.foilPrimary}
                strokeOpacity="0.78"
                strokeWidth="1"
              />
              <circle
                cx="126"
                cy="152"
                r="52"
                fill="none"
                stroke={p.foilSecondary}
                strokeOpacity="0.65"
                strokeDasharray="3 5"
              />
              <line x1="126" y1="152" x2="126" y2="92" stroke={p.foilPrimary} strokeWidth="1.5" />
              <line x1="126" y1="152" x2="168" y2="174" stroke={p.foilSecondary} strokeWidth="1.5" />
            </g>
          )}

          {movie.posterTheme === 'velvet-static' && (
            <g>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => {
                const heights = [48, 92, 156, 198, 112, 174, 128, 76, 40];
                const h = heights[idx];
                const x = 46 + idx * 20;
                return (
                  <line
                    key={idx}
                    x1={x}
                    y1={152 - h / 2}
                    x2={x}
                    y2={152 + h / 2}
                    stroke={idx === 3 ? p.foilPrimary : p.foilSecondary}
                    strokeWidth={idx === 3 ? '3' : '1.5'}
                    strokeOpacity={idx === 3 ? '0.95' : '0.65'}
                  />
                );
              })}
            </g>
          )}

          {movie.posterTheme === 'orbital-grid' && (
            <g>
              <ellipse
                cx="126"
                cy="152"
                rx="88"
                ry="34"
                fill="none"
                stroke={p.foilPrimary}
                strokeOpacity="0.7"
                strokeWidth="1"
                transform="rotate(-28 126 152)"
              />
              <ellipse
                cx="126"
                cy="152"
                rx="88"
                ry="34"
                fill="none"
                stroke={p.foilSecondary}
                strokeOpacity="0.7"
                strokeWidth="1"
                transform="rotate(28 126 152)"
              />
              <circle cx="126" cy="152" r="14" fill={p.foilPrimary} />
            </g>
          )}

          {movie.posterTheme === 'echo-ivory' && (
            <g>
              {[24, 46, 68, 92].map((r, idx) => (
                <circle
                  key={r}
                  cx="126"
                  cy="152"
                  r={r}
                  fill="none"
                  stroke={p.foilPrimary}
                  strokeOpacity={0.85 - idx * 0.18}
                  strokeWidth="0.9"
                />
              ))}
            </g>
          )}

          {movie.posterTheme === 'bathurst-carbon' && (
            <g>
              <polygon points="48,248 128,52 154,52 74,248" fill={p.foilPrimary} fillOpacity="0.86" />
              <polygon
                points="104,248 184,52 202,52 122,248"
                fill={p.foilSecondary}
                fillOpacity="0.68"
              />
            </g>
          )}

          {movie.posterTheme === 'saltwater-sun' && (
            <g>
              <circle cx="126" cy="132" r="48" fill={p.foilPrimary} fillOpacity="0.88" />
              <line x1="28" y1="192" x2="224" y2="192" stroke={p.foilSecondary} strokeWidth="2" />
              <line
                x1="52"
                y1="210"
                x2="200"
                y2="210"
                stroke={p.foilPrimary}
                strokeOpacity="0.6"
                strokeWidth="1"
              />
            </g>
          )}

          {movie.posterTheme === 'cambon-silk' && (
            <g>
              <path
                d="M66 36 C150 90, 96 210, 186 268"
                fill="none"
                stroke={p.foilPrimary}
                strokeWidth="2.2"
              />
              <path
                d="M84 36 C168 90, 114 210, 204 268"
                fill="none"
                stroke={p.foilSecondary}
                strokeWidth="1"
                strokeOpacity="0.7"
              />
              <rect
                x="48"
                y="36"
                width="156"
                height="232"
                fill="none"
                stroke={p.foilPrimary}
                strokeOpacity="0.28"
                strokeWidth="0.8"
              />
            </g>
          )}

          {movie.posterTheme === 'mirror-monolith' && (
            <g>
              <rect
                x="96"
                y="42"
                width="60"
                height="220"
                fill={p.foilSecondary}
                fillOpacity="0.32"
                stroke={p.foilPrimary}
                strokeWidth="1.2"
              />
              <circle cx="126" cy="152" r="76" fill="none" stroke={p.foilPrimary} strokeOpacity="0.45" />
            </g>
          )}

          {movie.posterTheme === 'cicada-jade' && (
            <g>
              <line x1="62" y1="54" x2="62" y2="250" stroke={p.foilPrimary} strokeOpacity="0.4" />
              <line x1="126" y1="38" x2="126" y2="266" stroke={p.foilPrimary} strokeOpacity="0.8" />
              <line x1="190" y1="54" x2="190" y2="250" stroke={p.foilPrimary} strokeOpacity="0.4" />
              <circle cx="126" cy="124" r="34" fill={p.foilPrimary} fillOpacity="0.75" />
            </g>
          )}

          {movie.posterTheme === 'tasman-storm' && (
            <g>
              <polygon
                points="126,52 192,238 60,238"
                fill="none"
                stroke={p.foilPrimary}
                strokeWidth="1.4"
              />
              <polygon
                points="126,76 172,238 126,238"
                fill={p.foilSecondary}
                fillOpacity="0.75"
              />
            </g>
          )}

          {movie.posterTheme === 'orpheus-velvet' && (
            <g>
              <path
                d="M72 72 A54 54 0 1 1 72 232"
                fill="none"
                stroke={p.foilPrimary}
                strokeWidth="2"
              />
              <path
                d="M180 72 A54 54 0 1 0 180 232"
                fill="none"
                stroke={p.foilSecondary}
                strokeWidth="1.2"
              />
              <circle cx="126" cy="152" r="10" fill={p.foilPrimary} />
            </g>
          )}

          {movie.posterTheme === 'cradle-mist' && (
            <g>
              <path
                d="M24 220 L88 126 L132 176 L178 108 L228 220 Z"
                fill={p.foilSecondary}
                fillOpacity="0.45"
                stroke={p.foilPrimary}
                strokeWidth="1.1"
              />
              <line x1="24" y1="236" x2="228" y2="236" stroke={p.foilPrimary} strokeOpacity="0.5" />
            </g>
          )}
            </>
          )}
        </svg>

        {/* Museum Plinth Typography on Bottom Mat */}
        <text
          x="150"
          y="374"
          textAnchor="middle"
          fill={p.matInk}
          fontSize="18.5"
          fontFamily="Bodoni Moda, Didot, Georgia, serif"
          fontWeight="500"
          letterSpacing="-0.2"
        >
          {shortTitle}
        </text>

        <text
          x="150"
          y="396"
          textAnchor="middle"
          fill={p.matInk}
          fillOpacity="0.72"
          fontSize="9"
          fontFamily="Google Sans Flex, sans-serif"
          fontWeight="500"
          letterSpacing="2.4"
        >
          {`UN FILM DE ${movie.director.toUpperCase()}`}
        </text>

        <line
          x1="115"
          y1="410"
          x2="185"
          y2="410"
          stroke={p.matInk}
          strokeOpacity="0.28"
          strokeWidth="0.75"
        />

        <text
          x="150"
          y="426"
          textAnchor="middle"
          fill={p.matInk}
          fillOpacity="0.6"
          fontSize="8.5"
          fontFamily="Cormorant Garamond, Georgia, serif"
          fontStyle="italic"
        >
          {`${movie.countryOrigin} · ${movie.releaseYear}`}
        </text>
      </svg>
    </div>
  );
}
