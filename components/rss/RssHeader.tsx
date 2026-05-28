import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { spacing, typography, ThemeColors } from '@/lib/theme';
import IconButton from '@/components/common/IconButton';
import { useLanguage } from '@/lib/language';

interface RssHeaderProps {
  title: string | null;
  lastSyncTime?: number;
  selectedFeedId: string | null;
  onBack: () => void;
  colors: ThemeColors;
}

/**
 * Sub-component for the RSS header with back button and sync status
 */
const RssHeader = memo(({ 
  title, 
  lastSyncTime, 
  selectedFeedId, 
  onBack, 
  colors 
}: RssHeaderProps) => {
  const { t, translate } = useLanguage();

  return (
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
  );
});

RssHeader.displayName = 'RssHeader';

export default RssHeader;