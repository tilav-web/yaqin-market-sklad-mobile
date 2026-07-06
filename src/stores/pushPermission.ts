import { create } from 'zustand';

/**
 * Tracks whether push notification permission was denied, so the UI can show
 * a persistent (dismissible) notice with a path to re-enable it in Settings.
 * Deliberately NOT persisted — every fresh launch re-checks via
 * `registerForPush()` and re-shows the notice if still denied (the user may
 * have fixed it in Settings meanwhile); `dismissed` only silences it for the
 * current app session.
 */
interface PushPermissionState {
  denied: boolean;
  dismissed: boolean;
  setDenied: (v: boolean) => void;
  dismiss: () => void;
}

export const usePushPermissionStore = create<PushPermissionState>((set) => ({
  denied: false,
  dismissed: false,
  setDenied: (v) => set({ denied: v }),
  dismiss: () => set({ dismissed: true }),
}));
