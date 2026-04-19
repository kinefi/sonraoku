import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { Alert, Share, Animated } from 'react-native';
import * as Speech from 'expo-speech';
import { Highlight } from '@/lib/db/highlights';
import { useLanguage } from '@/lib/language';
import { HighlightColor, useTheme, FONT_SIZE_MIN, FONT_SIZE_MAX } from '@/lib/theme';
import { 
  getTotalCacheSize, 
  clearAllImageCache, 
  queryClient, 
  ParseQueueContext,
  buildParserHtml
} from '@/lib/reader';
import { 
  addTagToArticle, removeTagFromArticle, 
  insertHighlight, deleteHighlight,
  toggleFavoriteArticle
} from '@/lib/db';
import { useToast } from '@/lib/toast';
import { fetchRawHtml, stripTags } from '@/lib/utils';
import { ReaderMessage } from '@/types/reader';
import { TIMEOUTS } from '@/lib/constants';

export function useSettings() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { 
    fontSize, setFontSize, 
    highlightColor, setHighlightColor 
  } = useTheme();
  const [cacheSize, setCacheSize] = useState<number>(0);

  const updateCacheSize = useCallback(async () => {
    try {
      const size = await getTotalCacheSize();
      setCacheSize(size);
    } catch (e) {
      console.warn('Failed to calculate cache size:', e);
    }
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        await updateCacheSize();
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    };
    loadSettings();
  }, [updateCacheSize]);

  const changeFontSize = useCallback((delta: number) => {
    setFontSize(fontSize + delta);
  }, [fontSize, setFontSize]);

  const changeHighlightColor = useCallback((color: HighlightColor) => {
    setHighlightColor(color);
  }, [setHighlightColor]);

  const handleClearCache = useCallback(async () => {
    Alert.alert(t.confirmDelete, t.clearCache, [
      { text: t.back, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: async () => {
          await clearAllImageCache();
          await updateCacheSize();
          showToast({ message: t.cacheCleared, type: 'success' });
        }
      },
    ]);
  }, [t, updateCacheSize, showToast]);

  return {
    fontSize,
    highlightColor,
    cacheSize,
    changeFontSize,
    changeHighlightColor,
    handleClearCache,
    updateCacheSize,
    FONT_SIZE_MIN,
    FONT_SIZE_MAX
  };
}

/**
 * Custom hook to handle smooth background color transitions when the theme changes.
 */
export function useThemeTransition(targetColor: string) {
  const bgColorAnim = useRef(new Animated.Value(0)).current;
  const [transitionColors, setTransitionColors] = useState({ prev: targetColor, curr: targetColor });

  useEffect(() => {
    if (targetColor !== transitionColors.curr) {
      setTransitionColors({ prev: transitionColors.curr, curr: targetColor });
      bgColorAnim.setValue(0);
      Animated.timing(bgColorAnim, {
        toValue: 1,
        duration: TIMEOUTS.THEME_TRANSITION,
        useNativeDriver: false,
      }).start();
    }
  }, [targetColor, transitionColors.curr, bgColorAnim]);

  return bgColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [transitionColors.prev, transitionColors.curr],
  });
}

export function useArticleSettings() {
  const { fontSize, changeFontSize, highlightColor } = useSettings();
  const { fontFamily, colors } = useTheme();
  return {
    fontSize,
    changeFontSize,
    defaultColor: highlightColor,
    fontFamily,
    colors,
  };
}

