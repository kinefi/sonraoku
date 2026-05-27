import React, { useMemo } from 'react';
import { TouchableOpacity, TouchableOpacityProps, StyleSheet, Text, ActivityIndicator, View, TextStyle, ViewProps, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, borderRadius, typography } from '@/lib/theme';

export type IconName = keyof typeof Ionicons.glyphMap;

export type IconButtonProps = TouchableOpacityProps & ViewProps & {
  name?: IconName;
  label?: string;
  size?: number;
  color?: string;
  variant?: 'ghost' | 'filled' | 'outlined';
  loading?: boolean;
  passive?: boolean;
  labelStyle?: StyleProp<TextStyle>;
};

export default function IconButton({ name, label, size = 24, color, style, children, variant = 'ghost', loading, passive, labelStyle, ...props }: IconButtonProps) {
  const { colors } = useTheme();

  const isDisabled = props.disabled;
  const isFilled = variant === 'filled';
  const isOutlined = variant === 'outlined';
  const themeColor = color || colors.primary;
  const contentColor = isDisabled ? colors.textFaint : (isFilled ? colors.white : themeColor);

  const Container = (passive ? View : TouchableOpacity) as React.ElementType;

  const styles = useMemo(() => StyleSheet.create({
    base: {
      padding: spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filled: {
      backgroundColor: themeColor,
      padding: spacing.lg,
      borderRadius: borderRadius.xl,
    },
    outlined: {
      borderWidth: 1,
      borderColor: themeColor,
      padding: spacing.sm,
      borderRadius: borderRadius.lg,
    },
    disabled: {
      opacity: 0.5,
    },
    label: {
      fontSize: 16,
      fontWeight: typography.weights.bold,
      textAlign: 'center',
    },
  }), [themeColor]);

  return (
    <Container
      accessibilityLabel={props.accessibilityLabel || label}
      accessibilityRole={props.accessibilityRole || (passive ? undefined : 'button')}
      accessibilityState={props.accessibilityState || { disabled: isDisabled }}
      importantForAccessibility={passive ? 'no-hide-descendants' : 'yes'}
      {...(!passive && { activeOpacity: 0.7 })}
      style={[
        styles.base,
        isFilled && styles.filled,
        isOutlined && styles.outlined,
        isDisabled && styles.disabled,
        style
      ]}
      {...props}
    >
      {loading && <ActivityIndicator size="small" color={contentColor} />}
      {!loading && name && <Ionicons name={name} size={size} color={contentColor} />}
      {!loading && label && (
        <Text style={[styles.label, { color: contentColor }, name && { marginTop: spacing.xs }, labelStyle]}>
          {label}
        </Text>
      )}
      {!loading && children}
    </Container>
  );
}