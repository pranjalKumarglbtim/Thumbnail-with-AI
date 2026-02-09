import { ThumbnailConfig } from '../types';

// Hugging Face API configuration
const HF_API_URL = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0';

// Interface for generated thumbnail result
export interface GeneratedImageResult {
  url: string;
  blob?: Blob;
}

/**
 * Generate a thumbnail image using Hugging Face Stable Diffusion
 * 
 * @param prompt - The text prompt describing the thumbnail
 * @param config - Thumbnail configuration settings
 * @returns Promise with the generated image URL or blob
 */
export const generateThumbnail = async (
  prompt: string,
  config: ThumbnailConfig
): Promise<GeneratedImageResult> => {
  const apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;

  if (!apiKey) {
    throw new Error('Hugging Face API key is not set. Please add VITE_HUGGINGFACE_API_KEY to your .env file.');
  }

  // Build the full prompt based on config
  const fullPrompt = buildPrompt(prompt, config);

  try {
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: {
          width: getWidthFromAspectRatio(config.aspectRatio),
          height: getHeightFromAspectRatio(config.aspectRatio),
          num_inference_steps: config.quality === 'pro' ? 50 : 30,
          guidance_scale: 7.5,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Handle "Model is loading" error
      if (errorData.error?.includes('loading')) {
        // Wait and retry (model is cold starting)
        await new Promise(resolve => setTimeout(resolve, 5000));
        return generateThumbnail(prompt, config);
      }
      
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to generate image`);
    }

    // Get the image as a blob
    const blob = await response.blob();
    
    // Convert blob to base64 data URL
    const base64Data = await blobToBase64(blob);
    
    return {
      url: base64Data,
      blob: blob,
    };
  } catch (error: any) {
    console.error('Hugging Face API Error:', error);
    throw new Error(error.message || 'Failed to generate thumbnail');
  }
};

/**
 * Build a detailed prompt from user input and configuration
 */
const buildPrompt = (userPrompt: string, config: ThumbnailConfig): string => {
  const stylePrompts: Record<string, string> = {
    'viral-hype': 'MrBeast style viral thumbnail, high saturation, exaggerated facial features, vibrant background with radial sunburst, massive bold text',
    'neon-gaming': 'Professional gaming thumbnail, dark moody atmosphere, cyan and magenta rim lighting, geometric neon overlays, tech-style bold typography',
    'tech-clean': 'Apple-style minimalist tech thumbnail, clean soft lighting, blurred background, elegant typography, premium sophisticated feel',
    'cinematic-story': 'Cinematic documentary style, dramatic shadows, warm film grain, serif classic typography, emotional lighting, high dynamic range',
  };

  const stylePrompt = stylePrompts[config.presetId || 'viral-hype'] || stylePrompts['viral-hype'];

  // Combine user prompt with style and configuration
  const fullPrompt = `
    ${userPrompt}
    
    Style: ${stylePrompt}
    Text overlay: "${config.overlayText}"
    Background: ${config.backgroundDetails}
    Character action: ${config.characterAction}
    Facial expression: ${config.facialExpression}
    Text style: ${config.textStyle.replace('-', ' ')}
    
    High quality, detailed, viral YouTube thumbnail, professional photography style, high contrast, attention-grabbing, 4K quality
  `.trim();

  return fullPrompt;
};

/**
 * Get width from aspect ratio
 */
const getWidthFromAspectRatio = (ratio: string): number => {
  switch (ratio) {
    case '16:9': return 1024;
    case '9:16': return 576;
    case '1:1': return 1024;
    default: return 1024;
  }
};

/**
 * Get height from aspect ratio
 */
const getHeightFromAspectRatio = (ratio: string): number => {
  switch (ratio) {
    case '16:9': return 576;
    case '9:16': return 1024;
    case '1:1': return 1024;
    default: return 576;
  }
};

/**
 * Convert Blob to Base64 data URL
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Query available models from Hugging Face
 */
export const getAvailableModels = async (): Promise<string[]> => {
  const apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    throw new Error('Hugging Face API key is not set');
  }

  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/status?pipeline_tag=text-to-image',
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }

    const models = await response.json();
    return models.map((m: any) => m.id);
  } catch (error) {
    console.error('Error fetching models:', error);
    // Return default models
    return [
      'stabilityai/stable-diffusion-xl-base-1.0',
      'runwayml/stable-diffusion-v1-5',
      'stabilityai/stable-diffusion-2-1',
    ];
  }
};
