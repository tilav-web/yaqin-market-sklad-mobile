import { Vibration } from 'react-native';

const LOOP_VIBRATION = [0, 600, 400, 600, 400];
const TWICE_VIBRATION = [0, 500, 350, 500];

/**
 * Start the new-order alarm (vibration only — no audio file required).
 * - loop=true  ("long"): vibrates continuously until stopOrderAlarm() is called.
 * - loop=false ("short"): vibrates twice, then stops on its own.
 */
export function startOrderAlarm(loop: boolean): void {
  try {
    Vibration.vibrate(loop ? LOOP_VIBRATION : TWICE_VIBRATION, loop);
  } catch {
    // vibration unsupported on this device
  }
}

/** Stop any ongoing alarm vibration. Safe to call when no alarm is active. */
export function stopOrderAlarm(): void {
  try {
    Vibration.cancel();
  } catch {
    // ignore
  }
}
