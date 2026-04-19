import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import { sharedStyles, spacing, borderRadius, typography, useTheme } from '@/lib/theme';
import { queryClient, buildParserHtml, useParseQueue } from '@/lib/reader';
import { insertArticle } from '@/lib/db';
import { fetchRawHtml } from '@/lib/utils';
import { useLanguage } from '@/lib/language';
import IconButton from './IconButton';

type Props = {
  visible: boolean;
  onClose: () => void;
};

function generateId(): string {
  return Crypto.randomUUID();
}

export default function SaveUrlSheet({ visible, onClose }: Props) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { addToQueue } = useParseQueue();
  const { colors } = useTheme();
  const { t } = useLanguage();

  async function handleSave() {
    const trimmed = url.trim();
    if (!trimmed) return;

    // Basic URL validation
    try {
      new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    } catch {
      setError(t.articles.invalidUrl);
      AccessibilityInfo.announceForAccessibility(t.articles.invalidUrl);
      return;
    }

    const fullUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    setError('');
    setLoading(true);
    AccessibilityInfo.announceForAccessibility(t.common.loading);

    const id = generateId();
    await insertArticle(id, fullUrl);
    queryClient.invalidateQueries({ queryKey: ['articles'] });
    setLoading(false);
    setUrl('');
    onClose();

    // Fetch + queue in background — sheet is already closed
    fetchRawHtml(fullUrl)
      .then((rawHtml) => {
        addToQueue({ 
          id, 
          html: buildParserHtml(rawHtml, fullUrl, {
            timeout: t.errors.internalSafetyTimeout,
            noContent: t.articles.noContent,
            unknownError: t.errors.parseError,
          }), 
          url: fullUrl 
        });
        AccessibilityInfo.announceForAccessibility(t.articles.downloadSuccess);
      })
      .catch((e) => { 
        console.error(e);
        AccessibilityInfo.announceForAccessibility(t.articles.downloadError);
      });
  }

  function handleClose() {
    if (loading) return;
    setUrl('');
    setError('');
    onClose();
  }

  const styles = useMemo(() => StyleSheet.create({
    ...sharedStyles(colors),
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheetWrapper: {
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.bgPage,
      borderTopLeftRadius: borderRadius.xxl,
      borderTopRightRadius: borderRadius.xxl,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxxl,
    },
    handle: {
      width: 36,
      height: spacing.xs,
      backgroundColor: colors.borderMid,
      borderRadius: borderRadius.xs,
      alignSelf: 'center',
      marginBottom: spacing.lg,
    },
    heading: {
      fontSize: 17,
      fontWeight: typography.weights.semibold,
      color: colors.textPrimary,
      marginBottom: spacing.lg,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.borderMid,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md + 2,
      paddingVertical: spacing.md,
      fontSize: 15,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    error: {
      color: colors.error,
      fontSize: 13,
      marginBottom: spacing.sm,
    },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md + 2,
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    saveBtnDisabled: {
      opacity: 0.6,
    },
  }), [colors]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrapper}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.heading}>{t.articles.saveArticle}</Text>

          <TextInput
            style={styles.input}
            placeholder={t.articles.urlPlaceholder}
            placeholderTextColor={colors.placeholder}
            value={url}
            onChangeText={(t) => {
              setUrl(t);
              setError('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="done"
            onSubmitEditing={handleSave}
            editable={!loading}
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <IconButton
            label={t.articles.save}
            variant="filled"
            onPress={handleSave}
            loading={loading}
            disabled={loading}
            style={styles.saveBtn}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
