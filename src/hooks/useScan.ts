import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useWardrobeStore, ClothingItem } from '@/store/wardrobeStore';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useUsageStore, LimitReachedError } from '@/store/usageStore';
import { analyzeWardrobeImage, DetectedItem } from '@/services/openaiService';
import { describeClothingItem, generateDalle3Photo } from '@/services/productPhotoService';
import { removeBackground } from '@/services/removeBgService';
import { wardrobeSupabaseService } from '@/services/wardrobeSupabaseService';

export type ScanState = 'INTRO' | 'CAMERA' | 'PROCESSING' | 'COMPLETE';
export type ScanMode  = 'wardrobe' | 'single';

function makeId() {
  return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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
  const addItem        = useWardrobeStore((s) => s.addItem);
  const userId         = useAuthStore((s) => s.user?.id ?? 'local');
  const openaiKey      = useSettingsStore((s) => s.openaiKey);
  const anthropicKey   = useSettingsStore((s) => s.anthropicKey);
  const removeBgKey    = useSettingsStore((s) => s.removeBgKey);
  const replicateKey   = useSettingsStore((s) => s.replicateKey);
  const supabaseUrl    = useSettingsStore((s) => s.supabaseUrl);
  const supabaseAnon   = useSettingsStore((s) => s.supabaseAnonKey);
  const checkLimit     = useUsageStore((s) => s.checkLimit);
  const increment      = useUsageStore((s) => s.increment);
  const supabaseReady  = !!(supabaseUrl && supabaseAnon);

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
      // Check scan limit before starting
      checkLimit('scan');

      const isSingle  = scanMode === 'single';
      const sourceUri = uris[uris.length - 1];

      // ── Stap 1: Claude Haiku / GPT-4o Vision → metadata ──────────────────────
      setProcessingLabel('📸 Foto analyseren...');
      const detected = await analyzeWardrobeImage(uris, openaiKey, isSingle, anthropicKey);

      // ── Stap 2: GPT-4o Vision → uitgebreide beschrijving voor productfoto ─────
      setProcessingLabel('✂️ Kledingstuk herkennen...');
      let description: string;
      try {
        description = await describeClothingItem(sourceUri, openaiKey, anthropicKey);
      } catch (e) {
        console.warn('[useScan] describeClothingItem failed, using metadata fallback:', e);
        description = detected[0] ? fallbackDescription(detected[0]) : 'clothing item';
      }

      // Increment scan usage after successful analysis
      await increment('scan');

      // ── Stap 3: Flux Pro / gpt-image-1 → productfoto ─────────────────────────
      setProcessingLabel('🎨 Productfoto genereren...');
      let processedUri: string | undefined;
      try {
        // Check HD photo limit before generating
        checkLimit('hdPhoto');
        processedUri = await generateDalle3Photo(sourceUri, description, openaiKey, anthropicKey, replicateKey, detected[0]?.category);
        await increment('hdPhoto');
      } catch (dalleErr) {
        if (dalleErr instanceof LimitReachedError) {
          // Limit reached — skip HD photo silently, use background removal instead
          console.warn('[useScan] HD photo limit reached, trying remove.bg');
        } else {
          console.warn('[useScan] generateDalle3Photo failed, trying remove.bg:', dalleErr);
        }
        try {
          processedUri = await removeBackground(sourceUri, removeBgKey);
        } catch (bgErr) {
          console.warn('[useScan] remove.bg also failed, using original photo:', bgErr);
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
          description,
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
        if (supabaseReady) {
          wardrobeSupabaseService.insert(newItem)
            .catch((e) => console.warn('[useScan] Supabase insert failed:', e));
        }
      });

      setAddedCount(detected.length);
      setScanState('COMPLETE');
    } catch (err) {
      if (err instanceof LimitReachedError) {
        Alert.alert('Limiet bereikt', err.message, [{ text: 'Upgraden', style: 'default' }, { text: 'Sluiten', style: 'cancel' }]);
        setScanState('INTRO');
        return;
      }
      const msg = err instanceof Error ? err.message : 'Analyse mislukt. Probeer opnieuw.';
      console.error('[useScan] finishCapture error:', err);
      setError(msg);
      setScanState('INTRO');
    }
  }, [scanMode, openaiKey, anthropicKey, removeBgKey, replicateKey, supabaseReady, addItem, userId, checkLimit, increment]);

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
