import React from 'react';
import { Text, Modal, Pressable, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme, spacing, borderRadius, typography } from '@/lib/theme';
import { useLanguage } from '@/lib/language';
import { isValidUrl } from '@/lib/reader/rssFetcher';

interface Props {
  visible: boolean;
  onClose: () => void;
  urlInput: string;
  onUrlChange: (url: string) => void;
  onSave: () => void;
  isPending: boolean;
}

const RssAddModal = ({ visible, onClose, urlInput, onUrlChange, onSave, isPending }: Props) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const isInvalid = urlInput.length > 0 && !isValidUrl(urlInput);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable 
          style={[styles.content, { backgroundColor: colors.bgMuted, borderRadius: borderRadius.lg, padding: spacing.md }]} 
          onPress={() => {}} 
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t.rss.addFeed}</Text>
          <TextInput
            placeholder={t.rss.urlPlaceholder}
            placeholderTextColor={colors.textSecondary}
            value={urlInput}
            onChangeText={onUrlChange}
            autoFocus
            autoCapitalize="none"
            style={[styles.input, { backgroundColor: colors.bgPage, color: colors.textPrimary, borderRadius: borderRadius.md }]}
          />
          {isInvalid && (
            <Text style={[styles.error, { color: colors.error }]}>{t.articles.invalidUrl}</Text>
          )}
          <TouchableOpacity 
            onPress={onSave}
            disabled={isPending || !urlInput || isInvalid}
            style={[styles.btn, { backgroundColor: colors.primary, opacity: (!urlInput || isInvalid) ? 0.5 : 1 }]}
          >
            {isPending ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={[styles.btnText, { color: colors.white }]}>{t.articles.save}</Text>}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  content: { width: '100%', maxWidth: 400 },
  title: { fontSize: 18, fontWeight: typography.weights.bold, marginBottom: spacing.md },
  input: { height: 50, paddingHorizontal: 15, marginBottom: spacing.sm },
  error: { fontSize: 12, marginBottom: spacing.md },
  btn: { height: 50, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  btnText: { fontWeight: typography.weights.bold },
});

export default RssAddModal;