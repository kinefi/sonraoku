import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Highlight } from '../lib/db';
import { buildReaderHtml } from '../lib/readerAssets';

export type ReaderMessage =
  | { type: 'highlight'; id: string; text: string; contextBefore: string; contextAfter: string }
  | { type: 'delete-highlight'; id: string };

type Props = {
  html: string;
  title: string;
  fontSize: number;
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
  defaultColor,
  highlights,
  onMessage,
  onScrollProgress,
  scrollToHighlightId,
}: Props) {
  const webViewRef = useRef<WebView>(null);
  const loaded = useRef(false);

  const source = useMemo(
    () => ({ html: buildReaderHtml(title, html, fontSize, defaultColor, highlights) }),
    // highlights intentionally omitted — WebView manages visual state after initial render;
    // fontSize intentionally omitted — changes are injected via JS to preserve scroll position
    [html, title, defaultColor]
  );

  const injectReaderSettings = useCallback(() => {
    if (!webViewRef.current) return;
    const hsJson = JSON.stringify(highlights);
    webViewRef.current.injectJavaScript(
      `document.body.style.fontSize='${fontSize}px';` +
      `var t=document.querySelector('h1.title');if(t)t.style.fontSize='${fontSize + 6}px';` +
      `window.updateHighlights(${hsJson}); true;`
    );
  }, [fontSize, highlights]);

  // Inject font size changes without reloading the WebView
  useEffect(() => {
    if (!loaded.current) return;
    injectReaderSettings();
  }, [fontSize, injectReaderSettings]);

  // Handle scrolling to a specific highlight
  useEffect(() => {
    if (scrollToHighlightId && loaded.current) {
      webViewRef.current?.injectJavaScript(`window.scrollToHighlight('${scrollToHighlightId}'); true;`);
    }
  }, [scrollToHighlightId]);

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
