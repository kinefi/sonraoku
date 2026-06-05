import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTags } from '@/lib/db';

export function useTags() {
  const [searchQuery, setSearchQuery] = useState('');

  const query = useQuery({
    queryKey: ['allTags', searchQuery],
    queryFn: async () => {
      const res = await getTags();
      if (res.error) throw res.error;
      const all = res.data || [];
      if (!searchQuery) return all;
      return all.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
    },
  });

  return { ...query, searchQuery, setSearchQuery };
}
