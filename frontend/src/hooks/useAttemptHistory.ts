import { useQuery } from '@tanstack/react-query';
import { attemptApi } from '../api/client';
import { attemptKeys } from '../lib/queryKeys';
import { queryPolicies } from '../lib/queryPolicies';

export function useAttemptHistoryQuery(page = 1, pageSize = 15) {
  return useQuery({
    queryKey: attemptKeys.history({ page, page_size: pageSize }),
    queryFn: ({ signal }) => attemptApi.getMyHistory(page, pageSize, signal),
    ...queryPolicies.attemptHistory,
  });
}
