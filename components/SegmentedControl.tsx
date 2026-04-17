import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../lib/themeContext';
import { spacing, borderRadius } from '../lib/theme';
import IconButton from './IconButton';

type SegmentedControlProps<T> = {
  options: readonly T[] | { key: T; label?: string; icon?: keyof typeof Ionicons.glyphMap }[];
  value: T;
  onChange: (val: T) => void;
  getLabel?: (val: T) => string;
  accessibilityLabel?: string;
  size?: 'normal' | 'small';
};

export default function SegmentedControl<T extends string>({ 
  options, 
  value, 
  onChange, 
  getLabel,
  accessibilityLabel,
  size = 'normal'
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const activeIndex = options.findIndex(opt => {
    const key = typeof opt === 'string' ? opt : (opt as any).key;
    return key === value;
  });

  const segmentWidth = containerWidth ? (containerWidth - 4) / options.length : 0;

  useEffect(() => {
    if (segmentWidth > 0) {
      Animated.spring(translateX, {
        toValue: activeIndex * segmentWidth,
        useNativeDriver: true,
        bounciness: 4,
        speed: 12,
      }).start();
    }
  }, [activeIndex, segmentWidth]);

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  return (
    <View 
      onLayout={handleLayout}
      accessibilityLabel={accessibilityLabel}
      style={{ 
        flexDirection: 'row', 
        backgroundColor: colors.bgMuted, 
        borderRadius: size === 'small' ? borderRadius.xxl : borderRadius.lg, 
        padding: spacing.xs / 2, 
        margin: size === 'small' ? 0 : spacing.lg, 
        position: 'relative' 
      }}
    >
      {containerWidth > 0 && (
        <Animated.View 
          style={{
            position: 'absolute',
            top: spacing.xs / 2,
            left: spacing.xs / 2,
            width: segmentWidth,
            bottom: spacing.xs / 2,
            backgroundColor: colors.white,
            borderRadius: size === 'small' ? borderRadius.xxl - 2 : borderRadius.md,
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            transform: [{ translateX }]
          }}
        />
      )}
      {options.map((opt) => {
        const key = typeof opt === 'string' ? opt : (opt as any).key;
        const optionObj = typeof opt === 'object' ? opt : {} as any;
        const label = getLabel 
          ? getLabel(key) 
          : (typeof opt === 'string' ? opt : optionObj.label);
          
        const icon = optionObj.icon;
        const isActive = value === key;

        return (
          <TouchableOpacity
            key={key}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(key);
            }}
            hitSlop={{ top: spacing.md, bottom: spacing.md, left: 0, right: 0 }}
            accessibilityRole="tab"
            accessibilityLabel={label || String(key)}
            accessibilityState={{ selected: isActive }}
            style={{
              flex: 1,
              paddingVertical: size === 'small' ? spacing.xs : spacing.sm,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
            }}
          >
            {icon && (
              <IconButton 
                name={icon} 
                size={16} 
                color={isActive ? colors.primary : colors.textSecondary} 
                style={{ marginRight: label ? spacing.xs + 2 : 0 }}
                passive
              />
            )}
            {label && (
              <Text style={{ fontSize: 13, fontWeight: isActive ? '600' : '400', color: isActive ? colors.primary : colors.textSecondary }}>
                {label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}