import React, { useMemo, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { Highlight } from '@/lib/db';
import { useTheme, sharedStyles, spacing, borderRadius } from '@/lib/theme';
import { useLanguage } from '@/lib/language';
import IconButton from '@/components/common/IconButton';

type Props = {
  visible: boolean;
  onClose: () => void;
  highlights: Highlight[];
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  defaultColor: string;
};

export default function HighlightsModal({ visible, onClose, highlights, onSelect, onDelete, defaultColor }: Props) {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const confirmDelete = useCallback((id: string) => {
    if (!onDelete) return;
    
    Alert.alert(
      t.common.confirmDelete,
      '',
      [
        { text: t.common.cancel, style: 'cancel' },
        { 
          text: t.common.delete, 
          style: 'destructive', 
          onPress: () => onDelete(id) 
        }
      ]
    );
  }, [onDelete, t]);

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
          <Text style={styles.modalTitle}>{t.highlights.title}</Text>
          <IconButton
            name="close"
            size={24}
            color={colors.textPrimary}
            onPress={onClose}
            accessibilityLabel={t.common.back}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                {onDelete && (
                  <IconButton 
                    name="trash-outline" 
                    size={18} 
                    color={colors.error} 
                    onPress={() => confirmDelete(item.id)} 
                  />
                )}
                <IconButton name="chevron-forward" size={16} color={colors.textFaint} passive />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyHighlights}>
              <Text style={styles.emptyHighlightsText}>{t.highlights.noHighlightsYet}</Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}