import OpenAI from 'openai';
import { ClothingItem, AIDetectedItem, ClothingCategory, ClothingFormality, ClothingSeason } from '../models/ClothingItem';
import { OutfitSuggestion, OutfitSuggestionContext, OutfitOccasion } from '../models/Outfit';
import { WeatherDay, PacklistByUser, PacklistItem } from '../models/Trip';

function getClient(): OpenAI {
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
  return new OpenAI({ apiKey });
}

interface GapSuggestion {
  name: string;
  category: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

// ── analyzeWardrobePhoto ──────────────────────────────────────────────────────

export async function analyzeWardrobePhoto(imageUrl: string): Promise<AIDetectedItem[]> {
  const client = getClient();

  const systemPrompt = `You are a professional fashion analyst and AI stylist.
Analyse the provided wardrobe photo and identify ALL clothing items visible.
For each item return a JSON object with these fields:
- name: string (descriptive name)
- category: one of tops|bottoms|shoes|outerwear|accessories|underwear|activewear|swimwear|sleepwear|formalwear|other
- subcategory: string (e.g. "t-shirt", "jeans", "sneakers")
- color: string (primary colour)
- colors: string[] (all visible colours)
- brand: string | null
- material: string | null (e.g. "cotton", "denim", "leather")
- pattern: string | null (e.g. "solid", "striped", "floral")
- formality: one of casual|smart-casual|formal|athletic | null
- season: array of spring|summer|autumn|winter
- tags: string[] (style keywords)
- confidence: number 0-1

Respond ONLY with a JSON array of detected items. No commentary.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: imageUrl, detail: 'high' },
          },
          {
            type: 'text',
            text: 'Please analyse this wardrobe photo and identify all clothing items.',
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message.content ?? '[]';
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned) as AIDetectedItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.warn('[aiService.analyzeWardrobePhoto] Failed to parse JSON:', content);
    return [];
  }
}

// ── analyzeClothingItem ───────────────────────────────────────────────────────

export async function analyzeClothingItem(imageUrl: string): Promise<Partial<AIDetectedItem>> {
  const client = getClient();

  const systemPrompt = `You are a professional fashion analyst.
Analyse the single clothing item in the image and return a JSON object with:
- name: string
- category: one of tops|bottoms|shoes|outerwear|accessories|underwear|activewear|swimwear|sleepwear|formalwear|other
- subcategory: string
- color: string (primary colour)
- colors: string[]
- brand: string | null (look for visible logos/labels)
- material: string | null
- pattern: string | null
- formality: casual|smart-casual|formal|athletic|null
- season: (spring|summer|autumn|winter)[]
- tags: string[]
- confidence: number 0-1

Respond ONLY with a JSON object. No commentary.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1024,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          { type: 'text', text: 'Analyse this clothing item.' },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message.content ?? '{}';
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned) as Partial<AIDetectedItem>;
  } catch {
    console.warn('[aiService.analyzeClothingItem] Failed to parse JSON:', content);
    return {};
  }
}

// ── generateOutfitSuggestions ─────────────────────────────────────────────────

export async function generateOutfitSuggestions(
  items: ClothingItem[],
  context: OutfitSuggestionContext
): Promise<OutfitSuggestion[]> {
  const client = getClient();

  const wardrobeSummary = items.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    color: item.color,
    colors: item.colors,
    formality: item.formality,
    season: item.season,
    pattern: item.pattern,
    brand: item.brand,
    wear_count: item.wear_count,
  }));

  const contextDescription = [
    context.occasion ? `Occasion: ${context.occasion}` : null,
    context.weather
      ? `Weather: ${context.weather.temp_c}°C, ${context.weather.condition}`
      : null,
    context.formality ? `Formality: ${context.formality}` : null,
    context.exclude_item_ids?.length
      ? `Exclude item IDs: ${context.exclude_item_ids.join(', ')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  const systemPrompt = `You are an expert fashion stylist.
Given a wardrobe inventory and context, suggest 5 complete outfit combinations.

Rules:
- Each outfit should include at least a top and bottom (or a dress), plus optional shoes, outerwear, accessories
- Use item IDs from the provided wardrobe only
- Consider colour harmony, formality matching, and weather appropriateness
- Prefer items with lower wear_count (less worn = fresher)
- Return ONLY a JSON array of exactly 5 outfit objects with these fields:
  - name: string
  - description: string (2-3 sentences)
  - item_ids: string[] (IDs from the wardrobe)
  - occasion: casual|work|date|sport|travel|formal|beach|outdoor|home|null
  - formality: casual|smart-casual|formal|athletic|null
  - weather_min: number|null (minimum °C comfortable)
  - weather_max: number|null (maximum °C comfortable)
  - reasoning: string (why this outfit works)`;

  const userMessage = `Context:\n${contextDescription || 'No specific context'}\n\nWardrobe:\n${JSON.stringify(wardrobeSummary, null, 2)}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  const content = response.choices[0]?.message.content ?? '[]';
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned) as OutfitSuggestion[];
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    console.warn('[aiService.generateOutfitSuggestions] Failed to parse JSON:', content);
    return [];
  }
}

