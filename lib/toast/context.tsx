import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { useTheme, borderRadius, spacing, typography, sharedStyles } from '@/lib/theme';
import { IconButton } from '@/components';

type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback(({ message, type = 'info', duration = 3000 }: ToastOptions) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setMessage(message);
    setType(type);
    setVisible(true);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    timeoutRef.current = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
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
      backgroundColor: type === 'success' ? colors.success : type === 'error' ? colors.error : colors.primary,
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
  }), [colors, type]);

  const iconName = type === 'success' ? 'checkmark-circle' : type === 'error' ? 'alert-circle' : 'information-circle';

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <IconButton 
            name={iconName} 
            size={20} 
            color={colors.white} 
            passive 
            style={styles.icon} 
          />
          <Text style={styles.text}>{message}</Text>
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