import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient, ParseQueueContext, ParseQueueItem, cacheArticleImages } from '@/lib/reader';
import { initDb, updateArticleContent } from '@/lib/db';
import { ArticleParser } from '@/components';
import { LanguageProvider, useLanguage } from '@/lib/language';
import { ThemeProvider, useTheme } from '@/lib/theme';
import { ToastProvider, useToast } from '@/lib/toast';
// Register background tasks globally
import '@/lib/hooks/backgroundSync';
import { ParseResult } from '@/types/reader';

const MAX_PARSE_RETRIES = 2;

function RootLayoutContent() {
  const [parseQueue, setParseQueue] = useState<ParseQueueItem[]>([]);
  const [isDbReady, setIsDbReady] = useState(false);

  const { colors } = useTheme();

  useEffect(() => {
    const setup = async () => {
      try {
        const result = await initDb();
        if (result.error) {
          console.error('Database migration failed during setup:', result.error);
        }
        setIsDbReady(true);
      } catch (e) {
        console.error('Unexpected error during setup:', e);
        setIsDbReady(true); // Proceed anyway to show error states instead of hanging
      }
    };
    setup();
  }, []);

  const { showToast } = useToast();
  const { t, translate } = useLanguage();

  const addToQueue = useCallback((item: ParseQueueItem) => {
    setParseQueue((prev) => [...prev, item]);
  }, []);

  const handleParsed = useCallback(async (id: string, result: ParseResult) => {
    // Find the specific item in the queue to avoid race conditions
    const queueItem = parseQueue.find(item => item.id === id);
    if (!queueItem) return;

    let cachedHtml = result.content;
    try {
      if (result.content) {
        cachedHtml = await cacheArticleImages(result.content, id);
      }
    } catch (e) {
      console.warn('Image caching failed, using original HTML:', e);
    }

    const { error } = await updateArticleContent(
      id, 
      result.title || queueItem.title || t.articles.untitled, 
      result.excerpt, 
      cachedHtml, 
      result.lang
    );

    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['article', id] });
      showToast({ message: result.title || t.articles.saved, type: 'success' });
    } else {
      console.error(`DB Error saving article ${id}:`, error);
      showToast({ message: t.errors.parseError, type: 'error' });
    }
    
    setParseQueue((prev) => prev.filter(item => item.id !== id));
  }, [parseQueue, t.articles.saved, t.articles.untitled, t.errors.parseError, showToast]);

  const handleParseError = useCallback((id: string, error?: string) => {
    console.warn('Parse failed for article', id, error ? `- ${error}` : '');
    setParseQueue((prev) => {
      const activeJob = prev[0];
      if (activeJob?.id !== id) return prev;

      const retries = activeJob.retries ?? 0;
      if (retries < MAX_PARSE_RETRIES) {
        showToast({
          message: translate('errors.retryAttempt', {
            current: retries + 1,
            max: MAX_PARSE_RETRIES
          }),
          type: 'info'
        });
        return [...prev.slice(1), { ...activeJob, retries: retries + 1 }];
      } else {
        showToast({ message: t.errors.parseFailed, type: 'error' });
      }
      return prev.filter(item => item.id !== id);
    });
  }, [t.errors.parseFailed, translate, showToast]);

  const current = parseQueue[0];

  // Memoize context to prevent full app re-renders when layout re-renders
  const queueContextValue = useMemo(() => ({ addToQueue, parseQueue }), [addToQueue, parseQueue]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <ParseQueueContext.Provider value={queueContextValue}>
          {!isDbReady ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="article/[id]" options={{ headerShown: false }} />
              </Stack>
              {/* Stable container for the parser to prevent layout index shifting */}
              <View style={styles.parserContainer} pointerEvents="none">
                {current && (
                  <ArticleParser
                    key={current.id}
                    html={current.html}
                    onParsed={(result) => handleParsed(current.id, result)}
                    onError={(error) => handleParseError(current.id, error)}
                  />
                )}
              </View>
            </>
          )}
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
  parserContainer: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0.01,
  },
});
