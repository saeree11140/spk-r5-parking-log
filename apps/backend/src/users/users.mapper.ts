import type { UserRole, UserSummary } from '@spk-r5-parking-log/shared-types';

export interface UserSummaryRecord {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toUserSummary(user: UserSummaryRecord): UserSummary {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    lockedUntil: user.lockedUntil?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
