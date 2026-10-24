import { createFileRoute } from "@tanstack/react-router";

import { ViolationCategoriesPage } from "@/features/violation-categories/violation-categories-page";

export const Route = createFileRoute("/_authenticated/violation-categories")({
  component: ViolationCategoriesPage,
});
