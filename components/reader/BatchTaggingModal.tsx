import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { useTheme, sharedStyles, spacing, borderRadius } from '@/lib/theme';
import { useLanguage } from '@/lib/language';
import IconButton from '@/components/common/IconButton';
import { addTagsToArticles } from '@/lib/db/articles';
import { insertTag , getTags } from '@/lib/db/tags';
import { queryClient } from '@/lib/reader';
import { useQuery } from '@tanstack/react-query';

type Props = {
  visible: boolean;
  onClose: () => void;
  selectedArticleIds: string[];
};

export default function BatchTaggingModal({
  visible,
  onClose,
  selectedArticleIds,
}: Props) {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const [newTagName, setNewTagName] = useState('');
  // State to track which tags are selected in the modal for batch application
  const [tagsToApply, setTagsToApply] = useState<string[]>([]);

  // Fetch all available tags
  const { data: allAvailableTags = [] } = useQuery({
    queryKey: ['allTags'],
    queryFn: async () => {
      const { data } = await getTags();
      return data || [];
    },
  });

  // When modal opens, reset tagsToApply (or pre-populate based on common tags in selected articles)
  useEffect(() => {
    if (visible) {
      // For simplicity, start with no tags selected in the modal.
      // A more advanced feature would be to find common tags among selected articles.
      setTagsToApply([]);
      setNewTagName('');
    }
  }, [visible]);

  const handleToggleTag = useCallback((tagName: string) => {
    setTagsToApply(prev =>
      prev.includes(tagName) ? prev.filter(name => name !== tagName) : [...prev, tagName]
    );
  }, []);

  const handleAddNewTag = useCallback(async () => {
    const trimmedTagName = newTagName.trim();
    if (!trimmedTagName) return;

    // Check if tag already exists in allAvailableTags
    if (allAvailableTags.some(tag => tag.name === trimmedTagName)) {
      Alert.alert(t.tags.title, `"${trimmedTagName}" ${t.common.notAvailablePhase3}`); // Reusing a translation key for now
      setNewTagName('');
      return;
    }

    const { error, data: newTag } = await insertTag(trimmedTagName);
    if (error || !newTag) {
      console.error('Failed to add new tag:', error);
      // Optionally show a toast notification
      return;
    }

    // Invalidate allTags query to refetch the updated list
    queryClient.invalidateQueries({ queryKey: ['allTags'] });
    // Automatically select the newly added tag for application
    setTagsToApply(prev => [...prev, newTag.name]);
    setNewTagName('');
  }, [newTagName, allAvailableTags, t.tags.title, t.common.notAvailablePhase3]);

  const handleApplyTags = useCallback(async () => {
    if (selectedArticleIds.length === 0) {
      onClose();
      return;
    }

    // Determine which tags to add and which to remove.
    // This modal is designed to *set* the tags for the selected articles to `tagsToApply`.
    // So, for each selected article, we need to:
    // 1. Get its current tags.
    // 2. Calculate tags to add (in tagsToApply but not current).
    // 3. Calculate tags to remove (in current but not tagsToApply).
    // This is complex for a batch operation.
    // A simpler approach for batch is to only *add* selected tags, or *replace* all tags.
    // Let's implement an "add only" approach for simplicity, or "replace all".
    // For now, let's assume the user wants to *add* the selected tags to all articles.
    // If a tag is already present, `addTagsToArticles` will handle the conflict.

    const { error } = await addTagsToArticles(selectedArticleIds, tagsToApply);
    if (error) {
      console.error('Error applying batch tags:', error);
      // Optionally show a toast notification
    } else {
      queryClient.invalidateQueries({ queryKey: ['articles'] }); // Invalidate article list to show new tags
      // Optionally show a success toast
    }
    onClose();
  }, [selectedArticleIds, tagsToApply, onClose]);

  const styles = useMemo(() => StyleSheet.create({
    ...sharedStyles(colors),
    modalBackdrop: { flex: 1, backgroundColor: colors.overlay },
    modalContent: {
      height: '60%',
      backgroundColor: colors.bgPage,
      borderTopLeftRadius: borderRadius.xxl,
      borderTopRightRadius: borderRadius.xxl,
      paddingTop: spacing.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    tagInputRow: { flexDirection: 'row', padding: spacing.xl, gap: spacing.lg },
    tagInput: {
      flex: 1,
      height: 44,
      backgroundColor: colors.bgMuted,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md + 3,
      fontSize: 15,
      color: colors.textPrimary,
    },
    addTagBtn: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.xl,
    },
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl, gap: spacing.sm, marginTop: spacing.md },
    tagBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm - 2,
      borderRadius: borderRadius.xxl,
      gap: spacing.sm - 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tagBadgeSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    tagBadgeText: { fontSize: 14, color: colors.textPrimary },
    applyButton: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md + 2,
      alignItems: 'center',
      marginHorizontal: spacing.xl,
      marginTop: spacing.lg,
    },
    applyButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '600',
    },
  }), [colors]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t.tags.title} ({selectedArticleIds.length})</Text>
          <IconButton
            name="close"
            size={24}
            color={colors.textPrimary}
            onPress={onClose}
            accessibilityLabel={t.common.back}
          />
        </View>

        <View style={styles.tagInputRow}>
          <TextInput
            style={styles.tagInput}
            placeholder={t.tags.placeholder}
            value={newTagName}
            onChangeText={setNewTagName}
            placeholderTextColor={colors.placeholder}
            onSubmitEditing={handleAddNewTag}
            autoCapitalize="none"
          />
          <IconButton
            label={t.tags.add}
            variant="filled"
            onPress={handleAddNewTag}
            disabled={!newTagName.trim()}
            style={styles.addTagBtn}
          />
        </View>

        <View style={styles.tagsContainer}>
          {allAvailableTags.map((tag) => {
            const isSelected = tagsToApply.includes(tag.name);
            return (
              <TouchableOpacity
                key={tag.id}
                style={[
                  styles.tagBadge,
                  isSelected && styles.tagBadgeSelected,
                ]}
                onPress={() => handleToggleTag(tag.name)}
              >
                <Text style={[
                  styles.tagBadgeText,
                  isSelected && { color: colors.white }
                ]}>
                  {tag.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.applyButton}
          onPress={handleApplyTags}
          disabled={tagsToApply.length === 0}
        >
          <Text style={styles.applyButtonText}>
            {t.common.save} ({tagsToApply.length})
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}