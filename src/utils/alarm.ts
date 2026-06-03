import { Vibration } from 'react-native';

// The looping order-alarm tone (a short two-tone beep that loops cleanly).
const ALARM_SOUND = require('../../assets/sounds/order-alarm.wav');

// expo-audio is a NATIVE module. We lazy-require it so the JS bundle still runs
// on a dev client that hasn't yet been rebuilt to include it — in that case the
// sound is silently skipped and only vibration plays. After a dev-client
// rebuild the sound works automatically.
let audio: typeof import('expo-audio') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  audio = require('expo-audio');
} catch {
  audio = null;
}

let player: ReturnType<NonNullable<typeof audio>['createAudioPlayer']> | null = null;
let audioModeSet = false;

async function ensurePlayer() {
  if (!audio) return null;
  try {
    if (!audioModeSet) {
      // Ring even when the phone is on silent — this is an alarm.
      await audio.setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
      audioModeSet = true;
    }
    if (!player) player = audio.createAudioPlayer(ALARM_SOUND);
    return player;
  } catch {
    return null;
  }
}

// Continuous "buzz-buzz" while looping; a single buzz otherwise.
const LOOP_VIBRATION = [0, 600, 400, 600, 400];

/**
 * Start the new-order alarm. `loop=true` rings/vibrates continuously until
 * {@link stopOrderAlarm} is called (used for the "long" mode that must not stop
 * until the order is seen); `loop=false` plays a single short alert.
 */
export async function startOrderAlarm(loop: boolean): Promise<void> {
  try {
    Vibration.vibrate(loop ? LOOP_VIBRATION : [0, 500], loop);
  } catch {
    // vibration unsupported — ignore
  }
  const p = await ensurePlayer();
  if (!p) return;
  try {
    p.loop = loop;
    await p.seekTo(0);
    p.play();
  } catch {
    // native audio module not present (pre-rebuild) — vibration already covers it
  }
}

/** Stop any ongoing alarm (sound + vibration). */
export function stopOrderAlarm(): void {
  try {
    Vibration.cancel();
  } catch {
    /* ignore */
  }
  try {
    player?.pause();
  } catch {
    /* ignore */
  }
}
