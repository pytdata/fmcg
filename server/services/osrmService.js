// Adapted from delivery-hub: [lat, lng] inputs, MLD driving routes, bounded cache.
const cache = new Map();
async function getRoute(start, end) {
  if (![...start, ...end].every(Number.isFinite)) throw new Error('Invalid routing coordinates');
  const base = process.env.OSRM_BASE_URL;
  if (!base) throw new Error('Ghana routing is not configured yet');
  const key = JSON.stringify([start, end]);
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const coords = `${start[1]},${start[0]};${end[1]},${end[0]}`;
  const response = await fetch(`${base.replace(/\/$/, '')}/route/v1/driving/${coords}?overview=false&radiuses=1000;1000`, { signal: AbortSignal.timeout(8000) });
  const data = await response.json();
  const route = data.routes?.[0];
  if (!response.ok || data.code !== 'Ok' || !Number.isFinite(route?.distance) || route.distance < 0) {
    throw new Error('No drivable delivery route found. Please choose a nearby accessible address.');
  }
  const value = { distanceKm: route.distance / 1000, durationMin: Math.round(route.duration / 60) };
  if (cache.size >= 500) cache.clear();
  cache.set(key, { value, expires: Date.now() + 60000 });
  return value;
}
module.exports = { getRoute };
