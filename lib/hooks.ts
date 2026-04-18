import { useState, useEffect, useCallback, useContext } from 'react';
import { Alert, Share } from 'react-native';
import * as Speech from 'expo-speech';
import { useLanguage } from './languageContext';
import { HighlightColor } from './theme';
import { 
  useTheme, 
  FONT_SIZE_MIN, 
  FONT_SIZE_MAX 
} from './themeContext';
import { getTotalCacheSize, clearAllImageCache } from './imageCache';
import { 
  addTagToArticle, removeTagFromArticle, 
  insertHighlight, deleteHighlight,
  toggleFavoriteArticle
} from './db';
import { queryClient } from './queryClient';
import { ParseQueueContext } from './parseQueue';
import { useToast } from './toastContext';
import { fetchRawHtml, buildParserHtml, stripTags } from './utils';
import { ReaderMessage } from '../components/ReaderView';
import { TIMEOUTS } from './constants';

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
        timeout: t.internalSafetyTimeout,
        noContent: t.noContent,
        unknownError: t.parseError,
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
        title: title || t.appName,
        message: url,
      });
    } catch (e) {
      console.error(e);
    }
  }, [url, title, t.appName]);

  const handleAddTag = useCallback(async (tagName: string) => {
    if (!articleId || !tagName.trim()) return;
    await addTagToArticle(articleId, tagName);
    queryClient.invalidateQueries({ queryKey: ['tags', articleId] });
    showToast({ message: t.tagAdded, type: 'success' });
  }, [articleId, t, showToast]);

  const handleRemoveTag = useCallback(async (tagName: string) => {
    if (!articleId) return;
    await removeTagFromArticle(articleId, tagName);
    queryClient.invalidateQueries({ queryKey: ['tags', articleId] });
  }, [articleId]);

  const handleToggleFavorite = useCallback(async (isFavorite: boolean) => {
    if (!articleId) return;
    await toggleFavoriteArticle(articleId, isFavorite);
    queryClient.invalidateQueries({ queryKey: ['articles'] });
    queryClient.invalidateQueries({ queryKey: ['article', articleId] });
    showToast({ 
      message: isFavorite ? t.favorited : t.unfavorited, 
      type: 'success' 
    });
  }, [articleId, t, showToast]);

  const handleReaderMessage = useCallback(async (msg: ReaderMessage) => {
    if (!articleId) return;
    if (msg.type === 'highlight') {
      await insertHighlight(msg.id, articleId, msg.text, msg.contextBefore, msg.contextAfter);
      queryClient.invalidateQueries({ queryKey: ['highlights', articleId] });
    } else if (msg.type === 'delete-highlight') {
      await deleteHighlight(msg.id);
      queryClient.invalidateQueries({ queryKey: ['highlights', articleId] });
    }
  }, [articleId]);

  return {
    isFetching,
    fetchStatus,
    handleFetchAgain,
    handleShare,
    handleAddTag,
    handleRemoveTag,
    handleToggleFavorite,
    handleReaderMessage,
  };
}