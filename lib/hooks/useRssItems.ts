import React, { useCallback } from 'react';
import { Alert, Share } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { desc, eq, and, like } from 'drizzle-orm';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { db, rssFeeds, rssItems, articles, RssItemWithFeed } from '@/lib/db';
import { ARTICLES_PAGE_SIZE } from '@/lib/constants';
import { useDeduplicatedInfiniteData } from './useDeduplicatedInfiniteData';
import { RssItem } from '@/components/index';
import { Translations } from '@/lib/language/translations';

interface UseRssItemsProps {
  isUnreadOnly: boolean;
  searchQuery: string;
  selectedFeedId: string | null;
  colors: any;
  t: Translations;
  markReadMutation: any;
  deleteItemMutation: any;
  handleSaveToReadingList: any;
  showToast: (params: { message: string, type: 'success' | 'error' | 'info' }) => void;
}

export function useRssItems({
  isUnreadOnly,
  searchQuery,
  selectedFeedId,
  colors,
  t,
  markReadMutation,
  deleteItemMutation,
  handleSaveToReadingList,
  showToast,
}: UseRssItemsProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isFetching } = useInfiniteQuery({
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

  const flatItems = useDeduplicatedInfiniteData(data?.pages);

  const handlePress = useCallback(async (item: RssItemWithFeed) => {
    if (item.isRead === 0) markReadMutation.mutate(item.id);
    if (item.isDownloaded) {
      router.push(`/article/${item.isDownloaded}`);
    } else {
      const canOpen = await Linking.canOpenURL(item.link);
      if (canOpen) Linking.openURL(item.link);
      else showToast({ message: t.articles.invalidUrl, type: 'error' });
    }
  }, [markReadMutation, t.articles.invalidUrl, showToast]);

  const handleLongPress = useCallback((item: RssItemWithFeed) => {
    Alert.alert(item.title, null, [
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

  const renderItem = useCallback(({ item }: { item: RssItemWithFeed }) => React.createElement(RssItem, {
    item,
    colors,
    t,
    onDelete: (id) => deleteItemMutation.mutate(id),
    onSaveOffline: handleSaveToReadingList,
    onLongPress: handleLongPress,
    onPress: handlePress,
  }), [colors, t, deleteItemMutation, handleSaveToReadingList, handleLongPress, handlePress]);

  return { flatItems, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isFetching, renderItem };
}