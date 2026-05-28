import React, { useCallback, memo, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { spacing, borderRadius, typography, ThemeColors } from '@/lib/theme';
import { useLanguage } from '@/lib/language';
import { RssItemWithFeed } from '@/lib/db/types';

interface RssItemProps {
  item: RssItemWithFeed;
  colors: ThemeColors;
  onDelete: (id: string) => void;
  onSaveOffline: (item: RssItemWithFeed) => void;
  onLongPress: (item: RssItemWithFeed) => void;
  onPress: (item: RssItemWithFeed) => void;
}

function RssItemComponent({
  item,
  colors,
  onDelete,
  onSaveOffline,
  onLongPress,
  onPress,
}: RssItemProps) {
  const { t } = useLanguage();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        deleteAction: { width: 80, justifyContent: 'center', alignItems: 'center' },
        itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
        saveButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
        offlineBadge: { flexDirection: 'row', alignItems: 'center', opacity: 0.8 },
      }),
    [],
  );

  const renderRightActions = useCallback(
    () => (
      <TouchableOpacity
        onPress={() => onDelete(item.id)}
        style={[
          styles.deleteAction,
          { backgroundColor: colors.error, marginBottom: spacing.md, borderRadius: borderRadius.md },
        ]}
      >
        <Ionicons name="trash" size={24} color={colors.white} />
      </TouchableOpacity>
    ),
    [item.id, onDelete, colors, styles],
  );

  const isRead = item.isRead === 1;

  return (
    <Swipeable renderRightActions={renderRightActions} friction={2}>
      <TouchableOpacity
        onPress={() => onPress(item)}
        onLongPress={() => onLongPress(item)}
        activeOpacity={0.7}
        style={{
          backgroundColor: colors.bgMuted,
          marginBottom: spacing.md,
          padding: spacing.md,
          borderRadius: borderRadius.md,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: isRead ? 0.65 : 1,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
          {!isRead && (
            <View style={{ width: 8, height: 8, borderRadius: borderRadius.xxl, backgroundColor: colors.primary, marginRight: spacing.sm }} />
          )}
          <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }} numberOfLines={1}>
            {item.feedTitle}
          </Text>
        </View>

        <Text style={{ fontSize: 16, fontWeight: typography.weights.bold, color: colors.textPrimary, marginBottom: spacing.xs }}>{item.title}</Text>

        {item.excerpt && (
          <Text numberOfLines={2} style={{ color: colors.textSecondary, marginBottom: spacing.sm, fontSize: 14 }}>
            {item.excerpt.replace(/<[^>]*>/g, '')}
          </Text>
        )}

        <View style={styles.itemFooter}>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            {item.pubDate ? new Date(item.pubDate).toLocaleDateString() : ''}
          </Text>

          {item.isDownloaded ? (
            <View style={styles.offlineBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={{ color: colors.success, marginLeft: 4, fontSize: 11, fontWeight: typography.weights.semibold }}>{t.articles.offline}</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={() => onSaveOffline(item)} style={[styles.saveButton, { backgroundColor: colors.primary + '1a' }]}> 
              <Ionicons name="download-outline" size={14} color={colors.primary} />
              <Text style={{ color: colors.primary, marginLeft: 4, fontSize: 11, fontWeight: typography.weights.semibold }}>
                {t.rss.saveToReadingList}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const RssItem = memo(RssItemComponent);
RssItem.displayName = 'RssItem';

export default RssItem;
