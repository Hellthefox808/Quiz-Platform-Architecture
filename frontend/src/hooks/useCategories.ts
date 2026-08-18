import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryApi } from '../api/client';
import { categoryKeys } from '../lib/queryKeys';
import { queryPolicies } from '../lib/queryPolicies';
import { invalidation } from '../lib/invalidation';
import { CreateCategoryRequest, UpdateCategoryRequest } from '../types';

export function useCategoriesQuery(includeInactive = false) {
  return useQuery({
    queryKey: categoryKeys.list({ includeInactive }),
    queryFn: ({ signal }) => categoryApi.list(includeInactive, signal),
    ...queryPolicies.categories,
  });
}

export function useCategoryMutations() {
  const queryClient = useQueryClient();

  const createCategory = useMutation({
    mutationFn: (data: CreateCategoryRequest) => categoryApi.create(data),
    onSuccess: () => invalidation.onCategoryChange(queryClient),
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryRequest }) =>
      categoryApi.update(id, data),
    onSuccess: () => invalidation.onCategoryChange(queryClient),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => categoryApi.delete(id),
    onSuccess: () => invalidation.onCategoryChange(queryClient),
  });

  return {
    createCategory,
    updateCategory,
    deleteCategory,
  };
}

