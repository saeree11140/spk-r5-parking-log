import { createFileRoute, notFound } from "@tanstack/react-router";

import { HouseDetailPage } from "@/features/houses/house-detail-page";
import { HouseNotFound } from "@/features/houses/house-not-found";
import { isHouseCode } from "@/lib/house-code";

export const Route = createFileRoute("/_authenticated/houses/$houseCode")({
  beforeLoad: ({ params }) => {
    if (!isHouseCode(params.houseCode)) throw notFound();
  },
  notFoundComponent: HouseNotFound,
  component: HouseRoute,
});

function HouseRoute() {
  const { houseCode } = Route.useParams();
  return <HouseDetailPage houseCode={houseCode} />;
}
