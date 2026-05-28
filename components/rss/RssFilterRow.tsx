import React, { useMemo } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useTheme, spacing, borderRadius, typography } from '@/lib/theme';
import { useLanguage } from '@/lib/language';
import IconButton from '@/components/common/IconButton';

interface RssFilterRowProps {
  sortOrder: 'alpha' | 'unread';
  onToggleSort: () => void;
  isUnreadOnly: boolean;
  onToggleUnreadOnly: () => void;
  onManage: () => void;
  onClearRead: () => void;
  onMarkAllRead: () => void;
}

export const RssFilterRow = ({
  sortOrder,
  onToggleSort,
  isUnreadOnly,
  onToggleUnreadOnly,
  onManage,
  onClearRead,
  onMarkAllRead
}: RssFilterRowProps) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const styles = useMemo(() => StyleSheet.create({
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.xs + 2,
    },
    chip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs + 2,
      borderRadius: borderRadius.xxl,
    },
    chipText: {
      fontSize: 13,
      fontWeight: typography.weights.medium,
    },
    chipTextActive: {
      color: colors.white,
    },
  }), [colors]);

  return (
    <View style={{ backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <IconButton
          label={sortOrder === 'alpha' ? t.articles.sortAlpha : t.articles.unread}
          name={sortOrder === 'alpha' ? "list-outline" : "stats-chart-outline"}
          variant="ghost"
          onPress={onToggleSort}
          style={styles.chip}
          labelStyle={styles.chipText}
        />

        <IconButton
          label={t.rss.unreadOnly}
          name={isUnreadOnly ? "eye-off-outline" : "eye-outline"}
          variant={isUnreadOnly ? 'filled' : 'ghost'}
          onPress={onToggleUnreadOnly}
          style={[styles.chip, isUnreadOnly && { backgroundColor: colors.primary }]}
          labelStyle={[styles.chipText, isUnreadOnly && styles.chipTextActive]}
        />
        <IconButton label={t.rss.manageFeeds} name="settings-outline" variant="ghost" onPress={onManage} style={styles.chip} labelStyle={styles.chipText} />
        <IconButton label={t.rss.clearRead} name="trash-outline" variant="ghost" onPress={onClearRead} style={styles.chip} labelStyle={styles.chipText} />
        <IconButton label={t.rss.markAllRead} name="checkmark-done-outline" variant="ghost" onPress={onMarkAllRead} style={styles.chip} labelStyle={styles.chipText} />
      </ScrollView>
    </View>
  );
};

export default RssFilterRow;
