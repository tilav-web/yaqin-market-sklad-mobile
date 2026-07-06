import { api } from './api';

export type AnalyticsEventType = 'product_view' | 'add_to_cart';

interface QueuedEvent {
  type: AnalyticsEventType;
  shopId: string;
  productVariantId?: string;
}

// Server caps a batch at 100 (LogAnalyticsEventsDto) — flush well before that,
// and otherwise on a short timer so events don't sit unsent for long if the
// user stops browsing.
const FLUSH_THRESHOLD = 20;
const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH = 100;

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush(): void {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, FLUSH_INTERVAL_MS);
}

/**
 * Fire-and-forget by design (SPEC.md §5.3 view→cart→order funnel is a
 * secondary metrics feed, not user-facing): a failed POST is swallowed here,
 * never surfaced as a toast/Alert, and never retried — losing a batch of
 * view/add-to-cart events is harmless, but blocking or erroring on a tap
 * would not be.
 */
async function flush(): Promise<void> {
  if (queue.length === 0) return;
  const batch = queue.splice(0, MAX_BATCH);
  try {
    await api.post('/analytics/events', { events: batch });
  } catch {
    // swallowed intentionally — see doc comment above
  }
  if (queue.length > 0) scheduleFlush();
}

function enqueue(event: QueuedEvent): void {
  queue.push(event);
  if (queue.length >= FLUSH_THRESHOLD) {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    void flush();
  } else {
    scheduleFlush();
  }
}

export function trackProductView(shopId: string, productVariantId: string): void {
  enqueue({ type: 'product_view', shopId, productVariantId });
}

export function trackAddToCart(shopId: string, productVariantId: string): void {
  enqueue({ type: 'add_to_cart', shopId, productVariantId });
}
