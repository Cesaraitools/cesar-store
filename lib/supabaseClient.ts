import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

/* Single shared client */
export const supabase = createClient();

/* =========================
   Realtime Order Tracking
========================= */

export function subscribeToOrderTrackingEvents(
  orderId: string,
  onEvent: (payload: any) => void
): RealtimeChannel {

  const channelName = `order-tracking:${orderId}`;

  /* --- Prevent duplicate channels --- */

  const existing = supabase.getChannels().find(
    (c) => c.topic === channelName
  );

  if (existing) {
    supabase.removeChannel(existing);
  }

  /* --- Create channel --- */

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "order_tracking_events",
        filter: `order_id=eq.${orderId}`,
      },
      (payload) => {
        onEvent(payload);
      }
    )
    .subscribe();

  return channel;
}

/* =========================
   Channel Cleanup
========================= */

export function unsubscribeFromChannel(channel: RealtimeChannel) {
  supabase.removeChannel(channel);
}