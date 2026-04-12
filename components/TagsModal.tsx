import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';
import { useLanguage } from '../lib/languageContext';

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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t.tagsTitle}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.tagInputRow}>
          <TextInput
            style={styles.tagInput}
            placeholder={t.tagPlaceholder}
            value={newTag}
            onChangeText={setNewTag}
            onSubmitEditing={onAddTag}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.addTagBtn} onPress={onAddTag}>
            <Text style={styles.addTagBtnText}>{t.addTag}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tagsContainer}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tagBadge}>
              <Text style={styles.tagBadgeText}>{tag}</Text>
              <TouchableOpacity onPress={() => onRemoveTag(tag)}>
                <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: {
    height: '60%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  tagInputRow: { flexDirection: 'row', padding: 20, gap: 10 },
  tagInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.bgMuted,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 15,
  },
  addTagBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  addTagBtnText: { color: colors.white, fontWeight: '600' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 8 },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  tagBadgeText: { fontSize: 14, color: colors.textPrimary },
});