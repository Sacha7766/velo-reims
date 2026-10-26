import type { DeviceRole } from './types.ts';

// The devices a rider used last, by role, as saved per rider profile. Pure, no storage: index.ts reads and
// writes them. A device has one job: a trainer that also offers the power-meter service stays the trainer
// (it sends its power anyway), so a device saved under two roles keeps the first of ROLE_ORDER.

export const ROLE_ORDER: readonly DeviceRole[] = ['trainer', 'controller', 'hr', 'power'];

export type SavedIds = Partial<Record<DeviceRole, string>>;

/** Saved ids as stored (any JSON), each device under one role only. */
export function cleanIds(raw: unknown): SavedIds {
  const out: SavedIds = {};
  if (!raw || typeof raw !== 'object') return out;
  const seen = new Set<string>();
  for (const role of ROLE_ORDER) {
    const id = (raw as Record<string, unknown>)[role];
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    seen.add(id);
    out[role] = id;
  }
  return out;
}

/** The saved ids once `id` takes `role`: it leaves whatever role it had before. */
export function withRole(ids: SavedIds, role: DeviceRole, id: string): SavedIds {
  const out: SavedIds = {};
  for (const r of ROLE_ORDER) if (ids[r] && ids[r] !== id) out[r] = ids[r];
  out[role] = id;
  return cleanIds(out);
}

/** The saved ids without `id`. */
export function withoutId(ids: SavedIds, id: string): SavedIds {
  const out: SavedIds = {};
  for (const r of ROLE_ORDER) if (ids[r] && ids[r] !== id) out[r] = ids[r];
  return out;
}
