import { createContext, useContext } from 'react';

export type ParseQueueItem = {
  id: string;
  html: string;
  title: string;
  url: string;
  retries?: number;
};

export type ParseQueueContextType = {
  addToQueue: (item: ParseQueueItem) => void;
  parseQueue: ParseQueueItem[];
};

export const ParseQueueContext = createContext<ParseQueueContextType>({
  addToQueue: () => {},
  parseQueue: [],
});

export function useParseQueue() {
  return useContext(ParseQueueContext);
}
