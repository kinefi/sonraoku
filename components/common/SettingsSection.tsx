import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, spacing, borderRadius, typography } from '@/lib/theme';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

const SettingsSection = ({ title, description, children }: SettingsSectionProps) => {
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    section: {
      marginTop: spacing.lg,
      marginHorizontal: spacing.lg,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      overflow: 'hidden',
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: typography.weights.semibold,
      textTransform: 'uppercase',
      letterSpacing: typography.letterSpacing.relaxed,
      paddingHorizontal: spacing.md + 2,
      paddingTop: spacing.sm + 2,
      paddingBottom: spacing.xs,
    },
    description: {
      paddingHorizontal: spacing.md + 2,
      fontSize: 13,
      marginBottom: spacing.sm,
      lineHeight: 18,
    },
    content: {
      backgroundColor: 'transparent',
    },
  }), []);

  return (
    <View style={[styles.section, { borderColor: colors.border }]}> 
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{title}</Text>
      {description && (
        <Text style={[styles.description, { color: colors.textSecondary }]}> 
          {description}
        </Text>
      )}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

export default SettingsSection;