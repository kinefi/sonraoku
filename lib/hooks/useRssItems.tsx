import React, { useCallback } from 'react';
import { Alert, Share } from 'react-native';
import { useInfiniteQuery, InfiniteData } from '@tanstack/react-query';
import { desc, eq, and, like } from 'drizzle-orm';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { db, rssFeeds, rssItems, articles } from '@/lib/db';
import { RssItemWithFeed } from '@/lib/db/types';
import { ARTICLES_PAGE_SIZE } from '@/lib/constants';
import RssItem from '@/components/rss/RssItem';
import { useDeduplicatedInfiniteData } from '@/lib/hooks/useDeduplicatedInfiniteData';
import { useTheme } from '@/lib/theme';
import { useLanguage } from '@/lib/language';
import { useRssActions } from '@/lib/hooks/useRssActions';
import { useToast } from '@/lib/toast';

// Define the exact shape returned by the queryFn to ensure type safety for isDownloaded
type RssItemQueryResult = RssItemWithFeed & { isDownloaded: string | null };

interface UseRssItemsProps {
  isUnreadOnly: boolean;
  searchQuery: string;
  selectedFeedId: string | null;
}

export function useRssItems({
  isUnreadOnly,
  searchQuery,
  selectedFeedId,
}: UseRssItemsProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { markReadMutation, deleteItemMutation, handleSaveToReadingList } = useRssActions();
  const { showToast } = useToast();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isFetching } = useInfiniteQuery<
    RssItemQueryResult[],
    Error,
    InfiniteData<RssItemQueryResult[], number>,
    any[],
    number
  >({
    queryKey: ['rss-items', isUnreadOnly, searchQuery, selectedFeedId],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const conditions = [];
      if (isUnreadOnly) conditions.push(eq(rssItems.is_read, 0));
      if (searchQuery) conditions.push(like(rssItems.title, `%${searchQuery}%`));
      if (selectedFeedId) conditions.push(eq(rssItems.feed_id, selectedFeedId));

      const baseQuery = db.select({
        id: rssItems.id,
        feedId: rssItems.feed_id,
        title: rssItems.title,
        link: rssItems.link,
        excerpt: rssItems.excerpt,
        pubDate: rssItems.pub_date,
        isRead: rssItems.is_read,
        feedTitle: rssFeeds.title,
        isDownloaded: articles.id,
      })
        .from(rssItems)
        .innerJoin(rssFeeds, eq(rssItems.feed_id, rssFeeds.id))
        .leftJoin(articles, eq(rssItems.link, articles.url));

      const finalQuery = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

      return await finalQuery
        .orderBy(desc(rssItems.pub_date))
        .limit(ARTICLES_PAGE_SIZE)
        .offset(pageParam as number);
    },
    getNextPageParam: (lastPage, allPages) => {
      return (lastPage?.length || 0) < ARTICLES_PAGE_SIZE ? undefined : allPages.length * ARTICLES_PAGE_SIZE;
    },
  });

  const flatItems = useDeduplicatedInfiniteData<RssItemQueryResult>(data?.pages);

  const handlePress = useCallback(async (item: RssItemQueryResult) => {
    if (item.isRead === 0) markReadMutation.mutate(item.id);
    if (item.isDownloaded) {
      router.push(`/article/${item.isDownloaded}`);
    } else {
      const canOpen = await Linking.canOpenURL(item.link);
      if (canOpen) Linking.openURL(item.link);
      else showToast({ message: t.articles.invalidUrl, type: 'error' });
    }
  }, [markReadMutation, t.articles.invalidUrl, showToast]);

  const handleLongPress = useCallback((item: RssItemQueryResult) => {
    Alert.alert(item.title, '', [
      { text: t.common.share, onPress: () => Share.share({ url: item.link, message: item.title }) },
      {
        text: t.articles.openInBrowser,
        onPress: async () => {
          const canOpen = await Linking.canOpenURL(item.link);
          if (canOpen) Linking.openURL(item.link);
        }
      },
      { text: t.common.cancel, style: 'cancel' }
    ], { cancelable: true });
  }, [t]);

  const renderItem = useCallback(({ item }: { item: RssItemQueryResult }) => (
    <RssItem
      item={item}
      colors={colors}
      onDelete={(id: string) => deleteItemMutation.mutate(id)}
      onSaveOffline={handleSaveToReadingList}
      onLongPress={handleLongPress}
      onPress={handlePress}
    />
  ), [colors, deleteItemMutation, handleSaveToReadingList, handleLongPress, handlePress]);

  return { flatItems, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isFetching, renderItem };
}