export function useArticleSpeech(htmlContent: string | null, lang: string | null) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const stopSpeech = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  const toggleSpeech = useCallback(() => {
    if (isSpeaking) {
      stopSpeech();
      return;
    }

    if (!htmlContent) return;

    const plainText = stripTags(htmlContent);
    if (!plainText) return;

    setIsSpeaking(true);
    
    // Speech.speak has character limits on some engines, but usually handles long text by chunking internally
    // We use the article's detected language or fallback to Turkish
    Speech.speak(plainText, {
      language: lang || 'tr',
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [isSpeaking, htmlContent, lang, stopSpeech]);

  useEffect(() => {
    return () => { Speech.stop(); };
  }, []);

  return { isSpeaking, toggleSpeech, stopSpeech };
}

export function useArticleActions(articleId?: string, url?: string, title?: string | null) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { addToQueue } = useContext(ParseQueueContext);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'fetching' | 'success' | 'error' | null>(null);

  const handleFetchAgain = useCallback(async () => {
    if (!articleId || !url) return;
    setIsFetching(true);
    setFetchStatus('fetching');
    try {
      const html = await fetchRawHtml(url);
      addToQueue({ id: articleId, url, html: buildParserHtml(html, url, {
        timeout: t.errors.internalSafetyTimeout,
        noContent: t.articles.noContent,
        unknownError: t.errors.parseError,
      }), retries: 0 });
      setFetchStatus('success');
    } catch (e) {
      setFetchStatus('error');
      console.error(e);
    } finally {
      setIsFetching(false);
      setTimeout(() => setFetchStatus(null), TIMEOUTS.STATUS_MESSAGE_RESET);
    }
  }, [articleId, url, t, addToQueue]);

  const handleShare = useCallback(async () => {
    if (!url) return;
    try {
      await Share.share({
        title: title || t.common.appName,
        message: url,
      });
    } catch (e) {
      console.error(e);
    }
  }, [url, title, t.common.appName]);

  const handleAddTag = useCallback(async (tagName: string) => {
    if (!articleId || !tagName.trim()) return;
    const { error } = await addTagToArticle(articleId, tagName);
    if (error) {
      showToast({ message: t.errors.parseError, type: 'error' });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['tags', articleId] });
    queryClient.invalidateQueries({ queryKey: ['tags', 'all'] });
    showToast({ message: t.tags.added, type: 'success' });
  }, [articleId, t, showToast]);

  const handleRemoveTag = useCallback(async (tagName: string) => {
    if (!articleId) return;
    const { error } = await removeTagFromArticle(articleId, tagName);
    queryClient.invalidateQueries({ queryKey: ['tags', articleId] });
  }, [articleId, queryClient]);

  const handleToggleFavorite = useCallback(async (isFavorite: boolean) => {
    if (!articleId) return;
    const { error } = await toggleFavoriteArticle(articleId, isFavorite);
    queryClient.invalidateQueries({ queryKey: ['articles'] });
    queryClient.invalidateQueries({ queryKey: ['article', articleId] });
    showToast({ 
      message: isFavorite ? t.articles.favorited : t.articles.unfavorited, 
      type: 'success' 
    });
  }, [articleId, t, showToast]);

  const handleDeleteHighlight = useCallback(async (highlightId: string) => {
    if (!articleId) return;
    
    // Optimistically update the cache
    queryClient.setQueryData(['highlights', articleId], (old: Highlight[] | undefined) => {
      return old ? old.filter(h => h.id !== highlightId) : [];
    });

    const { error } = await deleteHighlight(highlightId);
    if (error) {
      console.error('Delete highlight error:', error);
      showToast({ message: t.errors.parseError, type: 'error' });
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: ['highlights', articleId] });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['highlights', articleId] });
  }, [articleId, t.errors.parseError, showToast]);

  const handleReaderMessage = useCallback(async (msg: ReaderMessage) => {
    if (!articleId) return;
    if (msg.type === 'highlight') {
      // Optimistically add the highlight to the cache
      const newHighlight: Highlight = {
        id: msg.id,
        article_id: articleId,
        selected_text: msg.text,
        context_before: msg.contextBefore,
        context_after: msg.contextAfter,
        created_at: Date.now(),
      };

      queryClient.setQueryData(['highlights', articleId], (old: Highlight[] | undefined) => {
        return old ? [...old, newHighlight] : [newHighlight];
      });

      const { error } = await insertHighlight(msg.id, articleId, msg.text, msg.contextBefore, msg.contextAfter);
      if (error) {
        console.error('Highlight error:', error);
        // Rollback on error
        queryClient.invalidateQueries({ queryKey: ['highlights', articleId] });
      }
    } else if (msg.type === 'delete-highlight') {
      await handleDeleteHighlight(msg.id);
    }
  }, [articleId, handleDeleteHighlight, queryClient]);

  return {
    isFetching,
    fetchStatus,
    handleFetchAgain,
    handleShare,
    handleAddTag,
    handleRemoveTag,
    handleToggleFavorite,
    handleReaderMessage,
    handleDeleteHighlight,
  };
}