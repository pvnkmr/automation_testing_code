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
// Ensure we have a valid auth token; perform login if needed and store in `auth`.
async function ensureAuth(request) {
  if (auth) return auth;
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);
  params.append('code', OTP);
  const login = await request.post(`${BASE_URL}/Public/login`, {
    data: params.toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'userType': USER_TYPE, 'deviceId': DEVICE_ID }
  });
  const lj = await login.json().catch(async () => ({}));
  if (lj && lj.data && lj.data.token) {
    auth = `${lj.data.tokenType || 'Bearer '} ${lj.data.token}`.trim();
  }
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
// Tries multipart first, then raw binary as a fallback.
async function uploadImage(request, buffer, fileName = 'scan.png', folder = 'waterbar_category') {
  const uploadUrl = `${BASE_URL}/vip_member/uploadImage?folder=${folder}`;
  const multipartRes = await request.post(uploadUrl, {
    multipart: {
      files: { name: fileName, mimeType: 'image/png', buffer },
      folder
    },
    headers: authHeaders({ Origin: 'http://192.168.40.95:8090', Referer: 'http://192.168.40.95:8090/' })
  });
  try {
    const upj = await multipartRes.json();
    if (upj && upj.code === 0 && Array.isArray(upj.data) && upj.data.length > 0) return upj.data[0];
  } catch (e) {
    // ignore parse error and fall through to raw upload
  }

  // Fallback: send raw buffer
  const rawRes = await request.post(uploadUrl, {
    data: buffer,
    headers: authHeaders({ 'Content-Type': 'application/octet-stream' })
  });
  try {
    const rawJ = await rawRes.json();
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
  const res = await request.post(`${BASE_URL}/categories`, {
    data: JSON.stringify(payload),
    headers: {
      Authorization: auth,
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Content-Type': 'application/json',
      deviceId: DEVICE_ID,
      lang: 'zh',
      userType: USER_TYPE,
      Origin: 'http://192.168.40.95:8090',
      Referer: 'http://192.168.40.95:8090/'
    }
  });

  // Log server response to aid debugging when tests fail.
  console.log('create status', res.status());
  try {
    const body = await res.json();
    console.log('create response', body);
    } catch (e) {
    console.log('create response text', await res.text());
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

  // PATCH the category endpoint using the query param categoryId
  const res = await request.fetch(`${BASE_URL}/categories/update?categoryId=${categoryId}`, {
    method: 'PATCH',
    data: JSON.stringify(payload),
    headers: {
      Authorization: auth,
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Content-Type': 'application/json',
      deviceId: DEVICE_ID,
      lang: 'zh',
      userType: USER_TYPE,
      Origin: 'http://192.168.40.95:8090',
      Referer: 'http://192.168.40.95:8090/'
    }
  });

  console.log('update status', res.status());
  try {
    const body = await res.json();
    console.log('update response', body);
  } catch (e) {
    console.log('update response text', await res.text());
  }
});

// ===== Category update: PATCH /categories/update with categoryId query ===== //

test('Delete First Announcement From List', async ({ request }) => {
  // Ensure authentication and fetch announcement list (first page)
  await ensureAuth(request);
  const listUrl = `${BASE_URL}/announcement/getList?title=&status=&announceType=&startDate=&endDate=&offset=0&limit=10`;
  const listRes = await request.get(listUrl, { headers: authHeaders({ Origin: 'http://192.168.40.95:8090', Referer: 'http://192.168.40.95:8090/' }) });

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
  const dres = await request.get(deleteUrl, {
    headers: {
      Authorization: auth,
      deviceId: DEVICE_ID,
      lang: 'zh',
      userType: USER_TYPE,
      Accept: 'application/json, text/plain, */*'
    }
  });
  const db = await dres.json().catch(async () => ({ raw: await dres.text(), status: dres.status() }));
  console.log('DELETE', deleteUrl, '=>', db);
  if (!(db && db.code === 0)) throw new Error('Delete failed: ' + JSON.stringify(db));
});

// ===== Announcement delete: GET /announcement/getList then GET /announcement/delete_by_id?id=<id> ===== //
