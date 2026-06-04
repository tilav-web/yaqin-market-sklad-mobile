import { Vibration } from 'react-native';

// The order-alarm tone (a short two-tone beep that loops cleanly).
const ALARM_SOUND = require('../../assets/sounds/order-alarm.wav');

// expo-audio is a NATIVE module. We lazy-require it so the JS bundle still runs
// on a dev client that hasn't yet been rebuilt to include it — in that case the
// sound is silently skipped and only vibration plays. After a rebuild the sound
// works automatically.
let audio: typeof import('expo-audio') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  audio = require('expo-audio');
} catch {
  audio = null;
}

type Player = ReturnType<NonNullable<typeof audio>['createAudioPlayer']>;
let player: Player | null = null;
let audioModeSet = false;
let finishSub: { remove: () => void } | null = null;
let shortPlaysLeft = 0;

async function ensurePlayer(): Promise<Player | null> {
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

const LOOP_VIBRATION = [0, 600, 400, 600, 400]; // repeats while looping
const TWICE_VIBRATION = [0, 500, 350, 500]; // two buzzes, no repeat

/**
 * Start the new-order alarm.
 * - `loop=true`  ("long"): rings/vibrates continuously until {@link stopOrderAlarm}
 *   is called (i.e. until the owner/staff sees the order).
 * - `loop=false` ("short"): rings exactly TWICE, then stops on its own.
 */
export async function startOrderAlarm(loop: boolean): Promise<void> {
  try {
    Vibration.vibrate(loop ? LOOP_VIBRATION : TWICE_VIBRATION, loop);
  } catch {
    // vibration unsupported — ignore
  }

  const p = await ensurePlayer();
  if (!p) return;

  // Drop any previous finish listener before (re)starting.
  finishSub?.remove();
  finishSub = null;

  try {
    if (loop) {
      p.loop = true;
      await p.seekTo(0);
      p.play();
    } else {
      // Short mode: play the tone, replay once on finish, then stop (= 2 rings).
      p.loop = false;
      shortPlaysLeft = 2;
      finishSub = p.addListener('playbackStatusUpdate', (status) => {
        if (!status.didJustFinish) return;
        shortPlaysLeft -= 1;
        if (shortPlaysLeft > 0) {
          void p.seekTo(0).then(() => p.play());
        } else {
          finishSub?.remove();
          finishSub = null;
        }
      });
      await p.seekTo(0);
      p.play();
    }
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
    finishSub?.remove();
    finishSub = null;
    shortPlaysLeft = 0;
    player?.pause();
  } catch {
    /* ignore */
  }
}
