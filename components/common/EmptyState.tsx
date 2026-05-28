import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, spacing, typography } from '@/lib/theme';
import IconButton from '@/components/common/IconButton';

interface EmptyStateProps {
  icon: NonNullable<React.ComponentProps<typeof IconButton>['name']>;
  title: string;
  description?: string;
  fullScreen?: boolean;
}

const EmptyState = ({ icon, title, description, fullScreen = true }: EmptyStateProps) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <IconButton 
        name={icon} 
        size={48} 
        color={colors.borderMid} 
        passive 
        style={styles.icon}
      />
      <Text style={[styles.title, { color: colors.textFaint }]}>
        {title}
      </Text>
      {description && (
        <Text style={[styles.description, { color: colors.placeholder }]}>
          {description}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  fullScreen: {
    flex: 1,
    paddingTop: 100,
  },
  icon: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default EmptyState;