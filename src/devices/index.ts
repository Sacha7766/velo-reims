import type {
  Capability,
  DeviceHub,
  DeviceInfo,
  Metrics,
  Protocol,
  SimParams,
  TrainerMode,
  ZwiftButton,
} from './types.ts';
import * as ftms from './ftms.ts';
import * as fec from './fec.ts';
import * as cps from './cps.ts';
import * as hrs from './hrs.ts';
import * as zwift from './zwift.ts';
import { createSimulator } from './simulator.ts';

export type * from './types.ts';

type Role = 'trainer' | 'power' | 'hr' | 'controller';
type Key = 'power' | 'cadence' | 'heartRate' | 'speed';
type Stamped = { v: number; t: number };

const STALE_MS = 3000;
const STORAGE_KEY = 'serpentine.devices';
const BATTERY_SERVICE = 0x180f;
const BATTERY_LEVEL = 0x2a19;
const INFO_SERVICE = 0x180a;
const LOCKED_MESSAGE =
  'Zwift Ride is locked. Ride firmware 1.3+ needs a daily unlock: open the Zwift app, connect the Ride for ~30 s and press a button, quit Zwift, then connect it here again.';
const DEFAULT_RIDER_KG = 75;
const DEFAULT_BIKE_KG = 8;

interface Link {
  id: string;
  role: Role;
  device: BluetoothDevice;
  protocol: Protocol;
  caps: Set<Capability>;
  state: DeviceInfo['state'];
  battery?: number;
  vals: Partial<Record<Key, Stamped>>;
  queue: Promise<unknown>;
  write?: (data: Uint8Array) => Promise<void>;
  zwiftWrite?: (data: Uint8Array) => Promise<void>;
  ftmsAt: number;
  pressed: Set<ZwiftButton>;
  locked: boolean;
  lastError?: unknown;
  ftmsRetried: Set<number>;
  lastCmd: Map<number, Uint8Array>;
  attempt: number;
  busy: boolean;
  intentional: boolean;
  retryTimer?: ReturnType<typeof setTimeout>;
  adAbort?: AbortController;
  onDisconnected: () => void;
}

interface ExtBluetooth {
  requestDevice(o: RequestDeviceOptions): Promise<BluetoothDevice>;
  getDevices?: () => Promise<BluetoothDevice[]>;
}

const defaultSim = { windSpeed: 0, crr: 0.004, cw: 0.51 };

function normSim(p: SimParams): Required<SimParams> {
  return {
    grade: Math.min(25, Math.max(-15, p.grade)),
    windSpeed: p.windSpeed ?? defaultSim.windSpeed,
    crr: p.crr ?? defaultSim.crr,
    cw: p.cw ?? defaultSim.cw,
  };
}

function bt(): ExtBluetooth | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as unknown as { bluetooth?: ExtBluetooth }).bluetooth;
}

function viewOf(ch: BluetoothRemoteGATTCharacteristic): DataView {
  return ch.value ?? new DataView(new ArrayBuffer(0));
}

async function tryGet<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch {
    return undefined;
  }
}

function loadIds(): Partial<Record<Role, string>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

function saveId(role: Role, id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadIds(), [role]: id }));
  } catch {
    // storage unavailable
  }
}

