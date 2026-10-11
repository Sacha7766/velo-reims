import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { hub } from '../devices/index.ts';
import type { DeviceInfo, Metrics, ShiftingMode } from '../devices/types.ts';
import type { LiveState, RideSession } from '../sim/session.ts';

interface HubSnapshot {
  metrics: Metrics;
  devices: DeviceInfo[];
  simulator: boolean;
  controllable: boolean;
  shifting: ShiftingMode;
}

let last: HubSnapshot | null = null;
function hubSnapshot(): HubSnapshot {
  const metrics = hub.metrics;
  const devices = hub.devices;
  if (!last || last.metrics !== metrics || last.devices !== devices || last.simulator !== hub.simulatorEnabled || last.shifting !== hub.shifting) {
    last = { metrics, devices, simulator: hub.simulatorEnabled, controllable: hub.hasControllableTrainer, shifting: hub.shifting };
  }
  return last;
}
const subscribeHub = (cb: () => void) => hub.subscribe(cb);

export function useHub(): HubSnapshot {
  return useSyncExternalStore(subscribeHub, hubSnapshot);
}

export function useSession(session: RideSession): LiveState {
  return useSyncExternalStore(
    (cb) => session.subscribe(cb),
    () => session.state,
  );
}

/** Redraw a canvas whenever deps change and on resize. */
export function useCanvas(draw: (c: HTMLCanvasElement) => void, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => {
    const c = ref.current;
    if (c) drawRef.current(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ro = new ResizeObserver(() => drawRef.current(c));
    ro.observe(c);
    return () => ro.disconnect();
  }, []);
  return ref;
}

// Battery Status API (Chrome only, not in TypeScript's DOM types)
interface BatteryManager extends EventTarget {
  charging: boolean;
  level: number;
}

export interface Battery {
  charging: boolean;
  /** 0..1 */
  level: number;
}

/** The laptop's battery, null where the browser doesn't tell (a desktop reads as charging at 100 %). */
export function useBattery(): Battery | null {
  const [state, setState] = useState<Battery | null>(null);
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManager> };
    let bat: BatteryManager | null = null;
    const update = () => bat && setState({ charging: bat.charging, level: bat.level });
    void nav.getBattery?.().then((b) => {
      bat = b;
      update();
      b.addEventListener('chargingchange', update);
      b.addEventListener('levelchange', update);
    }).catch(() => undefined);
    return () => {
      bat?.removeEventListener('chargingchange', update);
      bat?.removeEventListener('levelchange', update);
    };
  }, []);
  return state;
}
