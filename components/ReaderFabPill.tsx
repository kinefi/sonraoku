import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../lib/theme';
import { FONT_SIZE_MIN, FONT_SIZE_MAX } from '../lib/hooks';

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
  return (
    <View style={styles.fabActionRow}>
      <View style={styles.fabPill}>
        <TouchableOpacity style={styles.fabActionBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        {hasContent && (
          <>
            <TouchableOpacity
              style={[styles.fabActionBtn, fontSize <= FONT_SIZE_MIN && styles.fabActionBtnDisabled]}
              onPress={() => {
                Haptics.selectionAsync();
                onFontSizeChange(-2);
              }}
              disabled={fontSize <= FONT_SIZE_MIN}
            >
              <Text style={styles.fabFontText}>A−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fabActionBtn, fontSize >= FONT_SIZE_MAX && styles.fabActionBtnDisabled]}
              onPress={() => {
                Haptics.selectionAsync();
                onFontSizeChange(2);
              }}
              disabled={fontSize >= FONT_SIZE_MAX}
            >
              <Text style={styles.fabFontText}>A+</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.fabActionBtn} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggleHighlights();
              }}
            >
              <Ionicons name="bookmarks-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.fabActionBtn} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggleTags();
              }}
            >
              <Ionicons name="pricetag-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.fabActionBtn} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onRefresh?.();
              }}
              disabled={isFetching}
            >
              {isFetching ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="refresh-outline" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fabActionBtn, isSpeaking && styles.fabActionBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onToggleSpeech();
              }}
            >
              <Ionicons
                name={isSpeaking ? 'stop-circle' : 'volume-high-outline'}
                size={24}
                color={isSpeaking ? colors.white : colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.fabActionBtn} onPress={onShare}>
              <Ionicons name="share-social-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          </>
        )}
      </View>
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
    elevation: 6,
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  fabActionBtn: {
    width: 44,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabActionBtnActive: { backgroundColor: colors.primary, borderRadius: 20 },
  fabActionBtnDisabled: { opacity: 0.5 },
  fabFontText: {
    fontSize: 20, fontWeight: '700', color: colors.primary,
  },
});