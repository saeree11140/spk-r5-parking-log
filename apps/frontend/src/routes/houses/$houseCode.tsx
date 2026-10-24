import { createFileRoute } from "@tanstack/react-router";

import { HouseDetailPage } from "@/features/houses/house-detail-page";

export const Route = createFileRoute("/houses/$houseCode")({
  component: HouseRoute,
});

function HouseRoute() {
  const { houseCode } = Route.useParams();
  return <HouseDetailPage houseCode={houseCode} />;
}
