import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useArticleSpeech, useArticleSettings, useArticleActions } from '../../lib/hooks';
import { queryClient } from '../../lib/queryClient';
import {
  getArticleById, markArticleRead,
  getHighlightsByArticle, getTagsForArticle,
} from '../../lib/db';
import { sharedStyles } from '../../lib/theme';
import { useTheme, FONT_SIZE_MIN, FONT_SIZE_MAX } from '../../lib/themeContext';
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
  const { fontSize, fontFamily, changeFontSize, defaultColor, colors } = useArticleSettings();
  const { isDark } = useTheme();
  const scrollProgress = useRef(new Animated.Value(0)).current;
  const [readerHeight, setReaderHeight] = useState(0);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [targetHighlightId, setTargetHighlightId] = useState<string | null>(null);

  // Animation for background color transition
  const bgColorAnim = useRef(new Animated.Value(0)).current;
  const [prevColor, setPrevColor] = useState(colors.white);
  const [currColor, setCurrColor] = useState(colors.white);

  useEffect(() => {
    if (colors.white !== currColor) {
      setPrevColor(currColor);
      setCurrColor(colors.white);
      bgColorAnim.setValue(0);
      Animated.timing(bgColorAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [colors.white]);

  const animatedBgColor = bgColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [prevColor, currColor],
  });

  const prevFontSize = useRef(fontSize);
  useEffect(() => {
    if (fontSize !== prevFontSize.current) {
      if (fontSize >= FONT_SIZE_MAX) {
        AccessibilityInfo.announceForAccessibility(t.maxFontSizeReached);
      } else if (fontSize <= FONT_SIZE_MIN) {
        AccessibilityInfo.announceForAccessibility(t.minFontSizeReached);
      }
      prevFontSize.current = fontSize;
    }
  }, [fontSize, t]);

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
      AccessibilityInfo.announceForAccessibility(t.markAsRead);
      queryClient.setQueryData(['article', article.id], { ...article, is_read: 1 });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    }
  }, [article, article?.id, article?.is_read, t.markAsRead]);


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

  const handleScrollProgress = useCallback((progress: number) => {
    scrollProgress.setValue(progress);
  }, [scrollProgress]);

  const handleAddTag = useCallback(() => {
    runAddTag(newTag);
    setNewTag('');
  }, [runAddTag, newTag]);

  const scrollFillHeight = scrollProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, readerHeight],
    extrapolate: 'clamp',
  });

  const styles = useMemo(() => StyleSheet.create({
    ...sharedStyles(colors),
    readerWrapper: {
      flex: 1,
    },
    scrollTrack: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
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
  }), [colors, isDark]);

  if (!article) return null;

  return (
    <Animated.View style={[styles.container, { backgroundColor: animatedBgColor }]}>
      <SafeAreaView style={{ flex: 1 }}>
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
            fontFamily={fontFamily}
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

      {showHighlights && (
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
      )}

      {showTags && (
        <TagsModal
          visible={showTags}
          onClose={() => setShowTags(false)}
          tags={tags}
          newTag={newTag}
          setNewTag={setNewTag}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
        />
      )}
    </SafeAreaView>
    </Animated.View>
  );
}
