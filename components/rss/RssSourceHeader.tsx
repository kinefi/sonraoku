import React, { memo, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, ColorTokens } from '@/lib/theme';

interface RssSourceHeaderProps {
  id: string;
  title: string;
  unreadCount: number;
  isExpanded: boolean;
  isFiltered: boolean;
  colors: ColorTokens;
  onToggle: (id: string) => void;
}

function RssSourceHeaderComponent({
  id,
  title,
  unreadCount,
  isExpanded,
  isFiltered,
  colors,
  onToggle,
}: RssSourceHeaderProps) {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: 1 },
        content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
        text: { fontSize: 13, fontWeight: typography.weights.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
        badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, minWidth: 24, alignItems: 'center' },
        badgeText: { fontSize: 10, fontWeight: typography.weights.bold },
      }),
    [],
  );

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: colors.bgMuted, borderBottomColor: colors.border }]}
      onPress={() => onToggle(id)}
    >
      <View style={styles.content}>
        <View style={styles.left}>
          <Ionicons
            name={isExpanded || isFiltered ? 'chevron-down' : 'chevron-forward'}
            size={14}
            color={colors.textSecondary}
            style={{ marginRight: spacing.xs }}
          />
          <Ionicons name="logo-rss" size={16} color={colors.primary} style={{ marginRight: spacing.sm }} />
          <Text style={[styles.text, { color: colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}> 
            <Text style={[styles.badgeText, { color: colors.white }]}>{unreadCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const RssSourceHeader = memo(RssSourceHeaderComponent);
RssSourceHeader.displayName = 'RssSourceHeader';

export default RssSourceHeader;
