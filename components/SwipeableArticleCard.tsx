import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/colors';
// eslint-disable-next-line import/no-deprecated
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { queryClient } from '../lib/queryClient';
import { Article, archiveArticle, unarchiveArticle, markArticleRead, markArticleUnread } from '../lib/db';
import ArticleCard from './ArticleCard';

type Props = {
  article: Article;
  onPress: () => void;
};

export default function SwipeableArticleCard({ article, onPress }: Props) {
  const swipeableRef = useRef<Swipeable>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['articles'] });
  }

  function handleToggleRead() {
    if (article.is_read) {
      markArticleUnread(article.id);
    } else {
      markArticleRead(article.id);
    }
    invalidate();
    swipeableRef.current?.close();
  }

  function handleToggleArchive() {
    if (article.is_archived) {
      unarchiveArticle(article.id);
      swipeableRef.current?.close();
    } else {
      archiveArticle(article.id);
    }
    invalidate();
  }

  function renderLeftActions() {
    const label = article.is_read ? 'Okunmadı' : 'Okundu';
    const icon = article.is_read ? 'mail-unread-outline' : 'checkmark-circle-outline';
    return (
      <View style={[styles.action, styles.readAction]}>
        <Ionicons name={icon} size={22} color="#fff" />
        <Text style={styles.actionText}>{label}</Text>
      </View>
    );
  }

  function renderRightActions() {
    const label = article.is_archived ? 'Arşivden Çıkar' : 'Arşivle';
    const icon = article.is_archived ? 'arrow-undo-outline' : 'archive-outline';
    return (
      <View style={[styles.action, styles.archiveAction]}>
        <Ionicons name={icon} size={22} color="#fff" />
        <Text style={styles.actionText}>{label}</Text>
      </View>
    );
  }

  return (
    <Swipeable
      ref={swipeableRef}
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
      <ArticleCard article={article} onPress={onPress} />
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  readAction: {
    backgroundColor: colors.primary,
    marginLeft: 16,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  archiveAction: {
    backgroundColor: colors.error,
    marginRight: 16,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  actionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
