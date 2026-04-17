import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, AccessibilityInfo } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Highlight } from '../lib/db';
import { FontFamily } from '../lib/theme';
import { useTheme } from '../lib/themeContext';
import { useLanguage } from '../lib/languageContext';
import { buildReaderHtml, getReaderSettingsScript } from '../lib/readerAssets';

export type ReaderMessage =
  | { type: 'highlight'; id: string; text: string; contextBefore: string; contextAfter: string }
  | { type: 'delete-highlight'; id: string };

type Props = {
  html: string;
  title: string;
  fontSize: number;
  fontFamily: FontFamily;
  defaultColor: string;
  highlights: Highlight[];
  onMessage: (msg: ReaderMessage) => void;
  onScrollProgress: (progress: number) => void;
  scrollToHighlightId?: string | null;
};

export default function ReaderView({
  html,
  title,
  fontSize,
  fontFamily,
  defaultColor,
  highlights,
  onMessage,
  onScrollProgress,
  scrollToHighlightId,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const webViewRef = useRef<WebView>(null);
  const loaded = useRef(false);

  const source = useMemo(
    () => ({ html: buildReaderHtml(title, html, fontSize, fontFamily, defaultColor, highlights, colors) }),
    // highlights and fontSize omitted to preserve WebView state/scroll on updates
    [html, title, defaultColor, colors]
  );

  const injectReaderSettings = useCallback(() => {
    if (!webViewRef.current) return;
    webViewRef.current.injectJavaScript(
      getReaderSettingsScript(fontSize, fontFamily, highlights, colors)
    );
  }, [fontSize, fontFamily, highlights, colors]);

  // Inject font or size changes without reloading the WebView
  useEffect(() => {
    if (!loaded.current) return;
    injectReaderSettings();
  }, [fontSize, fontFamily, injectReaderSettings]);

  // Handle scrolling to a specific highlight
  useEffect(() => {
    if (scrollToHighlightId && loaded.current) {
      webViewRef.current?.injectJavaScript(`window.scrollToHighlight('${scrollToHighlightId}'); true;`);
      const highlight = highlights.find(h => h.id === scrollToHighlightId);
      if (highlight) {
        AccessibilityInfo.announceForAccessibility(`${t.highlightsTitle}: ${highlight.selected_text}`);
      }
    }
  }, [scrollToHighlightId, highlights, t.highlightsTitle]);

  function handleMessage(e: WebViewMessageEvent) {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === 'scroll') {
        onScrollProgress(data.progress as number);
      } else {
        onMessage(data as ReaderMessage);
      }
    } catch(e) {
      console.error(e);
    }
  }

  return (
    <WebView
      ref={webViewRef}
      style={styles.webView}
      source={source}
      javaScriptEnabled
      originWhitelist={['*']}
      showsVerticalScrollIndicator={false}
      onLoadEnd={() => {
        loaded.current = true;
        injectReaderSettings();
      }}
      onMessage={handleMessage}
    />
  );
}

const styles = StyleSheet.create({
  webView: { flex: 1 },
});
