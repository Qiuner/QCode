/** Deterministic garden time. No browser, Date, renderer, or Three.js dependency. */
export const GARDEN_SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type GardenSeason = typeof GARDEN_SEASONS[number];
export const GARDEN_PERIOD_NAMES = ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时'] as const;
export type GardenPeriodName = typeof GARDEN_PERIOD_NAMES[number];
export type GardenDirection = [number, number, number];

export const GARDEN_DAY_SECONDS = 360;
export const GARDEN_SEASON_SECONDS = 720;
export const GARDEN_YEAR_SECONDS = GARDEN_SEASON_SECONDS * GARDEN_SEASONS.length;
/** Artistic mid-latitude sky, not a location/date ephemeris. */
export const GARDEN_LATITUDE_DEGREES = 35;
export const GARDEN_DECLINATION_DEGREES = 20;
export const GARDEN_TWILIGHT_DEGREES = 12;

export interface GardenSky {
  /** True at/below the solar horizon; twilight remains continuous separately. */
  night: boolean;
  /** 0 in daylight, 1 at night; smooth through solar altitude +6 to -6 degrees. */
  nightMix: number;
  /** Complement of nightMix, for light/sky intensity rather than hours. */
  daylight: number;
  /** Unit vectors FROM the garden TOWARD each body; +Y up, dawn -X, noon +Z. */
  sunDirection: GardenDirection;
  moonDirection: GardenDirection;
  /** Elevation above the horizon, in radians. */
  sunAltitude: number;
  moonAltitude: number;
  sunriseHour: number;
  sunsetHour: number;
  dayLengthHours: number;
}

export interface GardenClockSnapshot extends GardenSky {
  /** Local solar hour in [0, 24). */
  hour: number;
  season: GardenSeason;
  periodName: GardenPeriodName;
  /** 子=0, 丑=1, …, 亥=11. 子 spans [23,24) and [0,1). */
  periodIndex: number;
  running: boolean;
  /** Elapsed fraction of this 720-second season, in [0, 1). */
  seasonProgress: number;
}

export interface GardenClock {
  /** Advance only with finite positive seconds while running; returns a fresh snapshot. */
  update(dtSeconds: number): GardenClockSnapshot;
  /** Wrap finite hours (e.g. -1 -> 23); invalid values leave the clock unchanged. */
  setHour(hour: number): GardenClockSnapshot;
  /** Set the season and reset its timer, including when selecting the same season. */
  setSeason(season: GardenSeason): GardenClockSnapshot;
  /** Manual hour/season changes still work when running is false. */
  setRunning(running: boolean): GardenClockSnapshot;
  getSnapshot(): GardenClockSnapshot;
}

