import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTheme, sharedStyles, spacing, borderRadius } from '@/lib/theme';
import { useLanguage } from '@/lib/language';
import IconButton from '@/components/common/IconButton';
import { Tag } from '@/lib/db/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  tags: Tag[]; // Expect Tag objects
  availableTags?: Tag[];
  newTag: string;
  setNewTag: (text: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tagName: string) => void;
  onToggleTag?: (tag: Tag) => void;
};

export default function TagsModal({
  visible,
  onClose,
  tags,
  availableTags = [],
  newTag,
  setNewTag,
  onAddTag,
  onRemoveTag,
  onToggleTag,
}: Props) {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const currentTagNames = useMemo(() => tags.map(t => t.name), [tags]);

  const styles = useMemo(() => StyleSheet.create({
    ...sharedStyles(colors),
    modalBackdrop: { flex: 1, backgroundColor: colors.overlay },
    modalContent: {
      height: '75%',
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
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
      paddingHorizontal: spacing.xl,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
      textTransform: 'uppercase',
    },
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: spacing.lg },
    tagBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgMuted,
      paddingLeft: spacing.md,
      paddingRight: spacing.xs,
      paddingVertical: spacing.sm - 2,
      borderRadius: borderRadius.xxl,
      gap: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tagBadgeText: { fontSize: 14, color: colors.textPrimary },
    suggestedTag: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.bgPage,
      borderRadius: borderRadius.xxl,
      borderWidth: 1,
      borderColor: colors.border,
    },
    suggestedTagSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    suggestedTagText: { fontSize: 13, color: colors.textSecondary },
    suggestedTagTextSelected: { color: colors.white, fontWeight: '600' },
  }), [colors]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t.tags.title}</Text>
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
            value={newTag}
            onChangeText={setNewTag}
            placeholderTextColor={colors.placeholder}
            onSubmitEditing={onAddTag}
            autoCapitalize="none"
          />
          <IconButton
            label={t.tags.add}
            variant="filled"
            onPress={onAddTag}
            style={styles.addTagBtn}
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {tags.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>{t.nav.tags}</Text>
              <View style={styles.tagsContainer}>
                {tags.map((tag) => (
                  <View key={tag.id} style={styles.tagBadge}>
                    <Text style={styles.tagBadgeText}>{tag.name}</Text>
                    <IconButton
                      name="close-circle"
                      size={18}
                      color={colors.textMuted}
                      onPress={() => onRemoveTag(tag.name)}
                      accessibilityLabel={t.common.delete}
                    />
                  </View>
                ))}
              </View>
            </>
          )}

          {availableTags.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>{t.common.all}</Text>
              <View style={styles.tagsContainer}>
                {availableTags.map((tag) => {
                  const isSelected = currentTagNames.includes(tag.name);
                  return (
                    <TouchableOpacity
                      key={tag.id}
                      style={[styles.suggestedTag, isSelected && styles.suggestedTagSelected]}
                      onPress={() => onToggleTag?.(tag)}
                    >
                      <Text style={[styles.suggestedTagText, isSelected && styles.suggestedTagTextSelected]}>
                        {tag.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}