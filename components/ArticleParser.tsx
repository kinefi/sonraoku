import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export type ParseResult = {
  title: string;
  content: string;
  excerpt: string;
  lang: string;
};

type Props = {
  html: string;
  onParsed: (result: ParseResult) => void;
  onError: (error: string) => void;
};

const WEBVIEW_LOAD_TIMEOUT = 20000;
const PARSE_TIMEOUT = 15000;

export default function ArticleParser({ html, onParsed, onError }: Props) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    // Budget for WebView to load the page
    timeoutRef.current = setTimeout(() => {
      onErrorRef.current('Zaman aşımı');
    }, WEBVIEW_LOAD_TIMEOUT);

    return clearTimer;
  }, []);

  return (
    <WebView
      style={styles.hidden}
      source={{ html }}
      javaScriptEnabled={true}
      originWhitelist={['*']}
      domStorageEnabled={true}
      allowFileAccess={true}
      allowUniversalAccessFromFileURLs={true}
      mixedContentMode="always"
      onLoadEnd={() => {
        // Page loaded — now budget only for Readability execution
        clearTimer();
        timeoutRef.current = setTimeout(() => {
          onErrorRef.current('Zaman aşımı');
        }, PARSE_TIMEOUT);
      }}
      onError={(syntheticEvent) => {
        clearTimer();
        onErrorRef.current(syntheticEvent.nativeEvent.description ?? 'Sayfa yüklenemedi');
      }}
      onMessage={(event) => {
        clearTimer();
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.success) {
            onParsed({
              title: data.title ?? '',
              content: data.content ?? '',
              excerpt: data.excerpt ?? '',
              lang: data.lang ?? '',
            });
          } else {
            onErrorRef.current(data.error ?? 'İçerik ayrıştırılamadı');
          }
        } catch (e) {
          onErrorRef.current('Sonuç okunamadı');
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
