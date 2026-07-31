import type { QueryClient } from "@tanstack/react-query";

export const userKeys = {
  all: ["users"] as const,
};

export const queryKeys = {
  auth: ["auth", "me"] as const,
  house: (houseCode: string) => ["house", houseCode] as const,
  houses: ["houses"] as const,
  users: userKeys.all,
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
