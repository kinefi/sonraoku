import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllTags } from '@/lib/db';

export function useTags() {
  const [searchQuery, setSearchQuery] = useState('');

  const query = useQuery({
    queryKey: ['tags', 'all', searchQuery],
    queryFn: async () => {
      const res = await getAllTags(searchQuery);
      if (res.error) throw res.error;
      return res.data || [];
    },
  });

  return { ...query, searchQuery, setSearchQuery };
}
