import React from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Highlight } from '../lib/db';
import { colors } from '../lib/theme';
import { useLanguage } from '../lib/languageContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  highlights: Highlight[];
  onSelect: (id: string) => void;
  defaultColor: string;
};

export default function HighlightsModal({ visible, onClose, highlights, onSelect, defaultColor }: Props) {
  const { t } = useLanguage();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t.highlightsTitle}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={highlights}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.highlightsList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.highlightItem}
              onPress={() => onSelect(item.id)}
            >
              <View style={[styles.highlightIndicator, { backgroundColor: defaultColor }]} />
              <Text style={styles.highlightText} numberOfLines={3}>
                {item.selected_text}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyHighlights}>
              <Text style={styles.emptyHighlightsText}>{t.noHighlightsYet}</Text>
            </View>
          }
        />
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
  highlightsList: { paddingVertical: 10 },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  highlightIndicator: { width: 4, height: 24, borderRadius: 2 },
  highlightText: {
    flex: 1, fontSize: 14, color: colors.textPrimary, lineHeight: 20,
  },
  emptyHighlights: { padding: 40, alignItems: 'center' },
  emptyHighlightsText: { color: colors.textMuted, fontSize: 14 },
});