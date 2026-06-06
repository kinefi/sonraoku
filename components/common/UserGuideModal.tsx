import React, { useMemo } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, spacing, borderRadius } from '@/lib/theme';
import { useLanguage } from '@/lib/language';
import IconButton from '@/components/common/IconButton';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function UserGuideModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const iconGuideItems = useMemo(() => [
    { name: 'list-outline' as const, label: t.settings.guideIconReadingList },
    { name: 'pricetags-outline' as const, label: t.settings.guideIconTags },
    { name: 'logo-rss' as const, label: t.settings.guideIconFeeds },
    { name: 'bookmarks-outline' as const, label: t.settings.guideIconHighlights },
    { name: 'settings-outline' as const, label: t.settings.guideIconSettings },
    { name: 'search' as const, label: t.settings.guideIconSearch },
    { name: 'close-circle' as const, label: t.settings.guideIconClear },
    { name: 'add' as const, label: t.settings.guideIconAdd },
    { name: 'copy-outline' as const, label: t.settings.guideIconCopy },
    { name: 'share-social-outline' as const, label: t.settings.guideIconShare },
    { name: 'trash-outline' as const, label: t.settings.guideIconDelete },
    { name: 'checkmark-done-outline' as const, label: t.settings.guideIconMarkRead },
    { name: 'eye-outline' as const, label: t.settings.guideIconUnreadOnly },
    { name: 'swap-vertical-outline' as const, label: t.settings.guideIconSort },
    { name: 'download-outline' as const, label: t.settings.guideIconDownload },
    { name: 'arrow-back' as const, label: t.settings.guideIconBack },
    { name: 'refresh-outline' as const, label: t.settings.guideIconRefresh },
    { name: 'document-text-outline' as const, label: t.settings.guideIconReadme },
    { name: 'logo-github' as const, label: t.settings.guideIconGithub },
    { name: 'information-circle-outline' as const, label: t.settings.guideIconGuide },
    { name: 'close' as const, label: t.settings.guideIconClose },
  ], [t]);

  const styles = useMemo(() => StyleSheet.create({
    modalBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.overlay,
    },
    modalPanel: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'transparent',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      backgroundColor: colors.bgPage,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    modalContent: {
      padding: spacing.lg,
      backgroundColor: colors.bgPage,
    },
    modalSection: {
      marginBottom: spacing.lg,
    },
    modalSectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    modalSectionText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: spacing.sm,
    },
    iconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    iconLabel: {
      flex: 1,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bgMuted,
    },
  }), [colors]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalPanel}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t.settings.guideTitle}</Text>
          <IconButton name="close" size={24} onPress={onClose} accessibilityLabel={t.common.back} />
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>{t.settings.guideTabs}</Text>
            <Text style={styles.modalSectionText}>{t.settings.guideTabsArticles}</Text>
            <Text style={styles.modalSectionText}>{t.settings.guideTabsHighlights}</Text>
            <Text style={styles.modalSectionText}>{t.settings.guideTabsTags}</Text>
            <Text style={styles.modalSectionText}>{t.settings.guideTabsFeeds}</Text>
            <Text style={styles.modalSectionText}>{t.settings.guideTabsSettings}</Text>
          </View>
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>{t.settings.guideIconsTitle}</Text>
            {iconGuideItems.map((item) => (
              <View key={item.name} style={styles.iconRow}>
                <View style={styles.iconBox}>
                  <IconButton name={item.name} size={18} passive />
                </View>
                <Text style={styles.iconLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