const DEG = Math.PI / 180;
const HOURS_PER_SECOND = 24 / GARDEN_DAY_SECONDS;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
function wrap(value: number, period: number): number {
  const remainder = value % period;
  const positive = remainder < 0 ? remainder + period : remainder;
  // Avoid -0, or a rounded-up period for a tiny negative remainder.
  return positive === 0 || positive === period ? 0 : positive;
}
function smoothstep(lo: number, hi: number, value: number): number {
  const t = clamp((value - lo) / (hi - lo), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Pure sky sampler; progress=1 is allowed for checking continuity into the next season. */
export function sampleGardenSky(hour: number, season: GardenSeason, seasonProgress = 0): GardenSky {
  const h = Number.isFinite(hour) ? wrap(hour, 24) : 10;
  const index = GARDEN_SEASONS.indexOf(season);
  const seasonIndex = index < 0 ? 1 : index;
  const progress = Number.isFinite(seasonProgress) ? clamp(seasonProgress, 0, 1) : 0;
  const latitude = GARDEN_LATITUDE_DEGREES * DEG;
  // Spring/autumn start at equinox; summer/winter start at their artistic extrema.
  // The cyclic sine keeps direction AND seasonal derivative continuous on auto advance.
  const declination = Math.sin((seasonIndex + progress) * Math.PI / 2) * GARDEN_DECLINATION_DEGREES * DEG;
  const hourAngle = (h - 12) * Math.PI / 12;
  const cosDeclination = Math.cos(declination), sinDeclination = Math.sin(declination);
  const cosLatitude = Math.cos(latitude), sinLatitude = Math.sin(latitude);
  const cosHour = Math.cos(hourAngle);
  const sunDirection: GardenDirection = [
    cosDeclination * Math.sin(hourAngle),
    sinLatitude * sinDeclination + cosLatitude * cosDeclination * cosHour,
    sinLatitude * cosDeclination * cosHour - cosLatitude * sinDeclination,
  ];
  const moonDirection: GardenDirection = [-sunDirection[0], -sunDirection[1], -sunDirection[2]];
  const sunAltitude = Math.asin(clamp(sunDirection[1], -1, 1));
  const nightMix = 1 - smoothstep(-GARDEN_TWILIGHT_DEGREES * DEG, GARDEN_TWILIGHT_DEGREES * DEG, sunAltitude);
  const sunsetAngle = Math.acos(clamp(-Math.tan(latitude) * Math.tan(declination), -1, 1));
  const halfDayHours = sunsetAngle * 12 / Math.PI;
  return {
    // A tiny tolerance gives exact computed sunrise/sunset a stable horizon classification.
    night: sunDirection[1] <= 1e-12,
    nightMix,
    daylight: 1 - nightMix,
    sunDirection,
    moonDirection,
    sunAltitude,
    moonAltitude: -sunAltitude,
    sunriseHour: 12 - halfDayHours,
    sunsetHour: 12 + halfDayHours,
    dayLengthHours: 2 * halfDayHours,
  };
}

export function createGardenClock(): GardenClock {
  let daySeconds = 10 / HOURS_PER_SECOND;
  let seasonIndex = 1; // summer
  let seasonSeconds = 0;
  let running = true;

  function getSnapshot(): GardenClockSnapshot {
    const hour = daySeconds * HOURS_PER_SECOND;
    const season = GARDEN_SEASONS[seasonIndex];
    const seasonProgress = seasonSeconds / GARDEN_SEASON_SECONDS;
    const periodIndex = Math.floor(wrap(hour + 1, 24) / 2);
    return {
      hour, season, running, seasonProgress,
      periodIndex,
      periodName: GARDEN_PERIOD_NAMES[periodIndex],
      ...sampleGardenSky(hour, season, seasonProgress),
    };
  }

  return {
    update(dtSeconds) {
      if (running && Number.isFinite(dtSeconds) && dtSeconds > 0) {
        // Reduce the delta BEFORE adding: even Number.MAX_VALUE cannot overflow state.
        daySeconds = wrap(daySeconds + dtSeconds % GARDEN_DAY_SECONDS, GARDEN_DAY_SECONDS);
        const yearSeconds = wrap(seasonIndex * GARDEN_SEASON_SECONDS + seasonSeconds + dtSeconds % GARDEN_YEAR_SECONDS, GARDEN_YEAR_SECONDS);
        seasonIndex = Math.floor(yearSeconds / GARDEN_SEASON_SECONDS);
        seasonSeconds = yearSeconds - seasonIndex * GARDEN_SEASON_SECONDS;
      }
      return getSnapshot();
    },
    setHour(hour) {
      if (Number.isFinite(hour)) daySeconds = wrap(hour, 24) / HOURS_PER_SECOND;
      return getSnapshot();
    },
    setSeason(season) {
      const next = GARDEN_SEASONS.indexOf(season);
      if (next >= 0) { seasonIndex = next; seasonSeconds = 0; }
      return getSnapshot();
    },
    setRunning(value) {
      if (typeof value === 'boolean') running = value;
      return getSnapshot();
    },
    getSnapshot,
  };
}
