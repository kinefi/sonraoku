import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAllTags } from '../../lib/db';
import { useLanguage } from '../../lib/languageContext';
import { colors, sharedStyles } from '../../lib/theme';
import FabGroup from '../../components/FabGroup';
import SaveUrlSheet from '../../components/SaveUrlSheet';
import SearchBar from '../../components/SearchBar';

export default function TagsScreen() {
  const { t } = useLanguage();
  const [showSheet, setShowSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: tags = [] } = useQuery({
    queryKey: ['tags', 'all', searchQuery],
    queryFn: () => getAllTags(searchQuery),
  });

  return (
    <SafeAreaView style={sharedStyles.container}>
      <View style={sharedStyles.header}>
        <Text style={sharedStyles.headerTitle}>{t.tagsTitle}</Text>
      </View>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={t.searchPlaceholder}
        onClear={() => setSearchQuery('')}
      />
      <FlatList
        data={tags}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.tagItem}
            onPress={() => router.push({ pathname: '/', params: { tag: item } })}
          >
            <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
            <Text style={styles.tagText}>{item}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="pricetags-outline" size={48} color={colors.borderMid} />
            <Text style={styles.emptyText}>{t.noTagsYet}</Text>
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
  );
}

const styles = StyleSheet.create({
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
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
});