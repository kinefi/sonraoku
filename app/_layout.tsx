import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { ParseQueueContext, ParseQueueItem } from '../lib/parseQueue';
import { initDb, updateArticleContent } from '../lib/db';
import { cacheArticleImages } from '../lib/imageCache';
import ArticleParser, { ParseResult } from '../components/ArticleParser';
import { LanguageProvider } from '../lib/languageContext';

const MAX_PARSE_RETRIES = 2;

export default function RootLayout() {
  const [parseQueue, setParseQueue] = useState<ParseQueueItem[]>([]);

  useEffect(() => {
    try {
      initDb();
    } catch (e) {
      console.error('Database initialization failed:', e);
    }
  }, []);

  const addToQueue = useCallback((item: ParseQueueItem) => {
    setParseQueue((prev) => [...prev, item]);
  }, []);

  const handleParsed = useCallback(async (id: string, result: ParseResult) => {
    let cachedHtml = result.content;
    try {
      cachedHtml = await cacheArticleImages(result.content, id);
    } catch (e) {
      console.warn('Image caching failed, using original HTML:', e);
    }
    updateArticleContent(id, result.title, result.excerpt, cachedHtml, result.lang);
    queryClient.invalidateQueries({ queryKey: ['articles'] });
    queryClient.invalidateQueries({ queryKey: ['article', id] });
    setParseQueue((prev) => prev.slice(1));
  }, []);

  const handleParseError = useCallback((id: string, error?: string) => {
    console.warn('Parse failed for article', id, error ? `- ${error}` : '');
    setParseQueue((prev) => {
      const current = prev[0];
      const retries = current?.retries ?? 0;
      if (retries < MAX_PARSE_RETRIES) {
        return [...prev.slice(1), { ...current, retries: retries + 1 }];
      }
      return prev.slice(1);
    });
  }, []);

  const current = parseQueue[0];

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <ParseQueueContext.Provider value={{ addToQueue }}>
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
        </LanguageProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
