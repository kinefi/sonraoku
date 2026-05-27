import { useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';

export function useOptimisticMutation<TData, TVariables>(
  queryKey: QueryKey,
  mutationFn: (variables: TVariables) => Promise<any>,
  updateFn: (oldData: TData | undefined, variables: TVariables) => TData
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<TData>(queryKey, (old) => updateFn(old, variables));

      // Return a context object with the snapshotted value
      return { previousData };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (_err, _variables, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    // Always refetch after error or success to ensure sync with DB
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}