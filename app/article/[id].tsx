import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Speech from 'expo-speech';
import { queryClient } from '../../lib/queryClient';
import { getArticleById, markArticleRead } from '../../lib/db';
import { colors } from '../../lib/colors';
import { getDomain, getReadTime } from '../../lib/utils';
import { useParseQueue } from '../../lib/parseQueue';
import { fetchRawHtml, buildParserHtml } from '../../lib/parser';
import ReaderView from '../../components/ReaderView';
import { useLanguage } from '../../lib/languageContext';

const FONT_SIZE_KEY = 'reader_font_size';
const FONT_SIZE_DEFAULT = 16;
const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 36;
const SPEECH_CHUNK_MAX_LEN = 4000;
const SPEECH_RATE = 1.0;
const SPEECH_SAFETY_TIMEOUT_MS = 30_000;

function splitIntoChunks(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();
  while (remaining.length > maxLen) {
    let cut = remaining.lastIndexOf('. ', maxLen);
    if (cut === -1) cut = remaining.lastIndexOf(' ', maxLen);
    if (cut === -1) cut = maxLen;
    else cut += 1;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const [fontSize, setFontSize] = useState(FONT_SIZE_DEFAULT);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechChunksRef = useRef<string[]>([]);
  const speechChunkIndexRef = useRef(0);
  const speechSafetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakNextChunkRef = useRef<() => void>(() => {});
  speakNextChunkRef.current = () => {
    if (speechSafetyTimerRef.current) clearTimeout(speechSafetyTimerRef.current);
    const idx = speechChunkIndexRef.current;
    const chunks = speechChunksRef.current;
    if (idx >= chunks.length) {
      setIsSpeaking(false);
      return;
    }
    speechChunkIndexRef.current = idx + 1;
    speechSafetyTimerRef.current = setTimeout(() => setIsSpeaking(false), SPEECH_SAFETY_TIMEOUT_MS);
    Speech.speak(chunks[idx], {
      language: article?.lang || 'tr',
      rate: SPEECH_RATE,
      onDone: () => speakNextChunkRef.current(),
      onStopped: () => {
        if (speechSafetyTimerRef.current) clearTimeout(speechSafetyTimerRef.current);
        setIsSpeaking(false);
      },
      onError: () => {
        if (speechSafetyTimerRef.current) clearTimeout(speechSafetyTimerRef.current);
        setIsSpeaking(false);
      },
    });
  };
  const scrollProgress = useRef(new Animated.Value(0)).current;
  const [scrollBarWidth, setScrollBarWidth] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
  const { addToQueue } = useParseQueue();
  const fetchStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(FONT_SIZE_KEY)
      .then((val) => { if (val) setFontSize(Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, parseInt(val, 10)))); })
      .catch(() => {});
  }, []);

  // Stop speech and clear timers when leaving the screen
  useEffect(() => {
    return () => {
      Speech.stop();
      if (speechSafetyTimerRef.current) clearTimeout(speechSafetyTimerRef.current);
      if (fetchStatusTimerRef.current) clearTimeout(fetchStatusTimerRef.current);
    };
  }, []);

  const changeFontSize = useCallback(
    (delta: number) => {
      const next = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, fontSize + delta));
      setFontSize(next);
      AsyncStorage.setItem(FONT_SIZE_KEY, String(next));
    },
    [fontSize]
  );

  const { data: article } = useQuery({
    queryKey: ['article', id],
    queryFn: () => getArticleById(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (article && !article.is_read) {
      markArticleRead(article.id);
      queryClient.setQueryData(['article', article.id], { ...article, is_read: 1 });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?.id, article?.is_read]);

  const toggleSpeech = useCallback(async () => {
    if (isSpeaking) {
      await Speech.stop();
      speechChunksRef.current = [];
      speechChunkIndexRef.current = 0;
      setIsSpeaking(false);
      return;
    }
    if (!article?.html_content) return;
    const text = htmlToPlainText(article.html_content);
    speechChunksRef.current = splitIntoChunks(text, SPEECH_CHUNK_MAX_LEN);
    speechChunkIndexRef.current = 0;
    setIsSpeaking(true);
    speakNextChunkRef.current();
  }, [isSpeaking, article?.html_content]);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const scrollable = contentSize.height - layoutMeasurement.height;
    if (scrollable > 0) {
      scrollProgress.setValue(contentOffset.y / scrollable);
    }
  }

  async function handleFetchAgain() {
    if (!article || isFetching) return;
    setIsFetching(true);
    setFetchStatus('fetching');
    try {
      const rawHtml = await fetchRawHtml(article.url);
      const parserHtml = buildParserHtml(rawHtml, article.url);
      addToQueue({ id: article.id, html: parserHtml, url: article.url });
      setFetchStatus('success');
      fetchStatusTimerRef.current = setTimeout(() => setFetchStatus('idle'), 3000);
    } catch {
      setFetchStatus('error');
      fetchStatusTimerRef.current = setTimeout(() => setFetchStatus('idle'), 3000);
    } finally {
      setIsFetching(false);
    }
  }

  if (!article) return null;

  const progressWidth = scrollProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, scrollBarWidth],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Progress bar */}
      <View
        style={styles.progressTrack}
        onLayout={(e) => setScrollBarWidth(e.nativeEvent.layout.width)}
      >
        <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
      </View>

      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>{t.back}</Text>
        </TouchableOpacity>
        <View style={styles.navRight}>
          <TouchableOpacity onPress={() => Linking.openURL(article.url)}>
            <Text style={styles.shareText}>{t.share}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Domain + offline indicator */}
      <View style={styles.metaRow}>
        <Text style={styles.domain}>{getDomain(article.url)}</Text>
        {article.html_content && (
          <View style={styles.offlineIndicator}>
            <View style={styles.offlineDot} />
            <Text style={styles.offlineText}>{t.offlineLabel}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      {article.html_content ? (
        <ScrollView style={styles.scroll} onScroll={handleScroll} scrollEventThrottle={16}>
          <Text style={[styles.articleTitle, { fontSize: fontSize + 6 }]}>{article.title}</Text>
          <ReaderView html={article.html_content} fontSize={fontSize} />
        </ScrollView>
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>
            {article.title ? t.couldNotLoad(article.title) : t.noContent}
          </Text>
          <TouchableOpacity style={styles.openBtn} onPress={() => Linking.openURL(article.url)}>
            <Text style={styles.openBtnText}>{t.openInBrowser}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fetchBtn, isFetching && styles.fetchBtnDisabled]}
            onPress={handleFetchAgain}
            disabled={isFetching}
          >
            {isFetching ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : fetchStatus === 'success' ? (
              <Text style={styles.fetchBtnTextSuccess}>{t.downloadSuccess}</Text>
            ) : fetchStatus === 'error' ? (
              <Text style={styles.fetchBtnTextError}>{t.downloadError}</Text>
            ) : (
              <Text style={styles.fetchBtnText}>{t.downloadOffline}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <View style={styles.fontControls}>
          <TouchableOpacity
            style={[styles.fontBtn, fontSize <= FONT_SIZE_MIN && styles.fontBtnDisabled]}
            onPress={() => changeFontSize(-2)}
            disabled={fontSize <= FONT_SIZE_MIN}
          >
            <Text style={[styles.fontBtnText, fontSize <= FONT_SIZE_MIN && styles.fontBtnTextDisabled]}>A−</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fontBtn, fontSize >= FONT_SIZE_MAX && styles.fontBtnDisabled]}
            onPress={() => changeFontSize(2)}
            disabled={fontSize >= FONT_SIZE_MAX}
          >
            <Text style={[styles.fontBtnText, { fontSize: 16 }, fontSize >= FONT_SIZE_MAX && styles.fontBtnTextDisabled]}>A+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.readTime}>{article.html_content ? t.readTime(getReadTime(article.html_content)) : ''}</Text>
      </View>

      {article.html_content && (
        <View style={styles.fabActionRow}>
          <TouchableOpacity
            style={[styles.fabActionBtn, isSpeaking && styles.fabActionBtnActive]}
            onPress={toggleSpeech}
          >
            <Ionicons
              name={isSpeaking ? 'stop-circle' : 'volume-high-outline'}
              size={20}
              color={colors.white}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fabActionBtn, isFetching && styles.fabActionBtnDisabled]}
            onPress={handleFetchAgain}
            disabled={isFetching}
          >
            <Ionicons
              name="refresh-outline"
              size={20}
              color={colors.white}
            />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scroll: {
    flex: 1,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.border,
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.primary,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    paddingVertical: 4,
  },
  backText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '500',
  },
  navRight: {
    flexDirection: 'row',
    gap: 16,
  },
  shareText: {
    fontSize: 15,
    color: colors.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  domain: {
    fontSize: 12,
    color: colors.textMuted,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  offlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  offlineText: {
    fontSize: 11,
    color: colors.success,
  },
  articleTitle: {
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    lineHeight: 32,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  fallbackText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  openBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  openBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  fetchBtn: {
    backgroundColor: colors.bgMuted,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  fetchBtnDisabled: {
    opacity: 0.6,
  },
  fetchBtnText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  fetchBtnTextSuccess: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '600',
  },
  fetchBtnTextError: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fontControls: {
    flexDirection: 'row',
    gap: 12,
  },
  fontBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.bgMuted,
  },
  fontBtnText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  fontBtnDisabled: {
    backgroundColor: colors.bgPage,
  },
  fontBtnTextDisabled: {
    color: colors.textFaint,
  },
  fabActionRow: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    flexDirection: 'row',
    gap: 12,
  },
  fabActionBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabActionBtnActive: {
    backgroundColor: colors.primaryDark,
  },
  fabActionBtnDisabled: {
    opacity: 0.5,
  },
  readTime: {
    fontSize: 12,
    color: colors.textFaint,
  },
});
