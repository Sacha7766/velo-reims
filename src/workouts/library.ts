import type { Workout, WorkoutCategory, WorkoutMessage, WorkoutStep } from './types.ts';
import { buildWorkout } from './metrics.ts';

type Say = [offsetSeconds: number, text: string];
interface Seg {
  steps: WorkoutStep[];
  say: Say[];
}

const MIN = 60;

function seg(steps: WorkoutStep | WorkoutStep[], ...say: Say[]): Seg {
  return { steps: Array.isArray(steps) ? steps : [steps], say };
}

function warm(min: number, lo: number, hi: number, ...say: Say[]): Seg {
  return seg({ kind: 'warmup', duration: min * MIN, start: lo, end: hi }, ...say);
}

function cool(min: number, hi: number, lo: number, ...say: Say[]): Seg {
  return seg({ kind: 'cooldown', duration: min * MIN, start: hi, end: lo }, ...say);
}

function hold(min: number, p: number, cadence?: number, label?: string, ...say: Say[]): Seg {
  const s: WorkoutStep = { kind: 'steady', duration: min * MIN, start: p, end: p };
  if (cadence !== undefined) s.cadence = cadence;
  if (label) s.label = label;
  return seg(s, ...say);
}

function ramp(min: number, a: number, b: number, label?: string, ...say: Say[]): Seg {
  const s: WorkoutStep = { kind: 'ramp', duration: min * MIN, start: a, end: b };
  if (label) s.label = label;
  return seg(s, ...say);
}

/** Alternating on/off steps (seconds); the final recovery is omitted unless trailing is true. */
function reps(n: number, onSec: number, onP: number, offSec: number, offP: number, opts: { cadence?: number; trailing?: boolean; say?: Say[] } = {}): Seg {
  const steps: WorkoutStep[] = [];
  for (let i = 0; i < n; i++) {
    const on: WorkoutStep = { kind: 'on', duration: onSec, start: onP, end: onP, label: `Rep ${i + 1}/${n}` };
    if (opts.cadence !== undefined) on.cadence = opts.cadence;
    steps.push(on);
    if (i < n - 1 || opts.trailing) steps.push({ kind: 'off', duration: offSec, start: offP, end: offP, label: 'Recover' });
  }
  return { steps, say: opts.say ?? [] };
}

function rest(min: number, p = 0.55, ...say: Say[]): Seg {
  return seg({ kind: 'off', duration: min * MIN, start: p, end: p, label: 'Recover' }, ...say);
}

function make(id: string, name: string, category: WorkoutCategory, description: string, segs: Seg[]): Workout {
  const steps: WorkoutStep[] = [];
  const messages: WorkoutMessage[] = [];
  let t = 0;
  for (const s of segs) {
    for (const [off, text] of s.say) messages.push({ at: t + off, text });
    for (const st of s.steps) {
      steps.push(st);
      t += st.duration;
    }
  }
  messages.sort((a, b) => a.at - b.at);
  return buildWorkout({ id, name, description, author: 'Serpentine', category, steps, messages, source: 'builtin' });
}

