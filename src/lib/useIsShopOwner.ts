import { useQuery } from '@tanstack/react-query';

import { api } from './api';
import { MyShop } from './types';

/**
 * Whether the current user OWNS the given shop, as opposed to being invited
 * staff. There is no dedicated "am I the owner of shop X" endpoint today, so
 * this is derived client-side from `GET /seller/shops/mine` (the same
 * owned-shops list the profile screen already fetches — safe to call for any
 * authenticated user, including staff who are not sellers themselves; it just
 * returns an empty list for them).
 *
 * Server-side, owner-only actions (staff management, shop settings, balance,
 * stats/analytics, promotions management, permanent product delete, blocking
 * a customer) are ALREADY correctly enforced regardless of this value — this
 * hook only drives client UI so staff don't see a button that will 403.
 *
 * Returns `undefined` while unresolved. Callers should treat that as "unknown
 * — assume owner" for entry points (avoids flashing "missing" tabs to the
 * common owner case) but as "not yet confirmed" for guarding the owner-only
 * network calls themselves (skip only once this resolves to `false`, so a
 * genuine owner is never delayed).
 */
export function useIsShopOwner(shopId: string | undefined): boolean | undefined {
  const myShopsQuery = useQuery({
    queryKey: ['shops', 'mine'],
    queryFn: async () => (await api.get<MyShop[]>('/seller/shops/mine')).data,
    staleTime: 60_000,
  });
  if (!shopId || myShopsQuery.data === undefined) return undefined;
  return myShopsQuery.data.some((s) => s.id === shopId);
}
