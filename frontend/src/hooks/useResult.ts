import { useQuery } from '@tanstack/react-query';
import { attemptApi } from '../api/client';
import { attemptKeys } from '../lib/queryKeys';
import { queryPolicies } from '../lib/queryPolicies';

export function useResultQuery(resultId?: string, attemptId?: string) {
  return useQuery({
    queryKey: resultId ? attemptKeys.result(resultId) : ['attempts', 'result-by-attempt', attemptId || ''],
    queryFn: async ({ signal }) => {
      if (resultId) {
        return attemptApi.getResult(resultId, signal);
      }
      if (attemptId) {
        // Fallback submit / result fetch
        return attemptApi.submit(attemptId);
      }
      throw new Error('No result or attempt ID provided.');
    },
    enabled: !!resultId || !!attemptId,
    ...queryPolicies.assessmentResult,
  });
}
