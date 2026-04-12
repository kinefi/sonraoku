import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Animated,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Speech from 'expo-speech';
import { queryClient } from '../../lib/queryClient';
import {
  getArticleById, markArticleRead,
  getHighlightsByArticle, insertHighlight, deleteHighlight,
  getTagsForArticle, addTagToArticle, removeTagFromArticle,
} from '../../lib/db';
import { colors, HIGHLIGHT_COLOR_DEFAULT, HIGHLIGHT_COLOR_KEY, HIGHLIGHT_COLORS, HighlightColor } from '../../lib/colors';
import { LANGUAGES } from '../../lib/i18n';
import { getDomain, getReadTime } from '../../lib/utils';
import { useParseQueue } from '../../lib/parseQueue';
import { fetchRawHtml, buildParserHtml } from '../../lib/parser';
import ReaderView, { ReaderMessage } from '../../components/ReaderView';
import { useLanguage } from '../../lib/languageContext';

const FONT_SIZE_KEY = 'reader_font_size';
const FONT_SIZE_DEFAULT = 16;
const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 36;

// Module-level cache prevents font size flash on re-navigation (AsyncStorage is async,
// so the first render would otherwise use the default before the stored value loads)
let _fontSizeCache: number | null = null;
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
  const { id, highlightId } = useLocalSearchParams<{ id: string; highlightId?: string }>();
  const { t } = useLanguage();
  const [fontSize, setFontSize] = useState(_fontSizeCache ?? FONT_SIZE_DEFAULT);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechChunksRef = useRef<string[]>([]);
  const speechChunkIndexRef = useRef(0);
  const speechSafetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakNextChunkRef = useRef<() => void>(() => { });
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
  const [readerHeight, setReaderHeight] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
  const [defaultColor, setDefaultColor] = useState<HighlightColor>(HIGHLIGHT_COLOR_DEFAULT);
  const { addToQueue } = useParseQueue();
  const fetchStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [targetHighlightId, setTargetHighlightId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(FONT_SIZE_KEY)
      .then((val) => {
        if (val) {
          const parsed = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, parseInt(val, 10)));
          if (parsed !== _fontSizeCache) {
            _fontSizeCache = parsed;
            setFontSize(parsed);
          }
        }
      })
      .catch((e) => { console.error(e) });
    AsyncStorage.getItem(HIGHLIGHT_COLOR_KEY)
      .then((val) => { if (val && (HIGHLIGHT_COLORS as readonly string[]).includes(val)) setDefaultColor(val as HighlightColor); })
      .catch((e) => { console.error(e) });
  }, []);

  useEffect(() => {
    if (highlightId) {
      setTargetHighlightId(highlightId);
      const timer = setTimeout(() => setTargetHighlightId(null), 500);
      return () => clearTimeout(timer);
    }
  }, [highlightId]);

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
      _fontSizeCache = next;
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

  const { data: highlights = [] } = useQuery({
    queryKey: ['highlights', id],
    queryFn: () => getHighlightsByArticle(id!),
    enabled: !!id,
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['tags', id],
    queryFn: () => getTagsForArticle(id!),
    enabled: !!id,
  });

  function handleScrollProgress(progress: number) {
    scrollProgress.setValue(progress);
  }

  function generateId(): string {
    return Crypto.randomUUID();
  }

  function handleReaderMessage(msg: ReaderMessage) {
    if (!article) return;
    if (msg.type === 'highlight') {
      insertHighlight(msg.id, article.id, msg.text, msg.contextBefore, msg.contextAfter);
      queryClient.invalidateQueries({ queryKey: ['highlights', article.id] });
    } else if (msg.type === 'delete-highlight') {
      deleteHighlight(msg.id);
      queryClient.invalidateQueries({ queryKey: ['highlights', article.id] });
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

  const handleShare = useCallback(async () => {
    if (!article) return;
    try {
      await Share.share({
        message: article.title ? `${article.title}\n${article.url}` : article.url,
        url: article.url,
      });
    } catch (e) {
      console.error(e);
    }
  }, [article]);

  function handleAddTag() {
    if (!id || !newTag.trim()) return;
    addTagToArticle(id, newTag);
    setNewTag('');
    queryClient.invalidateQueries({ queryKey: ['tags', id] });
    queryClient.invalidateQueries({ queryKey: ['articles'] });
  }

  function handleRemoveTag(name: string) {
    removeTagFromArticle(id!, name);
    queryClient.invalidateQueries({ queryKey: ['tags', id] });
  }

  if (!article) return null;

  const langLabel = article.lang
    ? LANGUAGES.find((l) => article.lang?.toLowerCase().startsWith(l.key))?.label ||
      article.lang.toUpperCase()
    : null;

  const scrollFillHeight = scrollProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, readerHeight],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Site name left | read time center | offline right */}
      <View style={styles.metaRow}>
        <Text style={styles.domain} numberOfLines={1}>{getDomain(article.url)}</Text>
        <View style={styles.metaCenter}>
          {article.html_content && (
            <Text style={styles.readTime}>
              {langLabel && `${langLabel} • `}
              {t.readTime(getReadTime(article.html_content))}
            </Text>
          )}
        </View>
        <View style={styles.metaRight}>
          {article.html_content && (
            <View style={styles.offlineIndicator}>
              <View style={styles.offlineDot} />
              <Text style={styles.offlineText}>{t.offlineLabel}</Text>
            </View>
          )}
        </View>
      </View>
      {/* Content */}
      {article.html_content ? (
        <View
          style={styles.readerWrapper}
          onLayout={(e) => setReaderHeight(e.nativeEvent.layout.height)}
        >
          <ReaderView
            html={article.html_content}
            title={article.title ?? ''}
            fontSize={fontSize}
            defaultColor={defaultColor}
            highlights={highlights}
            onMessage={handleReaderMessage}
            onScrollProgress={handleScrollProgress}
            scrollToHighlightId={targetHighlightId}
          />
          <View style={styles.scrollTrack}>
            <Animated.View style={[styles.scrollFill, { height: scrollFillHeight }]} />
          </View>
        </View>
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

      <View style={styles.fabActionRow}>
        <View style={styles.fabPill}>
          <TouchableOpacity style={styles.fabActionBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          {article.html_content && (
            <>
              <TouchableOpacity
                style={[styles.fabActionBtn, fontSize <= FONT_SIZE_MIN && styles.fabActionBtnDisabled]}
                onPress={() => changeFontSize(-2)}
                disabled={fontSize <= FONT_SIZE_MIN}
              >
                <Text style={styles.fabFontText}>A−</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fabActionBtn, fontSize >= FONT_SIZE_MAX && styles.fabActionBtnDisabled]}
                onPress={() => changeFontSize(2)}
                disabled={fontSize >= FONT_SIZE_MAX}
              >
                <Text style={styles.fabFontText}>A+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fabActionBtn}
                onPress={() => setShowHighlights(true)}
              >
                <Ionicons name="bookmarks-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fabActionBtn}
                onPress={() => setShowTags(true)}
              >
                <Ionicons name="pricetag-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fabActionBtn, isSpeaking && styles.fabActionBtnActive]}
                onPress={toggleSpeech}
              >
                <Ionicons
                  name={isSpeaking ? 'stop-circle' : 'volume-high-outline'}
                  size={24}
                  color={isSpeaking ? colors.white : colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fabActionBtn}
                onPress={handleShare}
              >
                <Ionicons name="share-social-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Highlights List Modal */}
      <Modal visible={showHighlights} animationType="slide" transparent onRequestClose={() => setShowHighlights(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowHighlights(false)} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t.highlightsTitle}</Text>
            <TouchableOpacity onPress={() => setShowHighlights(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={highlights}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.highlightsList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.highlightItem}
                onPress={() => {
                  setTargetHighlightId(item.id);
                  setShowHighlights(false);
                  // Clear after trigger to allow re-navigation if needed
                  setTimeout(() => setTargetHighlightId(null), 100);
                }}
              >
                <View style={[styles.highlightIndicator, { backgroundColor: defaultColor }]} />
                <Text style={styles.highlightText} numberOfLines={3}>
                  {item.selected_text}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyHighlights}>
                <Text style={styles.emptyHighlightsText}>{t.noHighlightsYet}</Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* Tags Modal */}
      <Modal visible={showTags} animationType="slide" transparent onRequestClose={() => setShowTags(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowTags(false)} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t.tagsTitle}</Text>
            <TouchableOpacity onPress={() => setShowTags(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.tagInputRow}>
            <TextInput
              style={styles.tagInput}
              placeholder={t.tagPlaceholder}
              value={newTag}
              onChangeText={setNewTag}
              onSubmitEditing={handleAddTag}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.addTagBtn} onPress={handleAddTag}>
              <Text style={styles.addTagBtnText}>{t.addTag}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tagsContainer}>
            {tags.map((tag) => (
              <View key={tag} style={styles.tagBadge}>
                <Text style={styles.tagBadgeText}>{tag}</Text>
                <TouchableOpacity onPress={() => handleRemoveTag(tag)}>
                  <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  readerWrapper: {
    flex: 1,
  },
  scrollTrack: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  scrollFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    opacity: 0.45,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  metaCenter: {
    flex: 1,
    alignItems: 'center',
  },
  metaRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  domain: {
    flex: 1,
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
  fabActionRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
  },
  fabPill: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.bgMuted,
    borderRadius: 32,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 6,
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  fabActionBtn: {
    width: 48,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabActionBtnActive: {
    backgroundColor: colors.primary,
    borderRadius: 20,
  },
  fabActionBtnDisabled: {
    opacity: 0.5,
  },
  fabFontText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  readTime: {
    fontSize: 12,
    color: colors.textFaint,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    height: '60%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  highlightsList: {
    paddingVertical: 10,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  highlightIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
  },
  highlightText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  emptyHighlights: {
    padding: 40,
    alignItems: 'center',
  },
  emptyHighlightsText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  tagInputRow: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  tagInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.bgMuted,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 15,
  },
  addTagBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  addTagBtnText: {
    color: colors.white,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 8,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  tagBadgeText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
});
