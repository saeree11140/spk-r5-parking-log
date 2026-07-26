export const queryKeys = {
  house: (houseCode: string) => ["house", houseCode] as const,
  houses: ["houses"] as const,
};
