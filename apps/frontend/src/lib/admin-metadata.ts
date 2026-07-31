import type { Metadata } from "next";

export const ADMIN_ROBOTS_METADATA: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
  nocache: true,
};
