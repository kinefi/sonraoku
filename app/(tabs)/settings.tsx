import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sharedStyles } from '../../lib/sharedStyles';
import { colors } from '../../lib/colors';
import { useLanguage } from '../../lib/languageContext';
import { LANGUAGES, Lang } from '../../lib/i18n';

const FONT_SIZE_KEY = 'reader_font_size';
const FONT_SIZE_DEFAULT = 16;
const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 36;

export default function SettingsScreen() {
  const { t, lang, setLang } = useLanguage();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fontSize, setFontSize] = useState(FONT_SIZE_DEFAULT);

  useEffect(() => {
    AsyncStorage.getItem(FONT_SIZE_KEY)
      .then((val) => { if (val) setFontSize(Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, parseInt(val, 10)))); })
      .catch(() => {});
  }, []);

  function changeFontSize(delta: number) {
    const next = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, fontSize + delta));
    setFontSize(next);
    AsyncStorage.setItem(FONT_SIZE_KEY, String(next)).catch(() => {});
  }

  const currentLabel = LANGUAGES.find((l) => l.key === lang)?.label ?? lang;

  function handleSelect(key: Lang) {
    setLang(key);
    setPickerOpen(false);
  }

  return (
    <SafeAreaView style={sharedStyles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" translucent={false} />
      <View style={sharedStyles.header}>
        <Text style={sharedStyles.headerTitle}>{t.settings}</Text>
      </View>

      {/* Language */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t.language}</Text>
        <TouchableOpacity style={styles.combobox} onPress={() => setPickerOpen(true)}>
          <Text style={styles.comboboxText}>{currentLabel}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Font size */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t.defaultFontSize}</Text>
        <View style={styles.fontSizeRow}>
          <TouchableOpacity
            style={[styles.fontBtn, fontSize <= FONT_SIZE_MIN && styles.fontBtnDisabled]}
            onPress={() => changeFontSize(-2)}
            disabled={fontSize <= FONT_SIZE_MIN}
          >
            <Text style={[styles.fontBtnText, fontSize <= FONT_SIZE_MIN && styles.fontBtnTextDisabled]}>A−</Text>
          </TouchableOpacity>
          <Text style={[styles.fontSizeValue, { fontSize }]}>Aa</Text>
          <TouchableOpacity
            style={[styles.fontBtn, fontSize >= FONT_SIZE_MAX && styles.fontBtnDisabled]}
            onPress={() => changeFontSize(2)}
            disabled={fontSize >= FONT_SIZE_MAX}
          >
            <Text style={[styles.fontBtnText, { fontSize: 16 }, fontSize >= FONT_SIZE_MAX && styles.fontBtnTextDisabled]}>A+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.backdrop} onPress={() => setPickerOpen(false)} activeOpacity={1} />
        <View style={styles.dropdownWrapper}>
          <View style={styles.dropdown}>
            {LANGUAGES.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.option, option.key === lang && styles.optionSelected]}
                onPress={() => handleSelect(option.key)}
              >
                <Text style={[styles.optionText, option.key === lang && styles.optionTextSelected]}>
                  {option.label}
                </Text>
                {option.key === lang && (
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.white,
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  combobox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  comboboxText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  fontSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  fontBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontBtnDisabled: {
    backgroundColor: colors.bgPage,
  },
  fontBtnText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  fontBtnTextDisabled: {
    color: colors.textFaint,
  },
  fontSizeValue: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  dropdownWrapper: {
    position: 'absolute',
    top: '30%',
    left: 32,
    right: 32,
  },
  dropdown: {
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 8,
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  optionSelected: {
    backgroundColor: colors.bgMuted,
  },
  optionText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});
