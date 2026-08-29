import { useQuery } from '@tanstack/react-query';

import type { StaffPermission, StaffRole } from '@/constants/staffPermissions';

import { api } from './api';
import { MyShop } from './types';

/** One entry of `GET /seller/shops/working-for-me` — a shop the current user works at as staff. */
export interface WorkingForMeEntry {
  shop: { id: string; name: string; address: string; isOpenManual: boolean };
  role: string;
  preset: string;
  roles?: StaffRole[];
  permissions: StaffPermission[];
}

function useMyShopsQuery() {
  return useQuery({
    queryKey: ['shops', 'mine'],
    queryFn: async () => (await api.get<MyShop[]>('/seller/shops/mine')).data,
    staleTime: 60_000,
  });
}

function useWorkingForMeQuery() {
  return useQuery({
    queryKey: ['working-for-me'],
    queryFn: async () => (await api.get<WorkingForMeEntry[]>('/seller/shops/working-for-me')).data,
    staleTime: 60_000,
  });
}

/**
 * Whether the current user OWNS the given shop, as opposed to being invited
 * staff. There is no dedicated "am I the owner of shop X" endpoint today, so
 * this is derived client-side from `GET /seller/shops/mine` (the same
 * owned-shops list the profile screen already fetches — safe to call for any
 * authenticated user, including staff who are not sellers themselves; it just
 * returns an empty list for them).
 */
export function useIsShopOwner(shopId: string | undefined): boolean | undefined {
  const myShopsQuery = useMyShopsQuery();
  if (!shopId || myShopsQuery.data === undefined) return undefined;
  return myShopsQuery.data.some((s) => s.id === shopId);
}

/**
 * Resolves what the current user can actually do at a shop, combining
 * `GET /seller/shops/mine` (owned shops) with `GET
 * /seller/shops/working-for-me` (staff memberships + their `permissions`).
 */
export function useShopAccess(shopId: string | undefined): {
  isOwner: boolean | undefined;
  roles: StaffRole[];
  permissions: StaffPermission[];
  isResolved: boolean;
  has: (permission: StaffPermission) => boolean;
  hasRole: (role: StaffRole) => boolean;
} {
  const myShopsQuery = useMyShopsQuery();
  const workingForMeQuery = useWorkingForMeQuery();

  const isResolved = myShopsQuery.data !== undefined && workingForMeQuery.data !== undefined;
  const isOwner =
    !shopId || myShopsQuery.data === undefined
      ? undefined
      : myShopsQuery.data.some((s) => s.id === shopId);
  const membership = workingForMeQuery.data?.find((w) => w.shop.id === shopId);
  const roles: StaffRole[] = isOwner
    ? (['manager', 'cashier', 'storekeeper', 'courier'] as StaffRole[])
    : (membership?.roles ?? (membership?.preset ? [membership.preset as StaffRole] : []));
  const permissions = membership?.permissions ?? [];

  function has(permission: StaffPermission): boolean {
    if (!isResolved) return true;
    if (isOwner) return true;
    return permissions.includes(permission);
  }

  function hasRole(role: StaffRole): boolean {
    if (!isResolved) return true;
    if (isOwner) return true;
    return roles.includes(role);
  }

  return { isOwner, roles, permissions, isResolved, has, hasRole };
}
