import { useQuery } from "@tanstack/react-query";

import { parkingApi } from "@/lib/api/parking-api";

import { queryKeys } from "./keys";

export function useViolationCategoriesQuery({ enabled = true } = {}) {
  return useQuery({
    enabled,
    queryFn: () => parkingApi.getViolationCategories(),
    queryKey: queryKeys.violationCategories,
  });
}
