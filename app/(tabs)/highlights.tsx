import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, StatusBar, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { HighlightWithArticle } from '@/lib/db';
import { useLanguage } from '@/lib/language';
import { useTheme, sharedStyles } from '@/lib/theme';
import { useThemeTransition, useHighlights } from '@/lib/hooks';
import { FabGroup, SaveUrlSheet, SearchBar, IconButton, EmptyState } from '@/components';

export default function HighlightsScreen() {
  const { t } = useLanguage();
  const [showSheet, setShowSheet] = useState(false);
  const { colors, isDark } = useTheme();

  const { 
    data: highlights = [], isFetching, refetch, 
    searchQuery, setSearchQuery, handleDelete, handleShare, handleCopy 
  } = useHighlights();


  // Smooth theme transition for the background
  const animatedBgColor = useThemeTransition(colors.bgPage);

  const styles = useMemo(() => StyleSheet.create({
    ...sharedStyles(colors),
    itemRow: {
      flexDirection: 'row',
      backgroundColor: colors.bgPage,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    itemContent: {
      flex: 1,
      paddingLeft: 20,
      paddingVertical: 16,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingRight: 10,
    },
    actionBtn: {
      padding: 10,
    },
    articleTitle: {
      fontSize: 11,
      color: colors.primary,
      fontWeight: '700',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    text: {
      fontSize: 15,
      color: colors.textPrimary,
      lineHeight: 22,
      marginBottom: 8,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    date: {
      fontSize: 11,
      color: colors.textFaint,
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

  const renderHighlightItem = useCallback(({ item }: { item: HighlightWithArticle }) => (
    <View style={styles.itemRow}>
      <TouchableOpacity
        style={styles.itemContent}
        onPress={() =>
          router.push({
            pathname: '/article/[id]',
            params: { id: item.article_id, highlightId: item.id }
          })
        }
      >
        <Text style={styles.articleTitle} numberOfLines={1}>
          {item.article_title || t.articles.untitled}
        </Text>
        <Text style={styles.text} numberOfLines={3}>
          {item.selected_text}
        </Text>
        <View style={styles.footer}>
          <IconButton name="time-outline" size={12} color={colors.textFaint} passive />
          <Text style={styles.date}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.actions}>
        <IconButton
          name="copy-outline"
          size={18}
          onPress={() => handleCopy(item.selected_text)}
          accessibilityLabel={t.common.copy}
        />
        <IconButton
          name="share-social-outline"
          size={18}
          onPress={() => handleShare(item.selected_text)}
          accessibilityLabel={t.common.share}
        />
        <IconButton
          name="trash-outline"
          size={18}
          color={colors.error}
          onPress={() => handleDelete(item.id)}
          accessibilityLabel={t.common.delete}
        />
      </View>
    </View>
  ), [colors, handleCopy, handleShare, handleDelete, t, styles]);

  return (
    <Animated.View style={[styles.container, { backgroundColor: animatedBgColor, flex: 1 }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgPage} translucent={false} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t.nav.highlights}</Text>
        </View>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t.articles.searchPlaceholder}
          onClear={() => setSearchQuery('')}
        />
        <FlatList
          data={highlights}
          keyExtractor={(item) => item.id}
          renderItem={renderHighlightItem}
          refreshing={isFetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <EmptyState 
              icon="bookmarks-outline"
              title={t.highlights.noHighlightsYet}
            />
          }
          contentContainerStyle={highlights.length === 0 && { flex: 1 }}
        />

        <FabGroup
          actions={[
            {
              icon: 'add',
              iconSize: 24,
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