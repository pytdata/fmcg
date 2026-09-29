const { test, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
let queryImpl;
const db = { query: (...args) => queryImpl(...args), connect: async () => ({ query: (...args) => queryImpl(...args), release() {} }) };
require.cache[require.resolve('../db/pool')] = { exports: db };
require.cache[require.resolve('../services/notify')] = { exports: { notifyOrder: async () => {} } };
const delivery = require('../services/delivery');
const { getRoute } = require('../services/osrmService');
const realFetch = global.fetch;
let fetchImpl;
global.fetch = (...args) => fetchImpl(...args);
const app = express();
app.use(express.json());
app.use('/orders', require('../routes/orders'));
app.use('/delivery', require('../routes/delivery'));
const server = app.listen(0, '127.0.0.1');
after(() => { server.close(); global.fetch = realFetch; });
const json = data => ({ ok: true, json: async () => data });
const place = country => ({ id: 'place123', formattedAddress: `Address, ${country}`, location: { latitude: 5.7, longitude: -0.12 }, types: ['street_address'], addressComponents: [{ types: ['country'], shortText: country }] });
const sessionToken = '01234567-1234-1234-1234-012345678901';
beforeEach(() => {
  Object.assign(process.env, { GOOGLE_MAPS_API_KEY: 'test', OSRM_BASE_URL: 'http://osrm.test', DELIVERY_ORIGIN_LAT: '5.6', DELIVERY_ORIGIN_LNG: '-0.2', DELIVERY_PER_KM_GHS: '2', DELIVERY_MIN_FEE_GHS: '20', USD_GHS_RATE: '12.5' });
  queryImpl = async () => ({ rows: [] });
  fetchImpl = async () => { throw new Error('Unexpected fetch'); };
});
test('Ghana uses OSRM even when Africa is unavailable; quote keeps exact price', async () => {
  const queries = [];
  queryImpl = async (sql, args) => { queries.push([sql,args]); return { rows: sql.includes('site_settings') ? [{standard_delivery_fee:10}] : [] }; };
  fetchImpl = async url => url.includes('places.googleapis') ? json(place('GH')) : json({ code: 'Ok', routes: [{ distance: 12345, duration: 900 }] });
  const quote = await delivery.quote('place123',sessionToken);
  assert.equal(quote.method,'osrm'); assert.equal(quote.feeGhs,34.69);
  assert.equal(quote.distanceKm,12.35);
  assert.equal(queries.length,3); assert.match(queries[2][0],/INSERT INTO delivery_quotes/);
});
test('foreign country uses persisted continent USD fee and GHS conversion, never OSRM', async () => {
  queryImpl = async sql => ({ rows: sql.includes('delivery_groups') ? [{ name:'Europe',fee_usd:20,is_active:true }] : [] });
  fetchImpl = async url => { assert.match(url,/places.googleapis/); return json(place('GB')); };
  const quote = await delivery.quote('place123',sessionToken);
  assert.equal(quote.feeUsd,20); assert.equal(quote.feeGhs,250); assert.equal(quote.method,'flat');
});
test('unconfigured continent blocks delivery instead of silently charging zero', async () => {
  fetchImpl = async () => json(place('US'));
  await assert.rejects(delivery.quote('place123',sessionToken),/not available/);
});
test('city-level selection is rejected', async () => {
  fetchImpl = async () => json({ ...place('GH'), types: ['locality','political'] });
  await assert.rejects(delivery.quote('place123',sessionToken),/specific street/);
});
test('missing Ghana tariff fails closed; minimum fee applies', () => {
  assert.equal(delivery.ghanaFee(1,10),20);
  delete process.env.DELIVERY_PER_KM_GHS;
  assert.throws(() => delivery.ghanaFee(1,10),/not configured/);
});
test('OSRM no route fails closed', async () => {
  fetchImpl = async () => json({ code:'NoRoute' });
  await assert.rejects(getRoute([5.61,-0.21],[5.8,-0.3]),/No drivable/);
});
test('exchange provider failure does not invent a rate', async () => {
  delete process.env.USD_GHS_RATE;
  fetchImpl = async () => json({ result:'error' });
  await assert.rejects(delivery.exchangeRate(),/unavailable/);
});
test('dataset covers all seven groups and unique country codes with Ghana in Africa', () => {
  const countries = require('../db/delivery-countries.json');
  assert.equal(new Set(countries.map(c => c.code)).size,countries.length);
  assert.equal(new Set(countries.map(c => c.continent)).size,7);
  assert.equal(countries.find(c => c.code === 'GH').continent,'AF');
  assert.ok(countries.length >= 249);
});
async function request(path,body) {
  const response = await realFetch(`http://127.0.0.1:${server.address().port}${path}`, { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body) });
  return { status:response.status,data:await response.json() };
}
const order = { items:[{ name:'Test',quantity:1,unit_price:100,total_price:100 }],subtotal:100,total_amount:135,delivery_fee:0,delivery_mode:'delivery',delivery_quote_id:'12345678-1234-1234-1234-123456789012' };
function orderDb({ expired=false, coupon=null }={}) {
  const inserts=[];
  queryImpl = async (sql,args) => {
    if (sql.startsWith('SELECT details')) return { rows: expired ? [] : [{details:{feeGhs:35,address:'Verified address',countryCode:'GH'}}] };
    if (sql.includes('SELECT * FROM promotions')) return {rows:coupon ? [coupon] : []};
    if (sql.includes('INSERT INTO orders')) { inserts.push(args);return {rows:[{id:'order1',total_amount:args[8]}]}; }
    return {rows:[]};
  };
  return inserts;
}
test('order ignores client delivery fee and stores verified quote and total', async () => {
  const inserts=orderDb();
  const result=await request('/orders',order);
  assert.equal(result.status,201);assert.equal(inserts[0][7],35);assert.equal(inserts[0][8],135);assert.equal(inserts[0][12],'Verified address');
});
test('tampered total cannot remove delivery charge', async () => {
  orderDb(); const result=await request('/orders',{...order,total_amount:100});
  assert.equal(result.status,409);
});
test('expired quote and missing quote block order creation', async () => {
  orderDb({expired:true});assert.equal((await request('/orders',order)).status,409);
  assert.equal((await request('/orders',{...order,delivery_quote_id:undefined})).status,400);
});
test('pickup requires no quote and always costs zero delivery', async () => {
  const inserts=orderDb();
  assert.equal((await request('/orders',{...order,delivery_mode:'pickup',total_amount:100,delivery_fee:999})).status,201);
  assert.equal(inserts[0][7],0);
});
test('free shipping is verified from the database', async () => {
  const inserts=orderDb({coupon:{discount_type:'free_shipping',min_order_amount:0}});
  assert.equal((await request('/orders',{...order,coupon_code:'FREE',total_amount:100})).status,201);
  assert.equal(inserts[0][7],0);
  orderDb();assert.equal((await request('/orders',{...order,coupon_code:'FAKE',total_amount:100})).status,409);
});
test('admin delivery groups require authentication', async () => {
  const response=await realFetch(`http://127.0.0.1:${server.address().port}/delivery/groups`);
  assert.equal(response.status,401);
});
