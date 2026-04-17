import React, { useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Highlight } from '../lib/db';
import { sharedStyles, spacing, borderRadius } from '../lib/theme';
import { useTheme } from '../lib/themeContext';
import { useLanguage } from '../lib/languageContext';
import IconButton from './IconButton';

type Props = {
  visible: boolean;
  onClose: () => void;
  highlights: Highlight[];
  onSelect: (id: string) => void;
  defaultColor: string;
};

export default function HighlightsModal({ visible, onClose, highlights, onSelect, defaultColor }: Props) {
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
    highlightsList: { paddingVertical: spacing.md },
    highlightItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md + 2,
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    highlightIndicator: { width: spacing.xs, height: spacing.xxl, borderRadius: borderRadius.xs },
    highlightText: {
      flex: 1, fontSize: 14, color: colors.textPrimary, lineHeight: 20,
    },
    emptyHighlights: { padding: spacing.xxxl + 8, alignItems: 'center' },
    emptyHighlightsText: { color: colors.textMuted, fontSize: 14 },
  }), [colors]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t.highlightsTitle}</Text>
          <IconButton
            name="close"
            size={24}
            color={colors.textPrimary}
            onPress={onClose}
            accessibilityLabel={t.back}
          />
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
              <IconButton name="chevron-forward" size={16} color={colors.textFaint} passive />
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