import { useQuery } from '@tanstack/react-query';
import { certificateApi } from '../api/client';
import { studentKeys } from '../lib/queryKeys';
import { queryPolicies } from '../lib/queryPolicies';

export function useCertificatesQuery() {
  return useQuery({
    queryKey: studentKeys.certificates(),
    queryFn: ({ signal }) => certificateApi.getMy(signal),
    ...queryPolicies.certificates,
  });
}
