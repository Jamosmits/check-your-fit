import { useState, useCallback, useRef } from 'react';
import { useWardrobeStore, ClothingItem } from '@/store/wardrobeStore';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { analyzeWardrobeImage, DetectedItem } from '@/services/openaiService';
import { removeBackground } from '@/services/removeBgService';
import { smartCropGarment } from '@/services/cropService';

export type ScanState = 'INTRO' | 'CAMERA' | 'PROCESSING' | 'REVIEW' | 'COMPLETE';
export type ScanMode  = 'wardrobe' | 'single';

export interface ReviewItem extends DetectedItem {
  id:          string;
  originalUri: string; // raw camera capture
  imageUri:    string; // bg-removed + cropped (or same as originalUri if no key)
  accepted:    boolean | null;
}

function makeId() {
  return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface UseScanReturn {
  scanState:       ScanState;
  scanMode:        ScanMode;
  reviewItems:     ReviewItem[];
  currentIndex:    number;
  processingLabel: string;
  error:           string | null;
  addedCount:      number;

  startScan:     (mode: ScanMode) => void;
  finishCapture: (uris: string[]) => Promise<void>;
  acceptItem:    (id: string) => void;
  rejectItem:    (id: string) => void;
  acceptAll:     () => void;
  submitReview:  () => void;
  reset:         () => void;
}

const PROCESSING_LABELS = [
  'Kledingkast analyseren...',
  'Items herkennen...',
  'Achtergronden verwijderen...',
  'Uitsnijden en centreren...',
  'Kleuren bepalen...',
  'Stijlen classificeren...',
];

export function useScan(): UseScanReturn {
  const addItem     = useWardrobeStore((s) => s.addItem);
  const userId      = useAuthStore((s) => s.user?.id ?? 'local');
  const openaiKey   = useSettingsStore((s) => s.openaiKey);
  const removeBgKey = useSettingsStore((s) => s.removeBgKey);

  const [scanState,       setScanState]      = useState<ScanState>('INTRO');
  const [scanMode,        setScanMode]       = useState<ScanMode>('wardrobe');
  const [reviewItems,     setReviewItems]    = useState<ReviewItem[]>([]);
  const [currentIndex,    setCurrentIndex]   = useState(0);
  const [processingLabel, setProcessingLabel] = useState(PROCESSING_LABELS[0]);
  const [error,           setError]          = useState<string | null>(null);
  const [addedCount,      setAddedCount]     = useState(0);
  const labelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startLabelCycle = useCallback(() => {
    let idx = 0;
    labelIntervalRef.current = setInterval(() => {
      idx = (idx + 1) % PROCESSING_LABELS.length;
      setProcessingLabel(PROCESSING_LABELS[idx]);
    }, 1800);
  }, []);

  const stopLabelCycle = useCallback(() => {
    if (labelIntervalRef.current) {
      clearInterval(labelIntervalRef.current);
      labelIntervalRef.current = null;
    }
  }, []);

  const startScan = useCallback((mode: ScanMode) => {
    setScanMode(mode);
    setError(null);
    setScanState('CAMERA');
  }, []);

  const finishCapture = useCallback(async (uris: string[]) => {
    if (uris.length === 0) return;
    setScanState('PROCESSING');
    setProcessingLabel(PROCESSING_LABELS[0]);
    startLabelCycle();
    setError(null);

    try {
      const isSingle  = scanMode === 'single';
      const sourceUri = uris[uris.length - 1];

      // Step 1 — OpenAI herkenning
      const detected = await analyzeWardrobeImage(uris, openaiKey, isSingle);

      // Step 2 — Remove.bg: achtergrond weg, wit, gecropped (server-side)
      const bgRemovedUri = await removeBackground(sourceUri, removeBgKey);

      // Step 3 — Auto-crop: hanger weg, resize
      const finalUri = await smartCropGarment(bgRemovedUri);

      const items: ReviewItem[] = detected.map((d) => ({
        ...d,
        id:          makeId(),
        originalUri: sourceUri,
        imageUri:    finalUri,
        accepted:    null,
      }));

      stopLabelCycle();
      setReviewItems(items);
      setCurrentIndex(0);
      setScanState('REVIEW');
    } catch (err) {
      stopLabelCycle();
      setError(err instanceof Error ? err.message : 'Analyse mislukt. Probeer opnieuw.');
      setScanState('INTRO');
    }
  }, [scanMode, openaiKey, removeBgKey, startLabelCycle, stopLabelCycle]);

  const acceptItem = useCallback((id: string) => {
    setReviewItems((prev) =>
      prev.map((item) => item.id === id ? { ...item, accepted: true } : item),
    );
    setCurrentIndex((i) => Math.min(i + 1, reviewItems.length - 1));
  }, [reviewItems.length]);

  const rejectItem = useCallback((id: string) => {
    setReviewItems((prev) =>
      prev.map((item) => item.id === id ? { ...item, accepted: false } : item),
    );
    setCurrentIndex((i) => Math.min(i + 1, reviewItems.length - 1));
  }, [reviewItems.length]);

  const acceptAll = useCallback(() => {
    setReviewItems((prev) => prev.map((item) => ({ ...item, accepted: true })));
    setCurrentIndex(reviewItems.length - 1);
  }, [reviewItems.length]);

  const submitReview = useCallback(() => {
    const now   = new Date().toISOString();
    const toAdd = reviewItems.filter((item) => item.accepted !== false);

    toAdd.forEach((item) => {
      const bgRemoved = item.imageUri !== item.originalUri;
      const newItem: ClothingItem = {
        id:                makeId(),
        userId,
        imageUrl:          item.imageUri,
        processedPhotoUrl: bgRemoved ? item.imageUri : undefined,
        category:          item.category,
        subcategory:       item.subcategory,
        brand:             item.brand ?? undefined,
        colors:            item.colors,
        color:             item.colorNames[0],
        season:            item.season,
        notes:             item.styleTags.join(', '),
        timesWorn:         0,
        createdAt:         now,
        updatedAt:         now,
      };
      addItem(newItem);
    });

    setAddedCount(toAdd.length);
    setScanState('COMPLETE');
  }, [reviewItems, userId, addItem]);

  const reset = useCallback(() => {
    stopLabelCycle();
    setScanState('INTRO');
    setReviewItems([]);
    setCurrentIndex(0);
    setError(null);
    setAddedCount(0);
    setProcessingLabel(PROCESSING_LABELS[0]);
  }, [stopLabelCycle]);

  return {
    scanState,
    scanMode,
    reviewItems,
    currentIndex,
    processingLabel,
    error,
    addedCount,
    startScan,
    finishCapture,
    acceptItem,
    rejectItem,
    acceptAll,
    submitReview,
    reset,
  };
}