// ── generateTripPacklist ──────────────────────────────────────────────────────

interface TripInfo {
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  nights: number;
  activities: string[];
  traveler_ids: string[];
}

export async function generateTripPacklist(
  tripInfo: TripInfo,
  wardrobes: Record<string, ClothingItem[]>,
  weatherForecast: WeatherDay[] | null
): Promise<PacklistByUser> {
  const client = getClient();

  const systemPrompt = `You are a professional travel stylist and packing expert.
Given trip details, weather forecast, and each traveler's wardrobe, create a practical packing list.

Rules:
- Only suggest items that exist in each traveler's wardrobe (use their IDs)
- Consider the number of nights, activities, and weather conditions
- Suggest enough outfits but avoid overpacking
- Return ONLY a JSON object where keys are traveler user IDs and values are arrays of:
  { item_id: string, packed: false, notes: string | null }
- Do not include items that are clearly unsuitable for the weather or activities`;

  const wardrobeSummary: Record<string, unknown[]> = {};
  for (const [userId, items] of Object.entries(wardrobes)) {
    wardrobeSummary[userId] = items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      subcategory: item.subcategory,
      color: item.color,
      formality: item.formality,
      season: item.season,
      material: item.material,
    }));
  }

  const userMessage = `Trip: ${tripInfo.name}
Destination: ${tripInfo.destination}
Dates: ${tripInfo.start_date} to ${tripInfo.end_date} (${tripInfo.nights} nights)
Activities: ${tripInfo.activities.join(', ') || 'General sightseeing'}
Weather Forecast: ${weatherForecast ? JSON.stringify(weatherForecast.slice(0, 7), null, 2) : 'Not available'}

Traveler wardrobes:
${JSON.stringify(wardrobeSummary, null, 2)}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 8192,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  const content = response.choices[0]?.message.content ?? '{}';
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned) as Record<string, PacklistItem[]>;
    // Validate structure
    const result: PacklistByUser = {};
    for (const [userId, items] of Object.entries(parsed)) {
      if (Array.isArray(items)) {
        result[userId] = items.filter(
          (i) => typeof i.item_id === 'string' && typeof i.packed === 'boolean'
        );
      }
    }
    return result;
  } catch {
    console.warn('[aiService.generateTripPacklist] Failed to parse JSON:', content);
    return {};
  }
}

// ── analyzeWardrobeGaps ───────────────────────────────────────────────────────

export async function analyzeWardrobeGaps(items: ClothingItem[]): Promise<GapSuggestion[]> {
  const client = getClient();

  const wardrobeSummary = items.map((item) => ({
    name: item.name,
    category: item.category,
    subcategory: item.subcategory,
    color: item.color,
    formality: item.formality,
    season: item.season,
    material: item.material,
    wear_count: item.wear_count,
  }));

  const systemPrompt = `You are a professional fashion stylist analysing a client's wardrobe.
Identify gaps, missing essentials, or items that would significantly improve outfit versatility.
Return ONLY a JSON array of up to 8 shopping suggestions with these fields:
- name: string (specific item name, e.g. "Navy Blue Chinos")
- category: string (clothing category)
- reason: string (why this item is needed/would help)
- priority: high|medium|low

Focus on versatile items that fill genuine gaps, not luxury additions.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2048,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Analyse this wardrobe and suggest what's missing:\n${JSON.stringify(wardrobeSummary, null, 2)}`,
      },
    ],
  });

  const content = response.choices[0]?.message.content ?? '[]';
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned) as GapSuggestion[];
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    console.warn('[aiService.analyzeWardrobeGaps] Failed to parse JSON:', content);
    return [];
  }
}
