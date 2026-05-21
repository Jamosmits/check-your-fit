import { useState, useCallback } from 'react';
import { useWardrobeStore, ClothingItem } from '@/store/wardrobeStore';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { analyzeWardrobeImage, DetectedItem } from '@/services/openaiService';
import { describeClothingItem, generateDalle3Photo } from '@/services/productPhotoService';
import { removeBackground } from '@/services/removeBgService';

export type ScanState = 'INTRO' | 'CAMERA' | 'PROCESSING' | 'COMPLETE';
export type ScanMode  = 'wardrobe' | 'single';

function makeId() {
  return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Build a plain-text description from the OpenAI metadata as DALL-E fallback. */
function fallbackDescription(d: DetectedItem): string {
  return [
    d.colorNames.slice(0, 2).join(' and '),
    d.subcategory || d.category,
    d.brand,
    d.styleTags.slice(0, 2).join(', '),
  ].filter(Boolean).join(' ').trim() || d.category;
}

interface UseScanReturn {
  scanState:       ScanState;
  scanMode:        ScanMode;
  processingLabel: string;
  error:           string | null;
  addedCount:      number;

  startScan:     (mode: ScanMode) => void;
  finishCapture: (uris: string[]) => Promise<void>;
  reset:         () => void;
}

export function useScan(): UseScanReturn {
  const addItem      = useWardrobeStore((s) => s.addItem);
  const userId       = useAuthStore((s) => s.user?.id ?? 'local');
  const openaiKey    = useSettingsStore((s) => s.openaiKey);
  const removeBgKey  = useSettingsStore((s) => s.removeBgKey);

  const [scanState,       setScanState]       = useState<ScanState>('INTRO');
  const [scanMode,        setScanMode]        = useState<ScanMode>('wardrobe');
  const [processingLabel, setProcessingLabel] = useState('');
  const [error,           setError]           = useState<string | null>(null);
  const [addedCount,      setAddedCount]      = useState(0);

  const startScan = useCallback((mode: ScanMode) => {
    setScanMode(mode);
    setError(null);
    setScanState('CAMERA');
  }, []);

  const finishCapture = useCallback(async (uris: string[]) => {
    if (uris.length === 0) return;
    setScanState('PROCESSING');
    setError(null);

    try {
      const isSingle  = scanMode === 'single';
      const sourceUri = uris[uris.length - 1];

      // ── Stap 1: GPT-4o Vision → metadata (categorie, kleuren, stijl) ────────
      setProcessingLabel('📸 Foto analyseren...');
      const detected = await analyzeWardrobeImage(uris, openaiKey, isSingle);

      // ── Stap 2: GPT-4o Vision → uitgebreide beschrijving voor DALL-E ─────────
      setProcessingLabel('✂️ Kledingstuk herkennen...');
      let description: string;
      try {
        description = await describeClothingItem(sourceUri, openaiKey);
      } catch (e) {
        console.warn('[useScan] describeClothingItem failed, using metadata fallback:', e);
        description = detected[0] ? fallbackDescription(detected[0]) : 'clothing item';
      }

      // ── Stap 3: DALL-E 3 → productfoto  (fallback: remove.bg → origineel) ──
      setProcessingLabel('🎨 Productfoto genereren...');
      let processedUri: string | undefined;
      try {
        processedUri = await generateDalle3Photo(description, openaiKey);
      } catch (dalleErr) {
        console.warn('[useScan] DALL-E 3 failed, trying remove.bg:', dalleErr);
        try {
          processedUri = await removeBackground(sourceUri, removeBgKey);
        } catch (bgErr) {
          console.warn('[useScan] remove.bg also failed, using original photo:', bgErr);
          // processedUri stays undefined — wardrobe falls back to imageUrl
        }
      }

      // ── Stap 4: Opslaan ───────────────────────────────────────────────────────
      setProcessingLabel('✅ Toevoegen aan kledingkast...');
      const now = new Date().toISOString();
      detected.forEach((d) => {
        const newItem: ClothingItem = {
          id:                makeId(),
          userId,
          imageUrl:          sourceUri,
          processedPhotoUrl: processedUri,
          description,                      // GPT-4o description — used for try-on accuracy
          category:          d.category,
          subcategory:       d.subcategory,
          brand:             d.brand ?? undefined,
          colors:            d.colors,
          colorNames:        d.colorNames,
          color:             d.colorNames[0],
          season:            d.season,
          notes:             d.styleTags.join(', '),
          timesWorn:         0,
          createdAt:         now,
          updatedAt:         now,
        };
        addItem(newItem);
      });

      setAddedCount(detected.length);
      setScanState('COMPLETE');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analyse mislukt. Probeer opnieuw.';
      console.error('[useScan] finishCapture error:', err);
      setError(msg);
      setScanState('INTRO');
    }
  }, [scanMode, openaiKey, removeBgKey, addItem, userId]);

  const reset = useCallback(() => {
    setScanState('INTRO');
    setError(null);
    setAddedCount(0);
    setProcessingLabel('');
  }, []);

  return {
    scanState,
    scanMode,
    processingLabel,
    error,
    addedCount,
    startScan,
    finishCapture,
    reset,
  };
}
