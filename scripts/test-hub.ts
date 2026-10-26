// The device hub against fake Bluetooth devices: saved devices per rider, reconnecting them, and a device
// keeping one role. Run with: node scripts/test-hub.ts
import assert from 'node:assert/strict';

// ---- fakes: storage, and Bluetooth devices that answer every GATT call ----

const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
  },
});

const FTMS = 0x1826;
const HR = 0x180d;

function fakeChar() {
  return {
    properties: { write: true, writeWithoutResponse: false, notify: true },
    value: undefined,
    addEventListener() {},
    async startNotifications() {},
    async readValue() {
      return new DataView(Uint8Array.of(80).buffer);
    },
    async writeValueWithResponse() {},
    async writeValueWithoutResponse() {},
  };
}

function fakeDevice(id: string, name: string, services: number[]) {
  const handlers = new Set<() => void>();
  const gatt = {
    connected: false,
    async connect() {
      gatt.connected = true;
      return gatt;
    },
    disconnect() {
      if (!gatt.connected) return;
      gatt.connected = false;
      for (const h of handlers) h();
    },
    async getPrimaryService(uuid: number | string) {
      if (!services.includes(uuid as number)) throw new Error(`no service ${uuid}`);
      return { getCharacteristic: async () => fakeChar() };
    },
  };
  return {
    id,
    name,
    gatt,
    addEventListener: (type: string, h: () => void) => type === 'gattserverdisconnected' && handlers.add(h),
    removeEventListener: (_type: string, h: () => void) => handlers.delete(h),
  };
}

type Fake = ReturnType<typeof fakeDevice>;
const bluetooth = {
  nearby: [] as Fake[],
  picked: null as Fake | null,
  async getDevices() {
    return bluetooth.nearby;
  },
  async requestDevice() {
    if (!bluetooth.picked) throw new Error('User cancelled the requestDevice() chooser.');
    return bluetooth.picked;
  },
};
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { bluetooth } });
// device events are logged; keep the test output to the results
console.info = () => {};

const { createDeviceHub } = await import('../src/devices/index.ts');

const until = async (cond: () => boolean, ms: number, what: string) => {
  const end = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 50));
  }
};

let n = 0;
async function t(name: string, fn: () => Promise<void>) {
  await fn();
  n++;
  console.log(`ok - ${name}`);
}

// ---- tests ----

const kickr = fakeDevice('Q', 'KICKR CORE 8663', [FTMS]);
const tickr = fakeDevice('A', 'TICKR 0C64', [HR]);

const hub = createDeviceHub();

await t('reconnect: a trainer saved as power meter too comes back as the trainer', async () => {
  // as saved by the app on 2026-10-26
  store.set('serpentine.devices', JSON.stringify({ trainer: 'Q', hr: 'A', power: 'Q' }));
  bluetooth.nearby = [kickr, tickr];
  await hub.reconnectKnown();
  await until(() => hub.devices.filter((d) => d.state === 'connected').length === 2, 3000, 'both devices');
  const trainer = hub.devices.find((d) => d.id === 'Q')!;
  assert.ok(trainer.capabilities.includes('control'), 'the KICKR controls resistance');
  assert.equal(hub.hasControllableTrainer, true);
  assert.equal(hub.devices.find((d) => d.id === 'A')?.protocol, 'hrs');
  // the double entry is gone from storage
  assert.deepEqual(JSON.parse(store.get('serpentine.devices')!), { trainer: 'Q', hr: 'A' });
  assert.deepEqual(hub.searching, []);
});

await t('pairing: the trainer picked again as power meter stays the trainer', async () => {
  bluetooth.picked = kickr;
  await assert.rejects(hub.pairPowerMeter(), /already connected as your smart trainer/);
  assert.equal(hub.hasControllableTrainer, true);
  assert.deepEqual(JSON.parse(store.get('serpentine.devices')!), { trainer: 'Q', hr: 'A' });
});

await t('reconnect: a dropped device comes back by itself', async () => {
  tickr.gatt.disconnect();
  await until(() => hub.devices.find((d) => d.id === 'A')?.state === 'connected', 3000, 'the strap back');
});

await t('reconnect: a saved device that is asleep at start is found when it wakes up', async () => {
  for (const d of [...hub.devices]) await hub.disconnect(d.id);
  const ride = fakeDevice('Z', 'Zwift Ride', [HR]);
  // the second rider of the household
  store.set('serpentine.profiles', JSON.stringify([{ id: 'main', name: 'A', kit: '#e8442e' }, { id: 'r1', name: 'B', kit: '#2e7de8' }]));
  store.set('serpentine.profile', JSON.stringify('r1'));
  store.set('serpentine.devices.r1', JSON.stringify({ hr: 'Z' }));
  bluetooth.nearby = [];
  const h2 = createDeviceHub();
  await h2.reconnectKnown();
  assert.deepEqual(h2.searching, ['hr'], 'still looking');
  bluetooth.nearby = [ride];
  await until(() => h2.devices.some((d) => d.id === 'Z' && d.state === 'connected'), 8000, 'the woken device');
  await until(() => h2.searching.length === 0, 1000, 'the search to end');
  // the other rider's saved devices are untouched
  assert.equal(store.get('serpentine.devices'), JSON.stringify({}));
  await h2.disconnect('Z');
});

await t('reconnect: off means no search', async () => {
  store.set('serpentine.devices.r1', JSON.stringify({ hr: 'Z' }));
  const h3 = createDeviceHub();
  h3.setAutoConnect(false);
  await h3.reconnectKnown();
  assert.deepEqual(h3.searching, []);
  assert.equal(h3.devices.length, 0);
  h3.setAutoConnect(true);
  store.delete('serpentine.autoConnect');
  for (const d of [...h3.devices]) await h3.disconnect(d.id);
});

console.log(`\n${n} hub tests passed`);
process.exit(0);
