import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, StatusBar, Animated, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { getAllTags } from '@/lib/db';
import { useLanguage } from '@/lib/language';
import { sharedStyles, useTheme } from '@/lib/theme';
import { useThemeTransition } from '@/lib/hooks';
import { FabGroup, SaveUrlSheet, SearchBar, IconButton }  from '@/components';

export default function TagsScreen() {
  const { t } = useLanguage();
  const [showSheet, setShowSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: tags = [], isFetching, refetch } = useQuery({
    queryKey: ['tags', 'all', searchQuery],
    queryFn: async () => {
      const res = await getAllTags(searchQuery);
      if (res.error) throw res.error;
      return res.data || [];
    },
  });

  const { colors, isDark } = useTheme();

  // Smooth theme transition for the background
  const animatedBgColor = useThemeTransition(colors.bgPage);

  const styles = useMemo(() => StyleSheet.create({
    ...sharedStyles(colors),
    tagItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.bgPage,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      gap: 12,
    },
    tagText: {
      flex: 1,
      fontSize: 16,
      color: colors.textPrimary,
      textTransform: 'capitalize',
    },
    empty: {
      flex: 1,
      paddingTop: 100,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 15,
    },
  }), [colors]);

  return (
    <Animated.View style={[styles.container, { backgroundColor: animatedBgColor, flex: 1 }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgPage} translucent={false} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t.nav.tags}</Text>
        </View>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t.articles.searchPlaceholder}
          onClear={() => setSearchQuery('')}
        />
        <FlatList
          data={tags}
          keyExtractor={(item) => item}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.tagItem}
              onPress={() => router.push({ pathname: '/', params: { tag: item } })}
            >
              <IconButton name="pricetag-outline" size={20} color={colors.primary} passive />
              <Text style={styles.tagText}>{item}</Text>
              <IconButton name="chevron-forward" size={16} color={colors.textFaint} passive />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <IconButton name="pricetags-outline" size={48} color={colors.borderMid} passive />
              <Text style={styles.emptyText}>{t.tags.noTagsYet}</Text>
            </View>
          }
          contentContainerStyle={tags.length === 0 && { flex: 1 }}
        />

        <FabGroup
          actions={[
            {
              icon: 'add',
              iconSize: 30,
              onPress: () => setShowSheet(true),
              haptic: Haptics.ImpactFeedbackStyle.Light,
            },
          ]}
        />

        <SaveUrlSheet visible={showSheet} onClose={() => setShowSheet(false)} />
      </SafeAreaView>
    </Animated.View>
  );
}