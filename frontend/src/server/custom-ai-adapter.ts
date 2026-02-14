import { NextResponse } from 'next/server';

// Configuration
const CUSTOM_API_BASE = process.env.CUSTOM_API_BASE_URL || 'https://api.llmhub.com.cn';
const CUSTOM_API_KEY = process.env.CUSTOM_API_KEY;

// Model Mapping (Fal ID -> Custom API Model ID)
// Model Mapping (Fal ID -> Custom API Model ID)
// Custom Models provided: 
// Video: sora-2, sora-2-pro, veo-3.1-generate-preview, veo-3.1-fast-generate-preview, doubao-seedance-1.5-pro, wan2.6-t2v
// Image: gpt-image-1.5, gpt-image-1, gpt-image-1-mini, gemini-3-pro-image-preview, gemini-2.5-flash-image, 
//        imagen-4.0-ultra-generate-001, imagen-4.0-generate-001, imagen-4.0-fast-generate-001, 
//        doubao-seedream-4.5, qwen-image-max, wan2.6-t2i

const MODEL_MAP: Record<string, string> = {
  // --- Video Generation ---
  
  // Google Veo
  'fal-ai/veo3.1': 'veo-3.1-generate-preview',
  'fal-ai/veo3.1/fast': 'veo-3.1-fast-generate-preview',
  'fal-ai/veo3.1/first-last-frame-to-video': 'veo-3.1-generate-preview',
  'fal-ai/veo3.1/fast/first-last-frame-to-video': 'veo-3.1-fast-generate-preview',

  // OpenAI Sora
  'fal-ai/sora-2/text-to-video': 'sora-2',
  'fal-ai/sora-2/image-to-video': 'sora-2',
  'fal-ai/sora-2/text-to-video/pro': 'sora-2-pro',
  'fal-ai/sora-2/image-to-video/pro': 'sora-2-pro',

  // Wan (Aliyun)
  // Fal uses wan-25-preview, mapping to user's wan2.6-t2v
  'fal-ai/wan-25-preview/text-to-video': 'wan2.6-t2v',
  'fal-ai/wan-25-preview/image-to-video': 'wan2.6-t2v',

  // Doubao (ByteDance)
  // Fal uses seedance/v1.5/pro, mapping to user's doubao-seedance-1.5-pro
  'fal-ai/bytedance/seedance/v1.5/pro/text-to-video': 'doubao-seedance-1.5-pro',
  'fal-ai/bytedance/seedance/v1.5/pro/image-to-video': 'doubao-seedance-1.5-pro',

  // --- Image Generation ---
  
  // Mapping Flux/Recraft/Ideogram to user's Image models
  
  // Flux Pro -> Imagen 4.0 Ultra (High quality)
  'fal-ai/flux-pro/v1.1': 'imagen-4.0-ultra-generate-001',
  'fal-ai/flux-pro': 'imagen-4.0-ultra-generate-001',
  
  // Flux Dev/Schnell -> Imagen 4.0 Fast
  'fal-ai/flux/dev': 'imagen-4.0-fast-generate-001',
  'fal-ai/flux/schnell': 'imagen-4.0-fast-generate-001',
  
  // Recraft -> Gemini 3 Pro (Creative/High adherence)
  'fal-ai/recraft-v3': 'gemini-3-pro-image-preview',
  
  // Ideogram -> GPT Image 1.5 (Text rendering capacity)
  'fal-ai/ideogram/v2': 'gpt-image-1.5',
  'fal-ai/ideogram/v2/turbo': 'gpt-image-1-mini',

  // Fallbacks / Generic
  'fal-ai/stable-diffusion-v3-medium': 'imagen-4.0-generate-001',
};

// Check if we should intercept this request
export function isCustomApiTarget(modelId: string): boolean {
  return !!CUSTOM_API_KEY && (modelId in MODEL_MAP || Object.values(MODEL_MAP).includes(modelId));
}

