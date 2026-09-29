const pool = require('../db/pool');
const { getRoute } = require('./osrmService');
const { randomUUID } = require('node:crypto');
const money = value => Math.round((value + Number.EPSILON) * 100) / 100;

function configNumber(name, min = 0, max = Infinity) {
  const raw = process.env[name];
  const value = Number(raw);
  if (!raw?.trim() || !Number.isFinite(value) || value < min || value > max) throw new Error(`Delivery setting ${name} is not configured`);
  return value;
}
async function google(path, options = {}) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('Location search is not configured yet');
  const response = await fetch(`https://places.googleapis.com/v1/${path}`, {
    ...options, headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, ...options.headers },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Location search is temporarily unavailable. Please try again.');
  return response.json();
}
async function autocomplete(input, sessionToken) {
  const data = await google('places:autocomplete', {
    // Do not bias results to Ghana: shoppers may enter Canada or any supported
    // country and should see the international place suggestion immediately.
    method: 'POST', body: JSON.stringify({ input, sessionToken, languageCode: 'en' }),
  });
  return (data.suggestions || []).filter(s => s.placePrediction).map(({ placePrediction: p }) => ({ placeId: p.placeId, label: p.text.text }));
}
async function reverseGeocode(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw new Error('Invalid location coordinates');
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('Location search is not configured yet');
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(8000) });
  const data = await response.json();
  const result = data.results?.[0];
  if (!response.ok || data.status !== 'OK' || !result?.place_id) throw new Error('Could not identify your current location');
  return { placeId: result.place_id, label: result.formatted_address };
}
let rateCache;
async function exchangeRate() {
  if (process.env.USD_GHS_RATE?.trim()) return { rate: configNumber('USD_GHS_RATE', 0.000001), source: 'configured', asOf: new Date().toISOString() };
  if (rateCache && rateCache.expires > Date.now()) return rateCache.value;
  const response = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(8000) });
  const data = await response.json();
  const rate = data.rates?.GHS;
  if (!response.ok || data.result !== 'success' || !Number.isFinite(rate) || rate <= 0 || !data.time_last_update_unix || Date.now() - data.time_last_update_unix * 1000 > 48 * 3600000) {
    throw new Error('Currency conversion is temporarily unavailable. Please try again.');
  }
  const value = { rate, source: 'ExchangeRate-API', asOf: new Date(data.time_last_update_unix * 1000).toISOString() };
  rateCache = { value, expires: Date.now() + 3600000 };
  return value;
}
function ghanaFee(distanceKm, baseFee) {
  if (baseFee === null || baseFee === undefined || !Number.isFinite(Number(baseFee)) || Number(baseFee) < 0) throw new Error('Set a valid Ghana base fee in admin Settings');
  return money(Math.max(configNumber('DELIVERY_MIN_FEE_GHS'), Number(baseFee) + distanceKm * configNumber('DELIVERY_PER_KM_GHS', 0.000001)));
}
async function quote(placeId, sessionToken) {
  const place = await google(`places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}&languageCode=en`, {
    headers: { 'X-Goog-FieldMask': 'id,formattedAddress,addressComponents,location,types' },
  });
  const component = type => place.addressComponents?.find(c => c.types?.includes(type));
  const countryCode = component('country')?.shortText;
  if (!countryCode || !place.location) throw new Error('Choose a location with a country and street address');
  if (place.types?.some(t => ['country', 'administrative_area_level_1', 'administrative_area_level_2', 'locality', 'postal_code'].includes(t))) {
    throw new Error('Please select a specific street address or landmark, rather than a city or country');
  }
  const result = {
    placeId: place.id, address: place.formattedAddress, countryCode,
    city: component('locality')?.longText || '', region: component('administrative_area_level_1')?.longText || '',
    latitude: place.location.latitude, longitude: place.location.longitude,
  };
  // Country comes exclusively from Google Place Details, never from the client.
  if (countryCode === 'GH') {
    const route = await getRoute([
      configNumber('DELIVERY_ORIGIN_LAT', -90, 90), configNumber('DELIVERY_ORIGIN_LNG', -180, 180),
    ], [result.latitude, result.longitude]);
    const { rows: [settings] } = await pool.query('SELECT standard_delivery_fee FROM site_settings LIMIT 1');
    Object.assign(result, { method: 'osrm', distanceKm: money(route.distanceKm), feeGhs: ghanaFee(route.distanceKm, settings?.standard_delivery_fee) });
  } else {
    const { rows: [group] } = await pool.query(`SELECT g.* FROM delivery_groups g JOIN delivery_countries c ON c.continent_code = g.code WHERE c.code = $1`, [countryCode]);
    if (!group?.is_active || group.fee_usd === null) throw new Error('Delivery to this country is not available yet. Please contact us.');
    const fx = await exchangeRate();
    Object.assign(result, { method: 'flat', continent: group.name, feeUsd: Number(group.fee_usd), feeGhs: money(Number(group.fee_usd) * fx.rate), exchangeRate: fx.rate, rateSource: fx.source, rateAsOf: fx.asOf });
  }
  if (!Number.isFinite(result.feeGhs) || result.feeGhs < 0 || result.feeGhs > 99999999) throw new Error('Delivery price is outside the supported range');
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60000).toISOString();
  // Order snapshots are independent; discard abandoned location searches daily.
  await pool.query("DELETE FROM delivery_quotes WHERE expires_at < now() - interval '1 day'");
  await pool.query('INSERT INTO delivery_quotes (id, details, expires_at) VALUES ($1,$2,$3)', [id, result, expiresAt]);
  return { ...result, id, expiresAt };
}
module.exports = { autocomplete, reverseGeocode, quote, exchangeRate, ghanaFee, money };
