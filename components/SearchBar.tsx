import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../lib/themeContext';
import { useLanguage } from '../lib/languageContext';
import IconButton from './IconButton';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  onClear?: () => void;
};

export default function SearchBar({ value, onChangeText, placeholder, onClear }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <View style={[styles.searchContainer, { backgroundColor: colors.white }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.bgMuted }]}>
        <IconButton name="search" size={18} color={colors.textMuted} style={styles.searchIcon} passive />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          value={value}
          onChangeText={onChangeText}
          clearButtonMode="while-editing"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value.length > 0 && onClear && (
          <IconButton
            name="close-circle"
            size={18}
            color={colors.textMuted}
            onPress={onClear}
            accessibilityLabel={t.cancel}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
});