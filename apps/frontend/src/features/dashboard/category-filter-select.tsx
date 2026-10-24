import { Button } from "@/components/ui/button";
import { useViolationCategoriesQuery } from "@/lib/query/use-violation-categories";
import { ALL_CATEGORIES, useDashboardStore } from "@/stores/dashboard-store";

export function CategoryFilterSelect() {
  const categoryFilter = useDashboardStore((state) => state.categoryFilter);
  const setCategoryFilter = useDashboardStore(
    (state) => state.setCategoryFilter,
  );
  const categoriesQuery = useViolationCategoriesQuery();
  const categories = categoriesQuery.data ?? [];
  // Keep the active filter visible even before (or without) its name loading.
  const selectedIsListed =
    categoryFilter === ALL_CATEGORIES ||
    categories.some(({ id }) => id === categoryFilter);

  return (
    <label className="select-field">
      <span>กรองหมวด</span>
      <select
        aria-label="กรองหมวด"
        onChange={(event) => setCategoryFilter(event.target.value)}
        value={categoryFilter}
      >
        <option value={ALL_CATEGORIES}>ทั้งหมด</option>
        {selectedIsListed ? null : (
          <option value={categoryFilter}>
            {categoriesQuery.isError ? "หมวดที่เลือกไว้" : "กำลังโหลดหมวด..."}
          </option>
        )}
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.isActive ? category.name : `${category.name} (ปิดใช้งาน)`}
          </option>
        ))}
      </select>
      {categoriesQuery.isError ? (
        <small className="field-error" role="alert">
          โหลดหมวดไม่สำเร็จ{" "}
          <Button
            disabled={categoriesQuery.isFetching}
            onClick={() => void categoriesQuery.refetch()}
            variant="ghost"
          >
            ลองใหม่
          </Button>
        </small>
      ) : null}
    </label>
  );
}
