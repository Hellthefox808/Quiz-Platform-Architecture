import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsApi, userApi, auditApi } from '../api/client';
import { adminKeys } from '../lib/queryKeys';
import { queryPolicies } from '../lib/queryPolicies';
import { invalidation } from '../lib/invalidation';
import { UserRole } from '../types';

export function useAdminAnalyticsQuery() {
  return useQuery({
    queryKey: adminKeys.analytics(),
    queryFn: ({ signal }) => analyticsApi.getAdmin(signal),
    ...queryPolicies.adminAnalytics,
  });
}

export function useQuestionAnalyticsQuery() {
  return useQuery({
    queryKey: adminKeys.questionAnalytics(),
    queryFn: ({ signal }) => analyticsApi.getQuestions(signal),
    ...queryPolicies.adminAnalytics,
  });
}

export function useAdminUsersQuery(page = 1, pageSize = 30, search = '') {
  return useQuery({
    queryKey: adminKeys.users({ page, page_size: pageSize, search }),
    queryFn: ({ signal }) => userApi.listAdmin(page, pageSize, search, signal),
    ...queryPolicies.adminManagement,
  });
}

export function useAdminAuditLogsQuery(page = 1, pageSize = 40) {
  return useQuery({
    queryKey: adminKeys.auditLogs({ page, page_size: pageSize }),
    queryFn: ({ signal }) => auditApi.list(page, pageSize, signal),
    ...queryPolicies.adminManagement,
  });
}

export function useAdminUserMutations() {
  const queryClient = useQueryClient();

  const updateUserStatus = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      userApi.updateStatus(userId, status),
    onSuccess: (_, variables) => invalidation.onUserChange(queryClient, variables.userId),
  });

  const updateUserRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      userApi.updateRole(userId, role),
    onSuccess: (_, variables) => invalidation.onUserChange(queryClient, variables.userId),
  });

  return {
    updateUserStatus,
    updateUserRole,
  };
}
