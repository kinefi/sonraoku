import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAllTags } from '../../lib/db';
import { useLanguage } from '../../lib/languageContext';
import { colors, sharedStyles } from '../../lib/theme';

export default function TagsScreen() {
  const { t } = useLanguage();
  const { data: tags = [] } = useQuery({
    queryKey: ['tags', 'all'],
    queryFn: getAllTags,
  });

  return (
    <SafeAreaView style={sharedStyles.container}>
      <View style={sharedStyles.header}>
        <Text style={sharedStyles.headerTitle}>{t.tagsTitle}</Text>
      </View>
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