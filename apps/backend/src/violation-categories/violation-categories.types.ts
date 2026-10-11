import type { ViolationCategorySummary } from '@spk-r5-parking-log/shared-types';

export function mapCategory(
  category: ViolationCategorySummary,
): ViolationCategorySummary {
  return { id: category.id, name: category.name, isActive: category.isActive };
}
