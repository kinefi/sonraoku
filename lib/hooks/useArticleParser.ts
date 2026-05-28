import { useEffect, useRef, useMemo, useCallback } from 'react';
import { WebViewMessageEvent } from 'react-native-webview';
import { useLanguage } from '@/lib/language';
import { TIMEOUTS } from '@/lib/constants';
import { ParseResult } from '@/types/reader';

interface UseArticleParserProps {
  html: string;
  onParsed: (result: ParseResult) => void;
  onError: (error: string) => void;
}

export function useArticleParser({ html, onParsed, onError }: UseArticleParserProps) {
  const { t } = useLanguage();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFinished = useRef(false);
  
  const onErrorRef = useRef(onError);
  const onParsedRef = useRef(onParsed);

  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onParsedRef.current = onParsed; }, [onParsed]);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleInternalError = useCallback((msg: string) => {
    if (isFinished.current) return;
    isFinished.current = true;
    clearTimer();
    onErrorRef.current(msg);
  }, [clearTimer]);

  useEffect(() => {
    // Budget for WebView to load the page
    timeoutRef.current = setTimeout(() => {
      handleInternalError(t.reader.timeout);
    }, TIMEOUTS.WEBVIEW_LOAD);

    return clearTimer;
  }, [handleInternalError, t.reader.timeout, clearTimer]);

  const source = useMemo(() => ({ html }), [html]);

  const onLoadEnd = useCallback(() => {
    if (isFinished.current) return;
    // Page loaded — now budget only for Readability execution
    clearTimer();
    timeoutRef.current = setTimeout(() => {
      handleInternalError(t.reader.timeout);
    }, TIMEOUTS.PARSER_EXECUTION);
  }, [clearTimer, handleInternalError, t.reader.timeout]);

  const onWebViewError = useCallback((description: string) => {
    handleInternalError(description);
  }, [handleInternalError]);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
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
        handleInternalError(data.error ?? t.errors.parseError);
      }
    } catch {
      handleInternalError(t.errors.resultReadError);
    }
  }, [clearTimer, handleInternalError, t.errors.parseError, t.errors.resultReadError]);

  return {
    source,
    onLoadEnd,
    onWebViewError,
    onMessage,
  };
}