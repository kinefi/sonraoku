import { useState, useRef, useEffect, useCallback } from 'react';
import { Share } from 'react-native';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { 
  addTagToArticle, 
  removeTagFromArticle, 
  insertHighlight, 
  deleteHighlight 
} from './db';
import { fetchRawHtml, buildParserHtml } from './utils';
import { useParseQueue } from './parseQueue';
import { ReaderMessage } from '../components/ReaderView';
import { HIGHLIGHT_COLOR_DEFAULT, HIGHLIGHT_COLOR_KEY, HIGHLIGHT_COLORS, HighlightColor } from './theme';

// --- Settings Hook Logic ---
const FONT_SIZE_KEY = 'reader_font_size';
export const FONT_SIZE_DEFAULT = 16;
export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 36;

let _fontSizeCache: number | null = null;

export function useArticleSettings() {
  const [fontSize, setFontSize] = useState(_fontSizeCache ?? FONT_SIZE_DEFAULT);
  const [defaultColor, setDefaultColor] = useState<HighlightColor>(HIGHLIGHT_COLOR_DEFAULT);

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
      .catch(console.error);

    AsyncStorage.getItem(HIGHLIGHT_COLOR_KEY)
      .then((val) => {
        if (val && (HIGHLIGHT_COLORS as readonly string[]).includes(val)) {
          setDefaultColor(val as HighlightColor);
        }
      })
      .catch(console.error);
  }, []);

  const changeFontSize = useCallback((delta: number) => {
    const next = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, fontSize + delta));
    _fontSizeCache = next;
    setFontSize(next);
    AsyncStorage.setItem(FONT_SIZE_KEY, String(next));
  }, [fontSize]);

  return { fontSize, changeFontSize, defaultColor };
}

// --- Speech Hook Logic ---
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

function normalizeLang(lang?: string | null): string {
  if (!lang) return 'tr';
  return lang.split('-')[0].split('_')[0].toLowerCase();
}

export function useArticleSpeech(htmlContent: string | null, lang: string | null) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechChunksRef = useRef<string[]>([]);
  const speechChunkIndexRef = useRef(0);
  const speechSafetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakNextChunkRef = useRef<() => void>(() => {});

  const stopSpeech = useCallback(async () => {
    await Speech.stop();
    if (speechSafetyTimerRef.current) clearTimeout(speechSafetyTimerRef.current);
    speechChunksRef.current = [];
    speechChunkIndexRef.current = 0;
    setIsSpeaking(false);
  }, []);

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
      language: normalizeLang(lang),
      rate: SPEECH_RATE,
      onDone: () => speakNextChunkRef.current(),
      onStopped: () => stopSpeech(),
      onError: () => stopSpeech(),
    });
  };

  const toggleSpeech = useCallback(async () => {
    if (isSpeaking) {
      await stopSpeech();
      return;
    }
    if (!htmlContent) return;
    const text = htmlToPlainText(htmlContent);
    speechChunksRef.current = splitIntoChunks(text, SPEECH_CHUNK_MAX_LEN);
    speechChunkIndexRef.current = 0;
    setIsSpeaking(true);
    speakNextChunkRef.current();
  }, [isSpeaking, htmlContent, stopSpeech]);

  useEffect(() => {
    return () => { stopSpeech(); };
  }, [stopSpeech]);

  return { isSpeaking, toggleSpeech };
}

// --- Actions Hook Logic ---
export function useArticleActions(id: string | undefined, url: string | undefined, title: string | null | undefined) {
  const queryClient = useQueryClient();
  const { addToQueue } = useParseQueue();
  const [isFetching, setIsFetching] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
  const fetchStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (fetchStatusTimerRef.current) clearTimeout(fetchStatusTimerRef.current);
    };
  }, []);

  const handleFetchAgain = useCallback(async () => {
    if (!id || !url || isFetching) return;
    setIsFetching(true);
    setFetchStatus('fetching');
    try {
      const rawHtml = await fetchRawHtml(url);
      const parserHtml = buildParserHtml(rawHtml, url);
      addToQueue({ id, html: parserHtml, url });
      setFetchStatus('success');
      fetchStatusTimerRef.current = setTimeout(() => setFetchStatus('idle'), 3000);
    } catch {
      setFetchStatus('error');
      fetchStatusTimerRef.current = setTimeout(() => setFetchStatus('idle'), 3000);
    } finally {
      setIsFetching(false);
    }
  }, [id, url, isFetching, addToQueue]);

  const handleShare = useCallback(async () => {
    if (!url) return;
    try {
      await Share.share({
        message: title ? `${title}\n${url}` : url,
        url,
      });
    } catch (e) {
      console.error(e);
    }
  }, [url, title]);

  const handleAddTag = useCallback((tagName: string) => {
    if (!id || !tagName.trim()) return;
    addTagToArticle(id, tagName);
    queryClient.invalidateQueries({ queryKey: ['tags', id] });
    queryClient.invalidateQueries({ queryKey: ['articles'] });
  }, [id, queryClient]);

  const handleRemoveTag = useCallback((tagName: string) => {
    if (!id) return;
    removeTagFromArticle(id, tagName);
    queryClient.invalidateQueries({ queryKey: ['tags', id] });
    queryClient.invalidateQueries({ queryKey: ['articles'] });
  }, [id, queryClient]);

  const handleReaderMessage = useCallback((msg: ReaderMessage) => {
    if (!id) return;
    if (msg.type === 'highlight') {
      insertHighlight(msg.id, id, msg.text, msg.contextBefore, msg.contextAfter);
      queryClient.invalidateQueries({ queryKey: ['highlights', id] });
    } else if (msg.type === 'delete-highlight') {
      deleteHighlight(msg.id);
      queryClient.invalidateQueries({ queryKey: ['highlights', id] });
    }
  }, [id, queryClient]);

  return {
    isFetching,
    fetchStatus,
    handleFetchAgain,
    handleShare,
    handleAddTag,
    handleRemoveTag,
    handleReaderMessage,
  };
}