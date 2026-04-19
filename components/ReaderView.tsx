import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Highlight } from '@/lib/db';
import { FontFamily, useTheme, sharedStyles } from '@/lib/theme';
import { useReaderSelection } from '@/lib/reader';
import { ReaderMessage } from '@/types/reader';

type Props = {
  html: string;
  title: string;
  fontSize: number;
  fontFamily: FontFamily;
  defaultColor: string;
  highlights: Highlight[];
  onMessage: (msg: ReaderMessage) => void;
  onScrollProgress: (progress: number) => void;
  scrollToHighlightId?: string | null;
  initialProgress?: number;
};

export default function ReaderView({
  html,
  title,
  fontSize,
  fontFamily,
  defaultColor,
  highlights,
  onMessage,
  onScrollProgress,
  scrollToHighlightId,
  initialProgress,
}: Props) {
  const { colors } = useTheme();

  const {
    webViewRef,
    source,
    handleMessage,
    onLoadEnd,
    onLoadStart,
  } = useReaderSelection({
    html, title, fontSize, fontFamily, defaultColor, highlights, colors,
    onMessage, onScrollProgress, scrollToHighlightId, initialProgress
  });

  const styles = useMemo(() => StyleSheet.create({
    ...sharedStyles(colors),
    webView: { flex: 1 },
  }), [colors]);
  return (
    <WebView
      ref={webViewRef}
      source={source}
      javaScriptEnabled
      domStorageEnabled
      allowFileAccess={true}
      allowUniversalAccessFromFileURLs={true}
      mixedContentMode="always"
      style={styles.webView}
      originWhitelist={['*']}
      showsVerticalScrollIndicator={false}
      overScrollMode="never"
      textZoom={100}
      onLoadEnd={onLoadEnd}
      onLoadStart={onLoadStart}
      onMessage={handleMessage}
    />
  );
}
