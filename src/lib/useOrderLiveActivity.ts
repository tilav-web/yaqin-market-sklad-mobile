import { Platform } from 'react-native';

import { OrderActivityProps } from '@/widgets/order-activity';

// Instance reference stored in module scope — one active Live Activity at a time.
// expo-widgets instances are not serializable, so we keep them in memory only.
let activeInstance: { update: (p: OrderActivityProps) => void; end: (timing: string, p: OrderActivityProps) => Promise<void> } | null = null;

async function loadActivity() {
  if (Platform.OS !== 'ios') return null;
  const mod = await import('@/widgets/order-activity');
  return mod.default;
}

export async function startOrderActivity(props: OrderActivityProps) {
  if (Platform.OS !== 'ios') return;
  try {
    const Activity = await loadActivity();
    if (!Activity) return;
    activeInstance = Activity.start(props) as typeof activeInstance;
  } catch {
    // Live Activities are unavailable (simulator, older iOS, etc.)
  }
}

export async function updateOrderActivity(props: OrderActivityProps) {
  if (Platform.OS !== 'ios' || !activeInstance) return;
  try {
    activeInstance.update(props);
  } catch {
    // ignore
  }
}

export async function endOrderActivity(props: OrderActivityProps) {
  if (Platform.OS !== 'ios' || !activeInstance) return;
  try {
    await activeInstance.end('immediate', props);
    activeInstance = null;
  } catch {
    activeInstance = null;
  }
}
