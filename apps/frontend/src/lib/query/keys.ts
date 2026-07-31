import type { QueryClient } from "@tanstack/react-query";

export const queryKeys = {
  auth: ["auth", "me"] as const,
  house: (houseCode: string) => ["house", houseCode] as const,
  houses: ["houses"] as const,
  users: ["users"] as const,
};

export async function invalidateParkingQueries(
  queryClient: QueryClient,
  houseCode: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.houses }),
    queryClient.invalidateQueries({ queryKey: queryKeys.house(houseCode) }),
  ]);
}
