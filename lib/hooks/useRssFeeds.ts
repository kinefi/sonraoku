import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { eq, and } from 'drizzle-orm';
import { db, rssFeeds, rssItems } from '@/lib/db';
import { RssItemWithFeed } from '@/lib/db/types';
import { useLanguage } from '@/lib/language';

interface UseRssFeedsParams {
  flatItems: RssItemWithFeed[];
  expandedFeeds: Set<string>;
  selectedFeedId: string | null;
  sortOrder: 'alpha' | 'unread';
}

export function useRssFeeds({
  flatItems,
  expandedFeeds,
  selectedFeedId,
  sortOrder,
}: UseRssFeedsParams) {
  const { t } = useLanguage();

  // Get all feeds with unread counts
  const { data: feeds, isLoading } = useQuery({
    queryKey: ['rss-feeds-list'],
    queryFn: async () => {
      const results = await db.select().from(rssFeeds);
      const feedsWithCounts = await Promise.all(
        results.map(async (feed) => {
          const unread = await db
            .select()
            .from(rssItems)
            .where(and(eq(rssItems.feed_id, feed.id), eq(rssItems.is_read, 0)));
          return { ...feed, unreadCount: unread.length };
        })
      );
      return feedsWithCounts;
    },
  });

  const sections = useMemo(() => {
    const feedList = feeds ?? [];

    // Optimization: Group items by feedId once O(M)
    const itemsByFeed = flatItems.reduce((acc, item: RssItemWithFeed) => {
      if (!acc[item.feedId]) acc[item.feedId] = [];
      acc[item.feedId].push(item);
      return acc;
    }, {} as Record<string, RssItemWithFeed[]>);

    // Sort feeds based on criteria
    const sortedFeeds = [...feedList].sort((a, b) => {
      if (sortOrder === 'unread') {
        return (b.unreadCount || 0) - (a.unreadCount || 0);
      }
      return (a.title || '').localeCompare(b.title || '');
    });

    return sortedFeeds
      .filter((f) => !selectedFeedId || f.id === selectedFeedId)
      .map((feed) => {
        const isExpanded = expandedFeeds.has(feed.id) || !!selectedFeedId;
        return {
          id: feed.id,
          title: feed.title || t.articles.untitled,
          unreadCount: feed.unreadCount,
          data: isExpanded ? itemsByFeed[feed.id] || [] : [],
        };
      });
  }, [flatItems, feeds, expandedFeeds, selectedFeedId, t, sortOrder]);

  return { feeds, sections, isLoading };
}