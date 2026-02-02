
export type ThumbnailPreset = {
  id: string;
  name: string;
  description: string;
  icon: string;
  prompt: string;
};

export const PRESETS: ThumbnailPreset[] = [
  {
    id: 'mrbeast',
    name: 'Viral Hype',
    description: 'Bright colors, high contrast, dramatic expressions, and massive text.',
    icon: '🔥',
    prompt: 'MrBeast style viral thumbnail. High saturation, exaggerated facial features, vibrant background with radial sunburst, massive 3D impact font with thick black stroke.'
  },
  {
    id: 'gaming',
    name: 'Neon Gaming',
    description: 'Dark backgrounds with glowing neon accents and sharp edges.',
    icon: '🎮',
    prompt: 'Professional gaming thumbnail. Dark moody atmosphere, cyan and magenta rim lighting on the subject, geometric neon overlays, tech-style bold typography.'
  },
  {
    id: 'minimalist',
    name: 'Tech Clean',
    description: 'Elegant, spacious, high-quality photography vibe.',
    icon: '💻',
    prompt: 'Apple-style minimalist tech thumbnail. Clean soft lighting, blurred background, elegant thin typography, sophisticated color palette, premium feel.'
  },
  {
    id: 'documentary',
    name: 'Cinematic Story',
    description: 'Dramatic, film-like, storytelling with moody tones.',
    icon: '🎬',
    prompt: 'Cinematic documentary style. Dramatic shadows, warm film grain, serif classic typography, emotional lighting, high dynamic range.'
  }
];

export const SUGGESTED_BACKGROUNDS = [
  "Futuristic Cyberpunk City",
  "Abandoned Haunted Hospital",
  "Luxury Modern Mansion",
  "Volcanic Lava Landscape",
  "Deep Space Nebula",
  "Tropical Paradise Island",
  "Underwater Ruined City",
  "Ancient Forest Temple",
  "Post-Apocalyptic Street",
  "Professional Studio Setup"
];

export const SUGGESTED_ACTIONS = [
  "Shocked and pointing at camera",
  "Heroic pose with glowing eyes",
  "Thinking with a magnifying glass",
  "Holding a mysterious glowing object",
  "Running away in terror",
  "Meditating in a circle of light",
  "Sneaking around with a flashlight",
  "Celebrating with confetti everywhere"
];

export const SUGGESTED_EXPRESSIONS = [
  "Extremely Shocked (Mouth Open)",
  "Angry and Determined",
  "Joyful and Laughing",
  "Smug and Confident",
  "Terrified with wide eyes",
  "Focused and Serious",
  "Winking and Mischievous",
  "Crying or Sad"
];

export type TextStyle = 'impact-3d' | 'neon-glow' | 'comic-distressed' | 'minimal-modern' | 'horror-dripping' | 'luxury-gold';
export type ImageSize = '1K' | '2K' | '4K';

export interface SelectionArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ThumbnailConfig {
  style: string;
  overlayText: string;
  characterAction: string;
  backgroundDetails: string;
  facialExpression: string;
  textStyle: TextStyle;
  aspectRatio: '16:9' | '1:1' | '9:16';
  quality: 'flash' | 'pro';
  imageSize: ImageSize;
  useSearch: boolean;
  presetId?: string;
  isEditMode?: boolean;
  editInstruction?: string;
  selectionArea?: SelectionArea | null;
}

export interface GeneratedThumbnail {
  id: string;
  url: string;
  config: ThumbnailConfig;
  styleName: string;
  timestamp: number;
}