export const LIBRARY: Workout[] = [
  make('easy-spin', 'Easy Spin', 'recovery',
    'A genuinely easy 45 minutes to flush the legs between hard days. Keep it conversational and resist the urge to push.', [
      warm(5, 0.45, 0.55, [10, 'Welcome. Today is about freshness, not fitness.']),
      hold(35, 0.5, 90, undefined,
        [30, 'Light pedal pressure. Imagine pedalling on eggshells.'],
        [15 * MIN, 'Halfway. If your heart rate is climbing, ease off further.'],
        [30 * MIN, 'Nearly there. Shoulders loose, hands soft.']),
      cool(5, 0.55, 0.4, [5, 'Spin it out. Great restraint today.']),
    ]),

  make('endurance-base', 'Endurance Base', 'endurance',
    'Ninety minutes of steady Zone 2 in three blocks, the bread and butter of aerobic development. Stay smooth and stay patient.', [
      warm(10, 0.45, 0.65, [10, 'Ease in. Zone 2 is a long game.']),
      hold(22, 0.65, 90, undefined,
        [20, 'Settle into a rhythm around 90 rpm.'],
        [11 * MIN, 'Breathe through your nose if you can. That is the right effort.']),
      rest(2, 0.55, [5, 'Short breather. Sip some water.']),
      hold(22, 0.67, 90, undefined, [20, 'Block two. Same effort, same smoothness.']),
      rest(2, 0.55),
      hold(22, 0.65, 90, undefined,
        [20, 'Final block. Keep the form tidy as the fatigue builds.'],
        [18 * MIN, 'Four minutes to go. Finish it as well as you started.']),
      cool(10, 0.6, 0.4, [10, 'Base miles banked. Spin down gently.']),
    ]),

  make('tempo-trio', 'Tempo Trio', 'tempo',
    'Three 12-minute tempo blocks at 78 % FTP with short recoveries. Firm but sustainable, it builds aerobic strength.', [
      warm(10, 0.45, 0.7, [10, 'Warm up well. Tempo asks for a bit of respect.']),
      hold(12, 0.78, 90, 'Tempo 1/3', [5, 'Tempo 1 of 3. Find a rhythm you could hold for hours.'], [10 * MIN, 'Two minutes to go.']),
      rest(4, 0.5, [5, 'Easy now. Drink and shake out the arms.']),
      hold(12, 0.78, 90, 'Tempo 2/3', [5, 'Tempo 2. Keep the power flat, no surging.']),
      rest(4, 0.5),
      hold(12, 0.8, 90, 'Tempo 3/3', [5, 'Last one, a touch higher. Strong and steady.'], [10 * MIN, 'Finish clean.']),
      cool(8, 0.6, 0.4, [5, 'Well ridden. Cool it down.']),
    ]),

  make('tempo-long', 'Tempo Long Haul', 'tempo',
    'Two 25-minute tempo efforts at 80 % FTP. Mental toughness and muscular endurance in one session.', [
      warm(10, 0.45, 0.7, [10, 'Ease into it, the main set is long.']),
      hold(25, 0.8, 90, 'Tempo 1/2',
        [10, 'Long block ahead. Settle in and be patient.'],
        [12 * MIN, 'Halfway. Check your posture and relax your grip.'],
        [22 * MIN, 'Three minutes. Hold form.']),
      rest(5, 0.5, [5, 'Recover fully. Fuel and fluids.']),
      hold(25, 0.8, 90, 'Tempo 2/2',
        [10, 'Second block. Same power, stronger mind.'],
        [12 * MIN, 'Halfway again. You are doing the work that counts.'],
        [22 * MIN, 'Almost there. Finish strong.']),
      cool(10, 0.6, 0.4, [5, 'Brilliant. Easy spin to finish.']),
    ]),

  make('sweet-spot-3x12', 'Sweet Spot 3x12', 'sweetspot',
    'Three 12-minute efforts at 90 % FTP. The classic time-efficient session for raising your threshold.', [
      warm(10, 0.45, 0.75, [10, 'Warm up and get the legs ready for work.']),
      hold(12, 0.9, 90, 'Sweet Spot 1/3', [5, 'Sweet spot. Hard but controlled. 1 of 3.'], [9 * MIN, 'Three minutes to go. Stay tall.']),
      rest(5, 0.55, [5, 'Recover. Spin easy.']),
      hold(12, 0.9, 90, 'Sweet Spot 2/3', [5, 'Second one. Hold the same power.'], [9 * MIN, 'Three minutes. Dig in.']),
      rest(5, 0.55),
      hold(12, 0.91, 90, 'Sweet Spot 3/3', [5, 'Last interval. Make it your best.'], [9 * MIN, 'Three minutes. Everything you have, but smooth.']),
      cool(8, 0.6, 0.4, [5, 'Great session. Cool down.']),
    ]),

  make('sweet-spot-2x20', 'Sweet Spot 2x20', 'sweetspot',
    'Two 20-minute sweet spot blocks at 88 to 92 % FTP. A staple for building sustained power.', [
      warm(10, 0.45, 0.75, [10, 'Warm up. Today is two big blocks.']),
      seg([
        { kind: 'steady', duration: 10 * MIN, start: 0.88, end: 0.88, label: 'Sweet Spot 1/2' },
        { kind: 'steady', duration: 10 * MIN, start: 0.9, end: 0.9, label: 'Sweet Spot 1/2' },
      ], [5, 'Block one. Start at 88 % and resist going harder.'], [10 * MIN, 'Halfway. Bump it to 90 %.'], [17 * MIN, 'Three minutes. Stay composed.']),
      rest(8, 0.55, [5, 'Recover well. Eat and drink.']),
      seg([
        { kind: 'steady', duration: 10 * MIN, start: 0.9, end: 0.9, label: 'Sweet Spot 2/2' },
        { kind: 'steady', duration: 10 * MIN, start: 0.92, end: 0.92, label: 'Sweet Spot 2/2' },
      ], [5, 'Block two, a hair higher.'], [10 * MIN, 'Halfway. Up to 92 %.'], [17 * MIN, 'Final three minutes. Finish strong.']),
      cool(10, 0.6, 0.4, [5, 'That is how you build an engine. Spin down.']),
    ]),

  make('sweet-spot-ladder', 'Sweet Spot Ladder', 'sweetspot',
    'Ascending sweet spot efforts of 10, 15 and 20 minutes. The blocks get longer as your legs get tired.', [
      warm(10, 0.45, 0.75, [10, 'Warm up. The efforts get longer today.']),
      hold(10, 0.88, 90, 'Sweet Spot 10 min', [5, 'Ladder step one: ten minutes.']),
      rest(4, 0.55),
      hold(15, 0.9, 90, 'Sweet Spot 15 min', [5, 'Step two: fifteen minutes. Same smooth power.'], [12 * MIN, 'Three to go.']),
      rest(4, 0.55),
      hold(20, 0.9, 90, 'Sweet Spot 20 min', [5, 'The top rung. Twenty minutes.'], [10 * MIN, 'Halfway up the top step.'], [17 * MIN, 'Last three. Empty the tank evenly.']),
      cool(6, 0.6, 0.4, [5, 'Superb. Easy now.']),
    ]),

  make('threshold-2x20', 'Threshold 2x20', 'threshold',
    'Two 20-minute efforts just under FTP. The benchmark workout for raising your sustainable power.', [
      warm(12, 0.45, 0.75, [10, 'A thorough warm-up matters for this one.']),
      seg([
        { kind: 'steady', duration: 60, start: 1.0, end: 1.0, label: 'Opener' },
        { kind: 'steady', duration: 60, start: 0.5, end: 0.5, label: 'Opener rest' },
      ], [0, 'Short opener to wake the legs.']),
      hold(20, 0.98, 90, 'Threshold 1/2',
        [10, 'Threshold. Controlled discomfort. Settle in.'],
        [10 * MIN, 'Halfway. Do not fade.'],
        [17 * MIN, 'Three minutes. Hold your nerve.']),
      rest(10, 0.5, [5, 'Full recovery. Spin easy and breathe.']),
      hold(20, 0.98, 90, 'Threshold 2/2',
        [10, 'Second effort. Same power.'],
        [10 * MIN, 'Halfway. Stay strong.'],
        [17 * MIN, 'Three minutes. Finish it.']),
      cool(9, 0.6, 0.4, [5, 'Superb effort. Cool down.']),
    ]),

  make('over-unders', 'Over-Unders', 'threshold',
    'Three sets of alternating 95 % and 105 % FTP to teach your body to clear lactate while riding hard.', [
      warm(12, 0.45, 0.75, [10, 'Warm up. Today we ride either side of threshold.']),
      ...[1, 2, 3].flatMap((set) => {
        const steps: WorkoutStep[] = [];
        for (let i = 0; i < 3; i++) {
          steps.push({ kind: 'on', duration: 3 * MIN, start: 0.95, end: 0.95, label: `Under ${set}.${i + 1}` });
          steps.push({ kind: 'on', duration: MIN, start: 1.05, end: 1.05, label: `Over ${set}.${i + 1}` });
        }
        const say: Say[] = set === 1
          ? [[5, 'Set 1. Three minutes under, one minute over.'], [3 * MIN, 'Over. Lift the power, hold your breathing.']]
          : set === 2 ? [[5, 'Set 2. Same pattern, stay disciplined.']] : [[5, 'Final set. Make the overs count.'], [9 * MIN, 'Last three minutes of the session.']];
        return set < 3 ? [seg(steps, ...say), rest(5, 0.5, [5, 'Recover completely.'])] : [seg(steps, ...say)];
      }),
      cool(10, 0.6, 0.4, [5, 'Over-unders done. Nicely managed.']),
    ]),

  make('threshold-4x8', 'Threshold 4x8', 'threshold',
    'Four 8-minute threshold intervals at 100 % FTP with 4-minute recoveries. Shorter pieces let you hold full quality.', [
      warm(10, 0.45, 0.75, [10, 'Warm up. Four rounds at threshold.']),
      reps(4, 8 * MIN, 1.0, 4 * MIN, 0.5, { cadence: 92, say: [
        [5, 'Rep 1. Settle at 100 %.'],
        [8 * MIN + 4 * MIN + 5, 'Rep 2. Stay smooth.'],
        [2 * (12 * MIN) + 5, 'Rep 3. Halfway there, keep your form.'],
        [3 * (12 * MIN) + 5, 'Last rep. Give it everything you have.'],
      ] }),
      cool(8, 0.6, 0.4, [5, 'Excellent work. Spin down.']),
    ]),

  make('vo2-5x4', 'VO2 Max 5x4', 'vo2max',
    'Five 4-minute efforts at 118 % FTP with equal recovery. The gold-standard session for raising your aerobic ceiling.', [
      warm(12, 0.45, 0.75, [10, 'Warm up. This session is hard but it is worth it.'], [8 * MIN, 'Pick up the cadence for the last minutes.']),
      reps(5, 4 * MIN, 1.18, 4 * MIN, 0.5, { cadence: 95, say: [
        [5, 'Interval 1. Go, but do not blow up in the first minute.'],
        [2 * MIN, 'Halfway through. Breathe.'],
        [8 * MIN + 5, 'Interval 2. Same power.'],
        [16 * MIN + 5, 'Interval 3. Dig deep. You are in the middle.'],
        [24 * MIN + 5, 'Interval 4. Only two to go.'],
        [32 * MIN + 5, 'Last one. Leave nothing in the legs.'],
        [32 * MIN + 3 * MIN, 'One minute left. Empty it.'],
      ] }),
      cool(10, 0.6, 0.4, [5, 'Done. Outstanding effort.']),
    ]),

  make('vo2-30-30', 'VO2 Max 30/30s', 'vo2max',
    'Three sets of ten 30-second efforts at 120 % FTP, alternating with 30 seconds easy. Lots of time near VO2 max with less suffering.', [
      warm(12, 0.45, 0.75, [10, 'Warm up. Short, sharp and repeated.']),
      reps(10, 30, 1.2, 30, 0.5, { cadence: 100, trailing: false, say: [[5, 'Set 1. 30 on, 30 off. Find the groove.'], [5 * MIN, 'Halfway through the set.']] }),
      rest(6, 0.5, [5, 'Recover. Spin and breathe.']),
      reps(10, 30, 1.2, 30, 0.5, { cadence: 100, say: [[5, 'Set 2. Same quality.'], [5 * MIN, 'Halfway.']] }),
      rest(6, 0.5),
      reps(10, 30, 1.2, 30, 0.5, { cadence: 100, say: [[5, 'Final set. Make every rep count.'], [8 * MIN, 'Two minutes left in the set.']] }),
      cool(10, 0.6, 0.4, [5, 'That is hard work done. Cool down.']),
    ]),

  make('vo2-40-20', 'VO2 Max 40/20s', 'vo2max',
    'Three sets of eight 40-second efforts at 118 % FTP with 20 seconds of recovery. Short rests keep your oxygen system pinned.', [
      warm(12, 0.45, 0.75, [10, 'Warm up. Efforts are short but the rest is shorter.']),
      reps(8, 40, 1.18, 20, 0.5, { cadence: 100, say: [[5, 'Set 1. 40 on, 20 off.'], [4 * MIN, 'Halfway.']] }),
      rest(5, 0.5, [5, 'Recover between sets.']),
      reps(8, 40, 1.18, 20, 0.5, { cadence: 100, say: [[5, 'Set 2. Hold the same power.']] }),
      rest(5, 0.5),
      reps(8, 40, 1.2, 20, 0.5, { cadence: 100, say: [[5, 'Last set. Finish strong.'], [6 * MIN, 'Two minutes left.']] }),
      cool(10, 0.6, 0.4, [5, 'Nicely done. Spin it out.']),
    ]),

  make('anaerobic-punch', 'Anaerobic Punch', 'anaerobic',
    'Eight 30-second sprints at 150 % FTP with long recoveries, finishing with an all-out effort. Builds punch for attacks and steep ramps.', [
      warm(12, 0.45, 0.75, [10, 'Warm up. Today is short, sharp and powerful.']),
      seg([
        { kind: 'on', duration: 20, start: 1.1, end: 1.1, label: 'Opener' },
        { kind: 'off', duration: 100, start: 0.5, end: 0.5, label: 'Opener rest' },
      ], [0, 'Quick opener to get the legs ready.']),
      seg((() => {
        const steps: WorkoutStep[] = [];
        for (let i = 0; i < 8; i++) {
          const last = i === 7;
          steps.push(last
            ? { kind: 'maxeffort', duration: 30, start: 1.2, end: 1.2, label: 'All out' }
            : { kind: 'on', duration: 30, start: 1.5, end: 1.5, cadence: 110, label: `Sprint ${i + 1}/8` });
          if (!last) steps.push({ kind: 'off', duration: 210, start: 0.45, end: 0.45, label: 'Recover' });
        }
        return steps;
      })(),
      [2, 'Sprint 1. Explode out of the saddle.'],
      [4 * MIN + 2, 'Sprint 2. Full power.'],
      [16 * MIN + 2, 'Sprint 5. Halfway. Stay sharp.'],
      [28 * MIN - 8, 'Last one is all out. Max effort, go!'],
      [28 * MIN + 12, 'Empty. Ease off.']),
      cool(8, 0.6, 0.4, [5, 'Powerful work. Cool down slowly.']),
    ]),

  make('alpine-repeats', 'Alpine Repeats', 'climbing',
    'Five 6-minute low-cadence strength intervals at 88 % FTP. Mimics a steep climb. Pair it with a mountain route.', [
      warm(12, 0.45, 0.75, [10, 'Warm up. We are practising hard climbs today.']),
      reps(5, 6 * MIN, 0.88, 4 * MIN, 0.55, { cadence: 67, say: [
        [5, 'Hill 1. Drop to 65 to 70 rpm and push through the pedals.'],
        [3 * MIN, 'Halfway up. Stay seated, core engaged.'],
        [10 * MIN + 5, 'Hill 2. Low cadence, steady torque.'],
        [20 * MIN + 5, 'Hill 3. The middle is the hardest part.'],
        [30 * MIN + 5, 'Hill 4. Almost there.'],
        [40 * MIN + 5, 'Final hill. Dig in, then it is done.'],
      ] }),
      cool(10, 0.6, 0.4, [5, 'Strong legs. Spin them out.']),
    ]),

  make('summit-push', 'Summit Push', 'climbing',
    'A progressive build that gets harder every ten minutes and ends with a hard final push to the top. Ideal for a long mountain climb.', [
      warm(12, 0.45, 0.7, [10, 'Warm up. We are climbing to the summit.']),
      hold(10, 0.75, 85, 'Lower slopes', [5, 'Lower slopes. Easy rhythm, save your matches.']),
      hold(10, 0.85, 85, 'Mid climb', [5, 'The gradient bites now. Keep the cadence steady.']),
      hold(10, 0.92, 85, 'Upper slopes', [5, 'Upper slopes. Everything is getting heavier.'], [8 * MIN, 'Two more minutes before the break.']),
      rest(3, 0.55, [5, 'Brief respite. Prepare for the final push.']),
      ramp(8, 1.0, 1.1, 'Final push', [5, 'The summit is in sight. Build the power.'], [4 * MIN, 'Halfway up the final ramp.'], [7 * MIN, 'One minute to the top. Everything you have.']),
      seg({ kind: 'maxeffort', duration: MIN, start: 1.2, end: 1.2, label: 'Sprint to the top' }, [0, 'Go! Sprint to the summit!']),
      cool(10, 0.6, 0.4, [5, 'You are on the summit. Enjoy the descent.']),
    ]),

  make('recovery-30', 'Recovery Spin 30', 'recovery',
    'Thirty minutes of very light spinning on a rest-adjacent day. Loosens the legs without adding any fatigue.', [
      warm(5, 0.4, 0.5, [10, 'Barely turning the pedals. That is the point.']),
      hold(20, 0.48, 90, undefined, [5 * MIN, 'Smooth circles, relaxed shoulders.'], [14 * MIN, 'Nearly done. Keep it effortless.']),
      cool(5, 0.5, 0.4, [5, 'Done. Fresh legs tomorrow.']),
    ]),

  make('endurance-60', 'Endurance 60', 'endurance',
    'One steady hour in Zone 2. A simple aerobic session that fits between harder days.', [
      warm(8, 0.45, 0.65, [10, 'Ease in. Zone 2 all the way today.']),
      hold(45, 0.66, 90, undefined, [10 * MIN, 'Steady and nose-breathing. If you cannot chat, back off.'], [28 * MIN, 'Halfway through the block. Stay relaxed.'], [40 * MIN, 'Last few minutes. Keep the cadence smooth.']),
      cool(7, 0.6, 0.4, [5, 'Spin it out. Good steady work.']),
    ]),

  make('endurance-2h', 'Endurance 2h', 'endurance',
    'Two hours of steady aerobic riding with a short tempo lift in the middle. The weekly long ride for base building.', [
      warm(10, 0.45, 0.65, [10, 'Long day. Start easy and eat early.']),
      hold(40, 0.65, 90, undefined, [20 * MIN, 'Settle in. Fuel every 20 minutes.']),
      hold(10, 0.78, 90, 'Tempo lift', [5, 'Short tempo lift. Firm but controlled.']),
      hold(45, 0.65, 90, undefined, [15 * MIN, 'Back to Zone 2. Keep eating and drinking.'], [35 * MIN, 'Stay tall on the bike. Check your posture.']),
      cool(15, 0.6, 0.4, [5, 'Two hours done. Spin down slowly.']),
    ]),

  make('climbing-tempo', 'Climbing Tempo', 'climbing',
    'Three 15-minute seated tempo climbs at 80 % FTP with a steady, slightly low cadence. Builds climbing endurance without much fatigue.', [
      warm(12, 0.45, 0.7, [10, 'Warm up. Three long, seated climbs today.']),
      reps(3, 15 * MIN, 0.8, 5 * MIN, 0.55, { cadence: 75, say: [
        [5, 'Climb 1. Seated, smooth torque, around 75 rpm.'],
        [7 * MIN, 'Halfway up. Relax your grip.'],
        [20 * MIN + 5, 'Climb 2. Same rhythm.'],
        [40 * MIN + 5, 'Last climb. Hold your form to the top.'],
      ] }),
      cool(10, 0.6, 0.4, [5, 'Good climbing. Spin out the legs.']),
    ]),
];
