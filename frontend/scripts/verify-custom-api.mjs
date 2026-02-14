import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'frontend/.env.local') });

async function verifyCustomApi() {
  const CUSTOM_API_BASE = process.env.CUSTOM_API_BASE_URL;
  const CUSTOM_API_KEY = process.env.CUSTOM_API_KEY;

  if (!CUSTOM_API_BASE || !CUSTOM_API_KEY) {
    console.error('❌ Missing CUSTOM_API_BASE_URL or CUSTOM_API_KEY in .env.local');
    process.exit(1);
  }

  console.log('✅ Found Custom API Config:');
  console.log('   Base:', CUSTOM_API_BASE);
  console.log('   Key:', CUSTOM_API_KEY.slice(0, 10) + '...');

  // 1. Verify Video Generation Endpoint
  console.log('\nTesting /v1/video/generations (Veo)...');
  try {
    const res = await fetch(`${CUSTOM_API_BASE}/v1/video/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CUSTOM_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'veo-3.1-fast-generate-preview',
        prompt: 'A cyberpunk city with flying cars, neon lights, rain',
      }),
    });

    if (res.ok) {
      const json = await res.json();
      console.log('✅ Video Request Succeeded:', json);
    } else {
      const text = await res.text();
      console.error('❌ Video Request Failed:', res.status, text);
      // It might fail if model name is wrong or quota etc, but we verify response.
    }
  } catch (e) {
    console.error('❌ Video Check Error:', e.message);
  }

  // 2. Verify Image Generation Endpoint
  console.log('\nTesting /v1/images/generations (Imagen)...');
  try {
    const res = await fetch(`${CUSTOM_API_BASE}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CUSTOM_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'imagen-4.0-fast-generate-001',
        prompt: 'A futuristic electric car',
        size: '1024x1024'
      }),
    });

    if (res.ok) {
      const json = await res.json();
      console.log('✅ Image Request Succeeded:', json);
    } else {
      const text = await res.text();
      console.error('❌ Image Request Failed:', res.status, text);
    }
  } catch (e) {
    console.error('❌ Image Check Error:', e.message);
  }
}

verifyCustomApi();
