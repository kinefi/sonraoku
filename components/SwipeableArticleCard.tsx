import React, { useRef, useMemo } from 'react';
import { Text, StyleSheet, AccessibilityInfo } from 'react-native';
import { sharedStyles, spacing, borderRadius } from '../lib/theme';
import { useTheme } from '../lib/themeContext';
 
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { queryClient } from '../lib/queryClient';
import { Article, archiveArticle, unarchiveArticle, markArticleRead, markArticleUnread } from '../lib/db';
import ArticleCard from './ArticleCard';
import { useLanguage } from '../lib/languageContext';
import IconButton from './IconButton';

type Props = {
  article: Article;
  onPress: () => void;
  onLongPress?: () => void;
  isSelected?: boolean;
  selectionMode?: boolean;
};

export default function SwipeableArticleCard({ article, onPress, onLongPress, isSelected, selectionMode }: Props) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);

  const styles = useMemo(() => StyleSheet.create({
    ...sharedStyles(colors),
    action: {
      justifyContent: 'center',
      alignItems: 'center',
      width: 80,
      marginVertical: spacing.xs + 2,
      borderRadius: borderRadius.lg,
      gap: spacing.xs,
    },
    readAction: {
      backgroundColor: colors.primary,
      marginLeft: spacing.lg,
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
    },
    archiveAction: {
      backgroundColor: colors.error,
      marginRight: spacing.lg,
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
    },
    actionText: {
      color: colors.white,
      fontSize: 11,
      fontWeight: '600',
    },
  }), [colors]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['articles'] });
  }

  function handleToggleRead() {
    if (article.is_read) {
      markArticleUnread(article.id);
      AccessibilityInfo.announceForAccessibility(t.markAsUnread);
    } else {
      markArticleRead(article.id);
      AccessibilityInfo.announceForAccessibility(t.markAsRead);
    }
    invalidate();
    swipeableRef.current?.close();
  }

  function handleToggleArchive() {
    if (article.is_archived) {
      unarchiveArticle(article.id);
      AccessibilityInfo.announceForAccessibility(t.unarchive);
      swipeableRef.current?.close();
    } else {
      archiveArticle(article.id);
      AccessibilityInfo.announceForAccessibility(t.archive);
    }
    invalidate();
  }

  function renderLeftActions() {
    const label = article.is_read ? t.markAsUnread : t.markAsRead;
    const icon = article.is_read ? 'mail-unread-outline' : 'checkmark-circle-outline';
    return (
      <IconButton
        name={icon}
        size={22}
        color={colors.white}
        style={[styles.action, styles.readAction]}
        onPress={handleToggleRead}
        accessibilityLabel={label}
      >
        <Text style={styles.actionText}>{label}</Text>
      </IconButton>
    );
  }

  function renderRightActions() {
    const label = article.is_archived ? t.unarchive : t.archive;
    const icon = article.is_archived ? 'arrow-undo-outline' : 'archive-outline';
    return (
      <IconButton
        name={icon}
        size={22}
        color={colors.white}
        style={[styles.action, styles.archiveAction]}
        onPress={handleToggleArchive}
        accessibilityLabel={label}
      >
        <Text style={styles.actionText}>{label}</Text>
      </IconButton>
    );
  }

  return (
    <Swipeable
      ref={swipeableRef}
      enabled={!selectionMode}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableOpen={(direction: string) => {
        if (direction === 'left') handleToggleRead();
        if (direction === 'right') handleToggleArchive();
      }}
      friction={2}
      leftThreshold={60}
      rightThreshold={60}
    >
      <ArticleCard 
        article={article} 
        onPress={onPress} 
        onLongPress={onLongPress}
        isSelected={isSelected}
        selectionMode={selectionMode}
      />
    </Swipeable>
  );
}
