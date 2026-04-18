import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { ParseQueueContext, ParseQueueItem } from '../lib/parseQueue';
import { initDb, updateArticleContent } from '../lib/db';
import { cacheArticleImages } from '../lib/imageCache';
import ArticleParser, { ParseResult } from '../components/ArticleParser';
import { LanguageProvider, useLanguage } from '../lib/languageContext';
import { ThemeProvider } from '../lib/themeContext';
import { ToastProvider, useToast } from '../lib/toastContext';
import { interpolate } from '../lib/translations';

const MAX_PARSE_RETRIES = 2;

function RootLayoutContent() {
  const [parseQueue, setParseQueue] = useState<ParseQueueItem[]>([]);
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    const setup = async () => {
      try {
        await initDb();
        setIsDbReady(true);
      } catch (e) {
        console.error('Database initialization failed:', e);
        setIsDbReady(true); // Proceed anyway to show error states instead of hanging
      }
    };
    setup();
  }, []);

  const { showToast } = useToast();
  const { t } = useLanguage();

  const addToQueue = useCallback((item: ParseQueueItem) => {
    setParseQueue((prev) => [...prev, item]);
  }, []);

  const handleParsed = useCallback((id: string, result: ParseResult) => {
    // Ensure we are still processing the correct item
    setParseQueue((prev) => {
      if (prev[0]?.id !== id) return prev;

      (async () => {
        let cachedHtml = result.content;
        try {
          cachedHtml = await cacheArticleImages(result.content, id);
        } catch (e) {
          console.warn('Image caching failed, using original HTML:', e);
          showToast({ message: t.imageCachingFailed, type: 'info' });
        }
        await updateArticleContent(id, result.title, result.excerpt, cachedHtml, result.lang);
        queryClient.invalidateQueries({ queryKey: ['articles'] });
        queryClient.invalidateQueries({ queryKey: ['article', id] });
        showToast({ message: result.title || t.articleSaved, type: 'success' });
      })();

      return prev.slice(1);
    });
  }, []);

  const handleParseError = useCallback((id: string, error?: string) => {
    console.warn('Parse failed for article', id, error ? `- ${error}` : '');
    setParseQueue((prev) => {
      const activeJob = prev[0];
      if (activeJob?.id !== id) return prev;

      const retries = activeJob.retries ?? 0;
      if (retries < MAX_PARSE_RETRIES) {
        showToast({
          message: interpolate(t.retryAttempt, {
            n: retries + 1,
            max: MAX_PARSE_RETRIES
          }),
          type: 'info'
        });
        return [...prev.slice(1), { ...activeJob, retries: retries + 1 }];
      } else {
        showToast({ message: t.parseFailed, type: 'error' });
      }
      return prev.slice(1);
    });
  }, []);

  const current = parseQueue[0];

  // Memoize context to prevent full app re-renders when layout re-renders
  const queueContextValue = useMemo(() => ({ addToQueue }), [addToQueue]);

  if (!isDbReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#534AB7" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <ParseQueueContext.Provider value={queueContextValue}>
          {current && (
            <ArticleParser
              key={current.id}
              html={current.html}
              onParsed={(result) => handleParsed(current.id, result)}
              onError={(error) => handleParseError(current.id, error)}
            />
          )}
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="article/[id]" options={{ headerShown: false }} />
          </Stack>
        </ParseQueueContext.Provider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <RootLayoutContent />
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
