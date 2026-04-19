import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Share, StatusBar, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { getAllHighlights, deleteHighlight, HighlightWithArticle } from '@/lib/db';
import { queryClient } from '@/lib/reader';
import { useLanguage } from '@/lib/language';
import { useTheme, sharedStyles } from '@/lib/theme';
import { useThemeTransition } from '@/lib/hooks';
import { FabGroup, SaveUrlSheet, SearchBar, IconButton } from '@/components';
import { useToast } from '@/lib/toast';

export default function HighlightsScreen() {
  const { t, translate } = useLanguage();
  const [showSheet, setShowSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: highlights = [], isFetching, refetch } = useQuery({
    queryKey: ['highlights', 'all', searchQuery],
    queryFn: async () => {
      const res = await getAllHighlights(searchQuery);
      if (res.error) throw res.error;
      return res.data || [];
    },
  });

  const { showToast } = useToast();

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t.common.delete, t.common.confirmDelete, [
      { text: t.common.back, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => {
          deleteHighlight(id);
          queryClient.invalidateQueries({ queryKey: ['highlights'] });
        },
      },
    ]);
  };

  const handleShare = async (item: HighlightWithArticle) => {
    try {
      await Share.share({
        message: item.article_title
          ? `"${item.selected_text}"\n\n— ${item.article_title}`
          : item.selected_text,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopy = async (text: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(text);
    showToast({ message: t.common.copied, type: 'success' });
  };

  const { colors, isDark } = useTheme();

  // Smooth theme transition for the background
  const animatedBgColor = useThemeTransition(colors.bgPage);

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
          onPress={() => handleShare(item)}
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
  ), [colors, handleCopy, handleShare, handleDelete, t]);

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
            <View style={styles.empty}>
              <IconButton name="bookmarks-outline" size={48} color={colors.borderMid} passive />
              <Text style={styles.emptyText}>{t.highlights.noHighlightsYet}</Text>
            </View>
          }
          contentContainerStyle={highlights.length === 0 && { flex: 1 }}
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