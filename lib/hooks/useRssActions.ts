import { useCallback, useContext, useRef } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid/non-secure';
import { eq } from 'drizzle-orm';
import { 
  markAllRssItemsAsRead, 
  deleteRssFeed, clearReadRssItems, deleteRssItem, deleteAllRssItems, 
  addRssFeed, markRssFeedAsRead, syncAllFeeds
} from '@/lib/db/rss';
import { db, insertArticle, rssItems } from '@/lib/db';
import { RssItemWithFeed, RssFeed, RssItem } from '@/lib/db/types';
import { importOpml, exportOpml } from '@/lib/db/opmlService';
import { ParseQueueContext, buildParserHtml } from '@/lib/reader';
import { useToast } from '@/lib/toast';
import { useLanguage } from '@/lib/language';
import { fetchRawHtml } from '@/lib/utils';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useBackgroundSyncStatus } from '@/lib/hooks/useBackgroundSyncStatus';

export function useRssActions() {
  const queryClient = useQueryClient();
  const { addToQueue } = useContext(ParseQueueContext);
  const { showToast } = useToast();
  const { t, translate } = useLanguage();
  const { clearStatus } = useBackgroundSyncStatus(); // This hook is in lib/hooks, not lib/db
  const lastDeletedItem = useRef<RssItem | null>(null);

  const invalidateRss = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['rss-items'] });
    queryClient.invalidateQueries({ queryKey: ['rss-feeds-list'] });
  }, [queryClient]);

  const addFeedMutation = useMutation({
    mutationFn: addRssFeed,
    onSuccess: invalidateRss,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return await db.update(rssItems).set({ is_read: 1 }).where(eq(rssItems.id, id));
    },
    onSuccess: invalidateRss,
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const item = await db.select().from(rssItems).where(eq(rssItems.id, id)).limit(1);
      lastDeletedItem.current = item[0];
      return await deleteRssItem(id);
    },
    onSuccess: () => {
      invalidateRss();
      showToast({ 
        message: t.rss.itemDeleted, 
        type: 'info',
        action: { 
          label: t.rss.undo, 
          onPress: () => lastDeletedItem.current && restoreMutation.mutate(lastDeletedItem.current) 
        }
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (item: RssItem) => {
      await db.insert(rssItems).values(item);
    },
    onSuccess: invalidateRss,
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllRssItemsAsRead,
    onSuccess: invalidateRss,
  });

  const clearReadMutation = useMutation({
    mutationFn: clearReadRssItems,
    onSuccess: invalidateRss,
  });

  const deleteAllMutation = useMutation({
    mutationFn: deleteAllRssItems,
    onSuccess: invalidateRss,
  });

  const markFeedReadMutation = useMutation({
    mutationFn: markRssFeedAsRead,
    onSuccess: invalidateRss,
  });

  const deleteFeedMutation = useMutation({
    mutationFn: deleteRssFeed,
    onSuccess: invalidateRss,
  });

  const importMutation = useMutation({
    mutationFn: async (onProgress?: (c: number, t: number, title?: string) => void) => {
      let DocumentPickerModule: any;
      try {
        DocumentPickerModule = await import('expo-document-picker');
      } catch {
        throw new Error('Document picker not available on this platform.');
      }

      const result = await DocumentPickerModule.getDocumentAsync({
        type: 'text/xml', // Mime type for OPML
        copyToCacheDirectory: true,
      });

      // Support both old and new shapes
      const canceled = result?.canceled ?? (result?.type === 'cancel');
      if (canceled) {
        throw new Error('OPML import cancelled.');
      }

      const fileUri = result?.uri ?? result?.assets?.[0]?.uri;
      if (!fileUri) throw new Error('No file selected for import.');

      const opmlContent = await FileSystem.readAsStringAsync(fileUri);
      
      // Validation and confirmation as per AGENTS.md best practices
      const res = await importOpml(
        opmlContent,
        onProgress,
        async (count) =>
          new Promise((resolve) => {
            Alert.alert(t.rss.importOpml, translate('rss.confirmLargeImport', { count }), [
              { text: t.common.cancel, onPress: () => resolve(false), style: 'cancel' },
              { text: t.common.select, onPress: () => resolve(true) },
            ]);
          }),
      );
      if (res.error) throw res.error;
      return res;
    },
    onSuccess: (data) => {
      invalidateRss();
      if (data.successCount !== undefined) {
        Alert.alert(
          t.rss.importOpml,
          translate('rss.importOpmlSummary', { 
            success: data.successCount, 
            skipped: data.skippedCount 
          })
        );
      }
    },
    onError: (error) => {
      showToast({ message: `${t.rss.importOpmlError}: ${error.message}`, type: 'error' });
    }
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const result = await exportOpml();
      if (result.error) throw result.error;
      if (result.filePath) {
        await Sharing.shareAsync(result.filePath);
      } else {
        throw new Error('Export file path not found.');
      }
    },
    onSuccess: () => showToast({ message: t.common.share, type: 'success' }),
    onError: (error) => {
      showToast({ message: `${t.rss.exportOpmlError}: ${error.message}`, type: 'error' });
    }
  });

  const syncAllMutation = useMutation({
    mutationKey: ['rss-sync-all'],
    onMutate: () => {
      // Provide immediate haptic feedback and clear status
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    mutationFn: async (onUpdate: (p: number, title?: string) => void) => {
      // Ensure stale background error states are cleared before starting
      await clearStatus();
      return await syncAllFeeds(onUpdate);
    },
    onSuccess: () => {
      invalidateRss();
      queryClient.invalidateQueries({ queryKey: ['rss-last-sync'] });
    },
  });

  const handleSaveToReadingList = useCallback(async (item: RssItemWithFeed) => {
    try {
      const id = nanoid();
      const res = await insertArticle(id, item.link);
      if (res.error) throw res.error;
      
      const html = await fetchRawHtml(item.link);
      addToQueue({
        id,
        url: item.link,
        title: item.title,
        html: buildParserHtml(html, item.link, { // Line 123
          timeout: t.errors.internalSafetyTimeout,
          noContent: t.articles.noContent,
          unknownError: t.errors.parseError,
        }),
      });

      await db.update(rssItems).set({ is_read: 1 }).where(eq(rssItems.id, item.id));
      
      invalidateRss();
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    } catch (e) {
      console.error('Failed to save RSS item to reading list:', e);
      showToast({ message: t.errors.parseError, type: 'error' });
    }
  }, [
    addToQueue, invalidateRss, queryClient, showToast, 
    t.articles.noContent, t.errors.parseError, t.errors.internalSafetyTimeout
  ]);

  const handleReorderFeeds = useCallback(async (newFeeds: RssFeed[]) => {
     queryClient.setQueryData(['rss-feeds-list'], newFeeds);
  }, [queryClient]);

  return {
    addFeedMutation,
    markReadMutation,
    deleteItemMutation,
    markAllReadMutation,
    clearReadMutation,
    deleteAllMutation,
    markFeedReadMutation,
    deleteFeedMutation,
    syncAllMutation,
    handleSaveToReadingList,
    handleReorderFeeds,
    importMutation,
    exportMutation,
    invalidateRss,
  };
}
