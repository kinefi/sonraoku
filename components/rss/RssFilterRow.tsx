import React, { useMemo } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useTheme, spacing, borderRadius, typography } from '@/lib/theme';
import { useLanguage } from '@/lib/language';
import IconButton from '@/components/common/IconButton';

interface RssFilterRowProps {
  sortOrder: 'alpha' | 'unread';
  onToggleSort: () => void;
}

export const RssFilterRow = ({
  sortOrder,
  onToggleSort,
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
      backgroundColor: colors.bgMuted,
      maxWidth: 140,
      flexShrink: 1,
      alignItems: 'center',
    },
    chipText: {
      fontSize: 13,
      fontWeight: typography.weights.medium,
      color: colors.textSecondary,
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

        {/* Unread-only and bulk actions moved to FAB group */}
      </ScrollView>
    </View>
  );
};

export default RssFilterRow;
