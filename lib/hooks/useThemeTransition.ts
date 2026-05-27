import { useEffect, useState, useRef } from 'react';
import { Animated } from 'react-native';
import { TIMEOUTS } from '@/lib/constants';

/**
 * Custom hook to handle smooth background color transitions when the theme changes.
 */
export function useThemeTransition(targetColor: string) {
  const bgColorAnim = useRef(new Animated.Value(0)).current;
  const [transitionColors, setTransitionColors] = useState({ prev: targetColor, curr: targetColor });

  useEffect(() => {
    if (targetColor !== transitionColors.curr) {
      setTransitionColors({ prev: transitionColors.curr, curr: targetColor });
      bgColorAnim.setValue(0);
      Animated.timing(bgColorAnim, {
        toValue: 1,
        duration: TIMEOUTS.THEME_TRANSITION,
        useNativeDriver: false,
      }).start();
    }
  }, [targetColor, transitionColors.curr, bgColorAnim]);

  return bgColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [transitionColors.prev, transitionColors.curr],
  });
}
