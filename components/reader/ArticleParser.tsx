import React from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLanguage } from '@/lib/language';
import { useArticleParser } from '@/lib/hooks';
import { ParseResult } from '@/types/reader';

type Props = {
  html: string;
  onParsed: (result: ParseResult) => void;
  onError: (error: string) => void;
};

export default function ArticleParser({ html, onParsed, onError }: Props) {
  const { t } = useLanguage();
  const { source, onLoadEnd, onWebViewError, onMessage } = useArticleParser({
    html,
    onParsed,
    onError,
  });

  return (
    <WebView
      style={styles.hidden}
      source={source}
      javaScriptEnabled={true}
      originWhitelist={['*']}
      domStorageEnabled={false} // Readability on static HTML doesn't need storage
      cacheEnabled={false} // Critical for high-volume parsing to avoid disk/memory cache growth
      incognito={true} // Ensures each parse starts with a clean state
      allowFileAccess={false} // Not needed for string source
      allowUniversalAccessFromFileURLs={false} // Security hardening
      mixedContentMode="never" // Security hardening
      onLoadEnd={onLoadEnd}
      onError={(e) => onWebViewError(e.nativeEvent.description ?? t.errors.pageLoadError)}
      onMessage={onMessage}
    />
  );
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
