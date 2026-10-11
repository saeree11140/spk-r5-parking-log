import type { PrismaClient } from '../generated/prisma/client';
import { normalizeCategoryName } from '../violation-categories/category-name';

export const DEFAULT_VIOLATION_CATEGORY_NAMES = [
  'จอดรถผิดระเบียบ',
  'ปล่อยสัตว์เลี้ยงขับถ่ายในพื้นที่ส่วนกลางแล้วไม่เก็บ',
] as const;

export async function seedViolationCategories(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.$transaction(
    DEFAULT_VIOLATION_CATEGORY_NAMES.map((name) =>
      prisma.violationCategory.upsert({
        where: { normalizedName: normalizeCategoryName(name) },
        update: {},
        create: { name, normalizedName: normalizeCategoryName(name) },
      }),
    ),
  );
}
