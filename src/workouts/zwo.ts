import type { Workout, WorkoutCategory, WorkoutMessage, WorkoutStep } from './types.ts';
import { buildWorkout } from './metrics.ts';

interface XmlNode {
  name: string; // lower-cased
  attrs: Record<string, string>; // lower-cased keys
  children: XmlNode[];
  text: string;
}

const NOT_ZWO = 'Not a Zwift workout file';
/** Longest IntervalsT block we build; Zwift's own workouts stay well under 50. */
const MAX_REPEAT = 200;

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (m, e: string) => {
    if (e[0] === '#') {
      const cp = e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
    }
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[e] ?? m;
  });
}

function parseXml(xml: string): XmlNode {
  const root: XmlNode = { name: '#root', attrs: {}, children: [], text: '' };
  const stack: XmlNode[] = [root];
  let i = 0;
  const n = xml.length;
  while (i < n) {
    const lt = xml.indexOf('<', i);
    const cur = stack[stack.length - 1];
    if (lt < 0) {
      cur.text += decode(xml.slice(i));
      break;
    }
    if (lt > i) cur.text += decode(xml.slice(i, lt));
    if (xml.startsWith('<!--', lt)) {
      const end = xml.indexOf('-->', lt + 4);
      if (end < 0) throw new Error(NOT_ZWO);
      i = end + 3;
    } else if (xml.startsWith('<![CDATA[', lt)) {
      const end = xml.indexOf(']]>', lt);
      if (end < 0) throw new Error(NOT_ZWO);
      cur.text += xml.slice(lt + 9, end);
      i = end + 3;
    } else if (xml.startsWith('<?', lt)) {
      const end = xml.indexOf('?>', lt);
      if (end < 0) throw new Error(NOT_ZWO);
      i = end + 2;
    } else if (xml.startsWith('<!', lt)) {
      const end = xml.indexOf('>', lt);
      if (end < 0) throw new Error(NOT_ZWO);
      i = end + 1;
    } else if (xml.startsWith('</', lt)) {
      const end = xml.indexOf('>', lt);
      if (end < 0) throw new Error(NOT_ZWO);
      const name = xml.slice(lt + 2, end).trim().toLowerCase();
      if (stack.length < 2 || stack[stack.length - 1].name !== name) throw new Error(NOT_ZWO);
      stack.pop();
      i = end + 1;
    } else {
      const m = /^<([A-Za-z_][\w:.-]*)/.exec(xml.slice(lt, lt + 128));
      if (!m) throw new Error(NOT_ZWO);
      const node: XmlNode = { name: m[1].toLowerCase(), attrs: {}, children: [], text: '' };
      let p = lt + m[0].length;
      let selfClose = false;
      for (;;) {
        while (p < n && /\s/.test(xml[p])) p++;
        if (p >= n) throw new Error(NOT_ZWO);
        if (xml[p] === '>') { p++; break; }
        if (xml[p] === '/' && xml[p + 1] === '>') { selfClose = true; p += 2; break; }
        const am = /^([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/.exec(xml.slice(p, p + 4096));
        if (!am) throw new Error(NOT_ZWO);
        node.attrs[am[1].toLowerCase()] = decode(am[2] ?? am[3] ?? '');
        p += am[0].length;
      }
      cur.children.push(node);
      if (!selfClose) stack.push(node);
      i = p;
    }
  }
  if (stack.length !== 1) throw new Error(NOT_ZWO);
  return root;
}

function attr(node: XmlNode, ...names: string[]): number | undefined {
  for (const nm of names) {
    const v = node.attrs[nm];
    if (v !== undefined && v.trim() !== '') {
      const x = Number(v);
      if (Number.isFinite(x)) return x;
    }
  }
  return undefined;
}

function textOf(node: XmlNode | undefined): string | undefined {
  const t = node?.text.trim();
  return t ? t : undefined;
}

function inferCategory(name: string, tags: string[]): WorkoutCategory {
  const hay = `${tags.join(' ')} ${name}`.toLowerCase();
  const rules: [RegExp, WorkoutCategory][] = [
    [/recover/, 'recovery'],
    [/sweet\s*-?spot|\bss\b/, 'sweetspot'],
    [/vo2|vo₂/, 'vo2max'],
    [/anaerob|sprint|neuromusc/, 'anaerobic'],
    [/threshold|ftp|over.?under/, 'threshold'],
    [/tempo/, 'tempo'],
    [/climb|hill|mountain|alpine|summit/, 'climbing'],
    [/endurance|base|\bz2\b|zone\s*2/, 'endurance'],
  ];
  for (const [re, cat] of rules) if (re.test(hay)) return cat;
  return 'custom';
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'workout';
}

export function parseZwo(xml: string, id?: string): Workout {
  if (typeof xml !== 'string') throw new Error(NOT_ZWO);
  let doc: XmlNode;
  try {
    doc = parseXml(xml);
  } catch {
    throw new Error(NOT_ZWO);
  }
  const rootEl = doc.children.find((c) => c.name === 'workout_file');
  const block = rootEl?.children.find((c) => c.name === 'workout');
  if (!rootEl || !block) throw new Error(NOT_ZWO);

  const steps: WorkoutStep[] = [];
  const messages: WorkoutMessage[] = [];
  let t = 0;

  const events = (node: XmlNode, base: number) => {
    for (const c of node.children) {
      if (c.name !== 'textevent') continue;
      const text = c.attrs['message'];
      if (!text) continue;
      const m: WorkoutMessage = { at: base + (attr(c, 'timeoffset') ?? 0), text };
      const d = attr(c, 'duration');
      if (d !== undefined && d > 0) m.duration = d;
      messages.push(m);
    }
  };

  const push = (s: WorkoutStep) => {
    steps.push(s);
    t += s.duration;
  };

  for (const el of block.children) {
    const cadence = attr(el, 'cadence');
    const withCad = (s: WorkoutStep): WorkoutStep => (cadence !== undefined ? { ...s, cadence } : s);
    const dur = attr(el, 'duration');
    switch (el.name) {
      case 'warmup':
      case 'cooldown':
      case 'ramp':
      case 'rampup':
      case 'rampdown': {
        if (dur === undefined) throw new Error(NOT_ZWO);
        const kind = el.name === 'warmup' ? 'warmup' : el.name === 'cooldown' ? 'cooldown' : 'ramp';
        const p = attr(el, 'power');
        const start = attr(el, 'powerlow') ?? p ?? 0.5;
        const end = attr(el, 'powerhigh') ?? p ?? start;
        events(el, t);
        push(withCad({ kind, duration: dur, start, end }));
        break;
      }
      case 'steadystate':
      case 'solidstate': {
        if (dur === undefined) throw new Error(NOT_ZWO);
        const low = attr(el, 'powerlow');
        const high = attr(el, 'powerhigh');
        const p = attr(el, 'power') ?? low ?? high ?? 0.5;
        events(el, t);
        push(withCad({ kind: 'steady', duration: dur, start: low ?? p, end: high ?? p }));
        break;
      }
      case 'freeride': {
        if (dur === undefined) throw new Error(NOT_ZWO);
        events(el, t);
        push(withCad({ kind: 'free', duration: dur, start: 0.6, end: 0.6 }));
        break;
      }
      case 'maxeffort': {
        if (dur === undefined) throw new Error(NOT_ZWO);
        events(el, t);
        push(withCad({ kind: 'maxeffort', duration: dur, start: 1.2, end: 1.2 }));
        break;
      }
      case 'intervalst': {
        // a typo like repeat="1000000" would freeze the app building steps
        const reps = Math.min(MAX_REPEAT, Math.max(1, Math.round(attr(el, 'repeat') ?? 1)));
        const onD = attr(el, 'onduration') ?? 0;
        const offD = attr(el, 'offduration') ?? 0;
        const onP = attr(el, 'onpower');
        const onLow = attr(el, 'poweronlow') ?? onP ?? 1;
        const onHigh = attr(el, 'poweronhigh') ?? onP ?? onLow;
        const offP = attr(el, 'offpower');
        const offLow = attr(el, 'powerofflow') ?? offP ?? 0.5;
        const offHigh = attr(el, 'poweroffhigh') ?? offP ?? offLow;
        const cOn = attr(el, 'cadence');
        const cOff = attr(el, 'cadenceresting');
        events(el, t);
        for (let r = 0; r < reps; r++) {
          if (onD > 0) {
            const s: WorkoutStep = { kind: 'on', duration: onD, start: onLow, end: onHigh, label: `Interval ${r + 1}/${reps}` };
            if (cOn !== undefined) s.cadence = cOn;
            push(s);
          }
          if (offD > 0) {
            const s: WorkoutStep = { kind: 'off', duration: offD, start: offLow, end: offHigh, label: 'Recover' };
            if (cOff !== undefined) s.cadence = cOff;
            push(s);
          }
        }
        break;
      }
      default:
        break;
    }
  }
  if (steps.length === 0) throw new Error(NOT_ZWO);

  const name = textOf(rootEl.children.find((c) => c.name === 'name')) ?? 'Untitled workout';
  const tags = (rootEl.children.find((c) => c.name === 'tags')?.children ?? [])
    .filter((c) => c.name === 'tag')
    .map((c) => c.attrs['name'] ?? '')
    .filter(Boolean);
  messages.sort((a, b) => a.at - b.at);

  return buildWorkout({
    id: id ?? slug(name),
    name,
    description: textOf(rootEl.children.find((c) => c.name === 'description')),
    author: textOf(rootEl.children.find((c) => c.name === 'author')),
    category: inferCategory(name, tags),
    steps,
    messages,
    source: 'zwo',
  });
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function num(x: number): string {
  return String(Math.round(x * 10000) / 10000);
}

export function toZwo(w: Workout): string {
  const starts: number[] = [];
  let acc = 0;
  for (const s of w.steps) {
    starts.push(acc);
    acc += s.duration;
  }
  const events: string[][] = w.steps.map(() => []);
  for (const m of w.messages) {
    let idx = starts.length - 1;
    for (let i = 0; i < starts.length; i++) {
      if (m.at < starts[i] + w.steps[i].duration) { idx = i; break; }
    }
    const dur = m.duration !== undefined ? ` duration="${num(m.duration)}"` : '';
    events[idx].push(`<textevent timeoffset="${num(m.at - starts[idx])}" message="${esc(m.text)}"${dur} />`);
  }

  const lines: string[] = ['<workout_file>'];
  lines.push(`  <author>${esc(w.author ?? '')}</author>`);
  lines.push(`  <name>${esc(w.name)}</name>`);
  lines.push(`  <description>${esc(w.description ?? '')}</description>`);
  lines.push('  <sportType>bike</sportType>');
  lines.push('  <tags>');
  lines.push(`    <tag name="${esc(w.category)}"/>`);
  lines.push('  </tags>');
  lines.push('  <workout>');
  w.steps.forEach((s, i) => {
    let tag: string;
    let a: string;
    const d = `Duration="${num(s.duration)}"`;
    const cad = s.cadence !== undefined ? ` Cadence="${num(s.cadence)}"` : '';
    switch (s.kind) {
      case 'warmup': tag = 'Warmup'; a = `${d} PowerLow="${num(s.start)}" PowerHigh="${num(s.end)}"`; break;
      case 'cooldown': tag = 'Cooldown'; a = `${d} PowerLow="${num(s.start)}" PowerHigh="${num(s.end)}"`; break;
      case 'ramp': tag = 'Ramp'; a = `${d} PowerLow="${num(s.start)}" PowerHigh="${num(s.end)}"`; break;
      case 'free': tag = 'FreeRide'; a = d; break;
      case 'maxeffort': tag = 'MaxEffort'; a = d; break;
      default:
        tag = 'SteadyState';
        a = s.start === s.end ? `${d} Power="${num(s.start)}"` : `${d} PowerLow="${num(s.start)}" PowerHigh="${num(s.end)}"`;
    }
    if (events[i].length === 0) {
      lines.push(`    <${tag} ${a}${cad} />`);
    } else {
      lines.push(`    <${tag} ${a}${cad}>`);
      for (const e of events[i]) lines.push(`      ${e}`);
      lines.push(`    </${tag}>`);
    }
  });
  lines.push('  </workout>');
  lines.push('</workout_file>');
  return lines.join('\n') + '\n';
}
