import React, { ReactNode } from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, sharedStyles } from '../lib/theme';

export type FabAction = {
  icon?: keyof typeof Ionicons.glyphMap;
  label?: string;
  renderContent?: () => ReactNode;
  onPress: () => void;
  visible?: boolean;
  backgroundColor?: string;
  iconColor?: string;
  iconSize?: number;
  haptic?: Haptics.ImpactFeedbackStyle;
  disabled?: boolean;
  style?: ViewStyle;
  useFloatingStyle?: boolean;
};

type Props = {
  actions: FabAction[];
  containerStyle?: ViewStyle;
  disableAbsolutePositioning?: boolean;
};

export default function FabGroup({ actions, containerStyle, disableAbsolutePositioning }: Props) {
  const visibleActions = actions.filter((a) => a.visible !== false);

  if (visibleActions.length === 0) return null;

  return (
    <View style={[!disableAbsolutePositioning && styles.absoluteContainer, styles.container, containerStyle]}>
      {visibleActions.map((action, index) => (
        <TouchableOpacity
          key={index}
          activeOpacity={0.7}
          disabled={action.disabled}
          style={[
            styles.base,
            action.useFloatingStyle !== false ? styles.fabBase : null,
            { backgroundColor: action.backgroundColor ?? colors.primary },
            action.style,
            action.disabled ? styles.disabled : null,
          ]}
          onPress={() => {
            if (action.haptic) {
              Haptics.impactAsync(action.haptic);
            }
            action.onPress();
          }}
        >
          {action.renderContent ? (
            action.renderContent()
          ) : action.icon ? (
            <Ionicons
              name={action.icon}
              size={action.iconSize || 24}
              color={action.iconColor || colors.white}
            />
          ) : action.label ? (
            <Text style={[styles.label, { color: action.iconColor || colors.white }]}>
              {action.label}
            </Text>
          ) : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderRadius: 28,
    ...sharedStyles.floating,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 20,
    fontWeight: '700',
  },
});
