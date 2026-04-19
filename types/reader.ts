export type ParseResult = {
  title: string;
  content: string;
  excerpt: string;
  lang: string;
};

export type ReaderMessage =
  | { type: 'highlight'; id: string; text: string; contextBefore: string; contextAfter: string }
  | { type: 'delete-highlight'; id: string };

export type WebViewMessage = ReaderMessage | { type: 'scroll'; progress: number };