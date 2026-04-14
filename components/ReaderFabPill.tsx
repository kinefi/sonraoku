import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, sharedStyles } from '../lib/theme';
import { FONT_SIZE_MIN, FONT_SIZE_MAX } from '../lib/hooks';
import FabGroup, { FabAction } from './FabGroup';

type Props = {
  onBack: () => void;
  fontSize: number;
  onFontSizeChange: (delta: number) => void;
  onToggleHighlights: () => void;
  onToggleTags: () => void;
  isSpeaking: boolean;
  onToggleSpeech: () => void;
  onShare: () => void;
  isFetching?: boolean;
  onRefresh?: () => void;
  hasContent: boolean;
};

export default function ReaderFabPill({
  onBack,
  fontSize,
  onFontSizeChange,
  onToggleHighlights,
  onToggleTags,
  isSpeaking,
  onToggleSpeech,
  onShare,
  isFetching,
  onRefresh,
  hasContent,
}: Props) {
  const actions: FabAction[] = [
    {
      icon: 'arrow-back',
      onPress: onBack,
      iconColor: colors.primary,
      backgroundColor: 'transparent',
      useFloatingStyle: false,
      style: styles.fabActionBtn,
    },
  ];

  if (hasContent) {
    actions.push(
      {
        label: 'A−',
        onPress: () => {
          Haptics.selectionAsync();
          onFontSizeChange(-2);
        },
        disabled: fontSize <= FONT_SIZE_MIN,
        iconColor: colors.primary,
        backgroundColor: 'transparent',
        useFloatingStyle: false,
        style: styles.fabActionBtn,
      },
      {
        label: 'A+',
        onPress: () => {
          Haptics.selectionAsync();
          onFontSizeChange(2);
        },
        disabled: fontSize >= FONT_SIZE_MAX,
        iconColor: colors.primary,
        backgroundColor: 'transparent',
        useFloatingStyle: false,
        style: styles.fabActionBtn,
      },
      {
        icon: 'bookmarks-outline',
        iconSize: 22,
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggleHighlights();
        },
        iconColor: colors.primary,
        backgroundColor: 'transparent',
        useFloatingStyle: false,
        style: styles.fabActionBtn,
      },
      {
        icon: 'pricetag-outline',
        iconSize: 22,
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggleTags();
        },
        iconColor: colors.primary,
        backgroundColor: 'transparent',
        useFloatingStyle: false,
        style: styles.fabActionBtn,
      },
      {
        renderContent: () => isFetching ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="refresh-outline" size={24} color={colors.primary} />
        ),
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onRefresh?.();
        },
        disabled: isFetching,
        backgroundColor: 'transparent',
        useFloatingStyle: false,
        style: styles.fabActionBtn,
      },
      {
        icon: isSpeaking ? 'stop-circle' : 'volume-high-outline',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onToggleSpeech();
        },
        backgroundColor: isSpeaking ? colors.primary : 'transparent',
        iconColor: isSpeaking ? colors.white : colors.primary,
        useFloatingStyle: false,
        style: styles.fabActionBtn,
      },
      {
        icon: 'share-social-outline',
        onPress: onShare,
        iconColor: colors.primary,
        backgroundColor: 'transparent',
        useFloatingStyle: false,
        style: styles.fabActionBtn,
      }
    );
  }

  return (
    <View style={styles.fabActionRow}>
      <FabGroup 
        actions={actions} 
        containerStyle={styles.fabPill} 
        disableAbsolutePositioning 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fabActionRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
  },
  fabPill: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.bgMuted,
    borderRadius: 32,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    ...sharedStyles.floating,
  },
  fabActionBtn: {
    width: 44,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});