import React, { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useTheme, borderRadius, spacing, typography, sharedStyles } from '@/lib/theme';
import { IconButton } from '@/components';

type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
  action?: { label: string; onPress: () => void };
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  const [action, setAction] = useState<ToastOptions['action']>(undefined);
  const { colors } = useTheme();

  const [prevColor, setPrevColor] = useState(colors.primary);
  const [currColor, setCurrColor] = useState(colors.primary);
  const colorAnim = useRef(new Animated.Value(0)).current;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getTypeColor = useCallback((t: ToastType) => {
    return t === 'success' ? colors.success : t === 'error' ? colors.error : colors.primary;
  }, [colors]);

  useEffect(() => {
    const targetColor = getTypeColor(type);
    if (targetColor !== currColor) {
      setPrevColor(currColor);
      setCurrColor(targetColor);
      colorAnim.setValue(0);
      Animated.timing(colorAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [type, getTypeColor, currColor, colorAnim]);

  const showToast = useCallback(({ message, type = 'info', duration = 3000, action }: ToastOptions) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setMessage(message);
    setType(type);
    setAction(action);
    setVisible(true);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false, // Must be false to avoid conflict with colorAnim on the same node
    }).start();

    timeoutRef.current = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false, // Must be false to avoid conflict with colorAnim on the same node
      }).start(() => setVisible(false));
    }, duration);
  }, [fadeAnim]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 100,
      left: spacing.lg,
      right: spacing.lg,
      zIndex: 9999,
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      ...sharedStyles(colors).floating,
    },
    icon: {
      marginRight: spacing.sm,
    },
    text: {
      flex: 1,
      color: colors.white,
      fontSize: 14,
      fontWeight: typography.weights.medium,
    },
    actionButton: {
      marginLeft: spacing.sm,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    actionText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: typography.weights.bold,
      textTransform: 'uppercase',
    },
  }), [colors]);

  const iconName = type === 'success' ? 'checkmark-circle' : type === 'error' ? 'alert-circle' : 'information-circle';

  const animatedBackgroundColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [prevColor, currColor],
  });

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && (
        <Animated.View style={[styles.container, { opacity: fadeAnim, backgroundColor: animatedBackgroundColor }]}>
          <IconButton 
            name={iconName} 
            size={20} 
            color={colors.white} 
            passive 
            style={styles.icon} 
          />
          <Text style={styles.text}>{message}</Text>
          {action && (
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => {
                action.onPress();
                setVisible(false);
              }}
            >
              <Text style={styles.actionText}>{action.label}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}