import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BG_SYNC_STATUS_KEY } from '@/lib/hooks/backgroundSync';

export interface BackgroundSyncStatus {
  isSyncing: boolean;
  progress: number;
  title?: string;
  hasError?: boolean;
}

export function useBackgroundSyncStatus() {
  const [status, setStatus] = useState<BackgroundSyncStatus | null>(null);

  const clearStatus = async () => {
    await AsyncStorage.removeItem(BG_SYNC_STATUS_KEY);
    setStatus(null);
  };

  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      try {
        const stored = await AsyncStorage.getItem(BG_SYNC_STATUS_KEY);
        if (!isMounted) return;
        
        if (stored) {
          setStatus(JSON.parse(stored) as BackgroundSyncStatus);
        } else {
          setStatus(null);
        }
      } catch (e) {
        console.error('Failed to parse sync status:', e);
      }
    };

    // Initial check
    checkStatus();

    // Since AsyncStorage doesn't support listeners, we poll briefly 
    // while the app is active. Background tasks are rare (every 4h),
    // so this is safe.
    const interval = setInterval(checkStatus, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { status, clearStatus };
}