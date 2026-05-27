import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useTheme, FONT_SIZE_MIN, FONT_SIZE_MAX, HighlightColor } from '@/lib/theme';
import { useLanguage } from '@/lib/language';
import { useToast } from '@/lib/toast';
import { getTotalCacheSize, clearAllImageCache } from '@/lib/reader';
import { isBackgroundRssSyncRegistered, toggleBackgroundRssSync } from '@/lib/hooks/backgroundSync';

export function useSettings() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { fontSize, setFontSize, highlightColor, setHighlightColor } = useTheme();
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [isBgSyncEnabled, setIsBgSyncEnabled] = useState(false);

  useEffect(() => {
    isBackgroundRssSyncRegistered().then(setIsBgSyncEnabled);
  }, []);

  const toggleBgSync = useCallback(async (enabled: boolean) => {
    setIsBgSyncEnabled(enabled);
    await toggleBackgroundRssSync(enabled);
    setIsBgSyncEnabled(await isBackgroundRssSyncRegistered());
  }, []);

  const updateCacheSize = useCallback(async () => {
    try {
      const size = await getTotalCacheSize();
      setCacheSize(size);
    } catch (e) {
      console.warn('Failed to calculate cache size:', e);
    }
  }, []);

  useEffect(() => {
    updateCacheSize();
  }, [updateCacheSize]);

  const changeFontSize = useCallback((delta: number) => {
    setFontSize(fontSize + delta);
  }, [fontSize, setFontSize]);

  const changeHighlightColor = useCallback((color: HighlightColor) => {
    setHighlightColor(color);
  }, [setHighlightColor]);

  const handleClearCache = useCallback(async () => {
    Alert.alert(t.common.confirmDelete, t.settings.clearCache, [
      { text: t.common.back, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          await clearAllImageCache();
          await updateCacheSize();
          showToast({ message: t.settings.cacheCleared, type: 'success' });
        }
      },
    ]);
  }, [t, updateCacheSize, showToast]);

  return {
    fontSize,
    highlightColor,
    cacheSize,
    isBgSyncEnabled,
    toggleBgSync,
    changeFontSize,
    changeHighlightColor,
    handleClearCache,
    updateCacheSize,
    FONT_SIZE_MIN,
    FONT_SIZE_MAX
  };
}