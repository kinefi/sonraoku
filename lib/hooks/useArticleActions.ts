import { useState, useCallback, useContext } from 'react';
import { Share } from 'react-native';
import { useLanguage } from '@/lib/language';
import { useToast } from '@/lib/toast';
import { fetchRawHtml } from '@/lib/utils';
import { ReaderMessage } from '@/types/reader';
import { TIMEOUTS } from '@/lib/constants';
import { 
  addTagToArticle, removeTagFromArticle, 
  insertHighlight, deleteHighlight, toggleFavoriteArticle 
} from '@/lib/db';
import type { Highlight, Article } from '@/lib/db/types';
import { queryClient, ParseQueueContext, buildParserHtml } from '@/lib/reader';
import { useOptimisticMutation } from '@/lib/hooks/useOptimisticMutation';

export function useArticleActions(articleId?: string, url?: string, title?: string | null) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { addToQueue } = useContext(ParseQueueContext);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'fetching' | 'success' | 'error' | null>(null);

  const handleFetchAgain = useCallback(async () => {
    if (!articleId || !url) return;
    setIsFetching(true);
    setFetchStatus('fetching');
    try {
      const html = await fetchRawHtml(url);
      addToQueue({ id: articleId, url, title: title || t.articles.untitled, html: buildParserHtml(html, url, {
        // Fix: Changed timeout from number to translation string key
        timeout: t.reader.timeout,
        noContent: t.articles.noContent,
        unknownError: t.errors.parseError,
      }), retries: 0 });
      setFetchStatus('success');
    } catch (e) {
      setFetchStatus('error');
      console.error(e);
    } finally {
      setIsFetching(false);
      setTimeout(() => setFetchStatus(null), TIMEOUTS.STATUS_MESSAGE_RESET);
    }
  }, [articleId, url, t, addToQueue, title]);

  const handleShare = useCallback(async () => {
    if (!url) return;
    try {
      await Share.share({
        title: title || t.common.appName,
        message: url,
      });
    } catch (e) {
      console.error(e);
    }
  }, [url, title, t.common.appName]);

  const handleAddTag = useCallback(async (tagName: string) => {
    if (!articleId || !tagName.trim()) return;
    const { error } = await addTagToArticle(articleId, tagName);
    if (error) {
      showToast({ message: t.errors.resultReadError, type: 'error' });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['tags', articleId] });
    queryClient.invalidateQueries({ queryKey: ['tags', 'all'] });
    showToast({ message: t.tags.added, type: 'success' });
  }, [articleId, t, showToast]);

  const handleRemoveTag = useCallback(async (tagName: string) => {
    if (!articleId) return;
    await removeTagFromArticle(articleId, tagName);
    queryClient.invalidateQueries({ queryKey: ['tags', articleId] });
  }, [articleId]);

  const favoriteMutation = useOptimisticMutation<Article, boolean>(
    ['article', articleId],
    (isFav: boolean) => toggleFavoriteArticle(articleId!, isFav),
    (old, isFav) => old ? { ...old, is_favorite: isFav ? 1 : 0 } : ({} as Article)
  );

  const handleToggleFavorite = useCallback((isFavorite: boolean) => {
    if (!articleId) return;
    favoriteMutation.mutate(isFavorite, {
      onSuccess: () => showToast({ 
        message: isFavorite ? t.articles.favorited : t.articles.unfavorited, 
        type: 'success' 
      }),
    });
  }, [articleId, favoriteMutation, t, showToast]);

  const addHighlightMutation = useOptimisticMutation<Highlight[], Highlight>(
    ['highlights', articleId],
    (h) => insertHighlight(h.id, h.article_id, h.selected_text, h.context_before, h.context_after),
    (old, h) => [...(old || []), h]
  );

  const deleteHighlightMutation = useOptimisticMutation<Highlight[], string>(
    ['highlights', articleId],
    (id) => deleteHighlight(id),
    (old, id) => (old || []).filter(h => h.id !== id)
  );

  const handleDeleteHighlight = useCallback((highlightId: string) => {
    if (!articleId) return;
    deleteHighlightMutation.mutate(highlightId);
  }, [articleId, deleteHighlightMutation]);

  const handleReaderMessage = useCallback(async (msg: ReaderMessage) => {
    if (!articleId) return;
    if (msg.type === 'highlight') {
      addHighlightMutation.mutate({
        id: msg.id,
        article_id: articleId,
        selected_text: msg.text,
        context_before: msg.contextBefore,
        context_after: msg.contextAfter,
        created_at: Date.now(),
      });
    } else if (msg.type === 'delete-highlight') {
      await handleDeleteHighlight(msg.id);
    }
  }, [articleId, addHighlightMutation, handleDeleteHighlight]);

  return {
    isFetching,
    fetchStatus,
    handleFetchAgain,
    handleShare,
    handleAddTag,
    handleRemoveTag,
    handleToggleFavorite,
    handleReaderMessage,
    handleDeleteHighlight,
  };
}