import { useQuery } from '@tanstack/react-query';
import { leaderboardApi } from '../api/client';
import { leaderboardKeys } from '../lib/queryKeys';
import { queryPolicies } from '../lib/queryPolicies';

export function useLeaderboardQuery(timeframe = 'ALL_TIME', categoryId?: string) {
  return useQuery({
    queryKey: leaderboardKeys.list({ timeframe, categoryId }),
    queryFn: ({ signal }) => leaderboardApi.get(timeframe, categoryId, signal),
    ...queryPolicies.leaderboard,
  });
}
