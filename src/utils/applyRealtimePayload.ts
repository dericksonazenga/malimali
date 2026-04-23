import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/**
 * Apply a realtime postgres_changes payload to a list state in-place,
 * without refetching from the server.
 *
 * - INSERT  -> prepend new row (deduped by id) and trim to optional limit
 * - UPDATE  -> replace matching row by id (no list-order shuffle)
 * - DELETE  -> remove matching row by id
 *
 * Pass `mapper` to convert the raw DB row to your local shape.
 * Pass `filter` to ignore rows that don't belong to this view (e.g. wrong date).
 */
export function applyRealtimePayload<TRow extends { id: string }, TItem extends { id: string }>(
  prev: TItem[],
  payload: RealtimePostgresChangesPayload<TRow>,
  mapper: (row: TRow) => TItem,
  options?: {
    filter?: (row: TRow) => boolean;
    limit?: number;
    /** If true, INSERT appends to the end instead of prepending. Default false. */
    append?: boolean;
  }
): TItem[] {
  const { eventType } = payload;
  const limit = options?.limit;
  const filter = options?.filter;

  if (eventType === "DELETE") {
    const oldId = (payload.old as any)?.id as string | undefined;
    if (!oldId) return prev;
    return prev.filter((r) => r.id !== oldId);
  }

  const row = payload.new as TRow | undefined;
  if (!row || !row.id) return prev;
  if (filter && !filter(row)) {
    // Row no longer matches our view (e.g. moved out of today). Remove if present.
    return prev.filter((r) => r.id !== row.id);
  }

  const mapped = mapper(row);

  if (eventType === "INSERT") {
    if (prev.some((r) => r.id === mapped.id)) {
      // Optimistic insert may have already added it — replace.
      return prev.map((r) => (r.id === mapped.id ? mapped : r));
    }
    const next = options?.append ? [...prev, mapped] : [mapped, ...prev];
    return limit ? next.slice(0, limit) : next;
  }

  if (eventType === "UPDATE") {
    const exists = prev.some((r) => r.id === mapped.id);
    if (!exists) {
      // Sometimes UPDATE arrives before our SELECT caught the row — insert it.
      const next = options?.append ? [...prev, mapped] : [mapped, ...prev];
      return limit ? next.slice(0, limit) : next;
    }
    return prev.map((r) => (r.id === mapped.id ? mapped : r));
  }

  return prev;
}
