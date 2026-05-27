import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, spacing, typography } from '@/lib/theme';

interface SettingsRowProps {
  label: string;
  description?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  noBorder?: boolean;
  alignTop?: boolean;
}

const SettingsRow = ({ label, description, children, onPress, noBorder = false, alignTop = false }: SettingsRowProps) => {
  const { colors } = useTheme();
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[
        styles.row,
        !noBorder && { borderTopWidth: 1, borderTopColor: colors.borderLight },
        alignTop && { alignItems: 'flex-start', paddingTop: spacing.md }
      ]}
    >
      <View style={styles.left}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
        {description && (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {description}
          </Text>
        )}
      </View>
      {children && <View style={styles.right}>{children}</View>}
    </Container>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  left: {
    flex: 1,
    marginRight: spacing.md,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: { fontSize: 15, fontWeight: typography.weights.medium },
  description: { fontSize: 12, marginTop: 2, lineHeight: 16 },
});

export default SettingsRow;