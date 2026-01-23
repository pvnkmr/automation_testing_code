import { test } from "@playwright/test";
import fs from 'fs';
import path from 'path';

const OTP = "000000";
const password = "123456";
const username = "devvip";
const USER_TYPE = "staff_vip";
const DEVICE_ID = "web_172.16.10.100_1234567890";
const BASE_URL = "http://192.168.40.95:9750/vip-member";
let auth = '';

test("All Baccarat Flow", async ({ request }) => {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);
  params.append('code', OTP);
 
  const response = await request.post(`${BASE_URL}/Public/login`, {
    data: params.toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'userType': USER_TYPE, 'deviceId': DEVICE_ID }
  });

  console.log('status', response.status());
  try {
    const json = await response.json();
    console.log('response json', json);
    if (json && json.data && json.data.token) {
      auth = `${json.data.tokenType || 'Bearer '} ${json.data.token}`.trim();
      console.log('stored auth token:', auth);
    }
    // Example of reusing the token for an authenticated request:
    // const me = await request.get(`${BASE_URL}/Protected/endpoint`, {
    //   headers: { Authorization: auth }
    // });
    // console.log('protected status', me.status());
  } catch (e) {
    const body = await response.text();
    console.log('response body', body);
  }
});

test('Create Category With Image', async ({ request }) => {
  if (!auth) {
    // perform login again if token not present
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    params.append('code', OTP);
    const login = await request.post(`${BASE_URL}/Public/login`, {
      data: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'userType': USER_TYPE, 'deviceId': DEVICE_ID }
    });
    const lj = await login.json();
    auth = `${lj.data.tokenType || 'Bearer '} ${lj.data.token}`.trim();
  }

  // use specific image `scan.png` from tests/images
  const imagesDir = path.resolve(process.cwd(), 'tests', 'images');
  const file = 'scan.png';
  const filePath = path.resolve(imagesDir, file);
  if (!fs.existsSync(filePath)) throw new Error(`Image not found: ${filePath}`);
  const buffer = fs.readFileSync(filePath);

  const words = [
    'sun','sky','sea','tea','joy','fun','cat','dog','win','pro','max','zen','art','box','bee','fan'
  ];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  const name = pick();
  const description = pick();
  const status = Math.random() > 0.5 ? 'active' : 'inactive';
  const serviceTypes = ['LIFESTYLE'];
  const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];

  // Some servers expect the image already uploaded and receive a JSON body
  // where `image` is the storage path (as in your curl). We'll mimic that:
  // - choose an image file from tests/images
  // - construct a server-storage-like path for `image`
  // upload the image to server first and use returned storage path
  console.log('Uploading image for category creation...');
  const uploadUrl = `${BASE_URL}/vip_member/uploadImage?folder=waterbar_category`;
  const uploadRes = await request.post(uploadUrl, {
    multipart: {
      files: { name: file, mimeType: 'image/png', buffer },
      folder: 'waterbar_category'
    },
    headers: {
      Authorization: auth,
      deviceId: DEVICE_ID,
      lang: 'zh',
      userType: USER_TYPE,
      Origin: 'http://192.168.40.95:8090',
      Referer: 'http://192.168.40.95:8090/'
    }
  });

  let imageStoragePath;
  try {
    const upj = await uploadRes.json();
    console.log('upload response', upj);
    if (upj && upj.code === 0 && Array.isArray(upj.data) && upj.data.length > 0) {
      imageStoragePath = upj.data[0];
    }
    // if upload returned non-success, try raw binary upload as fallback
    if (!imageStoragePath) {
      console.log('multipart upload did not return path; trying raw binary upload');
      const rawRes = await request.post(uploadUrl, {
        data: buffer,
        headers: {
          Authorization: auth,
          deviceId: DEVICE_ID,
          lang: 'zh',
          userType: USER_TYPE,
          'Content-Type': 'application/octet-stream'
        }
      });
      try {
        const rawJ = await rawRes.json();
        console.log('raw upload response', rawJ);
        if (rawJ && rawJ.code === 0 && Array.isArray(rawJ.data) && rawJ.data.length > 0) {
          imageStoragePath = rawJ.data[0];
        }
      } catch (e) {
        console.log('raw upload parse error', e);
      }
    }
  } catch (e) {
    console.log('upload parse error', e);
  }

  // fallback: construct a path if upload didn't return one (best-effort)
  if (!imageStoragePath) {
    imageStoragePath = `vip-member/waterbar_category/${path.parse(file).name}_${Date.now()}${path.extname(file)}`;
  }

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

  console.log('create status', res.status());
  try {
    const body = await res.json();
    console.log('create response', body);
  } catch (e) {
    console.log('create response text', await res.text());
  }
});

test('Update Category', async ({ request }) => {
  // change this to the categoryId you want to update
  const categoryId = 130;

  if (!auth) {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    params.append('code', OTP);
    const login = await request.post(`${BASE_URL}/Public/login`, {
      data: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'userType': USER_TYPE, 'deviceId': DEVICE_ID }
    });
    const lj = await login.json();
    auth = `${lj.data.tokenType || 'Bearer '} ${lj.data.token}`.trim();
  }

  // upload image and get storage path (reuse scan.png)
  const imagesDir = path.resolve(process.cwd(), 'tests', 'images');
  const file = 'scan.png';
  const filePath = path.resolve(imagesDir, file);
  if (!fs.existsSync(filePath)) throw new Error(`Image not found: ${filePath}`);
  const buffer = fs.readFileSync(filePath);

  const uploadUrl = `${BASE_URL}/vip_member/uploadImage?folder=waterbar_category`;
  const uploadRes = await request.post(uploadUrl, {
    multipart: {
      files: { name: file, mimeType: 'image/png', buffer },
      folder: 'waterbar_category'
    },
    headers: {
      Authorization: auth,
      deviceId: DEVICE_ID,
      lang: 'zh',
      userType: USER_TYPE
    }
  });

  let imageStoragePath;
  try {
    const upj = await uploadRes.json();
    console.log('upload response', upj);
    if (upj && upj.code === 0 && Array.isArray(upj.data) && upj.data.length > 0) imageStoragePath = upj.data[0];
  } catch (e) {
    console.log('upload parse error', e);
  }
  if (!imageStoragePath) imageStoragePath = `vip-member/waterbar_category/${path.parse(file).name}_${Date.now()}${path.extname(file)}`;

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
