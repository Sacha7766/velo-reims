// Rider profiles on one machine (e.g. a household sharing the app): each rider has their own settings,
// saved trainer, ride history (so ghosts and PRs), training plan and Strava link. Custom routes and
// workouts are shared. The first profile is 'main' and keeps the original storage keys, so data from
// before profiles existed belongs to it without any migration.

export interface Profile {
  id: string;
  name: string;
  /** Jersey colour, for the picker. */
  kit: string;
}

export const MAIN = 'main';
const LIST_KEY = 'serpentine.profiles';
const ACTIVE_KEY = 'serpentine.profile';
const PICKED_KEY = 'serpentine.profilePicked';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked */
  }
}

/** All profiles; before the first one is created this is the implicit main profile. */
export function listProfiles(): Profile[] {
  const list = read<Profile[]>(LIST_KEY, []);
  if (list.some((p) => p.id === MAIN)) return list;
  const legacy = read<{ name?: string; kit?: string }>('serpentine.settings', {});
  return [{ id: MAIN, name: legacy.name || 'Rider', kit: legacy.kit || '#e8442e' }, ...list];
}

export function activeProfile(): string {
  const id = read<string>(ACTIVE_KEY, MAIN);
  return listProfiles().some((p) => p.id === id) ? id : MAIN;
}

/** Storage key for the active rider: the main profile keeps the original key. */
export function profileKey(base: string, sep = '.'): string {
  const id = activeProfile();
  return id === MAIN ? base : `${base}${sep}${id}`;
}

/** Switch rider. The page reloads so settings, devices and history all come from the new profile;
 * `toSettings` opens the Settings tab after the reload (a new rider sets weight and FTP first). */
export function switchProfile(id: string, toSettings = false) {
  write(ACTIVE_KEY, id);
  markPicked();
  try {
    if (toSettings) sessionStorage.setItem(SETTINGS_NEXT_KEY, '1');
  } catch {
    /* storage blocked */
  }
  location.reload();
}

const SETTINGS_NEXT_KEY = 'serpentine.openSettings';

/** True once after switchProfile(id, true). */
export function takeOpenSettings(): boolean {
  try {
    const v = sessionStorage.getItem(SETTINGS_NEXT_KEY) === '1';
    sessionStorage.removeItem(SETTINGS_NEXT_KEY);
    return v;
  } catch {
    return false;
  }
}

/** Keep the picker's name and colour in step with the rider's settings. */
export function touchProfile(name: string, kit: string) {
  const id = activeProfile();
  write(LIST_KEY, listProfiles().map((p) => (p.id === id ? { ...p, name: name || p.name, kit } : p)));
}

const KITS = ['#2e7de8', '#1fa67a', '#d4458f', '#f0a020', '#7b5cd6', '#e8442e'];

/** New rider with default settings; returns its id. */
export function addProfile(name: string): string {
  const list = listProfiles();
  let n = list.length;
  let id = `r${n}`;
  while (list.some((p) => p.id === id)) id = `r${++n}`;
  const kit = KITS.find((k) => !list.some((p) => p.kit.toLowerCase() === k)) ?? KITS[list.length % KITS.length]!;
  write(LIST_KEY, [...list, { id, name: name.trim() || 'Rider', kit }]);
  // a new rider starts at Zwift's 50 % gradient difficulty; 100 % is a choice
  write(`serpentine.settings.${id}`, { name: name.trim() || 'Rider', kit, difficulty: 0.5 });
  return id;
}

/** Remove a rider's profile and local settings. Their rides stay on disk. The main profile stays. */
export function removeProfile(id: string) {
  if (id === MAIN) return;
  write(LIST_KEY, listProfiles().filter((p) => p.id !== id));
  try {
    for (const k of [`serpentine.settings.${id}`, `serpentine.devices.${id}`]) localStorage.removeItem(k);
  } catch {
    /* storage blocked */
  }
  if (read<string>(ACTIVE_KEY, MAIN) === id) write(ACTIVE_KEY, MAIN);
}

/** Ask "who's riding?" once per browser tab when there is more than one rider. */
export function needsPick(): boolean {
  if (listProfiles().length < 2) return false;
  try {
    return sessionStorage.getItem(PICKED_KEY) !== '1';
  } catch {
    return false;
  }
}

export function markPicked() {
  try {
    sessionStorage.setItem(PICKED_KEY, '1');
  } catch {
    /* storage blocked */
  }
}
