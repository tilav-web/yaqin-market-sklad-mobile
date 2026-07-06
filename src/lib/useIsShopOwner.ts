import { useQuery } from '@tanstack/react-query';

import type { StaffPermission } from '@/constants/staffPermissions';

import { api } from './api';
import { MyShop } from './types';

/** One entry of `GET /seller/shops/working-for-me` — a shop the current user works at as staff. */
export interface WorkingForMeEntry {
  shop: { id: string; name: string; address: string; isOpenManual: boolean };
  role: string;
  preset: string;
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
 *
 * Server-side, owner-only actions (staff management, balance, stats/
 * analytics, permanent product delete, blocking a customer, prime
 * subscription) have no corresponding `StaffPermission` at all and are
 * ALREADY correctly enforced regardless of this value — this hook only
 * drives client UI so staff don't see a button that will 403. For anything
 * that DOES have a real permission flag (reviews, promotions, shop
 * open/close, etc.), use `useShopAccess` below instead so staff who hold that
 * permission aren't blocked by a blanket owner check.
 *
 * Returns `undefined` while unresolved. Callers should treat that as "unknown
 * — assume owner" for entry points (avoids flashing "missing" tabs to the
 * common owner case) but as "not yet confirmed" for guarding the owner-only
 * network calls themselves (skip only once this resolves to `false`, so a
 * genuine owner is never delayed).
 */
export function useIsShopOwner(shopId: string | undefined): boolean | undefined {
  const myShopsQuery = useMyShopsQuery();
  if (!shopId || myShopsQuery.data === undefined) return undefined;
  return myShopsQuery.data.some((s) => s.id === shopId);
}

/**
 * Resolves what the current user can actually do at a shop, combining
 * `GET /seller/shops/mine` (owned shops) with `GET
 * /seller/shops/working-for-me` (staff memberships + their `permissions`,
 * added alongside SPEC.md §24/25/27). Owners have no `shop_staff` row at all
 * (there is nothing to "grant" — they can do everything), so `has()`
 * special-cases `isOwner` the same way the server's
 * `shop-access.util.ts#assertShopPermission` does (owner always passes,
 * otherwise the actor must hold the specific permission).
 *
 * `has()` is optimistic (`true`) before both queries resolve, matching the
 * existing "assume owner" bias on this screen family (see `useIsShopOwner`
 * above) — it avoids flashing away a tab/row for the common case while the
 * network settles. Use `isResolved` when a definite "no" is required (e.g.
 * to decide whether to show a permission-denied notice).
 */
export function useShopAccess(shopId: string | undefined): {
  isOwner: boolean | undefined;
  permissions: StaffPermission[];
  isResolved: boolean;
  has: (permission: StaffPermission) => boolean;
} {
  const myShopsQuery = useMyShopsQuery();
  const workingForMeQuery = useWorkingForMeQuery();

  const isResolved = myShopsQuery.data !== undefined && workingForMeQuery.data !== undefined;
  const isOwner =
    !shopId || myShopsQuery.data === undefined
      ? undefined
      : myShopsQuery.data.some((s) => s.id === shopId);
  const permissions =
    workingForMeQuery.data?.find((w) => w.shop.id === shopId)?.permissions ?? [];

  function has(permission: StaffPermission): boolean {
    if (!isResolved) return true;
    if (isOwner) return true;
    return permissions.includes(permission);
  }

  return { isOwner, permissions, isResolved, has };
}
