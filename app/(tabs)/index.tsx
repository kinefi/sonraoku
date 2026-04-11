import React, { useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { getAllArticles, Article } from '../../lib/db';
import SwipeableArticleCard from '../../components/SwipeableArticleCard';
import SaveUrlSheet from '../../components/SaveUrlSheet';

type Filter = 'all' | 'unread' | 'offline' | 'archived';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'unread', label: 'Okunmamış' },
  { key: 'offline', label: 'Çevrimdışı' },
  { key: 'archived', label: 'Arşivlenmiş' },
];

function applyFilter(articles: Article[], filter: Filter): Article[] {
  switch (filter) {
    case 'unread':
      return articles.filter((a) => !a.is_read && !a.is_archived);
    case 'offline':
      return articles.filter((a) => a.html_content !== null && !a.is_archived);
    case 'archived':
      return articles.filter((a) => !!a.is_archived);
    default:
      return articles.filter((a) => !a.is_archived);
  }
}

export default function Index() {
  const [filter, setFilter] = useState<Filter>('all');
  const [showSheet, setShowSheet] = useState(false);

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: getAllArticles,
  });

  const filtered = applyFilter(articles, filter);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" translucent={false} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sonra Oku</Text>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map(({ key, label }) => (
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
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Herhangi bir yazı yok.</Text>
            <Text style={styles.emptyHint}>İlk yazınızı eklemek için + tuşuna basın.</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  chipActive: {
    backgroundColor: '#534AB7',
  },
  chipText: {
    fontSize: 13,
    color: '#555',
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
    color: '#aaa',
  },
  emptyHint: {
    fontSize: 13,
    color: '#bbb',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#534AB7',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#534AB7',
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
