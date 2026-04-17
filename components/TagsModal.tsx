import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { sharedStyles, spacing, borderRadius } from '../lib/theme';
import { useTheme } from '../lib/themeContext';
import { useLanguage } from '../lib/languageContext';
import IconButton from './IconButton';

type Props = {
  visible: boolean;
  onClose: () => void;
  tags: string[];
  newTag: string;
  setNewTag: (text: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tagName: string) => void;
};

export default function TagsModal({
  visible,
  onClose,
  tags,
  newTag,
  setNewTag,
  onAddTag,
  onRemoveTag,
}: Props) {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    ...sharedStyles(colors),
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: {
      height: '60%',
      backgroundColor: colors.white,
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
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl, gap: spacing.sm },
    tagBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm - 2,
      borderRadius: borderRadius.xxl,
      gap: spacing.sm - 2,
    },
    tagBadgeText: { fontSize: 14, color: colors.textPrimary },
  }), [colors]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t.tagsTitle}</Text>
          <IconButton
            name="close"
            size={24}
            color={colors.textPrimary}
            onPress={onClose}
            accessibilityLabel={t.back}
          />
        </View>

        <View style={styles.tagInputRow}>
          <TextInput
            style={styles.tagInput}
            placeholder={t.tagPlaceholder}
            value={newTag}
            onChangeText={setNewTag}
            placeholderTextColor={colors.placeholder}
            onSubmitEditing={onAddTag}
            autoCapitalize="none"
          />
          <IconButton
            label={t.addTag}
            variant="filled"
            onPress={onAddTag}
            style={styles.addTagBtn}
          />
        </View>

        <View style={styles.tagsContainer}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tagBadge}>
              <Text style={styles.tagBadgeText}>{tag}</Text>
              <IconButton
                name="close-circle"
                size={16}
                color={colors.textSecondary}
                onPress={() => onRemoveTag(tag)}
                accessibilityLabel={t.delete}
              />
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}