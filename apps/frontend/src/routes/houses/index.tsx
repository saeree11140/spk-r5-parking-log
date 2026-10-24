import { createFileRoute } from "@tanstack/react-router";

import { HouseListPage } from "@/features/houses/house-list-page";

export const Route = createFileRoute("/houses/")({
  component: HouseListPage,
});
