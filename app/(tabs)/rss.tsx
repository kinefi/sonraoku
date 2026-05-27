import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, SectionList, ActivityIndicator, RefreshControl, Text, Animated, LayoutAnimation } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { max } from 'drizzle-orm';

import { useTheme, spacing, sharedStyles } from '@/lib/theme';
import { useLanguage } from '@/lib/language';
import { db, rssFeeds } from '@/lib/db';
import { useThemeTransition, useRssActions, useRssFeeds, useRssItems } from '@/lib/hooks';
import { 
  FabGroup, 
  RssSourceHeader, 
  RssManageSheet, 
  RssAddModal, 
  RssSearchBar, 
  RssFilterRow,
  RssHeader,
  RssSyncProgress 
} from '@/components';
import { useToast } from '@/lib/toast';

const RssScreen = () => {
  const { colors } = useTheme();
  const { t, translate } = useLanguage();
  const { showToast } = useToast();
  const backgroundColor = useThemeTransition(colors.bgPage);

  const { 
    addFeedMutation, markReadMutation, deleteItemMutation, 
    markAllReadMutation, clearReadMutation, deleteAllMutation, 
    markFeedReadMutation, deleteFeedMutation, syncAllMutation, 
    handleSaveToReadingList, 
    importMutation, exportMutation 
  } = useRssActions();

  const styles = useMemo(() => StyleSheet.create({
    ...sharedStyles(colors),
    emptyText: { textAlign: 'center', marginTop: 50, opacity: 0.6 },
    listContainer: { padding: spacing.md },
  }), [colors]);

  const [urlInput, setUrlInput] = useState('');
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncingFeedTitle, setSyncingFeedTitle] = useState<string | null>(null);
  const [isUnreadOnly, setIsUnreadOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<'alpha' | 'unread'>('alpha');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [selectedFeedTitle, setSelectedFeedTitle] = useState<string | null>(null);
  const [expandedFeeds, setExpandedFeeds] = useState<Set<string>>(new Set());
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isManageModalVisible, setIsManageModalVisible] = useState(false);

  const { 
    flatItems, fetchNextPage, hasNextPage, 
    isFetchingNextPage, isLoading, isFetching, renderItem 
  } = useRssItems({
    isUnreadOnly,
    searchQuery,
    selectedFeedId,
    colors,
    t,
    markReadMutation,
    deleteItemMutation,
    handleSaveToReadingList,
    showToast,
  });
  
  const toggleSection = useCallback((feedId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFeeds(prev => {
      const next = new Set(prev);
      if (next.has(feedId)) next.delete(feedId);
      else next.add(feedId);
      return next;
    });
  }, []);

  const { feeds, sections } = useRssFeeds({
    flatItems,
    expandedFeeds,
    selectedFeedId,
    sortOrder,
  });

  // Get the latest sync time across all feeds
  const { data: lastSyncTime } = useQuery({
    queryKey: ['rss-last-sync'],
    queryFn: async () => {
      const result = await db.select({ lastSync: max(rssFeeds.last_synced_at) }).from(rssFeeds);
      return result[0]?.lastSync;
    },
  });

  const handleSync = useCallback(() => {
    setSyncProgress(0);
    setSyncingFeedTitle(null);
    syncAllMutation.mutate((p, title) => {
      setSyncProgress(p);
      if (title) setSyncingFeedTitle(title);
    });
  }, [syncAllMutation, setSyncProgress, setSyncingFeedTitle]);

  const handleImport = useCallback(() => {
    setSyncProgress(0);
    setSyncingFeedTitle(null);
    importMutation.mutate((c, t, title) => {
      setSyncProgress(c / t);
      if (title) setSyncingFeedTitle(title);
    });
  }, [importMutation, setSyncProgress, setSyncingFeedTitle]);

  const isSyncing = syncAllMutation.isPending || importMutation.isPending;

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      <RssHeader 
        title={selectedFeedTitle}
        lastSyncTime={lastSyncTime}
        selectedFeedId={selectedFeedId}
        colors={colors}
        t={t}
        translate={translate}
        onBack={() => {
          setSelectedFeedId(null);
          setSelectedFeedTitle(null);
        }}
      />

      <RssSearchBar 
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={t.rss.searchPlaceholder}
      />

      <RssFilterRow 
        sortOrder={sortOrder}
        onToggleSort={() => setSortOrder(prev => prev === 'alpha' ? 'unread' : 'alpha')}
        isUnreadOnly={isUnreadOnly}
        onToggleUnreadOnly={() => setIsUnreadOnly(!isUnreadOnly)}
        onManage={() => setIsManageModalVisible(true)}
        onClearRead={() => clearReadMutation.mutate()}
        onMarkAllRead={() => markAllReadMutation.mutate()}
      />

      <RssSyncProgress 
        isVisible={isSyncing}
        isImporting={importMutation.isPending}
        progress={syncProgress}
        title={syncingFeedTitle}
        colors={colors}
        t={t}
      />

      {isLoading ? <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} /> : <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <RssSourceHeader
            id={section.id}
            title={section.title}
            unreadCount={section.unreadCount}
            isExpanded={expandedFeeds.has(section.id)}
            isFiltered={!!selectedFeedId}
            colors={colors}
            onToggle={(id) => {
              if (selectedFeedId) { setSelectedFeedId(null); setSelectedFeedTitle(null); }
              else toggleSection(id);
            }}
          />
        )}
        stickySectionHeadersEnabled={true}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={(isFetching && !isFetchingNextPage) || isSyncing} 
            onRefresh={handleSync} 
            tintColor={colors.primary} 
          />
        }
        ListFooterComponent={
          isFetchingNextPage && !isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
          ) : null
        }
        ListEmptyComponent={
          !isLoading && <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t.rss.noFeeds}</Text>
        }
      />}

      <FabGroup
        actions={[
          {
            icon: 'add',
            iconSize: 24,
            onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsAddModalVisible(true); },
            haptic: Haptics.ImpactFeedbackStyle.Light,
            variant: 'filled',
          },
        ]}
      />

      <RssAddModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        urlInput={urlInput}
        onUrlChange={setUrlInput}
        isPending={addFeedMutation.isPending}
        onSave={() => addFeedMutation.mutate(urlInput, {
          onSuccess: () => { setUrlInput(''); setIsAddModalVisible(false); }
        })}
      />

      <RssManageSheet 
        visible={isManageModalVisible}
        onClose={() => setIsManageModalVisible(false)}
        feeds={feeds || []}
        onReorder={() => {}} // Disabled as we are moving to automatic sorting
        onDeleteFeed={(id) => deleteFeedMutation.mutate(id)}
        onMarkFeedRead={(id) => markFeedReadMutation.mutate(id)}
        onImport={handleImport}
        onExport={() => exportMutation.mutate()}
        onDeleteAll={() => deleteAllMutation.mutate()}
        onClearRead={() => clearReadMutation.mutate()}
      />
    </Animated.View>
  );
};

export default RssScreen;