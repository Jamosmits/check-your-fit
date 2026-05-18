import axios from 'axios';

interface AffiliateLink {
  store: string;
  url: string;
  price: number | null;
  currency: string;
}

interface AwinProduct {
  productId: string;
  productName: string;
  merchantName: string;
  price: { amount: number; currency: string };
  aw_deep_link: string;
  merchant_image_url?: string;
}

interface AwinSearchResponse {
  data: AwinProduct[];
}

// ── getAffiliateLinks ─────────────────────────────────────────────────────────

export async function getAffiliateLinks(
  itemName: string,
  category: string
): Promise<AffiliateLink[]> {
  const apiKey = process.env['AWIN_API_KEY'];
  const publisherId = process.env['AWIN_PUBLISHER_ID'];

  if (!apiKey || !publisherId) {
    return getFallbackLinks(itemName, category);
  }

  try {
    return await fetchAwinLinks(itemName, category, apiKey, publisherId);
  } catch (err) {
    console.warn('[affiliateService] Awin request failed, using fallback:', (err as Error).message);
    return getFallbackLinks(itemName, category);
  }
}

// ── fetchAwinLinks ────────────────────────────────────────────────────────────

async function fetchAwinLinks(
  itemName: string,
  category: string,
  apiKey: string,
  publisherId: string
): Promise<AffiliateLink[]> {
  const searchQuery = `${itemName} ${category}`.trim();

  const response = await axios.get<AwinSearchResponse>(
    'https://api.awin.com/publishers/product-search',
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      params: {
        publisherId,
        keyword: searchQuery,
        countryCode: 'DE',
        language: 'de',
        minPrice: 0,
        maxPrice: 500,
        pageSize: 5,
        page: 0,
      },
      timeout: 8000,
    }
  );

  const products = response.data.data ?? [];

  return products.slice(0, 3).map((product) => ({
    store: product.merchantName,
    url: product.aw_deep_link,
    price: product.price.amount,
    currency: product.price.currency,
  }));
}

// ── getFallbackLinks ──────────────────────────────────────────────────────────

function getFallbackLinks(itemName: string, category: string): AffiliateLink[] {
  const query = encodeURIComponent(`${itemName} ${category}`.trim());

  // Return generic search links as fallback (no affiliate commission but functional)
  return [
    {
      store: 'Zalando',
      url: `https://www.zalando.de/suche/?q=${query}`,
      price: null,
      currency: 'EUR',
    },
    {
      store: 'ASOS',
      url: `https://www.asos.com/search/?q=${query}`,
      price: null,
      currency: 'EUR',
    },
    {
      store: 'About You',
      url: `https://www.aboutyou.de/search?query=${query}`,
      price: null,
      currency: 'EUR',
    },
  ];
}
