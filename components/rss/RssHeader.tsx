import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { spacing, typography, useTheme } from '@/lib/theme';
import IconButton from '@/components/common/IconButton';

type ColorTokens = ReturnType<typeof useTheme>['colors'];

interface RssHeaderProps {
  title: string | null;
  lastSyncTime?: number;
  selectedFeedId: string | null;
  onBack: () => void;
  colors: ColorTokens;
  t: any;
  translate: (key: string, params?: Record<string, any>) => string;
}

/**
 * Sub-component for the RSS header with back button and sync status
 */
export const RssHeader = memo(({ 
  title, 
  lastSyncTime, 
  selectedFeedId, 
  onBack, 
  colors, 
  t, 
  translate 
}: RssHeaderProps) => (
  <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, marginBottom: 5 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {selectedFeedId && (
        <IconButton 
          name="arrow-back" 
          size={20} 
          color={colors.primary} 
          onPress={onBack}
          style={{ marginRight: spacing.xs, marginLeft: -spacing.xs }}
        />
      )}
      <Text 
        style={{ 
          fontSize: 24, 
          fontWeight: typography.weights.bold, 
          color: colors.textPrimary 
        }}
      >
        {title || t.rss.title}
      </Text>
    </View>
    {lastSyncTime && (
      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
        {translate('rss.lastSynced', { 
          time: new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        })}
      </Text>
    )}
  </View>
));

RssHeader.displayName = 'RssHeader';