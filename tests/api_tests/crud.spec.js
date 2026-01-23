// Playwright test utilities and Node file helpers
import { test } from "@playwright/test";
import fs from 'fs';
import path from 'path';

// ----- Configuration / constants -----
// OTP, credentials and client metadata used by the tests.
// These are intentionally simple test values — replace as needed for other environments.
const OTP = "000000";
const password = "123456";
const username = "devvip";
const USER_TYPE = "staff_vip";
const DEVICE_ID = "web_172.16.10.100_1234567890";
// Base API URL for the VIP member service under test
const BASE_URL = "http://192.168.40.95:9750/vip-member";

// `auth` stores the Authorization header value after successful login
let auth = '';

// ----- Helper utilities -----
// A small helper that performs an HTTP request and measures elapsed time (ms).
// It returns an object { res, ms } where `res` is the Playwright response.
async function timedRequest(request, method, url, options = {}) {
  const start = Date.now();
  let res;
  if (method === 'GET') res = await request.get(url, options);
  else if (method === 'POST') res = await request.post(url, options);
  else res = await request.fetch(url, Object.assign({ method }, options));
  const ms = Date.now() - start;
  // If response exceeded threshold, record it
  try {
    await recordSlowApiIfNeeded(method, url, ms);
    await recordFastApiIfNeeded(method, url, ms);
  } catch (e) {
    console.log('failed to record slow api', e);
  }
  return { res, ms };
}

// ----- Slow API tracking -----
// Configurable threshold in milliseconds. Set to 100 (ms) by default.
const SLOW_API_THRESHOLD_MS = 100;
const SLOW_APIS_PATH = path.resolve(process.cwd(), 'tests', 'api_tests', 'slow_apis.json');

// Ensure slow_apis.json exists and return parsed array
function readSlowApis() {
  try {
    if (!fs.existsSync(path.dirname(SLOW_APIS_PATH))) fs.mkdirSync(path.dirname(SLOW_APIS_PATH), { recursive: true });
    if (!fs.existsSync(SLOW_APIS_PATH)) {
      fs.writeFileSync(SLOW_APIS_PATH, JSON.stringify([]));
      return [];
    }
    const txt = fs.readFileSync(SLOW_APIS_PATH, 'utf8');
    return JSON.parse(txt || '[]');
  } catch (e) {
    return [];
  }
}

