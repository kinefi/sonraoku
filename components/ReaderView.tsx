import React, { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import RenderHtml from 'react-native-render-html';

type Props = {
  html: string;
  fontSize: number;
};

const tagsStyles = {
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    color: '#222',
  },
  p: { marginBottom: 14 },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: '#534AB7',
    paddingLeft: 12,
    marginLeft: 0,
    color: '#555',
  },
  a: { color: '#534AB7' },
  h1: { color: '#111', marginBottom: 8 },
  h2: { color: '#111', marginBottom: 8 },
  h3: { color: '#111', marginBottom: 8 },
  img: { maxWidth: '100%' as const },
};

export default function ReaderView({ html, fontSize }: Props) {
  const { width } = useWindowDimensions();
  const baseStyle = useMemo(() => ({ fontSize }), [fontSize]);

  return (
    <RenderHtml
      contentWidth={width}
      source={{ html }}
      tagsStyles={tagsStyles}
      baseStyle={baseStyle}
    />
  );
}
