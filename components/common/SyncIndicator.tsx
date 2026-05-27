import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { useMutationState } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

interface SyncIndicatorProps {
  color: string;
  size?: number;
  activeIcon?: keyof typeof Ionicons.glyphMap;
  idleIcon?: keyof typeof Ionicons.glyphMap;
}

const SyncIndicator = ({ color, size = 24, activeIcon = 'refresh', idleIcon = 'logo-rss' }: SyncIndicatorProps) => {
  const syncing = useMutationState({
    filters: { mutationKey: ['rss-sync-all'], status: 'pending' },
    select: (mutation) => mutation.state.status === 'pending',
  });

  const isSyncing = syncing.some(Boolean);
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSyncing) {
      Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotation.stopAnimation();
      rotation.setValue(0);
    }
  }, [isSyncing, rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <Ionicons name={isSyncing ? activeIcon : idleIcon} size={size} color={color} />
    </Animated.View>
  );
};

export default SyncIndicator;