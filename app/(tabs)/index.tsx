import React, { useState, useMemo } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { getArticles, archiveAllReadArticles } from '../../lib/db';
import { interpolate } from '../../lib/translations';
import { queryClient } from '../../lib/queryClient';
import { sharedStyles, spacing, borderRadius, typography } from '../../lib/theme';
import { useTheme } from '../../lib/themeContext';

import SwipeableArticleCard from '../../components/SwipeableArticleCard';
import SaveUrlSheet from '../../components/SaveUrlSheet';
import { useLanguage } from '../../lib/languageContext';
import FabGroup from '../../components/FabGroup';
import SearchBar from '../../components/SearchBar';
import IconButton from '../../components/IconButton';

type Filter = 'all' | 'unread' | 'offline' | 'archived';

export default function Index() {
  const { tag } = useLocalSearchParams<{ tag?: string }>();
  const [filter, setFilter] = useState<Filter>('all');
  const [showSheet, setShowSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t.all },
    { key: 'unread', label: t.unread },
    { key: 'offline', label: t.offline },
    { key: 'archived', label: t.archived },
  ];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['articles', filter, searchQuery, tag],
    queryFn: ({ pageParam }) => getArticles(20, pageParam, filter, searchQuery, tag),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length < 20 ? undefined : allPages.length * 20;
    },
  });

  const filtered = data?.pages.flat() ?? [];
  const hasReadArticles = filtered.some((a) => a.is_read === 1);

  const handleArchiveAllRead = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t.archiveAllRead, t.confirmArchiveRead, [
      { text: t.back, style: 'cancel' },
      {
        text: t.archiveAllRead,
        onPress: () => {
          archiveAllReadArticles();
          queryClient.invalidateQueries({ queryKey: ['articles'] });
        },
      },
    ]);
  };

  const styles = useMemo(() => StyleSheet.create({
    ...sharedStyles(colors),
    headerAction: {
      padding: spacing.xs,
    },
    searchContainer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      backgroundColor: colors.white,
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
      paddingBottom: spacing.lg,
      paddingTop: spacing.lg,
      backgroundColor: colors.white,
      gap: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    chip: {
      paddingHorizontal: spacing.md + 2,
      paddingVertical: spacing.sm - 2,
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
      paddingBottom: 80,
    },
    emptyList: {
      flex: 1,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgPage} translucent={false} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.readingList}</Text>
      </View>

      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={t.searchPlaceholder}
        onClear={() => setSearchQuery('')}
      />

      {/* Tag filter info */}
      {tag && (
        <View style={styles.tagInfo}>
          <Text style={styles.tagInfoText}>{interpolate(t.filteringByTag, { tag })}</Text>
          <IconButton
            name="close-circle"
            size={18}
            onPress={() => router.setParams({ tag: undefined })}
            accessibilityLabel={t.cancel}
            style={{ padding: 2 }}
          />
        </View>
      )}

      {/* Filter chips */}
      <View style={styles.filterRow}>
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
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SwipeableArticleCard article={item} onPress={() => router.push(`/article/${item.id}`)} />
        )}
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
            <Text style={styles.emptyText}>{t.noArticles}</Text>
            <Text style={styles.emptyHint}>{t.noArticlesHint}</Text>
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
            iconSize: 30,
            onPress: () => setShowSheet(true),
            haptic: Haptics.ImpactFeedbackStyle.Light,
            variant: 'filled',
          },
        ]}
      />

      <SaveUrlSheet visible={showSheet} onClose={() => setShowSheet(false)} />
    </SafeAreaView>
  );
}
