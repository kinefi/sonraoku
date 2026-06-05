import React, { useRef, useMemo } from 'react';
import { Text, StyleSheet, AccessibilityInfo } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useTheme, sharedStyles, spacing, borderRadius } from '@/lib/theme';
import { useLanguage } from '@/lib/language';
import { queryClient } from '@/lib/reader';
import { deleteRssItem, restoreRssItem } from '@/lib/db';
import { RssItemWithFeed } from '@/lib/db/types';
import RssItem from '@/components/rss/RssItem';
import IconButton from '@/components/common/IconButton';
import { useToast } from '@/lib/toast';

type Props = {
  item: RssItemWithFeed;
  onPress: () => void;
  onSave: () => void;
  onDelete?: (id: string) => void;
  onSaveOffline?: (item: RssItemWithFeed) => void;
  onLongPress?: () => void;
};

export default function SwipeableRssItem({ item, onPress, onSave, onDelete, onSaveOffline, onLongPress }: Props) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const swipeableRef = useRef<Swipeable>(null);

  const styles = useMemo(() => StyleSheet.create({
    ...sharedStyles(colors),
    action: {
      justifyContent: 'center',
      alignItems: 'center',
      width: 80,
      marginVertical: spacing.xs + 2, // Consistent with SwipeableArticleCard
      borderRadius: borderRadius.lg,
    },
    saveAction: {
      backgroundColor: colors.primary,
      marginLeft: spacing.lg,
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
    },
    deleteAction: {
      backgroundColor: colors.error,
      marginRight: spacing.lg,
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
    },
    actionText: {
      color: colors.white,
      fontSize: 10,
      fontWeight: '600',
      textAlign: 'center',
      marginTop: 4,
    },
  }), [colors]);

  async function handleDelete() {
    const itemId = item.id;
    await deleteRssItem(itemId);
    
    AccessibilityInfo.announceForAccessibility(t.rss.itemDeleted);
    queryClient.invalidateQueries({ queryKey: ['rssItems'] });

    showToast({
      message: t.rss.itemDeleted,
      type: 'info',
      action: {
        label: t.rss.undo,
        onPress: async () => {
          await restoreRssItem(itemId);
          queryClient.invalidateQueries({ queryKey: ['rssItems'] });
        }
      }
    });

    swipeableRef.current?.close();
  }

  function handleSave() {
    onSave();
    swipeableRef.current?.close();
  }

  function renderLeftActions() {
    return (
      <IconButton
        name="download-outline"
        size={22}
        color={colors.white}
        style={[styles.action, styles.saveAction]}
        onPress={handleSave}
        accessibilityLabel={t.rss.saveToReadingList}
      >
        <Text style={styles.actionText}>{t.rss.saveToReadingList}</Text>
      </IconButton>
    );
  }

  function renderRightActions() {
    return (
      <IconButton
        name="trash-outline"
        size={22}
        color={colors.white}
        style={[styles.action, styles.deleteAction]}
        onPress={handleDelete}
        accessibilityLabel={t.common.delete}
      >
        <Text style={styles.actionText}>{t.common.delete}</Text>
      </IconButton>
    );
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableOpen={(direction) => {
        if (direction === 'left') handleSave();
        if (direction === 'right') handleDelete();
      }}
      friction={2}
      leftThreshold={60}
      rightThreshold={60}
    >
      <RssItem
        item={item}
        onPress={onPress}
        colors={colors}
        onDelete={onDelete || (() => {})}
        onSaveOffline={onSaveOffline || (() => {})}
        onLongPress={onLongPress || (() => {})}
      />
    </Swipeable>
  );
}