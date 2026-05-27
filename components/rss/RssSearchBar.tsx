import React, { useMemo } from 'react';
import { StyleSheet, View, TextInput } from 'react-native';
import { useTheme, spacing, borderRadius } from '@/lib/theme';

interface RssSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}

export const RssSearchBar = ({ value, onChangeText, placeholder }: RssSearchBarProps) => {
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: { paddingHorizontal: spacing.md, marginTop: spacing.sm },
    searchInput: { height: 40, paddingHorizontal: 15, borderRadius: borderRadius.xxl, fontSize: 14 },
  }), []);

  return (
    <View style={styles.container}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        style={[styles.searchInput, { backgroundColor: colors.bgMuted, color: colors.textPrimary }]}
        clearButtonMode="while-editing"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
};

export default RssSearchBar;
