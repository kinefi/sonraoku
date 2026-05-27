import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Highlight } from '@/lib/db';
import { FontFamily, ColorTokens } from '@/lib/theme';
import { useLanguage } from '@/lib/language';
import { ReaderMessage, WebViewMessage } from '@/types/reader';
import { buildReaderHtml, getReaderSettingsScript } from './readerAssets';

interface UseReaderSelectionProps {
  html: string;
  title: string;
  fontSize: number;
  fontFamily: FontFamily;
  defaultColor: string;
  highlights: Highlight[];
  colors: ColorTokens;
  onMessage: (msg: ReaderMessage) => void;
  onScrollProgress: (progress: number) => void;
  scrollToHighlightId?: string | null;
  initialProgress?: number;
}

export function useReaderSelection({
  html,
  title,
  fontSize,
  fontFamily,
  defaultColor,
  highlights,
  colors,
  onMessage,
  onScrollProgress,
  scrollToHighlightId,
  initialProgress,
}: UseReaderSelectionProps) {
  const { t } = useLanguage();
  const webViewRef = useRef<WebView>(null);
  const loaded = useRef(false);

  const source = useMemo(
    () => ({ html: buildReaderHtml(title, html, fontSize, fontFamily, defaultColor, highlights, colors) }),
    [html, title, fontSize, fontFamily, defaultColor, highlights, colors]
  );

  const injectReaderSettings = useCallback(() => {
    if (!webViewRef.current) return;
    const script = getReaderSettingsScript(fontSize, fontFamily, highlights, colors);
    webViewRef.current.injectJavaScript(`${script}; true;`);
  }, [fontSize, fontFamily, highlights, colors]);

  useEffect(() => {
    if (scrollToHighlightId && loaded.current) {
      webViewRef.current?.injectJavaScript(`
        if (window.scrollToHighlight) {
          window.scrollToHighlight('${scrollToHighlightId}');
        }
        true;
      `);
      const highlight = highlights.find(h => h.id === scrollToHighlightId);
      if (highlight) {
        AccessibilityInfo.announceForAccessibility(`${t.highlightsTitle}: ${highlight.selected_text}`);
      }
    }
  }, [scrollToHighlightId, t.highlightsTitle, highlights]);

  useEffect(() => {
    if (!loaded.current) return;
    injectReaderSettings();
  }, [fontSize, fontFamily, highlights, colors, defaultColor, injectReaderSettings]);

  const handleMessage = useCallback((e: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(e.nativeEvent.data) as WebViewMessage;
      if (data.type === 'scroll') {
        onScrollProgress(data.progress);
      } else {
        onMessage(data as ReaderMessage);
      }
    } catch (err) {
      console.error('WebView message parse error:', err);
    }
  }, [onMessage, onScrollProgress]);

  const onLoadEnd = useCallback(() => {
    loaded.current = true;
    injectReaderSettings();
    if (initialProgress !== undefined && initialProgress > 0) {
      webViewRef.current?.injectJavaScript(`
        if (window.scrollToProgress) window.scrollToProgress(${initialProgress});
        true;
      `);
    }
  }, [initialProgress, injectReaderSettings]);

  const onLoadStart = useCallback(() => {
    loaded.current = false;
  }, []);

  return {
    webViewRef,
    source,
    handleMessage,
    onLoadEnd,
    onLoadStart,
  };
}