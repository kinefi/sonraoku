import React, { useEffect, useRef, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLanguage } from '../lib/languageContext';

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
  const { t } = useLanguage();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFinished = useRef(false);
  
  const onErrorRef = useRef(onError);
  const onParsedRef = useRef(onParsed);

  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onParsedRef.current = onParsed; }, [onParsed]);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleInternalError = (msg: string) => {
    if (isFinished.current) return;
    isFinished.current = true;
    clearTimer();
    onErrorRef.current(msg);
  };

  useEffect(() => {
    // Budget for WebView to load the page
    timeoutRef.current = setTimeout(() => {
      handleInternalError(t.timeout);
    }, WEBVIEW_LOAD_TIMEOUT);

    return clearTimer;
  }, []);

  const source = useMemo(() => ({ html }), [html]);

  return (
    <WebView
      style={styles.hidden}
      source={source}
      javaScriptEnabled={true}
      originWhitelist={['*']}
      domStorageEnabled={false} // Readability on static HTML doesn't need storage
      cacheEnabled={false} // Critical for high-volume parsing to avoid disk/memory cache growth
      incognito={true} // Ensures each parse starts with a clean state
      allowFileAccess={false} // Not needed for string source
      allowUniversalAccessFromFileURLs={false} // Security hardening
      mixedContentMode="never" // Security hardening
      onLoadEnd={() => {
        if (isFinished.current) return;
        // Page loaded — now budget only for Readability execution
        clearTimer();
        timeoutRef.current = setTimeout(() => {
          handleInternalError(t.timeout);
        }, PARSE_TIMEOUT);
      }}
      onError={(syntheticEvent) => {
        handleInternalError(syntheticEvent.nativeEvent.description ?? t.pageLoadError);
      }}
      onMessage={(event) => {
        if (isFinished.current) return;
        clearTimer();
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.success) {
            isFinished.current = true;
            onParsedRef.current({
              title: data.title ?? '',
              content: data.content ?? '',
              excerpt: data.excerpt ?? '',
              lang: data.lang ?? '',
            });
          } else {
            handleInternalError(data.error ?? t.parseError);
          }
        } catch (e) {
          handleInternalError(t.resultReadError);
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
