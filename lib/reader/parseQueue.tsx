import { createContext, useContext } from 'react';

export type ParseQueueItem = {
  id: string;
  html: string;
  title: string;
  url: string;
  retries?: number;
};

type ParseQueueContextType = {
  addToQueue: (item: ParseQueueItem) => void;
};

export const ParseQueueContext = createContext<ParseQueueContextType>({
  addToQueue: () => {},
});

export function useParseQueue() {
  return useContext(ParseQueueContext);
}
