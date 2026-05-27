import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncAllFeeds } from '@/lib/db/rss';

export const RSS_SYNC_TASK = 'BACKGROUND_RSS_SYNC';
export const BG_SYNC_STATUS_KEY = 'background_rss_sync_status';

TaskManager.defineTask(RSS_SYNC_TASK, async () => {
  try {
    console.log('[BackgroundFetch] Starting RSS Sync...');
    
    const updateStatus = async (progress: number, title?: string) => {
      await AsyncStorage.setItem(BG_SYNC_STATUS_KEY, JSON.stringify({ isSyncing: true, progress, title }));
    };

    await updateStatus(0);
    await syncAllFeeds(updateStatus);

    await AsyncStorage.removeItem(BG_SYNC_STATUS_KEY);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[BackgroundFetch] RSS Sync failed:', error);
    await AsyncStorage.setItem(BG_SYNC_STATUS_KEY, JSON.stringify({ isSyncing: false, hasError: true }));
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Configures the periodic background fetch task for RSS.
 */
export async function toggleBackgroundRssSync(enabled: boolean) {
  if (enabled) {
    await BackgroundFetch.registerTaskAsync(RSS_SYNC_TASK, {
      // The interval is implicitly handled by the OS for periodic tasks.
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } else {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(RSS_SYNC_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(RSS_SYNC_TASK);
    }
  }
}

export async function isBackgroundRssSyncRegistered(): Promise<boolean> {
  return await TaskManager.isTaskRegisteredAsync(RSS_SYNC_TASK);
}