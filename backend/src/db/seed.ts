import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from './pool';

const SALT_ROUNDS = 12;

async function seed(): Promise<void> {
  console.log('🌱 Starting seed...');

  // ── Household ──────────────────────────────────────────────────────────────
  const householdId = uuidv4();
  await pool.query(
    `INSERT INTO households (id, name, invite_code)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [householdId, 'Familie Demo', 'DEMO1234']
  );
  console.log('Created household: Familie Demo');

  // ── Users ──────────────────────────────────────────────────────────────────
  const sarahId = uuidv4();
  const thomasId = uuidv4();

  const sarahHash = await bcrypt.hash('demo1234', SALT_ROUNDS);
  const thomasHash = await bcrypt.hash('demo1234', SALT_ROUNDS);

  await pool.query(
    `INSERT INTO users (id, household_id, email, password_hash, display_name, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (email) DO NOTHING`,
    [sarahId, householdId, 'sarah@demo.de', sarahHash, 'Sarah Mueller', 'owner']
  );

  await pool.query(
    `INSERT INTO users (id, household_id, email, password_hash, display_name, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (email) DO NOTHING`,
    [thomasId, householdId, 'thomas@demo.de', thomasHash, 'Thomas Mueller', 'member']
  );

  console.log('Created users: Sarah and Thomas');

  // ── Sarah's Wardrobe (12 items) ────────────────────────────────────────────
  const sarahItems = [
    {
      id: uuidv4(),
      name: 'White Linen Blouse',
      category: 'tops',
      subcategory: 'blouse',
      color: 'white',
      colors: ['white'],
      brand: 'Zara',
      size: 'S',
      material: 'linen',
      pattern: 'solid',
      formality: 'smart-casual',
      season: ['spring', 'summer'],
      tags: ['versatile', 'office', 'casual'],
      wear_count: 8,
    },
    {
      id: uuidv4(),
      name: 'Navy Blue Blazer',
      category: 'outerwear',
      subcategory: 'blazer',
      color: 'navy',
      colors: ['navy'],
      brand: 'Mango',
      size: 'S',
      material: 'polyester',
      pattern: 'solid',
      formality: 'formal',
      season: ['spring', 'autumn', 'winter'],
      tags: ['office', 'formal', 'classic'],
      wear_count: 12,
    },
    {
      id: uuidv4(),
      name: 'Black Skinny Jeans',
      category: 'bottoms',
      subcategory: 'jeans',
      color: 'black',
      colors: ['black'],
      brand: 'H&M',
      size: '36',
      material: 'denim',
      pattern: 'solid',
      formality: 'casual',
      season: ['spring', 'autumn', 'winter'],
      tags: ['versatile', 'casual', 'everyday'],
      wear_count: 20,
    },
    {
      id: uuidv4(),
      name: 'Floral Summer Dress',
      category: 'tops',
      subcategory: 'dress',
      color: 'multicolor',
      colors: ['pink', 'green', 'white'],
      brand: 'About You',
      size: 'S',
      material: 'cotton',
      pattern: 'floral',
      formality: 'casual',
      season: ['spring', 'summer'],
      tags: ['feminine', 'summer', 'date'],
      wear_count: 5,
    },
    {
      id: uuidv4(),
      name: 'White Sneakers',
      category: 'shoes',
      subcategory: 'sneakers',
      color: 'white',
      colors: ['white'],
      brand: 'Nike',
      size: '38',
      material: 'leather',
      pattern: 'solid',
      formality: 'casual',
      season: ['spring', 'summer', 'autumn'],
      tags: ['sporty', 'casual', 'versatile'],
      wear_count: 15,
    },
    {
      id: uuidv4(),
      name: 'Beige Trench Coat',
      category: 'outerwear',
      subcategory: 'coat',
      color: 'beige',
      colors: ['beige'],
      brand: 'Burberry (dupe)',
      size: 'S',
      material: 'cotton blend',
      pattern: 'solid',
      formality: 'smart-casual',
      season: ['spring', 'autumn'],
      tags: ['classic', 'elegant', 'timeless'],
      wear_count: 7,
    },
    {
      id: uuidv4(),
      name: 'Grey Turtleneck Sweater',
      category: 'tops',
      subcategory: 'sweater',
      color: 'grey',
      colors: ['grey'],
      brand: 'COS',
      size: 'S',
      material: 'merino wool',
      pattern: 'solid',
      formality: 'smart-casual',
      season: ['autumn', 'winter'],
      tags: ['cosy', 'elegant', 'office'],
      wear_count: 10,
    },
    {
      id: uuidv4(),
      name: 'Burgundy Midi Skirt',
      category: 'bottoms',
      subcategory: 'skirt',
      color: 'burgundy',
      colors: ['burgundy'],
      brand: 'Zara',
      size: 'S',
      material: 'satin',
      pattern: 'solid',
      formality: 'smart-casual',
      season: ['autumn', 'winter'],
      tags: ['elegant', 'date', 'feminine'],
      wear_count: 4,
    },
    {
      id: uuidv4(),
      name: 'Striped Breton Top',
      category: 'tops',
      subcategory: 't-shirt',
      color: 'navy',
      colors: ['navy', 'white'],
      brand: 'Uniqlo',
      size: 'S',
      material: 'cotton',
      pattern: 'striped',
      formality: 'casual',
      season: ['spring', 'summer'],
      tags: ['french style', 'casual', 'nautical'],
      wear_count: 9,
    },
    {
      id: uuidv4(),
      name: 'Black Ankle Boots',
      category: 'shoes',
      subcategory: 'boots',
      color: 'black',
      colors: ['black'],
      brand: 'Tamaris',
      size: '38',
      material: 'leather',
      pattern: 'solid',
      formality: 'smart-casual',
      season: ['autumn', 'winter'],
      tags: ['versatile', 'classic', 'everyday'],
      wear_count: 14,
    },
    {
      id: uuidv4(),
      name: 'Khaki Cargo Pants',
      category: 'bottoms',
      subcategory: 'trousers',
      color: 'khaki',
      colors: ['khaki'],
      brand: 'Weekday',
      size: '36',
      material: 'cotton',
      pattern: 'solid',
      formality: 'casual',
      season: ['spring', 'summer', 'autumn'],
      tags: ['utility', 'trendy', 'casual'],
      wear_count: 6,
    },
    {
      id: uuidv4(),
      name: 'Gold Hoop Earrings',
      category: 'accessories',
      subcategory: 'earrings',
      color: 'gold',
      colors: ['gold'],
      brand: null,
      size: null,
      material: 'gold plated',
      pattern: null,
      formality: 'smart-casual',
      season: ['spring', 'summer', 'autumn', 'winter'],
      tags: ['jewellery', 'classic', 'versatile'],
      wear_count: 25,
    },
  ];

  // ── Thomas's Wardrobe (10 items) ───────────────────────────────────────────
  const thomasItems = [
    {
      id: uuidv4(),
      name: 'White Oxford Shirt',
      category: 'tops',
      subcategory: 'shirt',
      color: 'white',
      colors: ['white'],
      brand: 'Boss',
      size: 'M',
      material: 'cotton',
      pattern: 'solid',
      formality: 'formal',
      season: ['spring', 'summer', 'autumn', 'winter'],
      tags: ['office', 'formal', 'classic'],
      wear_count: 18,
    },
    {
      id: uuidv4(),
      name: 'Dark Wash Jeans',
      category: 'bottoms',
      subcategory: 'jeans',
      color: 'dark blue',
      colors: ['dark blue'],
      brand: 'Levi\'s',
      size: '32/32',
      material: 'denim',
      pattern: 'solid',
      formality: 'casual',
      season: ['spring', 'autumn', 'winter'],
      tags: ['versatile', 'everyday', 'casual'],
      wear_count: 22,
    },
    {
      id: uuidv4(),
      name: 'Grey Merino Crewneck',
      category: 'tops',
      subcategory: 'sweater',
      color: 'heather grey',
      colors: ['grey'],
      brand: 'Uniqlo',
      size: 'M',
      material: 'merino wool',
      pattern: 'solid',
      formality: 'smart-casual',
      season: ['autumn', 'winter'],
      tags: ['cosy', 'smart-casual', 'versatile'],
      wear_count: 13,
    },
    {
      id: uuidv4(),
      name: 'Navy Chinos',
      category: 'bottoms',
      subcategory: 'chinos',
      color: 'navy',
      colors: ['navy'],
      brand: 'Tommy Hilfiger',
      size: '32/32',
      material: 'cotton',
      pattern: 'solid',
      formality: 'smart-casual',
      season: ['spring', 'summer', 'autumn'],
      tags: ['smart-casual', 'office', 'versatile'],
      wear_count: 11,
    },
    {
      id: uuidv4(),
      name: 'White Running Shoes',
      category: 'shoes',
      subcategory: 'sneakers',
      color: 'white',
      colors: ['white', 'grey'],
      brand: 'Adidas',
      size: '43',
      material: 'mesh',
      pattern: 'solid',
      formality: 'athletic',
      season: ['spring', 'summer', 'autumn'],
      tags: ['sporty', 'athletic', 'running'],
      wear_count: 30,
    },
    {
      id: uuidv4(),
      name: 'Charcoal Suit Jacket',
      category: 'outerwear',
      subcategory: 'suit jacket',
      color: 'charcoal',
      colors: ['charcoal'],
      brand: 'Mango Man',
      size: '48',
      material: 'wool blend',
      pattern: 'solid',
      formality: 'formal',
      season: ['autumn', 'winter'],
      tags: ['formal', 'office', 'events'],
      wear_count: 5,
    },
    {
      id: uuidv4(),
      name: 'Black Leather Derby Shoes',
      category: 'shoes',
      subcategory: 'dress shoes',
      color: 'black',
      colors: ['black'],
      brand: 'Clarks',
      size: '43',
      material: 'leather',
      pattern: 'solid',
      formality: 'formal',
      season: ['autumn', 'winter'],
      tags: ['formal', 'classic', 'office'],
      wear_count: 8,
    },
    {
      id: uuidv4(),
      name: 'Olive Bomber Jacket',
      category: 'outerwear',
      subcategory: 'bomber jacket',
      color: 'olive',
      colors: ['olive'],
      brand: 'H&M',
      size: 'M',
      material: 'nylon',
      pattern: 'solid',
      formality: 'casual',
      season: ['spring', 'autumn'],
      tags: ['casual', 'streetwear', 'trendy'],
      wear_count: 7,
    },
    {
      id: uuidv4(),
      name: 'Heather Blue T-Shirt',
      category: 'tops',
      subcategory: 't-shirt',
      color: 'light blue',
      colors: ['light blue'],
      brand: 'Arket',
      size: 'M',
      material: 'organic cotton',
      pattern: 'solid',
      formality: 'casual',
      season: ['spring', 'summer'],
      tags: ['basic', 'everyday', 'casual'],
      wear_count: 16,
    },
    {
      id: uuidv4(),
      name: 'Brown Leather Belt',
      category: 'accessories',
      subcategory: 'belt',
      color: 'brown',
      colors: ['brown'],
      brand: null,
      size: '90',
      material: 'genuine leather',
      pattern: 'solid',
      formality: 'smart-casual',
      season: ['spring', 'summer', 'autumn', 'winter'],
      tags: ['accessory', 'classic', 'versatile'],
      wear_count: 20,
    },
  ];

  // Insert Sarah's items
  for (const item of sarahItems) {
    await pool.query(
      `INSERT INTO clothing_items (
        id, user_id, household_id, name, category, subcategory,
        color, colors, brand, size, material, pattern, formality,
        season, tags, wear_count, is_active, ai_analyzed
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, true, true
      ) ON CONFLICT DO NOTHING`,
      [
        item.id, sarahId, householdId,
        item.name, item.category, item.subcategory,
        item.color,
        item.colors ? `{${item.colors.join(',')}}` : null,
        item.brand ?? null,
        item.size ?? null,
        item.material ?? null,
        item.pattern ?? null,
        item.formality ?? null,
        `{${item.season.join(',')}}`,
        `{${item.tags.join(',')}}`,
        item.wear_count,
      ]
    );
  }
  console.log(`Created ${sarahItems.length} clothing items for Sarah`);

  // Insert Thomas's items
  for (const item of thomasItems) {
    await pool.query(
      `INSERT INTO clothing_items (
        id, user_id, household_id, name, category, subcategory,
        color, colors, brand, size, material, pattern, formality,
        season, tags, wear_count, is_active, ai_analyzed
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, true, true
      ) ON CONFLICT DO NOTHING`,
      [
        item.id, thomasId, householdId,
        item.name, item.category, item.subcategory,
        item.color,
        item.colors ? `{${item.colors.join(',')}}` : null,
        item.brand ?? null,
        item.size ?? null,
        item.material ?? null,
        item.pattern ?? null,
        item.formality ?? null,
        `{${item.season.join(',')}}`,
        `{${item.tags.join(',')}}`,
        item.wear_count,
      ]
    );
  }
  console.log(`Created ${thomasItems.length} clothing items for Thomas`);

  // ── Outfits (5 outfits) ────────────────────────────────────────────────────
  // Find item IDs by name for Sarah
  const getItemId = async (userId: string, name: string): Promise<string | null> => {
    const result = await pool.query<{ id: string }>(
      'SELECT id FROM clothing_items WHERE user_id = $1 AND name = $2',
      [userId, name]
    );
    return result.rows[0]?.id ?? null;
  };

  const sarahWhiteBlouse = await getItemId(sarahId, 'White Linen Blouse');
  const sarahBlazer = await getItemId(sarahId, 'Navy Blue Blazer');
  const sarahBlackJeans = await getItemId(sarahId, 'Black Skinny Jeans');
  const sarahFloral = await getItemId(sarahId, 'Floral Summer Dress');
  const sarahSneakers = await getItemId(sarahId, 'White Sneakers');
  const sarahTurtleneck = await getItemId(sarahId, 'Grey Turtleneck Sweater');
  const sarahMidiSkirt = await getItemId(sarahId, 'Burgundy Midi Skirt');
  const sarahBreton = await getItemId(sarahId, 'Striped Breton Top');
  const sarahAnkleBoot = await getItemId(sarahId, 'Black Ankle Boots');
  const sarahKhaki = await getItemId(sarahId, 'Khaki Cargo Pants');
  const sarahHoops = await getItemId(sarahId, 'Gold Hoop Earrings');

  const thomasWhiteShirt = await getItemId(thomasId, 'White Oxford Shirt');
  const thomasJeans = await getItemId(thomasId, 'Dark Wash Jeans');
  const thomasNavyChinos = await getItemId(thomasId, 'Navy Chinos');
  const thomasSuitJacket = await getItemId(thomasId, 'Charcoal Suit Jacket');
  const thomasDerby = await getItemId(thomasId, 'Black Leather Derby Shoes');

  const outfits = [
    {
      id: uuidv4(),
      user_id: sarahId,
      name: 'Office Chic',
      description: 'A polished, professional look perfect for the office.',
      item_ids: [sarahWhiteBlouse, sarahBlazer, sarahBlackJeans, sarahAnkleBoot, sarahHoops].filter(Boolean) as string[],
      occasion: 'work',
      season: ['spring', 'autumn', 'winter'],
      weather_min: 10,
      weather_max: 22,
      formality: 'smart-casual',
      is_ai_generated: false,
    },
    {
      id: uuidv4(),
      user_id: sarahId,
      name: 'Summer Brunch',
      description: 'Light and breezy outfit for a summer brunch or casual outing.',
      item_ids: [sarahFloral, sarahSneakers, sarahHoops].filter(Boolean) as string[],
      occasion: 'casual',
      season: ['spring', 'summer'],
      weather_min: 20,
      weather_max: 35,
      formality: 'casual',
      is_ai_generated: false,
    },
    {
      id: uuidv4(),
      user_id: sarahId,
      name: 'Autumn Date Night',
      description: 'A romantic, cosy outfit for an autumn evening out.',
      item_ids: [sarahTurtleneck, sarahMidiSkirt, sarahAnkleBoot, sarahHoops].filter(Boolean) as string[],
      occasion: 'date',
      season: ['autumn', 'winter'],
      weather_min: 5,
      weather_max: 16,
      formality: 'smart-casual',
      is_ai_generated: true,
    },
    {
      id: uuidv4(),
      user_id: sarahId,
      name: 'Weekend Explorer',
      description: 'Comfortable and stylish for weekend errands or exploring the city.',
      item_ids: [sarahBreton, sarahKhaki, sarahSneakers].filter(Boolean) as string[],
      occasion: 'casual',
      season: ['spring', 'summer'],
      weather_min: 18,
      weather_max: 28,
      formality: 'casual',
      is_ai_generated: false,
    },
    {
      id: uuidv4(),
      user_id: thomasId,
      name: 'Business Meeting',
      description: 'Sharp and professional for important business meetings.',
      item_ids: [thomasWhiteShirt, thomasSuitJacket, thomasNavyChinos, thomasDerby].filter(Boolean) as string[],
      occasion: 'work',
      season: ['autumn', 'winter'],
      weather_min: 5,
      weather_max: 20,
      formality: 'formal',
      is_ai_generated: false,
    },
  ];

  for (const outfit of outfits) {
    if (outfit.item_ids.length === 0) {
      console.warn(`Skipping outfit "${outfit.name}" — no item IDs resolved`);
      continue;
    }

    await pool.query(
      `INSERT INTO outfits (
        id, user_id, household_id, name, description, item_ids,
        occasion, season, weather_min, weather_max, formality, is_ai_generated
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12
      ) ON CONFLICT DO NOTHING`,
      [
        outfit.id,
        outfit.user_id,
        householdId,
        outfit.name,
        outfit.description,
        `{${outfit.item_ids.join(',')}}`,
        outfit.occasion,
        `{${outfit.season.join(',')}}`,
        outfit.weather_min,
        outfit.weather_max,
        outfit.formality,
        outfit.is_ai_generated,
      ]
    );
  }

  console.log(`Created ${outfits.length} outfits`);
  console.log('');
  console.log('Seed complete!');
  console.log('Demo credentials:');
  console.log('  Sarah:  sarah@demo.de  / demo1234');
  console.log('  Thomas: thomas@demo.de / demo1234');
  console.log('  Invite code: DEMO1234');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
