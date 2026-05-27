import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { getArticles, archiveAllReadArticles } from '@/lib/db';
import { ARTICLES_PAGE_SIZE } from '@/lib/constants';
import { useLanguage } from '@/lib/language';
import { useToast } from '@/lib/toast';
import { queryClient } from '@/lib/reader';

export function useReadingList() {
  const { tag } = useLocalSearchParams<{ tag?: string }>();
  const [filter, setFilter] = useState<'all' | 'unread' | 'favorites' | 'offline' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useLanguage();
  const { showToast } = useToast();

  const query = useInfiniteQuery({
    queryKey: ['articles', filter, searchQuery, tag],
    queryFn: async ({ pageParam }) => {
      const res = await getArticles(ARTICLES_PAGE_SIZE, pageParam as number, filter, searchQuery, tag);
      if (res.error) throw res.error;
      return res.data || [];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return (lastPage?.length || 0) < ARTICLES_PAGE_SIZE ? undefined : allPages.length * ARTICLES_PAGE_SIZE;
    },
  });

  const handleArchiveAllRead = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t.articles.archiveAllRead, t.articles.confirmArchiveRead, [
      { text: t.common.back, style: 'cancel' },
      {
        text: t.articles.archiveAllRead,
        onPress: async () => {
          await archiveAllReadArticles();
          queryClient.invalidateQueries({ queryKey: ['articles'] });
          showToast({ message: t.articles.articlesArchived, type: 'success' });
        },
      },
    ]);
  }, [t, showToast]);

  return { ...query, filter, setFilter, searchQuery, setSearchQuery, tag, handleArchiveAllRead };
}
