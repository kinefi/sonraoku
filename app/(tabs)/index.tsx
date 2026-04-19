import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { getArticles, archiveAllReadArticles, Article } from '@/lib/db';
import { useLanguage } from '@/lib/language';
import { queryClient } from '@/lib/reader';
import { sharedStyles, spacing, borderRadius, typography, useTheme } from '@/lib/theme';
import { ARTICLES_PAGE_SIZE } from '@/lib/constants';
import { useThemeTransition } from '@/lib/hooks';
import { 
  SwipeableArticleCard, 
  SaveUrlSheet, 
  FabGroup, 
  SearchBar, 
  IconButton 
} from '@/components';
import { useToast } from '@/lib/toast';

type Filter = 'all' | 'unread' | 'favorites' | 'offline' | 'archived';

export default function Index() {
  const { tag } = useLocalSearchParams<{ tag?: string }>();
  const [filter, setFilter] = useState<Filter>('all');
  const [showSheet, setShowSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { t, translate } = useLanguage();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  // Smooth theme transition for the main list background
  const animatedBgColor = useThemeTransition(colors.bgPage);

  const filters: { key: Filter; label: string }[] = useMemo(() => [
    { key: 'all', label: t.common.all },
    { key: 'unread', label: t.articles.unread },
    { key: 'favorites', label: t.articles.favorites },
    { key: 'offline', label: t.articles.offline },
    { key: 'archived', label: t.articles.archived },
  ], [t]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ['articles', filter, searchQuery, tag],
    queryFn: async ({ pageParam }) => {
      const res = await getArticles(ARTICLES_PAGE_SIZE, pageParam, filter, searchQuery, tag);
      if (res.error) throw res.error;
      return res.data || [];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return (lastPage?.length || 0) < ARTICLES_PAGE_SIZE ? undefined : allPages.length * ARTICLES_PAGE_SIZE;
    },
  });

  const filtered = useMemo(() => {
    const allItems = data?.pages.flat() ?? [];
    // Deduplicate by ID to prevent "unique key" warnings during pagination shifts
    const seen = new Set();
    return allItems.filter((item) => {
      if (!item || !item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [data?.pages]);

  const hasReadArticles = filtered.some((a) => a.is_read === 1);

  const handleArchiveAllRead = () => {
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
  };

  const renderArticleItem = useCallback(({ item }: { item: Article }) => (
    <SwipeableArticleCard 
      article={item} 
      onPress={() => router.push(`/article/${item.id}`)} 
    />
  ), []);

  const styles = useMemo(() => StyleSheet.create({
    ...sharedStyles(colors),
    headerAction: {
      padding: spacing.xs,
    },
    searchContainer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      backgroundColor: colors.bgPage,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgMuted,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      height: 40,
    },
    searchIcon: {
      marginRight: spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
    },
    tagInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgPage,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    tagInfoText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      gap: spacing.xs + 2,
    },
    chip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs + 2,
      borderRadius: borderRadius.xxl,
      backgroundColor: colors.bgMuted,
    },
    chipActive: {
      backgroundColor: colors.primary,
    },
    chipText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: typography.weights.medium,
    },
    chipTextActive: {
      color: colors.white,
    },
    list: {
      paddingTop: spacing.sm,
      paddingBottom: 100, // Increased to give the FAB group more breathing room
    },
    emptyList: {
      flexGrow: 1,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 100, // Ensure FAB doesn't cover the "No articles" hint
      paddingTop: 80,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: typography.weights.semibold,
      color: colors.textFaint,
    },
    emptyHint: {
      fontSize: 13,
      color: colors.placeholder,
      marginTop: spacing.xs,
    },
  }), [colors]);

  return (
    <Animated.View style={[styles.container, { backgroundColor: animatedBgColor, flex: 1 }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgPage} translucent={false} />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t.nav.readingList}</Text>
        </View>

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t.articles.searchPlaceholder}
          onClear={() => setSearchQuery('')}
        />

        {/* Tag filter info */}
        {tag && (
          <View style={styles.tagInfo}>
            <Text style={styles.tagInfoText}>{translate('tags.filtering', { tag })}</Text>
            <IconButton
              name="close-circle"
              size={18}
              onPress={() => router.setParams({ tag: undefined })}
              accessibilityLabel={t.common.cancel}
              style={{ padding: 2 }}
            />
          </View>
        )}

        {/* Filter chips */}
        <View style={{ backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {filters.map(({ key, label }) => (
              <IconButton
                key={key}
                label={label}
                variant={filter === key ? 'filled' : 'ghost'}
                onPress={() => setFilter(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: filter === key }}
                style={[styles.chip, filter === key && styles.chipActive]}
                labelStyle={[styles.chipText, filter === key && styles.chipTextActive]}
              />
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isFetchingNextPage}
              onRefresh={refetch}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          renderItem={renderArticleItem}
          contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.list}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t.articles.noArticles}</Text>
              <Text style={styles.emptyHint}>{t.articles.noArticlesHint}</Text>
            </View>
          }
        />

        {/* FAB */}
        <FabGroup
          actions={[
            {
              icon: 'archive-outline',
              onPress: handleArchiveAllRead,
              visible: filter !== 'archived' && hasReadArticles,
              haptic: Haptics.ImpactFeedbackStyle.Medium,
              variant: 'filled',
            },
            {
              icon: 'add',
              iconSize: 24, // Standard 24px size usually provides the best optical balance for "plus" icons
              onPress: () => setShowSheet(true),
              haptic: Haptics.ImpactFeedbackStyle.Light,
              variant: 'filled',
            },
          ]}
        />

        <SaveUrlSheet visible={showSheet} onClose={() => setShowSheet(false)} />
      </SafeAreaView>
    </Animated.View>
  );
}