export function createDeviceHub(): DeviceHub {
  const links = new Map<string, Link>();
  const listeners = new Set<() => void>();
  let simVals: Partial<Record<Key, Stamped>> = {};
  let simEnabled = false;
  let mode: TrainerMode = { kind: 'idle' };
  let metrics: Metrics = {};
  let devices: DeviceInfo[] = [];
  let devicesSig = '';
  let emitTimer: ReturnType<typeof setTimeout> | undefined;
  let lastEmit = 0;
  let tick: ReturnType<typeof setInterval> | undefined;

  const buttonListeners = new Set<(b: ZwiftButton) => void>();
  let gearRatio: number | null = null;
  let riderKg = DEFAULT_RIDER_KG;
  let bikeKg = DEFAULT_BIKE_KG;
  let gearTimer: ReturnType<typeof setTimeout> | undefined;

  const sent: { kind?: string; at: number; watts?: number; sim?: Required<SimParams> } = { at: 0 };

  const sim = createSimulator((m) => {
    const t = Date.now();
    simVals = {};
    if (m.power !== undefined) simVals.power = { v: m.power, t };
    if (m.cadence !== undefined) simVals.cadence = { v: m.cadence, t };
    if (m.heartRate !== undefined) simVals.heartRate = { v: m.heartRate, t };
    scheduleEmit();
  });

  function fresh(vals: Partial<Record<Key, Stamped>> | undefined, k: Key, now: number) {
    const s = vals?.[k];
    return s && now - s.t <= STALE_MS ? s.v : undefined;
  }

  function byRole(role: Role): Link | undefined {
    for (const l of links.values()) if (l.role === role && l.state === 'connected') return l;
    return undefined;
  }

  function computeMetrics(): Metrics {
    const now = Date.now();
    const pm = byRole('power')?.vals;
    const tr = byRole('trainer')?.vals;
    const hr = byRole('hr')?.vals;
    const sv = simEnabled ? simVals : undefined;
    const out: Metrics = {};
    const pick = (k: Key, ...srcs: (Partial<Record<Key, Stamped>> | undefined)[]) => {
      for (const s of srcs) {
        const v = fresh(s, k, now);
        if (v !== undefined) return v;
      }
      return undefined;
    };
    const power = pick('power', pm, tr, sv);
    const cadence = pick('cadence', pm, tr, sv);
    const heartRate = pick('heartRate', hr, tr, sv);
    const speed = pick('speed', tr);
    if (power !== undefined) out.power = power;
    if (cadence !== undefined) out.cadence = cadence;
    if (heartRate !== undefined) out.heartRate = heartRate;
    if (speed !== undefined) out.speed = speed;
    return out;
  }

  function computeDevices(): DeviceInfo[] {
    const out: DeviceInfo[] = [];
    for (const l of links.values()) {
      const d: DeviceInfo = {
        id: l.id,
        name: l.device.name || l.id,
        protocol: l.protocol,
        capabilities: [...l.caps],
        state: l.state,
      };
      if (l.battery !== undefined) d.battery = l.battery;
      out.push(d);
    }
    if (simEnabled) {
      out.push({
        id: 'simulator',
        name: 'Simulator',
        protocol: 'simulator',
        capabilities: ['power', 'cadence', 'heartRate', 'control'],
        state: 'connected',
      });
    }
    return out;
  }

  function flush() {
    emitTimer = undefined;
    lastEmit = Date.now();
    const m = computeMetrics();
    if (
      m.power !== metrics.power ||
      m.cadence !== metrics.cadence ||
      m.heartRate !== metrics.heartRate ||
      m.speed !== metrics.speed
    ) {
      metrics = m;
    }
    const nd = computeDevices();
    const sig = JSON.stringify(nd);
    if (sig !== devicesSig) {
      devicesSig = sig;
      devices = nd;
    }
    for (const l of [...listeners]) l();
  }

  function scheduleEmit() {
    if (emitTimer) return;
    emitTimer = setTimeout(flush, Math.max(0, 100 - (Date.now() - lastEmit)));
  }

  function setVal(vals: Partial<Record<Key, Stamped>>, k: Key, v: number | undefined) {
    if (v === undefined || Number.isNaN(v)) return;
    vals[k] = { v, t: Date.now() };
  }

  function controllableLink(): Link | undefined {
    const l = byRole('trainer');
    return l && (l.protocol === 'ftms' || l.protocol === 'fec-ble') ? l : undefined;
  }

  // ---- writes ----

  function enqueue(l: Link, fn: () => Promise<void>): Promise<void> {
    const run = l.queue.then(fn);
    l.queue = run.catch((e) => console.warn('[devices] GATT write failed', e));
    return run.catch(() => undefined);
  }

  function send(l: Link, data: Uint8Array): Promise<void> {
    return enqueue(l, async () => {
      if (!l.write) return;
      await l.write(data);
    });
  }

  function sendFtms(l: Link, data: Uint8Array) {
    if (data[0] !== ftms.OP_REQUEST_CONTROL && data[0] !== ftms.OP_START) l.lastCmd.set(data[0]!, data);
    return send(l, data);
  }

  async function writeChar(ch: BluetoothRemoteGATTCharacteristic, data: Uint8Array) {
    if (ch.properties.write || !ch.properties.writeWithoutResponse) {
      await ch.writeValueWithResponse(data as BufferSource);
    } else {
      await ch.writeValueWithoutResponse(data as BufferSource);
    }
  }

  // ---- mode ----

  function dispatch(force: boolean) {
    const l = controllableLink();
    if (!l) return;
    const now = Date.now();
    if (mode.kind === 'erg') {
      const watts = Math.max(0, Math.round(mode.watts));
      if (!force && sent.kind === 'erg' && sent.watts === watts && now - sent.at < 10000) return;
      sent.kind = 'erg';
      sent.watts = watts;
      sent.at = now;
      if (l.protocol === 'ftms') void sendFtms(l, ftms.encodeTargetPower(watts));
      else void send(l, fec.encodeFecTargetPower(watts));
      return;
    }
    const raw = normSim(mode.kind === 'sim' ? mode.params : { grade: 0 });
    const native = !!l.zwiftWrite;
    let target = raw;
    if (!native && gearRatio !== null && mode.kind === 'sim') {
      target = { ...raw, grade: gearedGrade(l, raw.grade, now), crr: 0, cw: 0 };
    }
    const prev = sent.sim;
    const kindChanged = sent.kind !== 'sim';
    const moved =
      !prev ||
      Math.abs(prev.grade - target.grade) >= 0.1 ||
      prev.windSpeed !== target.windSpeed ||
      prev.crr !== target.crr ||
      prev.cw !== target.cw;
    const resend = native && now - sent.at >= 10000;
    if (!force && !kindChanged && ((!moved && !resend) || now - sent.at < 1000)) return;
    if (!force && kindChanged && now - sent.at < 250) return;
    const windChanged =
      !prev || prev.windSpeed !== target.windSpeed || prev.cw !== target.cw || kindChanged || force;
    const leavingErg = sent.kind === 'erg';
    sent.kind = 'sim';
    sent.sim = target;
    sent.at = now;
    if (native) {
      if (leavingErg) void sendFtms(l, ftms.encodeSimParams({ grade: 0 }));
      void sendZwift(l, zwift.encodeSimulation(zwift.simulationFromGrade(target.grade)));
      if (leavingErg || force) sendPhysical(l);
    } else if (l.protocol === 'ftms') {
      void sendFtms(l, ftms.encodeSimParams(target));
    } else {
      if (windChanged) void send(l, fec.encodeFecWind(target.cw, target.windSpeed));
      void send(l, fec.encodeFecTrackResistance(target.grade, target.crr));
    }
  }

  function gearedGrade(l: Link, grade: number, now: number): number {
    const kmh = fresh(l.vals, 'speed', now);
    const rpm = fresh(l.vals, 'cadence', now);
    const ms = kmh !== undefined ? kmh / 3.6 : ((rpm ?? 0) / 60) * zwift.NEUTRAL_RATIO * 2.1;
    return zwift.gearedGrade(grade, gearRatio ?? zwift.NEUTRAL_RATIO, ms, riderKg + bikeKg);
  }

  // ---- zwift protocol writes ----

  function sendZwift(l: Link, data: Uint8Array): Promise<void> {
    return enqueue(l, async () => {
      if (!l.zwiftWrite) return;
      await l.zwiftWrite(data);
    });
  }

  function sendPhysical(l: Link) {
    void sendZwift(l, zwift.encodePhysical(zwift.physicalFrom(gearRatio, bikeKg, riderKg)));
    void sendZwift(l, zwift.encodeHubRequest(zwift.DATA_ID_GEAR_RATIO));
  }

  function scheduleGear() {
    clearTimeout(gearTimer);
    gearTimer = setTimeout(() => {
      gearTimer = undefined;
      const l = controllableLink();
      if (!l) return;
      if (l.zwiftWrite) sendPhysical(l);
      else if (mode.kind !== 'erg') dispatch(true);
    }, 80);
  }

  function applyModeNow() {
    sent.kind = undefined;
    sent.sim = undefined;
    sent.watts = undefined;
    dispatch(true);
  }

  function updateTicker() {
    const need = !!controllableLink();
    if (need && !tick) tick = setInterval(() => dispatch(false), 500);
    else if (!need && tick) {
      clearInterval(tick);
      tick = undefined;
    }
  }

  // ---- protocol setup ----

  async function setupFtms(l: Link, svc: BluetoothRemoteGATTService) {
    l.protocol = 'ftms';
    l.caps = new Set<Capability>(['power', 'cadence', 'speed', 'control']);
    const data = await svc.getCharacteristic(ftms.INDOOR_BIKE_DATA);
    data.addEventListener('characteristicvaluechanged', () => {
      const d = ftms.parseIndoorBikeData(viewOf(data));
      l.ftmsAt = Date.now();
      setVal(l.vals, 'power', d.power);
      setVal(l.vals, 'cadence', d.cadence);
      setVal(l.vals, 'speed', d.speed);
      setVal(l.vals, 'heartRate', d.heartRate && d.heartRate > 0 ? d.heartRate : undefined);
      scheduleEmit();
    });
    await data.startNotifications();

    const cp = await svc.getCharacteristic(ftms.FTMS_CONTROL_POINT);
    l.write = (b) => writeChar(cp, b);
    cp.addEventListener('characteristicvaluechanged', () => {
      const r = ftms.parseControlResponse(viewOf(cp));
      if (!r) return;
      if (r.result === ftms.RESULT_SUCCESS) {
        l.ftmsRetried.delete(r.requestOp);
        return;
      }
      console.warn(`[devices] FTMS op 0x${r.requestOp.toString(16)} failed with result ${r.result}`);
      const cmd = l.lastCmd.get(r.requestOp);
      if (r.result === ftms.RESULT_NOT_PERMITTED && cmd && !l.ftmsRetried.has(r.requestOp)) {
        l.ftmsRetried.add(r.requestOp);
        void send(l, ftms.encodeRequestControl());
        void send(l, ftms.encodeStart());
        void send(l, cmd);
      }
    });
    await cp.startNotifications();

    void tryGet(async () => {
      const f = await svc.getCharacteristic(ftms.FTMS_FEATURE);
      await f.readValue();
    });
    void tryGet(async () => {
      const r = await svc.getCharacteristic(ftms.FTMS_POWER_RANGE);
      await r.readValue();
    });

    await send(l, ftms.encodeRequestControl());
    await send(l, ftms.encodeStart());
  }

  async function setupFec(l: Link, svc: BluetoothRemoteGATTService) {
    l.protocol = 'fec-ble';
    l.caps = new Set<Capability>(['power', 'cadence', 'speed', 'control']);
    const notify = await svc.getCharacteristic(fec.FEC_NOTIFY);
    const wr = await svc.getCharacteristic(fec.FEC_WRITE);
    l.write = (b) => writeChar(wr, b);
    notify.addEventListener('characteristicvaluechanged', () => {
      const v = viewOf(notify);
      const d = fec.parseFecMessage(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
      if (!d) return;
      setVal(l.vals, 'power', d.power);
      setVal(l.vals, 'cadence', d.cadence);
      setVal(l.vals, 'speed', d.speed);
      scheduleEmit();
    });
    await notify.startNotifications();
  }

  async function setupCps(l: Link, svc: BluetoothRemoteGATTService) {
    l.protocol = 'cps';
    l.caps = new Set<Capability>(['power', 'cadence']);
    const calc = cps.createCadenceCalculator();
    const ch = await svc.getCharacteristic(cps.CPS_MEASUREMENT);
    ch.addEventListener('characteristicvaluechanged', () => {
      const m = cps.parseCpsMeasurement(viewOf(ch));
      if (!m) return;
      setVal(l.vals, 'power', m.power);
      setVal(l.vals, 'cadence', calc.update(m.crank, Date.now()));
      scheduleEmit();
    });
    await ch.startNotifications();
  }

  async function setupHr(l: Link, svc: BluetoothRemoteGATTService) {
    l.caps.add('heartRate');
    const ch = await svc.getCharacteristic(hrs.HR_MEASUREMENT);
    ch.addEventListener('characteristicvaluechanged', () => {
      const hr = hrs.parseHeartRate(viewOf(ch));
      setVal(l.vals, 'heartRate', hr && hr > 0 ? hr : undefined);
      scheduleEmit();
    });
    await ch.startNotifications();
  }

  function bytesOf(ch: BluetoothRemoteGATTCharacteristic): Uint8Array {
    const v = viewOf(ch);
    return new Uint8Array(v.buffer, v.byteOffset, v.byteLength).slice();
  }

  async function zwiftService(server: BluetoothRemoteGATTServer) {
    const svcOf = (uuid: BluetoothServiceUUID) => tryGet(() => server.getPrimaryService(uuid));
    return (await svcOf(zwift.ZWIFT_SERVICE_NEW)) ?? (await svcOf(zwift.ZWIFT_SERVICE_LEGACY));
  }

  async function openZwiftChannels(l: Link, svc: BluetoothRemoteGATTService, onAsync: (msg: Uint8Array) => void) {
    const async = await svc.getCharacteristic(zwift.ZWIFT_ASYNC);
    async.addEventListener('characteristicvaluechanged', () => {
      const msg = bytesOf(async);
      if (msg.length) onAsync(msg);
    });
    await async.startNotifications();
    const tx = await tryGet(() => svc.getCharacteristic(zwift.ZWIFT_SYNC_TX));
    if (tx) {
      tx.addEventListener('characteristicvaluechanged', () => undefined);
      await tryGet(() => tx.startNotifications());
    }
    const rx = await svc.getCharacteristic(zwift.ZWIFT_SYNC_RX);
    l.zwiftWrite = (b) => writeChar(rx, b);
  }

  async function setupZwiftTrainer(l: Link, svc: BluetoothRemoteGATTService) {
    await openZwiftChannels(l, svc, (msg) => {
      const d = zwift.decodeRidingData(msg);
      if (!d || Date.now() - l.ftmsAt <= STALE_MS) return;
      setVal(l.vals, 'power', d.power);
      setVal(l.vals, 'cadence', d.cadence);
      scheduleEmit();
    });
    await sendZwift(l, zwift.RIDE_ON_TRAINER);
    await sendZwift(l, zwift.TRAINER_HANDSHAKE_2);
    const grade = mode.kind === 'sim' ? mode.params.grade : 0.4;
    await sendZwift(l, zwift.encodeSimulation(zwift.simulationFromGrade(grade)));
    sendPhysical(l);
    l.caps.add('gears');
  }

  async function setupController(l: Link, server: BluetoothRemoteGATTServer) {
    l.protocol = 'zwift-ride';
    l.caps = new Set<Capability>(['buttons']);
    const svc = await zwiftService(server);
    if (!svc) {
      l.locked = true;
      throw new Error(LOCKED_MESSAGE);
    }
    await openZwiftChannels(l, svc, (msg) => {
      if (msg[0] === zwift.OP_KEYPAD) {
        const st = zwift.decodeKeyPadStatus(msg);
        if (!st) return;
        const now = zwift.pressedButtons(st);
        const fired = zwift.risingEdges(l.pressed, now);
        l.pressed = now;
        for (const b of fired) for (const fn of [...buttonListeners]) fn(b);
      } else if (msg[0] === zwift.OP_BATTERY) {
        const pct = zwift.decodeBattery(msg);
        if (pct !== undefined && pct !== l.battery) {
          l.battery = pct;
          scheduleEmit();
        }
      }
    });
    await sendZwift(l, zwift.RIDE_ON_CONTROLLER);
  }

  async function setupBattery(l: Link, server: BluetoothRemoteGATTServer) {
    const level = await tryGet(async () => {
      const svc = await server.getPrimaryService(BATTERY_SERVICE);
      const ch = await svc.getCharacteristic(BATTERY_LEVEL);
      return (await ch.readValue()).getUint8(0);
    });
    if (level !== undefined) l.battery = level;
  }

  async function setupLink(l: Link) {
    const gatt = l.device.gatt;
    if (!gatt) throw new Error('No GATT server');
    const server = gatt.connected ? gatt : await gatt.connect();
    l.write = undefined;
    l.zwiftWrite = undefined;
    l.ftmsAt = 0;
    l.pressed = new Set();
    l.locked = false;
    l.lastCmd.clear();
    l.ftmsRetried.clear();
    l.queue = Promise.resolve();
    const svcOf = (uuid: BluetoothServiceUUID) => tryGet(() => server.getPrimaryService(uuid));

    if (l.role === 'trainer') {
      const f = await svcOf(ftms.FTMS_SERVICE);
      const e = f ? undefined : await svcOf(fec.FEC_SERVICE);
      const c = f || e ? undefined : await svcOf(cps.CPS_SERVICE);
      if (f) {
        await setupFtms(l, f);
        const z = await zwiftService(server);
        if (z) {
          try {
            await setupZwiftTrainer(l, z);
          } catch (e) {
            console.warn('[devices] Zwift trainer protocol unavailable, using FTMS', e);
            l.zwiftWrite = undefined;
            l.caps.delete('gears');
          }
        }
      } else if (e) await setupFec(l, e);
      else if (c) await setupCps(l, c);
      else throw new Error('Trainer exposes no supported service');
      const h = await svcOf(hrs.HR_SERVICE);
      if (h) await tryGet(() => setupHr(l, h));
    } else if (l.role === 'controller') {
      await setupController(l, server);
    } else if (l.role === 'power') {
      const c = await svcOf(cps.CPS_SERVICE);
      if (!c) throw new Error('Device has no Cycling Power service');
      await setupCps(l, c);
    } else {
      l.protocol = 'hrs';
      l.caps = new Set<Capability>();
      const h = await svcOf(hrs.HR_SERVICE);
      if (!h) throw new Error('Device has no Heart Rate service');
      await setupHr(l, h);
    }
    await setupBattery(l, server);
  }

  async function connectLink(l: Link): Promise<boolean> {
    if (l.busy || l.intentional) return false;
    l.busy = true;
    if (l.state === 'disconnected') l.state = 'connecting';
    scheduleEmit();
    try {
      await setupLink(l);
      if (l.intentional) {
        l.device.gatt?.disconnect();
        return false;
      }
      l.attempt = 0;
      l.state = 'connected';
      saveId(l.role, l.id);
      l.adAbort?.abort();
      l.adAbort = undefined;
      if (l.role === 'trainer') {
        updateTicker();
        applyModeNow();
      }
      scheduleEmit();
      return true;
    } catch (e) {
      console.warn('[devices] connect failed', l.device.name, e);
      l.lastError = e;
      if (l.locked) {
        l.state = 'disconnected';
        l.device.gatt?.disconnect();
      }
      return false;
    } finally {
      l.busy = false;
    }
  }

  function scheduleReconnect(l: Link) {
    if (l.intentional) return;
    if (l.locked) {
      l.state = 'disconnected';
      scheduleEmit();
      return;
    }
    l.state = 'reconnecting';
    clearTimeout(l.retryTimer);
    const delay = Math.min(15000, 1000 * 2 ** l.attempt);
    l.attempt++;
    l.retryTimer = setTimeout(async () => {
      if (l.intentional || l.state === 'connected') return;
      if (!(await connectLink(l))) scheduleReconnect(l);
    }, delay);
    updateTicker();
    scheduleEmit();
  }

  function register(device: BluetoothDevice, role: Role): Link {
    const existing = links.get(device.id);
    if (existing) {
      existing.intentional = false;
      existing.role = role;
      return existing;
    }
    for (const other of [...links.values()]) if (other.role === role) removeLink(other);
    const l: Link = {
      id: device.id,
      role,
      device,
      protocol: role === 'hr' ? 'hrs' : role === 'power' ? 'cps' : role === 'controller' ? 'zwift-ride' : 'ftms',
      caps: new Set(),
      state: 'disconnected',
      vals: {},
      queue: Promise.resolve(),
      ftmsAt: 0,
      pressed: new Set(),
      locked: false,
      ftmsRetried: new Set(),
      lastCmd: new Map(),
      attempt: 0,
      busy: false,
      intentional: false,
      onDisconnected: () => {
        l.write = undefined;
        l.zwiftWrite = undefined;
        l.vals = {};
        if (l.intentional) l.state = 'disconnected';
        else scheduleReconnect(l);
        updateTicker();
        scheduleEmit();
      },
    };
    device.addEventListener('gattserverdisconnected', l.onDisconnected);
    links.set(l.id, l);
    return l;
  }

  function removeLink(l: Link) {
    l.intentional = true;
    clearTimeout(l.retryTimer);
    l.adAbort?.abort();
    l.device.removeEventListener('gattserverdisconnected', l.onDisconnected);
    if (l.device.gatt?.connected) l.device.gatt.disconnect();
    links.delete(l.id);
    updateTicker();
    scheduleEmit();
  }

  async function pair(role: Role, options: RequestDeviceOptions) {
    const b = bt();
    if (!b) throw new Error('Web Bluetooth is not supported in this browser');
    const device = await b.requestDevice(options);
    const l = register(device, role);
    if (!(await connectLink(l))) {
      if (role === 'controller' && l.locked && l.lastError instanceof Error) {
        removeLink(l);
        throw l.lastError;
      }
      if (links.get(l.id) === l && !l.intentional) scheduleReconnect(l);
      throw new Error(`Could not connect to ${device.name ?? 'device'}`);
    }
  }

  const hub: DeviceHub = {
    get supported() {
      return typeof navigator !== 'undefined' && !!(navigator as { bluetooth?: unknown }).bluetooth;
    },
    get devices() {
      return devices;
    },
    get metrics() {
      return metrics;
    },
    get hasControllableTrainer() {
      return !!controllableLink() || simEnabled;
    },
    get simulatorEnabled() {
      return simEnabled;
    },
    simulator: sim.controls,

    subscribe(listener) {
      listeners.add(listener);
      const stale = setInterval(scheduleEmit, 1000);
      return () => {
        listeners.delete(listener);
        clearInterval(stale);
      };
    },

    pairTrainer() {
      return pair('trainer', {
        filters: [
          { services: [ftms.FTMS_SERVICE] },
          { services: [fec.FEC_SERVICE] },
          { services: [cps.CPS_SERVICE] },
        ],
        optionalServices: [
          ftms.FTMS_SERVICE,
          fec.FEC_SERVICE,
          cps.CPS_SERVICE,
          hrs.HR_SERVICE,
          BATTERY_SERVICE,
          INFO_SERVICE,
          zwift.ZWIFT_SERVICE_NEW,
          zwift.ZWIFT_SERVICE_LEGACY,
        ],
      });
    },
    pairController() {
      return pair('controller', {
        filters: [{ namePrefix: 'Zwift' }, { manufacturerData: [{ companyIdentifier: 0x094a }] }],
        optionalServices: [zwift.ZWIFT_SERVICE_NEW, zwift.ZWIFT_SERVICE_LEGACY, BATTERY_SERVICE],
      });
    },
    pairPowerMeter() {
      return pair('power', {
        filters: [{ services: [cps.CPS_SERVICE] }],
        optionalServices: [BATTERY_SERVICE, INFO_SERVICE],
      });
    },
    pairHeartRate() {
      return pair('hr', {
        filters: [{ services: [hrs.HR_SERVICE] }],
        optionalServices: [BATTERY_SERVICE, INFO_SERVICE],
      });
    },

    async reconnectKnown() {
      const b = bt();
      if (!b || typeof b.getDevices !== 'function') return;
      try {
        const known = await b.getDevices();
        const ids = loadIds();
        for (const role of ['trainer', 'power', 'hr', 'controller'] as Role[]) {
          const id = ids[role];
          const device = id ? known.find((d) => d.id === id) : undefined;
          if (!device || links.get(device.id)?.state === 'connected') continue;
          const l = register(device, role);
          l.state = 'reconnecting';
          scheduleEmit();
          const watch = (device as unknown as {
            watchAdvertisements?: (o: { signal: AbortSignal }) => Promise<void>;
          }).watchAdvertisements;
          const ctrl = new AbortController();
          let watching = false;
          if (typeof watch === 'function') {
            device.addEventListener(
              'advertisementreceived',
              () => {
                ctrl.abort();
                if (l.state !== 'connected') void connectLink(l).then((ok) => !ok && scheduleReconnect(l));
              },
              { once: true },
            );
            watching = await watch.call(device, { signal: ctrl.signal }).then(
              () => true,
              () => false,
            );
            if (watching) l.adAbort = ctrl;
          }
          void connectLink(l).then((ok) => {
            if (!ok && !watching) scheduleReconnect(l);
          });
        }
      } catch (e) {
        console.warn('[devices] reconnectKnown failed', e);
      }
    },

    async disconnect(id) {
      if (id === 'simulator') {
        hub.setSimulator(false);
        return;
      }
      const l = links.get(id);
      if (l) removeLink(l);
    },

    setSimulator(enabled) {
      if (enabled === simEnabled) return;
      simEnabled = enabled;
      if (enabled) {
        sim.setMode(mode);
        sim.start();
      } else {
        sim.stop();
        simVals = {};
      }
      scheduleEmit();
    },

    setMode(m) {
      mode = m;
      sim.setMode(m);
      dispatch(false);
    },

    vibrateController() {
      const l = byRole('controller');
      if (l?.zwiftWrite) void sendZwift(l, zwift.VIBRATE).catch(() => undefined);
    },

    onButton(listener) {
      buttonListeners.add(listener);
      return () => {
        buttonListeners.delete(listener);
      };
    },

    setGearRatio(ratio) {
      gearRatio = ratio === null || !Number.isFinite(ratio) || ratio <= 0 ? null : ratio;
      scheduleGear();
    },

    setRiderWeights(rider, bike) {
      if (Number.isFinite(rider) && rider > 0) riderKg = rider;
      if (Number.isFinite(bike) && bike > 0) bikeKg = bike;
      scheduleGear();
    },

    get shifting() {
      const l = controllableLink();
      return l ? (l.zwiftWrite ? 'native' : 'ftms') : 'none';
    },
  };

  return hub;
}

export const hub: DeviceHub = createDeviceHub();
