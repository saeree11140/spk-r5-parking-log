import { HouseDetailPage } from "@/features/houses/house-detail-page";

export const dynamicParams = false;

export function generateStaticParams(): Array<{ houseCode: string }> {
  return Array.from({ length: 164 }, (_, index) => ({
    houseCode: `R5-${String(index + 1).padStart(3, "0")}`,
  }));
}

export default async function HousePage({
  params,
}: {
  params: Promise<{ houseCode: string }>;
}) {
  const { houseCode } = await params;
  return <HouseDetailPage houseCode={houseCode} />;
}
