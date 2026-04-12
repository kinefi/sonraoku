import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking, StyleSheet } from 'react-native';
import { colors } from '../lib/theme';
import { useLanguage } from '../lib/languageContext';

type Props = {
  title: string | null;
  url: string;
  isFetching: boolean;
  fetchStatus: 'idle' | 'fetching' | 'success' | 'error';
  onFetchAgain: () => void;
};

export default function ArticleFallback({ title, url, isFetching, fetchStatus, onFetchAgain }: Props) {
  const { t } = useLanguage();

  return (
    <View style={styles.fallback}>
      <Text style={styles.fallbackText}>
        {title ? t.couldNotLoad(title) : t.noContent}
      </Text>
      <TouchableOpacity style={styles.openBtn} onPress={() => Linking.openURL(url)}>
        <Text style={styles.openBtnText}>{t.openInBrowser}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.fetchBtn, isFetching && styles.fetchBtnDisabled]}
        onPress={onFetchAgain}
        disabled={isFetching}
      >
        {isFetching ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : fetchStatus === 'success' ? (
          <Text style={styles.fetchBtnTextSuccess}>{t.downloadSuccess}</Text>
        ) : fetchStatus === 'error' ? (
          <Text style={styles.fetchBtnTextError}>{t.downloadError}</Text>
        ) : (
          <Text style={styles.fetchBtnText}>{t.downloadOffline}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  fallbackText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  openBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  openBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  fetchBtn: {
    backgroundColor: colors.bgMuted,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  fetchBtnDisabled: { opacity: 0.6 },
  fetchBtnText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  fetchBtnTextSuccess: { color: colors.success, fontSize: 15, fontWeight: '600' },
  fetchBtnTextError: { color: colors.error, fontSize: 15, fontWeight: '600' },
});