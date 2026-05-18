import { useState, useCallback, useRef } from 'react';
import { scanService, ScanJob, ScannedItem } from '@/services/scanService';

export type ScanState = 'INTRO' | 'RECORDING' | 'PROCESSING' | 'REVIEW' | 'COMPLETE';

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

  const pollJobStatus = useCallback(
    (jobId: string) => {
      pollingRef.current = setInterval(async () => {
        try {
          const job = await scanService.getScanStatus(jobId);
          setScanJob(job);

          if (job.status === 'completed') {
            stopPolling();
            setScannedItems(job.results ?? []);
            const allIds = new Set((job.results ?? []).map((i) => i.id));
            setConfirmedIds(allIds);
            setRejectedIds(new Set());
            setScanState('REVIEW');
          } else if (job.status === 'failed') {
            stopPolling();
            setError('Processing failed. Please try again.');
            setScanState('INTRO');
          }
        } catch {
          stopPolling();
          setError('Processing failed. Please try again.');
          setScanState('INTRO');
        }
      }, 3000);
    },
    [stopPolling],
  );

  const startRecording = useCallback(() => {
    setError(null);
    setScanState('RECORDING');
  }, []);

  const stopRecordingAndUpload = useCallback(
    async (photos: string[]) => {
      setScanState('PROCESSING');
      setError(null);
      try {
        const { jobId } = await scanService.startScan(photos);
        const initialJob = await scanService.getScanStatus(jobId);
        setScanJob(initialJob);
        pollJobStatus(jobId);
      } catch {
        setError('Upload failed. Please try again.');
        setScanState('INTRO');
      }
    },
    [pollJobStatus],
  );

  const confirmItem = useCallback((id: string) => {
    setConfirmedIds((prev) => new Set(prev).add(id));
    setRejectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const rejectItem = useCallback((id: string) => {
    setRejectedIds((prev) => new Set(prev).add(id));
    setConfirmedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const confirmAll = useCallback(() => {
    setConfirmedIds(new Set(scannedItems.map((i) => i.id)));
    setRejectedIds(new Set());
  }, [scannedItems]);

  const submitReview = useCallback(async () => {
    if (!scanJob) return;
    try {
      await scanService.confirmScanResults(
        scanJob.id,
        Array.from(confirmedIds),
        Array.from(rejectedIds),
      );
      setScanState('COMPLETE');
    } catch {
      setError('Something went wrong. Please try again.');
    }
  }, [scanJob, confirmedIds, rejectedIds]);

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
