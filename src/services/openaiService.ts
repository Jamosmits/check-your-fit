import { readAsStringAsync } from 'expo-file-system/legacy';
import { ClothingItem } from '@/store/wardrobeStore';

export interface DetectedItem {
  category:    ClothingItem['category'];
  subcategory: string;
  colors:      string[];
  colorNames:  string[];
  styleTags:   string[];
  season:      string[];
  brand:       string | null;
  confidence:  number;
}

const WARDROBE_PROMPT = `Analyze this wardrobe/closet image. Identify every individual clothing item visible. For each item return a JSON array with: category (must be one of: tops/bottoms/dresses/outerwear/shoes/accessories), subcategory (specific Dutch name like "T-shirt", "Spijkerbroek", "Sneakers"), colors (array of hex codes, max 3), colorNames (Dutch color names), styleTags (array from: casual/sportief/zakelijk/elegant), season (array from: lente/zomer/herfst/winter), brand (if clearly visible else null), confidence (0.0-1.0 based on visibility). Return ONLY a valid JSON array, no markdown, no explanation.`;

const SINGLE_ITEM_PROMPT = `Analyze this single clothing item image. Return a JSON array with exactly one object containing: category (must be one of: tops/bottoms/dresses/outerwear/shoes/accessories), subcategory (specific Dutch name), colors (array of hex codes), colorNames (Dutch color names), styleTags (array from: casual/sportief/zakelijk/elegant), season (array from: lente/zomer/herfst/winter), brand (if visible else null), confidence (0.0-1.0). Return ONLY valid JSON array.`;

const MOCK_ITEMS: DetectedItem[] = [
  { category: 'tops',      subcategory: 'Gestreept overhemd', colors: ['#FFFFFF','#003399'], colorNames: ['Wit','Marineblauw'], styleTags: ['casual','zakelijk'], season: ['lente','zomer','herfst'], brand: null,       confidence: 0.92 },
  { category: 'bottoms',   subcategory: 'Slim-fit jeans',     colors: ['#1C3B5A'],           colorNames: ['Donkerblauw'],       styleTags: ['casual'],            season: ['lente','herfst','winter'],     brand: "Levi's",  confidence: 0.88 },
  { category: 'outerwear', subcategory: 'Wollen blazer',       colors: ['#2C2C2C'],           colorNames: ['Zwart'],             styleTags: ['zakelijk','elegant'],season: ['herfst','winter'],            brand: null,       confidence: 0.85 },
  { category: 'shoes',     subcategory: 'Leren chelsea boots', colors: ['#5C3317'],           colorNames: ['Cognac'],            styleTags: ['casual','zakelijk'], season: ['herfst','winter'],            brand: 'Vagabond', confidence: 0.91 },
  { category: 'tops',      subcategory: 'Witte T-shirt',       colors: ['#FFFFFF'],           colorNames: ['Wit'],               styleTags: ['casual','sportief'], season: ['lente','zomer'],              brand: 'Uniqlo',   confidence: 0.95 },
  { category: 'accessories',subcategory:'Leren riem',          colors: ['#2C1810'],           colorNames: ['Donkerbruin'],       styleTags: ['casual','zakelijk'], season: ['lente','zomer','herfst','winter'], brand: null, confidence: 0.78 },
];

async function toBase64(uri: string): Promise<string> {
  return readAsStringAsync(uri, { encoding: 'base64' });
}

function parseGptResponse(text: string): DetectedItem[] {
  // Strip markdown code fences if present
  const clean = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  const raw = JSON.parse(clean) as Array<Record<string, unknown>>;

  return raw.map((obj) => ({
    category:    (obj.category as ClothingItem['category']) ?? 'tops',
    subcategory: (obj.subcategory as string) ?? 'Kledingstuk',
    colors:      Array.isArray(obj.colors)    ? (obj.colors as string[])    : ['#808080'],
    colorNames:  Array.isArray(obj.colorNames)? (obj.colorNames as string[]): ['Grijs'],
    styleTags:   Array.isArray(obj.styleTags) ? (obj.styleTags as string[]) : ['casual'],
    season:      Array.isArray(obj.season)    ? (obj.season as string[])    : ['lente','zomer','herfst','winter'],
    brand:       (obj.brand as string | null) ?? null,
    confidence:  typeof obj.confidence === 'number' ? obj.confidence : 0.8,
  }));
}

export async function analyzeWardrobeImage(
  imageUris: string[],
  apiKey: string,
  singleItem = false,
): Promise<DetectedItem[]> {
  if (!apiKey || imageUris.length === 0) {
    // Mock mode: return realistic demo items
    const count = singleItem ? 1 : Math.floor(Math.random() * 3) + 3;
    return MOCK_ITEMS.slice(0, count).map((item) => ({
      ...item,
      confidence: 0.85 + Math.random() * 0.14,
    }));
  }

  // Build content array: images + text prompt
  const imageContent = await Promise.all(
    imageUris.slice(0, 10).map(async (uri) => {
      const b64 = await toBase64(uri);
      return {
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${b64}`, detail: 'high' },
      };
    }),
  );

  const prompt = singleItem ? SINGLE_ITEM_PROMPT : WARDROBE_PROMPT;
  const content = [...imageContent, { type: 'text', text: prompt }];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 2048,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI fout ${res.status}: ${err.slice(0, 200)}`);
  }

  const json = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  const text = json.choices[0]?.message?.content ?? '[]';
  return parseGptResponse(text);
}
