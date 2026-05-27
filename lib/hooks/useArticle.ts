import { useTheme } from '@/lib/theme';
import { useSettings } from '@/lib/hooks/useSettings';

export function useArticleSettings() {
  const { fontSize, changeFontSize, highlightColor } = useSettings();
  const { fontFamily, colors } = useTheme();
  return {
    fontSize,
    changeFontSize,
    defaultColor: highlightColor,
    fontFamily,
    colors,
  };
}
