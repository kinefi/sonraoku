import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useArticleSpeech, useArticleSettings, useArticleActions, FONT_SIZE_MIN, FONT_SIZE_MAX } from '../../lib/hooks';
import { queryClient } from '../../lib/queryClient';
import {
  getArticleById, markArticleRead,
  getHighlightsByArticle, getTagsForArticle,
} from '../../lib/db';
import { colors, sharedStyles } from '../../lib/theme';
import ReaderView from '../../components/ReaderView';
import { useLanguage } from '../../lib/languageContext';
import ArticleMetaHeader from '../../components/ArticleMetaHeader';
import HighlightsModal from '../../components/HighlightsModal';
import TagsModal from '../../components/TagsModal';
import ArticleFallback from '../../components/ArticleFallback';
import ReaderFabPill from '../../components/ReaderFabPill';

export default function ArticleScreen() {
  const { id, highlightId } = useLocalSearchParams<{ id: string; highlightId?: string }>();
  const { t } = useLanguage();
  const { fontSize, changeFontSize, defaultColor } = useArticleSettings();
  const scrollProgress = useRef(new Animated.Value(0)).current;
  const [readerHeight, setReaderHeight] = useState(0);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [targetHighlightId, setTargetHighlightId] = useState<string | null>(null);

  useEffect(() => {
    if (highlightId) {
      setTargetHighlightId(highlightId);
      const timer = setTimeout(() => setTargetHighlightId(null), 500);
      return () => clearTimeout(timer);
    }
  }, [highlightId]);

  const { data: article } = useQuery({
    queryKey: ['article', id],
    queryFn: () => getArticleById(id!),
    enabled: !!id,
  });

  const { isSpeaking, toggleSpeech } = useArticleSpeech(article?.html_content || null, article?.lang || null);
  
  const {
    isFetching,
    fetchStatus,
    handleFetchAgain,
    handleShare,
    handleAddTag: runAddTag,
    handleRemoveTag,
    handleReaderMessage,
  } = useArticleActions(article?.id, article?.url, article?.title);

  useEffect(() => {
    if (article && !article.is_read) {
      markArticleRead(article.id);
      queryClient.setQueryData(['article', article.id], { ...article, is_read: 1 });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?.id, article?.is_read]);


  const { data: highlights = [] } = useQuery({
    queryKey: ['highlights', id],
    queryFn: () => getHighlightsByArticle(id!),
    enabled: !!id,
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['tags', id],
    queryFn: () => getTagsForArticle(id!),
    enabled: !!id,
  });

  function handleScrollProgress(progress: number) {
    scrollProgress.setValue(progress);
  }

  function handleAddTag() {
    runAddTag(newTag);
    setNewTag('');
  }

  if (!article) return null;

  const scrollFillHeight = scrollProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, readerHeight],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.container}>
      <ArticleMetaHeader article={article} />

      {/* Content */}
      {article.html_content ? (
        <View
          style={styles.readerWrapper}
          onLayout={(e) => setReaderHeight(e.nativeEvent.layout.height)}
        >
          <ReaderView
            html={article.html_content}
            title={article.title ?? ''}
            fontSize={fontSize}
            defaultColor={defaultColor}
            highlights={highlights}
            onMessage={handleReaderMessage}
            onScrollProgress={handleScrollProgress}
            scrollToHighlightId={targetHighlightId}
          />
          <View style={styles.scrollTrack}>
            <Animated.View style={[styles.scrollFill, { height: scrollFillHeight }]} />
          </View>
        </View>
      ) : (
        <ArticleFallback
          title={article.title}
          url={article.url}
          isFetching={isFetching}
          fetchStatus={fetchStatus}
          onFetchAgain={handleFetchAgain}
        />
      )}

      <ReaderFabPill
        onBack={() => router.back()}
        fontSize={fontSize}
        onFontSizeChange={changeFontSize}
        onToggleHighlights={() => setShowHighlights(true)}
        onToggleTags={() => setShowTags(true)}
        isSpeaking={isSpeaking}
        onToggleSpeech={toggleSpeech}
        onShare={handleShare}
        isFetching={isFetching}
        onRefresh={handleFetchAgain}
        hasContent={!!article.html_content}
      />

      <HighlightsModal
        visible={showHighlights}
        onClose={() => setShowHighlights(false)}
        highlights={highlights}
        defaultColor={defaultColor}
        onSelect={(highlightId) => {
          setTargetHighlightId(highlightId);
          setShowHighlights(false);
          setTimeout(() => setTargetHighlightId(null), 100);
        }}
      />

      <TagsModal
        visible={showTags}
        onClose={() => setShowTags(false)}
        tags={tags}
        newTag={newTag}
        setNewTag={setNewTag}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  readerWrapper: {
    flex: 1,
  },
  scrollTrack: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  scrollFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    opacity: 0.45,
  },
  fabActionRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
  },
  fabPill: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.bgMuted,
    borderRadius: 32,
    paddingHorizontal: 10,
    paddingVertical: 8,
    ...sharedStyles.floating,
  },
  fabActionBtn: {
    width: 48,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabActionBtnActive: {
    backgroundColor: colors.primary,
    borderRadius: 20,
  },
  fabActionBtnDisabled: {
    opacity: 0.5,
  },
  fabFontText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  }
});
