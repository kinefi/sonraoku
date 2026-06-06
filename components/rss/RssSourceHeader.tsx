import React, { memo, useMemo, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { RectButton, Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, ThemeColors } from '@/lib/theme';
import { useLanguage } from '@/lib/language';

interface RssSourceHeaderProps {
  id: string;
  title: string;
  unreadCount: number;
  isExpanded: boolean;
  isFiltered: boolean;
  colors: ThemeColors;
  onToggle: (id: string) => void;
  onDeleteFeed: (id: string) => void;
  onMarkFeedRead: (id: string) => void;
}

function RssSourceHeaderComponent({
  id,
  title,
  unreadCount,
  isExpanded,
  isFiltered,
  colors,
  onToggle,
  onDeleteFeed,
  onMarkFeedRead,
}: RssSourceHeaderProps) {
  const { t } = useLanguage();
  const swipeableRef = useRef<React.ElementRef<typeof Swipeable>>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: 1 },
        content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
        text: { fontSize: 13, fontWeight: typography.weights.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
        badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, minWidth: 24, alignItems: 'center' },
        badgeText: { fontSize: 10, fontWeight: typography.weights.bold },
        action: { justifyContent: 'center', alignItems: 'center', width: 64, marginVertical: spacing.xs, borderRadius: 14 },
        markReadAction: { backgroundColor: colors.primary },
        deleteAction: { backgroundColor: colors.error },
      }),
    [colors],
  );

  const handleDelete = () => {
    Alert.alert(title || '', t.rss.deleteFeedConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => {
          onDeleteFeed(id);
          swipeableRef.current?.close();
        },
      },
    ]);
  };

  const handleMarkRead = () => {
    Alert.alert(title || '', t.rss.markFeedReadConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.rss.markAllRead,
        onPress: () => {
          onMarkFeedRead(id);
          swipeableRef.current?.close();
        },
      },
    ]);
  };

  const renderLeftActions = () => (
    <RectButton style={[styles.action, styles.markReadAction]} onPress={handleMarkRead}>
      <Ionicons name="checkmark-done-outline" size={20} color={colors.white} />
    </RectButton>
  );

  const renderRightActions = () => (
    <RectButton style={[styles.action, styles.deleteAction]} onPress={handleDelete}>
      <Ionicons name="trash-outline" size={20} color={colors.white} />
    </RectButton>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      friction={2}
      leftThreshold={50}
      rightThreshold={50}
    >
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
    </Swipeable>
  );
}

const RssSourceHeader = memo(RssSourceHeaderComponent);
RssSourceHeader.displayName = 'RssSourceHeader';

export default RssSourceHeader;
