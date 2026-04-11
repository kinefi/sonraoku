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
import { queryClient } from '../../lib/queryClient';
import * as Speech from 'expo-speech';
import { getArticleById, markArticleRead } from '../../lib/db';
import { useParseQueue } from '../../lib/parseQueue';
import { fetchRawHtml, buildParserHtml } from '../../lib/parser';
import ReaderView from '../../components/ReaderView';

const FONT_SIZE_KEY = 'reader_font_size';
const FONT_SIZE_DEFAULT = 16;
const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 36;

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function getReadTime(html: string | null): string {
  if (!html) return '';
  const words = html.replace(/<[^>]+>/g, '').split(/\s+/).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
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
  const [fontSize, setFontSize] = useState(FONT_SIZE_DEFAULT);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollProgress = useRef(new Animated.Value(0)).current;
  const [scrollBarWidth, setScrollBarWidth] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
  const { addToQueue } = useParseQueue();

  useEffect(() => {
    AsyncStorage.getItem(FONT_SIZE_KEY).then((val) => {
      if (val) setFontSize(parseInt(val, 10));
    });
  }, []);

  // Stop speech when leaving the screen
  useEffect(() => {
    return () => {
      Speech.stop();
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

  // Debug: log when article data changes
  useEffect(() => {
    console.log('Article data updated:', {
      id: article?.id,
      hasContent: !!article?.html_content,
      contentLength: article?.html_content?.length,
      title: article?.title?.substring(0, 30)
    });
  }, [article]);

  useEffect(() => {
    if (article && !article.is_read) {
      markArticleRead(article.id);
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?.id, article?.is_read]);

  const toggleSpeech = useCallback(async () => {
    if (isSpeaking) {
      await Speech.stop();
      setIsSpeaking(false);
      return;
    }
    if (!article?.html_content) return;
    const text = htmlToPlainText(article.html_content);
    Speech.speak(text, {
      language: 'en',
      rate: 0.9,
      onStart: () => setIsSpeaking(true),
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
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
      console.log('Starting fetch for article:', article.id);
      const rawHtml = await fetchRawHtml(article.url);
      console.log('Raw HTML length:', rawHtml.length);
      const parserHtml = buildParserHtml(rawHtml, article.url);
      console.log('Parser HTML length:', parserHtml.length);
      addToQueue({ id: article.id, html: parserHtml, url: article.url });
      console.log('Added to parse queue');
      setFetchStatus('success');
      setTimeout(() => setFetchStatus('idle'), 3000);
    } catch (error) {
      console.warn('Failed to fetch article content:', error);
      setFetchStatus('error');
      setTimeout(() => setFetchStatus('idle'), 3000);
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
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>
        <View style={styles.navRight}>
          <TouchableOpacity onPress={() => Linking.openURL(article.url)}>
            <Text style={styles.shareText}>Paylaş</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Domain + offline indicator */}
      <View style={styles.metaRow}>
        <Text style={styles.domain}>{getDomain(article.url)}</Text>
        {article.html_content && (
          <View style={styles.offlineIndicator}>
            <View style={styles.offlineDot} />
            <Text style={styles.offlineText}>saved offline</Text>
          </View>
        )}
      </View>

      {/* Content */}
      {article.html_content ? (
        <ScrollView style={{ flex: 1 }} onScroll={handleScroll} scrollEventThrottle={16}>
          <Text style={[styles.articleTitle, { fontSize: fontSize + 6 }]}>{article.title}</Text>
          <ReaderView html={article.html_content} fontSize={fontSize} />
        </ScrollView>
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>
            {article.title
              ? `"${article.title}" couldn't be parsed.`
              : 'Article content not available.'}
          </Text>
          <TouchableOpacity style={styles.openBtn} onPress={() => Linking.openURL(article.url)}>
            <Text style={styles.openBtnText}>Open in Browser</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.fetchBtn, isFetching && styles.fetchBtnDisabled]} 
            onPress={handleFetchAgain}
            disabled={isFetching}
          >
            {isFetching ? (
              <ActivityIndicator size="small" color="#534AB7" />
            ) : fetchStatus === 'success' ? (
              <Text style={styles.fetchBtnTextSuccess}>✓ Fetch Complete</Text>
            ) : fetchStatus === 'error' ? (
              <Text style={styles.fetchBtnTextError}>✗ Fetch Failed</Text>
            ) : (
              <Text style={styles.fetchBtnText}>Fetch for Offline Reading</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <View style={styles.fontControls}>
          <TouchableOpacity style={styles.fontBtn} onPress={() => changeFontSize(-2)}>
            <Text style={styles.fontBtnText}>A−</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fontBtn} onPress={() => changeFontSize(2)}>
            <Text style={[styles.fontBtnText, { fontSize: 16 }]}>A+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.readTime}>{getReadTime(article.html_content)}</Text>
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
              color="#fff"
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
              color="#fff"
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
    backgroundColor: '#fff',
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#eee',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#534AB7',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {
    paddingVertical: 4,
  },
  backText: {
    fontSize: 15,
    color: '#534AB7',
    fontWeight: '500',
  },
  navRight: {
    flexDirection: 'row',
    gap: 16,
  },
  shareText: {
    fontSize: 15,
    color: '#534AB7',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  domain: {
    fontSize: 12,
    color: '#888',
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
    backgroundColor: '#1D9E75',
  },
  offlineText: {
    fontSize: 11,
    color: '#1D9E75',
  },
  articleTitle: {
    fontWeight: '700',
    color: '#111',
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
    color: '#888',
    textAlign: 'center',
  },
  openBtn: {
    backgroundColor: '#534AB7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  openBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  fetchBtn: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  fetchBtnDisabled: {
    opacity: 0.6,
  },
  fetchBtnText: {
    color: '#534AB7',
    fontSize: 15,
    fontWeight: '600',
  },
  fetchBtnTextSuccess: {
    color: '#1D9E75',
    fontSize: 15,
    fontWeight: '600',
  },
  fetchBtnTextError: {
    color: '#E53E3E',
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
    borderTopColor: '#eee',
  },
  fontControls: {
    flexDirection: 'row',
    gap: 12,
  },
  fontBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  fontBtnText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    backgroundColor: '#534AB7',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#534AB7',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabActionBtnActive: {
    backgroundColor: '#3f369f',
  },
  fabActionBtnDisabled: {
    opacity: 0.5,
  },
  readTime: {
    fontSize: 12,
    color: '#aaa',
  },
});
