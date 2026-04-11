import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export type ParseResult = {
  title: string;
  content: string;
  excerpt: string;
};

type Props = {
  html: string;
  onParsed: (result: ParseResult) => void;
  onError: (error: string) => void;
};

export default function ArticleParser({ html, onParsed, onError }: Props) {
  console.log('ArticleParser mounting, HTML length:', html.length);
  const timeoutRef = useRef<NodeJS.Timeout>(10000);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      //console.error('ArticleParser timeout after 60 seconds');
      onError('Parsing timeout');
    }, 10000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <WebView
      style={styles.hidden}
      source={{ html }}
      javaScriptEnabled={true}
      originWhitelist={['*']}
      domStorageEnabled={true}
      allowFileAccess={true}
      allowUniversalAccessFromFileURLs={true}
      mixedContentMode="always"
      onLoadStart={() => console.log('WebView load started')}
      onLoadEnd={() => {
        console.log('WebView load ended');
        setTimeout(() => {
          console.log('Waiting for message from WebView...');
        }, 100);
      }}
      onError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.error('WebView error:', nativeEvent);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        onError('WebView failed to load');
      }}
      onMessage={(event) => {
        console.log('WebView message received, data:', event.nativeEvent.data);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        try {
          const messageStr = event.nativeEvent.data;
          console.log('Message type:', typeof messageStr, 'length:', messageStr.length);
          const data = JSON.parse(messageStr);
          console.log('Parsed message, success:', data.success);
          if (data.success) {
            console.log('Parse successful, title:', data.title, 'content length:', data.content.length);
            onParsed({
              title: data.title ?? '',
              content: data.content ?? '',
              excerpt: data.excerpt ?? '',
            });
          } else {
            console.error('Parse failed:', data.error);
            onError(data.error ?? 'Parse failed');
          }
        } catch (e) {
          console.error('Failed to parse WebView message:', e, 'raw:', event.nativeEvent.data);
          onError('Failed to read parse result');
        }
      }}
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