export async function handleCustomProxy(req: Request, modelId: string) {
  if (req.method === 'POST') {
    return handleSubmit(req, modelId);
  } else if (req.method === 'GET') {
    return handleStatus(req, modelId);
  }
  return NextResponse.json({ error: 'Method not supported' }, { status: 405 });
}

async function handleSubmit(req: Request, falModelId: string) {
  try {
    const body = await req.json();
    const targetModel = MODEL_MAP[falModelId] || falModelId;

    console.log(`[CustomAdapter] Forwarding ${falModelId} -> ${targetModel}`);
    
    // Choose endpoint based on model type
    // Video models usually go to /v1/video/generations per usage context
    // Image models go to /v1/images/generations
    const isVideo = targetModel.includes('veo') || targetModel.includes('video') || falModelId.includes('video');
    const endpoint = isVideo ? '/v1/video/generations' : '/v1/images/generations';

    const payload: Record<string, unknown> = {
      model: targetModel,
      ...body,
    };

    const response = await fetch(`${CUSTOM_API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CUSTOM_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CustomAdapter] Submit failed:', response.status, errorText);
      return NextResponse.json({ error: `Upstream error: ${errorText}` }, { status: response.status });
    }

    const json = await response.json();
    const requestId = json.id || json.task_id || json.request_id;
    
    return NextResponse.json({
      request_id: requestId,
      status: 'IN_QUEUE',
      _custom_model: targetModel,
    });

  } catch (error) {
    console.error('[CustomAdapter] Error:', error);
    return NextResponse.json({ error: 'Internal Adapter Error' }, { status: 500 });
  }
}

async function handleStatus(req: Request, _falModelId: string) {
  const url = new URL(req.url);
  const requestId = url.searchParams.get('request_id');
  
  if (!requestId) {
    return NextResponse.json({ error: 'Missing request_id' }, { status: 400 });
  }

  try {
    // Poll endpoints
    // If it was a video task, it might be /v1/video/generations/{id}
    // If image, /v1/images/generations/{id} ? Or maybe it returns immediately?
    // NewAPI often returns images immediately for /v1/images/generations if synchronous.
    // usage context: Fal client polls.
    
    // We try generic endpoint, or try to infer from ID?
    // Let's assume /v1/video/generations/{id} for now since user prioritized video.
    // If it fails, maybe try generic /v1/task/{id}?
    
    const endpoint = `/v1/video/generations/${requestId}`; 

    const response = await fetch(`${CUSTOM_API_BASE}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CUSTOM_API_KEY}`,
      },
    });

    if (!response.ok) {
       // If 404, might be an image task that shouldn't be polled?
       // But Fal client polls, so we must return something.
       return NextResponse.json({ status: 'IN_PROGRESS' });
    }

    const json = await response.json();
    
    let status = 'IN_PROGRESS';
    let videoUrl = null;
    
    const taskStatus = (json.task_status || json.status || '').toUpperCase();
    
    if (taskStatus === 'SUCCEEDED' || taskStatus === 'SUCCESS') {
      status = 'COMPLETED';
      const output = json.output || json.data?.[0];
      if (typeof output?.url === 'string') videoUrl = output.url;
      else if (typeof output?.video_url === 'string') videoUrl = output.video_url;
      else if (Array.isArray(output?.video)) videoUrl = output.video[0]?.url;
    } else if (taskStatus === 'FAILED') {
      status = 'FAILED';
    }

    const falResponse = {
      request_id: requestId,
      status: status,
      response: status === 'COMPLETED' ? {
        video: {
          url: videoUrl,
          content_type: 'video/mp4', 
        }
      } : undefined
    };

    return NextResponse.json(falResponse);

  } catch (error) {
    console.error('[CustomAdapter] Poll Error:', error);
    return NextResponse.json({ status: 'IN_PROGRESS' }); 
  }
}

