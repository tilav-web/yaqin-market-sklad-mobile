/**
 * Qarshi city-center coordinates — used as a GPS-denied/unavailable fallback
 * (map pickers, delivery-zone drawing) and nowhere else.
 *
 * Yaqin Market is currently piloting in a single city (Qarshi), so this is
 * intentionally hardcoded rather than a multi-city config. There is no
 * existing settings/env value for this today; if the app expands to more
 * cities, replace this with a per-shop or per-region lookup (e.g. resolved
 * from the shop's own city, or a server-provided default per region) instead
 * of adding more hardcoded constants like this one.
 */
export const PILOT_CITY_CENTER = { latitude: 38.8446827, longitude: 65.7803532 };
