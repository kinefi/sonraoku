import React, { useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getArticles, Article, archiveAllReadArticles } from '../../lib/db';
import { colors } from '../../lib/colors';
import { queryClient } from '../../lib/queryClient';
import { sharedStyles } from '../../lib/sharedStyles';
import SwipeableArticleCard from '../../components/SwipeableArticleCard';
import SaveUrlSheet from '../../components/SaveUrlSheet';
import { useLanguage } from '../../lib/languageContext';

type Filter = 'all' | 'unread' | 'offline' | 'archived';

export default function Index() {
  const { tag } = useLocalSearchParams<{ tag?: string }>();
  const [filter, setFilter] = useState<Filter>('all');
  const [showSheet, setShowSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useLanguage();

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

  const handleArchiveAllRead = () => {
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

  return (
    <SafeAreaView style={sharedStyles.container}>
      <StatusBar barStyle="dark-content" translucent={false} />

      <View style={sharedStyles.header}>
        <Text style={sharedStyles.headerTitle}>{t.readingList}</Text>
        {filter !== 'archived' && (
          <TouchableOpacity onPress={handleArchiveAllRead} style={styles.headerAction}>
            <Ionicons name="archive-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tag filter info */}
      {tag && (
        <View style={styles.tagInfo}>
          <Text style={styles.tagInfoText}>{t.filteringByTag(tag)}</Text>
          <TouchableOpacity onPress={() => router.setParams({ tag: undefined })}>
            <Ionicons name="close-circle" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {filters.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.chip, filter === key && styles.chipActive]}
            onPress={() => setFilter(key)}
          >
            <Text style={[styles.chipText, filter === key && styles.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
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
      <TouchableOpacity style={styles.fab} onPress={() => setShowSheet(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <SaveUrlSheet visible={showSheet} onClose={() => setShowSheet(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tagInfoText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 10,
    backgroundColor: colors.white,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.bgMuted,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
  },
  list: {
    paddingTop: 8,
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
    fontWeight: '600',
    color: colors.textFaint,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.placeholder,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabIcon: {
    fontSize: 28,
    color: '#fff',
    lineHeight: 32,
  },
});
