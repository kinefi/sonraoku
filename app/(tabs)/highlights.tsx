import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Share, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { getAllHighlights, deleteHighlight, HighlightWithArticle } from '../../lib/db';
import { queryClient } from '../../lib/queryClient';
import { useLanguage } from '../../lib/languageContext';
import { sharedStyles } from '../../lib/theme';
import { useTheme } from '../../lib/themeContext';
import FabGroup from '../../components/FabGroup';
import SaveUrlSheet from '../../components/SaveUrlSheet';
import SearchBar from '../../components/SearchBar';
import IconButton from '../../components/IconButton';

export default function HighlightsScreen() {
  const { t } = useLanguage();
  const [showSheet, setShowSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: highlights = [] } = useQuery({
    queryKey: ['highlights', 'all', searchQuery],
    queryFn: () => getAllHighlights(searchQuery),
  });

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t.delete, t.confirmDelete, [
      { text: t.back, style: 'cancel' },
      {
        text: t.delete,
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
  };

  const { colors, isDark } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    ...sharedStyles(colors),
    itemRow: {
      flexDirection: 'row',
      backgroundColor: colors.white,
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgPage} translucent={false} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.highlightsTitle}</Text>
      </View>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={t.searchPlaceholder}
        onClear={() => setSearchQuery('')}
      />
      <FlatList
        data={highlights}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
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
                {item.article_title || '...'}
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
                accessibilityLabel={t.copy}
              />
              <IconButton
                name="share-social-outline"
                size={18}
                onPress={() => handleShare(item)}
                accessibilityLabel={t.share}
              />
              <IconButton
                name="trash-outline"
                size={18}
                color={colors.error}
                onPress={() => handleDelete(item.id)}
                accessibilityLabel={t.delete}
              />
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <IconButton name="bookmarks-outline" size={48} color={colors.borderMid} passive />
            <Text style={styles.emptyText}>{t.noHighlightsYet}</Text>
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
  );
}