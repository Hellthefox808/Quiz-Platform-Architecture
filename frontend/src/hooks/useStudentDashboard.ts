import { useQuery } from '@tanstack/react-query';
import { analyticsApi, attemptApi } from '../api/client';
import { studentKeys, attemptKeys } from '../lib/queryKeys';
import { queryPolicies } from '../lib/queryPolicies';

export function useStudentDashboardQueries() {
  const analyticsQuery = useQuery({
    queryKey: studentKeys.analytics(),
    queryFn: ({ signal }) => analyticsApi.getStudent(signal),
    ...queryPolicies.studentDashboard,
  });

  const recentAttemptsQuery = useQuery({
    queryKey: attemptKeys.history({ page: 1, page_size: 5 }),
    queryFn: ({ signal }) => attemptApi.getMyHistory(1, 5, signal),
    ...queryPolicies.studentDashboard,
  });

  return {
    analytics: analyticsQuery.data,
    recentAttempts: recentAttemptsQuery.data?.items || [],
    isLoading: analyticsQuery.isLoading || recentAttemptsQuery.isLoading,
    isError: analyticsQuery.isError || recentAttemptsQuery.isError,
    error: analyticsQuery.error || recentAttemptsQuery.error,
    refetch: () => {
      analyticsQuery.refetch();
      recentAttemptsQuery.refetch();
    },
  };
}
