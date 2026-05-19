import { useState, useCallback, useRef } from 'react';
import { scanService, ScanJob, ScannedItem } from '@/services/scanService';
import { useAuthStore } from '@/store/authStore';
import { useWardrobeStore, ClothingItem } from '@/store/wardrobeStore';

function makeId() {
  return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export type ScanState = 'INTRO' | 'RECORDING' | 'PROCESSING' | 'REVIEW' | 'COMPLETE';

const DEMO_SCAN_RESULTS: ScannedItem[] = [
  {
    id: 'scan-demo-1',
    jobId: 'demo-job',
    imageUrl: 'https://images.unsplash.com/photo-1625910513952-b71a4a9f9f9b?w=400&q=80',
    category: 'tops',
    subcategory: 'Polo shirt',
    brand: 'Lacoste',
    colors: ['#2E8B57'],
    confidence: 0.94,
  },
  {
    id: 'scan-demo-2',
    jobId: 'demo-job',
    imageUrl: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&q=80',
    category: 'bottoms',
    subcategory: 'Shorts',
    brand: 'H&M',
    colors: ['#C4A882'],
    confidence: 0.88,
  },
  {
    id: 'scan-demo-3',
    jobId: 'demo-job',
    imageUrl: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=400&q=80',
    category: 'shoes',
    subcategory: 'Loafers',
    brand: 'Clarks',
    colors: ['#8B4513'],
    confidence: 0.91,
  },
  {
    id: 'scan-demo-4',
    jobId: 'demo-job',
    imageUrl: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=400&q=80',
    category: 'accessories',
    subcategory: 'Zonnebril',
    brand: 'Ray-Ban',
    colors: ['#000000'],
    confidence: 0.79,
  },
];

interface UseScanReturn {
  scanState: ScanState;
  scanJob: ScanJob | null;
  scannedItems: ScannedItem[];
  confirmedIds: Set<string>;
  rejectedIds: Set<string>;
  error: string | null;
  confirmedCount: number;
  startRecording: () => void;
  stopRecordingAndUpload: (photos: string[]) => Promise<void>;
  confirmItem: (id: string) => void;
  rejectItem: (id: string) => void;
  confirmAll: () => void;
  submitReview: () => Promise<void>;
  reset: () => void;
}

export function useScan(): UseScanReturn {
  const isDemo = useAuthStore((s) => s.isDemo);
  const addItem = useWardrobeStore((s) => s.addItem);

  const [scanState, setScanState] = useState<ScanState>('INTRO');
  const [scanJob, setScanJob] = useState<ScanJob | null>(null);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startRecording = useCallback(() => {
    setError(null);
    setScanState('RECORDING');
  }, []);

  const stopRecordingAndUpload = useCallback(
    async (photos: string[]) => {
      setScanState('PROCESSING');
      setError(null);

      if (isDemo) {
        // Simulate 2.5s AI processing, then show review
        await new Promise((resolve) => setTimeout(resolve, 2500));
        setScannedItems(DEMO_SCAN_RESULTS);
        setConfirmedIds(new Set(DEMO_SCAN_RESULTS.map((i) => i.id)));
        setRejectedIds(new Set());
        setScanState('REVIEW');
        return;
      }

      try {
        const { jobId } = await scanService.startScan(photos);
        const initialJob = await scanService.getScanStatus(jobId);
        setScanJob(initialJob);

        pollingRef.current = setInterval(async () => {
          try {
            const job = await scanService.getScanStatus(jobId);
            setScanJob(job);
            if (job.status === 'completed') {
              stopPolling();
              setScannedItems(job.results ?? []);
              setConfirmedIds(new Set((job.results ?? []).map((i) => i.id)));
              setRejectedIds(new Set());
              setScanState('REVIEW');
            } else if (job.status === 'failed') {
              stopPolling();
              setError('Verwerking mislukt. Probeer opnieuw.');
              setScanState('INTRO');
            }
          } catch {
            stopPolling();
            setError('Verwerking mislukt. Probeer opnieuw.');
            setScanState('INTRO');
          }
        }, 3000);
      } catch {
        setError('Upload mislukt. Probeer opnieuw.');
        setScanState('INTRO');
      }
    },
    [isDemo, stopPolling],
  );

  const confirmItem = useCallback((id: string) => {
    setConfirmedIds((prev) => new Set(prev).add(id));
    setRejectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }, []);

  const rejectItem = useCallback((id: string) => {
    setRejectedIds((prev) => new Set(prev).add(id));
    setConfirmedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }, []);

  const confirmAll = useCallback(() => {
    setConfirmedIds(new Set(scannedItems.map((i) => i.id)));
    setRejectedIds(new Set());
  }, [scannedItems]);

  const submitReview = useCallback(async () => {
    // Always save confirmed items to local store — no backend needed
    const now = new Date().toISOString();
    scannedItems
      .filter((item) => confirmedIds.has(item.id))
      .forEach((item) => {
        const newItem: ClothingItem = {
          id:          makeId(),
          userId:      useAuthStore.getState().user?.id ?? 'local',
          imageUrl:    item.imageUrl,
          category:    item.category,
          subcategory: item.subcategory,
          brand:       item.brand,
          colors:      item.colors ?? [],
          timesWorn:   0,
          createdAt:   now,
          updatedAt:   now,
        };
        addItem(newItem);
      });
    setScanState('COMPLETE');
  }, [scannedItems, confirmedIds, addItem]);

  const reset = useCallback(() => {
    stopPolling();
    setScanState('INTRO');
    setScanJob(null);
    setScannedItems([]);
    setConfirmedIds(new Set());
    setRejectedIds(new Set());
    setError(null);
  }, [stopPolling]);

  return {
    scanState,
    scanJob,
    scannedItems,
    confirmedIds,
    rejectedIds,
    error,
    confirmedCount: confirmedIds.size,
    startRecording,
    stopRecordingAndUpload,
    confirmItem,
    rejectItem,
    confirmAll,
    submitReview,
    reset,
  };
}
