import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import { colors } from '../lib/theme';
import { queryClient } from '../lib/queryClient';
import { insertArticle } from '../lib/db';
import { fetchRawHtml } from '../lib/utils';
import { buildParserHtml } from '../lib/htmlBuilder';
import { useParseQueue } from '../lib/parseQueue';
import { useLanguage } from '../lib/languageContext';

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
  const { t } = useLanguage();

  async function handleSave() {
    const trimmed = url.trim();
    if (!trimmed) return;

    // Basic URL validation
    try {
      new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    } catch {
      setError(t.invalidUrl);
      return;
    }

    const fullUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    setError('');
    setLoading(true);

    const id = generateId();
    insertArticle(id, fullUrl);
    queryClient.invalidateQueries({ queryKey: ['articles'] });
    setLoading(false);
    setUrl('');
    onClose();

    // Fetch + queue in background — sheet is already closed
    fetchRawHtml(fullUrl)
      .then((rawHtml) => addToQueue({ id, html: buildParserHtml(rawHtml, fullUrl), url: fullUrl }))
      .catch((e) => { console.error(e) });
  }

  function handleClose() {
    if (loading) return;
    setUrl('');
    setError('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrapper}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.heading}>{t.saveArticle}</Text>

          <TextInput
            style={styles.input}
            placeholder={t.urlPlaceholder}
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

          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>{t.save}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrapper: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.borderMid,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  heading: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderMid,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  error: {
    color: colors.error,
    fontSize: 13,
    marginBottom: 8,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
