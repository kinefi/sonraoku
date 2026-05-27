import { useState, useCallback } from 'react';
import { Alert, Share } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useQuery } from '@tanstack/react-query';
import { getAllHighlights, deleteHighlight } from '@/lib/db';
import { useLanguage } from '@/lib/language';
import { useToast } from '@/lib/toast';
import { queryClient } from '@/lib/reader';

export function useHighlights() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const query = useQuery({
    queryKey: ['highlights', 'all', searchQuery],
    queryFn: async () => {
      const res = await getAllHighlights(searchQuery);
      if (res.error) throw res.error;
      return res.data || [];
    },
  });

  const handleDelete = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t.common.delete, t.common.confirmDelete, [
      { text: t.common.back, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          await deleteHighlight(id);
          queryClient.invalidateQueries({ queryKey: ['highlights'] });
        },
      },
    ]);
  }, [t]);

  const handleShare = useCallback(async (text: string, title?: string | null) => {
    try {
      await Share.share({
        message: title ? `"${text}"\n\n— ${title}` : text,
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleCopy = useCallback(async (text: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(text);
    showToast({ message: t.common.copied, type: 'success' });
  }, [t, showToast]);

  return { ...query, searchQuery, setSearchQuery, handleDelete, handleShare, handleCopy };
}