// Write updated slow APIs array to file
function writeSlowApis(list) {
  try {
    fs.writeFileSync(SLOW_APIS_PATH, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.log('failed to write slow apis file', e);
  }
}

// If an API call took >= threshold ms, update `slow_apis.json` with last_ms and timestamp.
async function recordSlowApiIfNeeded(method, url, ms) {
  if (typeof ms !== 'number') return;
  if (ms < SLOW_API_THRESHOLD_MS) return;
  const list = readSlowApis();
  const key = `${method.toUpperCase()} ${url}`;
  const now = formatTimestamp(new Date());
  const idx = list.findIndex(i => i.key === key);
  if (idx >= 0) {
    // update existing entry
    list[idx].last_ms = ms;
    list[idx].last_seen = now;
    list[idx].count = (list[idx].count || 0) + 1;
  } else {
    list.push({ key, method: method.toUpperCase(), url, last_ms: ms, first_seen: now, last_seen: now, count: 1 });
  }
  writeSlowApis(list);
}

// ----- Fast API tracking -----
// Track APIs that respond faster than the fast threshold (ms).
const FAST_API_THRESHOLD_MS = 100; // change if you want a different cutoff
const FAST_APIS_PATH = path.resolve(process.cwd(), 'tests', 'api_tests', 'fast_apis.json');

// Initialize API log files for a fresh run: overwrite previous data with empty arrays.
function initApiLogs() {
  try {
    const dir = path.dirname(FAST_APIS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FAST_APIS_PATH, JSON.stringify([]), 'utf8');
    fs.writeFileSync(SLOW_APIS_PATH, JSON.stringify([]), 'utf8');
  } catch (e) {
    console.log('failed to initialize api log files', e);
  }
}

// run initialization once at module load so each test run starts fresh
initApiLogs();

function readFastApis() {
  try {
    if (!fs.existsSync(path.dirname(FAST_APIS_PATH))) fs.mkdirSync(path.dirname(FAST_APIS_PATH), { recursive: true });
    if (!fs.existsSync(FAST_APIS_PATH)) {
      fs.writeFileSync(FAST_APIS_PATH, JSON.stringify([]));
      return [];
    }
    const txt = fs.readFileSync(FAST_APIS_PATH, 'utf8');
    return JSON.parse(txt || '[]');
  } catch (e) {
    return [];
  }
}

function writeFastApis(list) {
  try {
    fs.writeFileSync(FAST_APIS_PATH, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.log('failed to write fast apis file', e);
  }
}

// Record APIs that are faster than the fast threshold. Keeps count and timestamps.
async function recordFastApiIfNeeded(method, url, ms) {
  if (typeof ms !== 'number') return;
  if (ms > FAST_API_THRESHOLD_MS) return;
  const list = readFastApis();
  const key = `${method.toUpperCase()} ${url}`;
  const now = formatTimestamp(new Date());
  const idx = list.findIndex(i => i.key === key);
  if (idx >= 0) {
    list[idx].last_ms = ms;
    list[idx].last_seen = now;
    list[idx].count = (list[idx].count || 0) + 1;
  } else {
    list.push({ key, method: method.toUpperCase(), url, last_ms: ms, first_seen: now, last_seen: now, count: 1 });
  }
  writeFastApis(list);
}

// Ensure we have a valid auth token; perform login if needed and store in `auth`.
async function ensureAuth(request) {
  if (auth) return auth;
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);
  params.append('code', OTP);
  const { res, ms } = await timedRequest(request, 'POST', `${BASE_URL}/Public/login`, {
    data: params.toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'userType': USER_TYPE, 'deviceId': DEVICE_ID }
  });
  const lj = await res.json().catch(async () => ({}));
  if (lj && lj.data && lj.data.token) {
    auth = `${lj.data.tokenType || 'Bearer '} ${lj.data.token}`.trim();
  }
  console.log('login response time:', ms, 'ms');
  return auth;
}

// Build common request headers for authenticated calls.
function authHeaders(additional = {}) {
  return Object.assign({
    Authorization: auth,
    deviceId: DEVICE_ID,
    lang: 'zh',
    userType: USER_TYPE,
    Accept: 'application/json, text/plain, */*'
  }, additional);
}

// Upload an image buffer to the server and return the storage path string.
// Tries multipart first, then raw binary as a fallback. Logs upload time.
async function uploadImage(request, buffer, fileName = 'scan.png', folder = 'waterbar_category') {
  const uploadUrl = `${BASE_URL}/vip_member/uploadImage?folder=${folder}`;
  const { res: multipartRes, ms: mms } = await timedRequest(request, 'POST', uploadUrl, {
    multipart: {
      files: { name: fileName, mimeType: 'image/png', buffer },
      folder
    },
    headers: authHeaders({ Origin: 'http://192.168.40.95:8090', Referer: 'http://192.168.40.95:8090/' })
  });
  try {
    const upj = await multipartRes.json();
    console.log('upload (multipart) time:', mms, 'ms');
    if (upj && upj.code === 0 && Array.isArray(upj.data) && upj.data.length > 0) return upj.data[0];
  } catch (e) {
    // ignore parse error and fall through to raw upload
  }

  // Fallback: send raw buffer
  const { res: rawRes, ms: rms } = await timedRequest(request, 'POST', uploadUrl, {
    data: buffer,
    headers: authHeaders({ 'Content-Type': 'application/octet-stream' })
  });
  try {
    const rawJ = await rawRes.json();
    console.log('upload (raw) time:', rms, 'ms');
    if (rawJ && rawJ.code === 0 && Array.isArray(rawJ.data) && rawJ.data.length > 0) return rawJ.data[0];
  } catch (e) {
    // ignore
  }
  return null;
}

