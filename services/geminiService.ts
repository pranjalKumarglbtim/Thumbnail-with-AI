import { GoogleGenAI } from "@google/genai";
import { ThumbnailConfig, TextStyle } from "../types";

const getTextStylePrompt = (style: TextStyle): string => {
  switch (style) {
    case 'impact-3d':
      return "rendered as massive, chunky 3D block letters with a glossy plastic texture, thick black outlines, and a sharp perspective tilt towards the viewer.";
    case 'neon-glow':
      return "designed as glowing futuristic glass neon tubes with intense light bloom, flickering electricity effects, and vibrant color gradients.";
    case 'comic-distressed':
      return "hand-drawn comic book font with halftone dot patterns, rough ink-bleed edges, and explosive starburst backing shapes.";
    case 'minimal-modern':
      return "ultra-clean, high-end sans-serif typography with generous kerning, subtle soft shadows, and a premium matte finish.";
    case 'horror-dripping':
      return "gruesome, jagged, dripping-blood style typography with grungy stone textures and long, creepy cast shadows.";
    case 'luxury-gold':
      return "exquisite 24-karat polished gold 3D lettering with sharp diamond-cut bevels, realistic ray-traced reflections, and sparkling light glints.";
    default:
      return "bold, high-impact YouTube typography.";
  }
};

export const generateThumbnail = async (
  base64Image: string,
  config: ThumbnailConfig
): Promise<string> => {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  
  if (!apiKey) {
    throw new Error("Google API key is not set. Please add VITE_GOOGLE_API_KEY to your .env file.");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  
  const isPro = config.quality === 'pro';
  const modelName = isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
  const textStyleDescription = getTextStylePrompt(config.textStyle);
  
  let prompt = "";

  if (config.isEditMode) {
    const selectionContext = config.selectionArea 
      ? `Specifically modify the region within these relative bounds: x=${config.selectionArea.x}%, y=${config.selectionArea.y}%, width=${config.selectionArea.width}%, height=${config.selectionArea.height}%.`
      : "";

    prompt = `
      CRITICAL INSTRUCTION: You are EDITING an existing thumbnail design. 
      The provided image is a PREVIOUS DRAFT.
      
      MODIFICATION REQUEST: ${config.editInstruction || 'Refine the overall quality and polish.'}
      ${selectionContext}
      
      CORE REQUIREMENTS:
      1. INTEGRATION: Seamlessly add or change elements as requested while maintaining the artistic style of the existing design.
      2. SUBJECT: Preserve the exact identity and likeness of the person in the design.
      3. TEXT: Ensure the text "${config.overlayText}" remains clearly legible in a ${textStyleDescription} style.
      4. EVOLUTION: Do not start from scratch. Evolve the existing image based on the modification request.
    `;
  } else {
    prompt = `
      CRITICAL INSTRUCTION: You MUST preserve the EXACT identity and facial features of the person in the provided photo.
      
      TASK: Create a professional viral YouTube thumbnail.
      
      SCENE DETAILS:
      - THE PERSON: Place the subject from the photo as the central hero. Their expression must be ${config.facialExpression}. Their action/pose must be ${config.characterAction}. Apply professional studio rim lighting.
      - THE WORLD: The environment is ${config.backgroundDetails}. Use cinematic atmospheric effects.
      - THE TEXT: Overlay the massive headline "${config.overlayText}" in a ${textStyleDescription} style.
      
      ARTISTIC VIBE: Follow the "${config.style}" aesthetic with high-contrast color grading.
    `;
  }

  try {
    const generationConfig: any = {
      imageConfig: {
        aspectRatio: config.aspectRatio,
      },
    };

    if (isPro) {
      generationConfig.imageConfig.imageSize = config.imageSize;
      if (config.useSearch) {
        generationConfig.tools = [{ googleSearch: {} }];
      }
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1],
              mimeType: 'image/png',
            },
          },
          { text: prompt },
        ],
      },
      config: generationConfig,
    });

    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error("The AI engine failed to return a design.");

    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data received.");
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw error;
  }
};
