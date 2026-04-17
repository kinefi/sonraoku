import React, { ReactNode, useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { sharedStyles, borderRadius, typography } from '../lib/theme';
import { useTheme } from '../lib/themeContext';
import IconButton, { IconName } from './IconButton';

export type FabAction = {
  icon?: IconName;
  label?: string;
  renderContent?: () => ReactNode;
  onPress: () => void;
  visible?: boolean;
  backgroundColor?: string;
  iconColor?: string;
  iconSize?: number;
  haptic?: Haptics.ImpactFeedbackStyle;
  disabled?: boolean;
  variant?: 'ghost' | 'filled' | 'outlined';
  style?: ViewStyle;
  useFloatingStyle?: boolean;
};

type Props = {
  actions: FabAction[];
  containerStyle?: ViewStyle;
  disableAbsolutePositioning?: boolean;
};

export default function FabGroup({ actions, containerStyle, disableAbsolutePositioning }: Props) {
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    absoluteContainer: {
      position: 'absolute',
      right: 20,
      bottom: 24,
    },
    container: {
      flexDirection: 'row',
      gap: 12,
    },
    base: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    fabBase: {
      width: 56,
      height: 56,
      borderRadius: borderRadius.pill,
      ...sharedStyles(colors).floating,
    },
    disabled: {
      opacity: 0.5,
    },
    label: {
      fontSize: 20,
      fontWeight: typography.weights.bold,
    },
  }), [colors]);

  const visibleActions = actions.filter((a) => a.visible !== false);

  if (visibleActions.length === 0) return null;

  return (
    <View style={[!disableAbsolutePositioning && styles.absoluteContainer, styles.container, containerStyle, { shadowColor: colors.black }]}>
      {visibleActions.map((action, index) => (
        <IconButton
          key={index}
          name={action.icon}
          label={action.label}
          size={action.iconSize || 24}
          variant={action.variant}
          color={action.iconColor || (action.backgroundColor === 'transparent' ? colors.primary : colors.white)}
          disabled={action.disabled}
          onPress={() => {
            if (action.haptic) {
              Haptics.impactAsync(action.haptic);
            }
            action.onPress();
          }}
          style={[
            styles.base,
            action.useFloatingStyle !== false ? styles.fabBase : null,
            { backgroundColor: action.backgroundColor ?? colors.primary },
            action.style,
            action.disabled ? styles.disabled : null,
          ]}
        >
          {action.renderContent?.()}
        </IconButton>
      ))}
    </View>
  );
}