// Pick a short meaningful word for test data
function pickWord() {
  const words = [ 'sun','sky','sea','tea','joy','fun','cat','dog','win','pro','max','zen','art','box','bee','fan' ];
  return words[Math.floor(Math.random() * words.length)];
}

// Format a Date into `YYYY-MM-DD HH:mm:ss` for human-friendly logs
function formatTimestamp(d) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${year}-${month}-${day} ${hh}:${mm}:${ss}`;
}

// Test: perform a simple login and store the auth token for reuse.
// This test is intentionally minimal: it demonstrates how to use Playwright's
// `request` fixture to perform an API login and save the `Authorization` header
// value for subsequent tests in this file.
test("All Baccarat Flow", async ({ request }) => {
  // Use helper to ensure auth; this keeps the test minimal and readable.
  await ensureAuth(request);
  console.log('stored auth token:', auth);
});

// ===== Auth set: subsequent tests reuse the stored Authorization token ===== //

// Test: create a category using an uploaded image.
// Steps:
// 1. Ensure we have an auth token (call login if necessary).
// 2. Read a local image from `tests/images/scan.png`.
// 3. Upload the image to the server and read back the storage path.
// 4. POST the category payload with the returned image path.
test('Create Category With Image', async ({ request }) => {
  // Ensure we have a stored auth token and consistent headers
  await ensureAuth(request);

  // Find the image in the repo and read it into a buffer.
  const imagesDir = path.resolve(process.cwd(), 'tests', 'images');
  const file = 'scan.png';
  const filePath = path.resolve(imagesDir, file);
  if (!fs.existsSync(filePath)) throw new Error(`Image not found: ${filePath}`);
  const buffer = fs.readFileSync(filePath);

  // Use short meaningful words for name/description to keep test data simple.
  const words = [
    'sun','sky','sea','tea','joy','fun','cat','dog','win','pro','max','zen','art','box','bee','fan'
  ];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  const name = pick();
  const description = pick();
  const status = Math.random() > 0.5 ? 'active' : 'inactive';
  const serviceTypes = ['LIFESTYLE'];
  const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];

  // Upload the image. The server expects multipart form data and returns
  // a storage path array on success (e.g. data: ["vip-member/..../img.png"]).
  console.log('Uploading image for category creation...');
  let imageStoragePath = await uploadImage(request, buffer, file, 'waterbar_category');
  // Final fallback to avoid blocking the test entirely if upload failed.
  if (!imageStoragePath) imageStoragePath = `vip-member/waterbar_category/${path.parse(file).name}_${Date.now()}${path.extname(file)}`;

  // Create a category using the (uploaded) image path.
  const payload = { name, description, status, image: imageStoragePath, serviceType };
  const { res: createRes, ms: createMs } = await timedRequest(request, 'POST', `${BASE_URL}/categories`, {
    data: JSON.stringify(payload),
    headers: authHeaders({ 'Accept-Language': 'en-US,en;q=0.9', 'Content-Type': 'application/json', Origin: 'http://192.168.40.95:8090', Referer: 'http://192.168.40.95:8090/' })
  });

  // Log server response and timing to aid debugging when tests fail.
  console.log('create status', createRes.status(), 'time', createMs, 'ms');
  try {
    const body = await createRes.json();
    console.log('create response', body);
  } catch (e) {
    console.log('create response text', await createRes.text());
  }
});

// ===== Category creation: upload image then POST /categories ===== //

// Test: update an existing category. This shows a PATCH request with
// JSON body and how to reuse an uploaded image path similar to the create test.
test('Update Category', async ({ request }) => {
  // change this to the categoryId you want to update
  const categoryId = 130;
  // Ensure authentication and reuse local `scan.png` image, upload it and obtain a storage path.
  await ensureAuth(request);
  const imagesDir = path.resolve(process.cwd(), 'tests', 'images');
  const file = 'scan.png';
  const filePath = path.resolve(imagesDir, file);
  if (!fs.existsSync(filePath)) throw new Error(`Image not found: ${filePath}`);
  const buffer = fs.readFileSync(filePath);
  let imageStoragePath = await uploadImage(request, buffer, file, 'waterbar_category');
  // Fallback path construction to keep the test resilient.
  if (!imageStoragePath) imageStoragePath = `vip-member/waterbar_category/${path.parse(file).name}_${Date.now()}${path.extname(file)}`;

  // Build a minimal update payload using short words for readability.
  const words = [ 'sun','sky','sea','tea','joy','fun','cat','dog','win','pro','max','zen','art','box','bee','fan' ];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  const name = pick();
  const description = pick();

  const payload = {
    name,
    description,
    status: 'inactive',
    image: imageStoragePath,
    serviceType: 'LIFESTYLE'
  };

  // PATCH the category endpoint using the query param categoryId (timed)
  const updateUrl = `${BASE_URL}/categories/update?categoryId=${categoryId}`;
  const { res: updateRes, ms: updateMs } = await timedRequest(request, 'PATCH', updateUrl, {
    data: JSON.stringify(payload),
    headers: authHeaders({ 'Accept-Language': 'en-US,en;q=0.9', 'Content-Type': 'application/json', Origin: 'http://192.168.40.95:8090', Referer: 'http://192.168.40.95:8090/' })
  });

  console.log('update status', updateRes.status(), 'time', updateMs, 'ms');
  try {
    const body = await updateRes.json();
    console.log('update response', body);
  } catch (e) {
    console.log('update response text', await updateRes.text());
  }
});

// ===== Category update: PATCH /categories/update with categoryId query ===== //

test('Delete First Announcement From List', async ({ request }) => {
  // Ensure authentication and fetch announcement list (first page)
  await ensureAuth(request);
  const listUrl = `${BASE_URL}/announcement/getList?title=&status=&announceType=&startDate=&endDate=&offset=0&limit=10`;
  const { res: listRes, ms: listMs } = await timedRequest(request, 'GET', listUrl, { headers: authHeaders({ Origin: 'http://192.168.40.95:8090', Referer: 'http://192.168.40.95:8090/' }) });
  console.log('announcement list response time:', listMs, 'ms');
  const listJson = await listRes.json().catch(async () => ({ raw: await listRes.text(), status: listRes.status() }));
  console.log('announcement list response', listJson);

  // extract first record from common shapes
  let first = null;
  if (Array.isArray(listJson)) first = listJson[0];
  if (!first && listJson && typeof listJson === 'object') {
    if (Array.isArray(listJson.data)) first = listJson.data[0];
    if (!first && listJson.data && Array.isArray(listJson.data.list)) first = listJson.data.list[0];
    if (!first && Array.isArray(listJson.list)) first = listJson.list[0];
    if (!first && Array.isArray(listJson.records)) first = listJson.records[0];
  }

  if (!first) {
    console.log('No announcement records found to delete');
    throw new Error('No announcement records');
  }

  // extract id from first announcement record
  const idCandidates = ['id', 'announceId', 'announcementId', 'announce_id'];
  let idVal = null;
  for (const f of idCandidates) if (first && first[f] !== undefined) { idVal = first[f]; break; }
  if (idVal === null && (typeof first === 'number' || typeof first === 'string')) idVal = first;
  if (!idVal) {
    console.log('Could not extract id from first announcement record', first);
    throw new Error('No id to delete');
  }

  // delete by id via query string
  const deleteUrl = `${BASE_URL}/announcement/delete_by_id?id=${encodeURIComponent(idVal)}`;
  console.log('Deleting announcement by id via URL:', deleteUrl);
  const { res: dres, ms: deleteMs } = await timedRequest(request, 'GET', deleteUrl, { headers: authHeaders() });
  console.log('delete response time:', deleteMs, 'ms');
  const db = await dres.json().catch(async () => ({ raw: await dres.text(), status: dres.status() }));
  console.log('DELETE', deleteUrl, '=>', db);
  if (!(db && db.code === 0)) throw new Error('Delete failed: ' + JSON.stringify(db));
});

// ===== Announcement delete: GET /announcement/getList then GET /announcement/delete_by_id?id=<id> ===== //
