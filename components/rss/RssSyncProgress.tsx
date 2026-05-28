import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { typography, ThemeColors } from '@/lib/theme';
import { useLanguage } from '@/lib/language';

interface RssSyncProgressProps {
  isVisible: boolean;
  isImporting: boolean;
  progress: number;
  title: string | null;
  colors: ThemeColors;
}

/**
 * Sub-component for the sync/import progress bar
 */
const RssSyncProgress = memo(({ 
  isVisible, 
  isImporting, 
  progress, 
  title, 
  colors 
}: RssSyncProgressProps) => {
  const { t } = useLanguage();

  if (!isVisible) return null;
  
  return (
    <View style={{ height: 20, width: '100%', backgroundColor: colors.bgMuted, justifyContent: 'center', marginBottom: 10 }}>
      <View 
        style={{ 
          backgroundColor: colors.primary + '33', 
          width: `${progress * 100}%`, 
          position: 'absolute', 
          height: '100%' 
        }} 
      />
      <Text style={{ fontSize: 10, color: colors.textPrimary, textAlign: 'center', fontWeight: typography.weights.bold }} numberOfLines={1}>
        {isImporting ? t.rss.importOpml : t.rss.syncing} {title ? `(${title})` : ''}
      </Text>
    </View>
  );
});

RssSyncProgress.displayName = 'RssSyncProgress';

export default RssSyncProgress;