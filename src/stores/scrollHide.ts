import { makeMutable } from 'react-native-reanimated';

/**
 * 0 = header/tab bar fully visible, 1 = fully hidden. A plain Reanimated
 * mutable (not a hook) so it can be shared between the home feed — which
 * drives it from scroll direction — and `CustomTabBar`, a sibling in the
 * navigator tree rather than a child, with no other cheap way to pass a
 * per-frame animated value across that boundary.
 */
export const hideProgress = makeMutable(0);
