import { useEffect, useRef, useSyncExternalStore } from 'react';
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
