import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { queryClient } from '../lib/queryClient';
import { Article, archiveArticle, markArticleRead, markArticleUnread } from '../lib/db';
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

  function handleArchive() {
    archiveArticle(article.id);
    invalidate();
    // No need to close — article disappears from list immediately
  }

  function renderLeftActions() {
    const label = article.is_read ? 'Unread' : 'Read';
    const icon = article.is_read ? 'mail-unread-outline' : 'checkmark-circle-outline';
    return (
      <View style={[styles.action, styles.readAction]}>
        <Ionicons name={icon} size={22} color="#fff" />
        <Text style={styles.actionText}>{label}</Text>
      </View>
    );
  }

  function renderRightActions() {
    return (
      <View style={[styles.action, styles.archiveAction]}>
        <Ionicons name="archive-outline" size={22} color="#fff" />
        <Text style={styles.actionText}>Archive</Text>
      </View>
    );
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableOpen={(direction) => {
        if (direction === 'left') handleToggleRead();
        if (direction === 'right') handleArchive();
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
    backgroundColor: '#534AB7',
    marginLeft: 16,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  archiveAction: {
    backgroundColor: '#e53e3e',
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
