import { useState, useCallback } from 'react';
import { useWardrobeStore, ClothingItem } from '@/store/wardrobeStore';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { analyzeWardrobeImage } from '@/services/openaiService';
import { generateProductPhoto } from '@/services/productPhotoService';

export type ScanState = 'INTRO' | 'CAMERA' | 'PROCESSING' | 'COMPLETE';
export type ScanMode  = 'wardrobe' | 'single';

function makeId() {
  return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
  const addItem   = useWardrobeStore((s) => s.addItem);
  const userId    = useAuthStore((s) => s.user?.id ?? 'local');
  const openaiKey = useSettingsStore((s) => s.openaiKey);

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

      // Stap 1 — Herkenning
      setProcessingLabel('Kledingstuk herkennen...');
      const detected = await analyzeWardrobeImage(uris, openaiKey, isSingle);

      // Stap 2 — Productfoto (best-effort; falls back to sourceUri on failure)
      setProcessingLabel('Productfoto genereren... ±15 sec');
      let finalUri = sourceUri;
      try {
        finalUri = await generateProductPhoto(sourceUri, openaiKey);
      } catch (photoErr) {
        console.warn('[useScan] Product photo failed, using original:', photoErr);
      }

      // Stap 3 — Opslaan
      setProcessingLabel('Toevoegen aan kledingkast...');
      const now = new Date().toISOString();
      detected.forEach((d) => {
        const newItem: ClothingItem = {
          id:                makeId(),
          userId,
          imageUrl:          finalUri,
          processedPhotoUrl: finalUri !== sourceUri ? finalUri : undefined,
          category:          d.category,
          subcategory:       d.subcategory,
          brand:             d.brand ?? undefined,
          colors:            d.colors,
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
      setError(msg);
      setScanState('INTRO');
    }
  }, [scanMode, openaiKey, addItem, userId]);

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
