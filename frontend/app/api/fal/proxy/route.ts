import { route as falRoute } from '@fal-ai/server-proxy/nextjs';
import { handleCustomProxy, isCustomApiTarget } from '@/server/custom-ai-adapter';
import { type NextRequest } from 'next/server';

export const runtime = 'nodejs';

const apiKey = process.env.FAL_KEY ?? process.env.FAL_API_KEY;
// Check strictly if FAL_KEY is missing ONLY if we are NOT using custom API for everything.
// But we might want to allow start without FAL_KEY if CUSTOM_API_KEY is set.
if (!apiKey && !process.env.CUSTOM_API_KEY) {
  throw new Error('Missing FAL API key. Set FAL_KEY or FAL_API_KEY in your environment.');
}

// Wrapper to intercept requests
const handler = async (req: NextRequest, _ctx: { params: { path?: string[] } }) => {
  // Extract model ID from path (e.g., /api/fal/proxy/fal-ai/veo3.1/fast)
  
  const url = new URL(req.url);
  // We need to extract 'fal-ai/...' from the URL.
  
  const pathPart = url.pathname.replace('/api/fal/proxy/', '');
  // normalize
  const modelId = pathPart.replace(/^\/+/, '');

  if (isCustomApiTarget(modelId)) {
    return handleCustomProxy(req, modelId);
  }

  // Fallback to original Fal handler
  if (req.method === 'GET') return falRoute.GET(req);
  if (req.method === 'POST') return falRoute.POST(req);
  if (req.method === 'PUT') return falRoute.PUT(req);
  return new Response('Method not allowed', { status: 405 });
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;


