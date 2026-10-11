import { useEffect, useRef, useState } from 'react';
import { hub } from '../devices/index.ts';
import { Engine, type LoadProgress } from '../engine/Engine.ts';
import type { CameraMode } from '../engine/CameraRig.ts';
import { RideAudio } from '../audio/RideAudio.ts';
import { sourcesFor } from '../geo/imagery.ts';
import { prefetchRoute } from '../geo/prefetch.ts';
import { withLeadIn } from '../geo/leadIn.ts';
import { buildRoute, findHairpins, type RouteData } from '../geo/route.ts';
import { findSegments, stravaToSegments, type Segment } from '../sim/segments.ts';
import { fetchStravaSegments, getStravaStatus } from '../sim/stravaApi.ts';
import { RideSession } from '../sim/session.ts';
import { rideStats } from '../sim/stats.ts';
import { bestRideFor, deleteRide, getRide, listCustomRoutes, listRides, loadSettings, saveRide, saveSettings, type AppSettings } from '../sim/storage.ts';
import type { RideRecord } from '../sim/types.ts';
import { clearUnfinished, loadUnfinished, saveUnfinished, type UnfinishedRide } from '../sim/unfinished.ts';
import { LIBRARY } from '../workouts/index.ts';
import { fmtTime } from './format.ts';
import { Home, type HomeTab, type StartRequest } from './Home.tsx';
import { needsPick, takeOpenSettings } from '../sim/profiles.ts';
import { Hud } from './Hud.tsx';
import { useBattery } from './hooks.ts';
import { Loading } from './Loading.tsx';
import { profileFromCoords, type ProfileData } from './profile.ts';
import { Summary, type SummaryData } from './Summary.tsx';

type Screen = 'home' | 'loading' | 'ride' | 'summary' | 'detail';

interface Ride {
  session: RideSession;
  hairpins: number[];
  ghostLabel: string | null;
  /** The ride so far, to keep in case the page goes away before it ends. */
  unfinished: () => UnfinishedRide;
}

/** Started by a test URL (?ride=…): no unload prompt and no unfinished-ride card. */
const TEST_START = new URLSearchParams(location.search).has('ride');

function stoppedAt(t: number): string {
  const d = new Date(t);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString() ? time : `${d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })} ${time}`;
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [settings, setSettingsState] = useState<AppSettings>(loadSettings);
  const [screen, setScreen] = useState<Screen>('home');
  const [homeTab, setHomeTab] = useState<HomeTab>(() => (takeOpenSettings() ? 'settings' : 'ride'));
  const [loadInfo, setLoadInfo] = useState<{ name: string; profile: ProfileData | null }>({ name: '', profile: null });
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [ride, setRide] = useState<Ride | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [unfinished, setUnfinished] = useState<UnfinishedRide | null>(null);
  const battery = useBattery();
  const onBattery = !!battery && !battery.charging;
  const lastStart = useRef<StartRequest | null>(null);
  const prefetchAbort = useRef<AbortController | null>(null);
  const [audio] = useState(() => new RideAudio());
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const e = new Engine(canvasRef.current!, settingsRef.current.quality);
    e.paused = true;
    setEngine(e);
    (window as unknown as { engine: Engine }).engine = e;
    // ?nobt=1: never touch Bluetooth on start (someone else is on the trainer). With several riders the
    // devices of whoever is picked reconnect after "Who's riding?" (Home), not the last rider's.
    if (!new URLSearchParams(location.search).has('nobt') && !needsPick()) void hub.reconnectKnown();
    return () => e.dispose();
  }, []);

  // back from the Strava authorisation: /?strava=connected|denied|error|unconfigured
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const result = q.get('strava');
    if (!result) return;
    q.delete('strava');
    history.replaceState(null, '', `${location.pathname}${q.size ? `?${q}` : ''}`);
    setHomeTab('settings');
    if (result === 'connected') {
      void getStravaStatus(true);
      setNotice('Strava connected. Segments on preset routes will show up.');
    } else setError(result === 'denied' ? 'Strava access was not granted.' : 'Could not connect to Strava. Check the Client ID and secret under Settings.');
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    engine?.setQuality(settings.quality);
  }, [engine, settings.quality]);

  useEffect(() => {
    engine?.setFrameCap(settings.frameRate);
    engine?.setBatterySaver(settings.batterySaver && onBattery);
  }, [engine, settings.frameRate, settings.batterySaver, onBattery]);

  // a ride that never reached "End ride" (battery, crash, reload): Home offers to carry on, save or discard it
  useEffect(() => {
    if (screen !== 'home' || TEST_START) return;
    void loadUnfinished().then((u) => {
      if (u && u.record.samples.length < 30) void clearUnfinished();
      else setUnfinished(u);
    });
  }, [screen]);

  // kept every 5 s and when the page is hidden, so a dead battery or a reload loses seconds, not the ride
  useEffect(() => {
    if (!ride) return;
    const save = () => {
      const { status } = ride.session.state;
      if (status === 'riding' || status === 'paused') void saveUnfinished(ride.unfinished());
    };
    const timer = setInterval(save, 5000);
    const hidden = () => document.visibilityState === 'hidden' && save();
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', save);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', save);
    };
  }, [ride]);

  // nobody touches the keyboard for an hour on a trainer: keep the display awake while riding, and ask before
  // the page goes away (Vite's client reloads it when it reconnects after the Mac slept)
  useEffect(() => {
    if (screen !== 'ride') return;
    let lock: WakeLockSentinel | null = null;
    let done = false;
    const acquire = () => {
      if (document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (done) void l.release();
          else lock = l;
        })
        .catch(() => undefined);
    };
    const guard = (e: BeforeUnloadEvent) => e.preventDefault();
    acquire();
    document.addEventListener('visibilitychange', acquire);
    if (!TEST_START) window.addEventListener('beforeunload', guard);
    return () => {
      done = true;
      document.removeEventListener('visibilitychange', acquire);
      window.removeEventListener('beforeunload', guard);
      void lock?.release();
    };
  }, [screen]);

  useEffect(() => {
    audio.setVolume(settings.volume);
    audio.setMuted(settings.volume <= 0.001);
  }, [audio, settings.volume]);

  // browsers only allow audio after a gesture
  useEffect(() => {
    const unlock = () => void audio.resume();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [audio]);

  const updateSettings = (s: AppSettings) => {
    setSettingsState(s);
    saveSettings(s);
  };

  /** Save a ride to history (under 30 s it is dropped) and forget its unfinished copy. */
  const storeRide = async (rec: RideRecord, summitTime: number | null): Promise<SummaryData> => {
    const stats = rideStats(rec.samples, rec.ftp);
    const prev = await bestRideFor(rec.routeId, !!rec.leadIn);
    if (rec.samples.length >= 30) {
      await saveRide(rec, {
        id: rec.id,
        name: rec.name,
        routeId: rec.routeId,
        workoutId: rec.workoutId,
        workoutName: rec.workoutName,
        start: rec.start,
        duration: stats.duration,
        distance: stats.distance,
        gain: stats.ascent,
        avgPower: stats.avgPower,
        np: stats.np,
        tss: stats.tss,
        summitTime,
        kj: stats.kj,
        avgHr: stats.avgHr,
        bestEfforts: stats.bestEfforts,
        segments: rec.segments,
        leadIn: rec.leadIn,
      });
    }
    await clearUnfinished();
    setUnfinished(null);
    return { record: rec, stats, summitTime, previousBest: prev?.summary.summitTime ?? null };
  };

  /**
   * Load the world and start a ride. `opts` is for test starts (?ride=…) and for carrying on an unfinished
   * ride; both say whether to ride the lead-in instead of following the setting.
   */
  const start = async (req: StartRequest, opts?: { at?: number; cam?: CameraMode; go?: boolean; leadIn?: boolean; resume?: UnfinishedRide }) => {
    if (!engine) return;
    const cfg = settingsRef.current;
    lastStart.current = req;
    // a new ride from Home keeps an unfinished one in history rather than overwriting it
    if (!opts) {
      const pending = await loadUnfinished();
      if (pending) await storeRide(pending.record, pending.summitTime);
    }
    const resume = opts?.resume;
    // test starts (?ride=…&at=…) keep the route's own distances unless they ask for the lead-in
    const data = (opts ? opts.leadIn : cfg.leadIn) ? withLeadIn(req.route) : req.route;
    setError(null);
    setProgress(null);
    setLoadInfo({ name: req.route.name, profile: profileFromCoords(data.coords) });
    setScreen('loading');
    try {
      const route = await buildRoute(data);
      // Strava segments for preset routes: fetched while the world loads, never waited on for more than 4 s
      const shift = (g: Segment): Segment => ({ ...g, start: g.start + route.leadInShift, end: g.end + route.leadInShift });
      const stravaSegs: Promise<Segment[]> =
        req.route.source === 'brouter'
          ? Promise.race([
              fetchStravaSegments(route.id).then((l) => stravaToSegments(l).map(shift).filter((g) => g.start >= route.leadIn)),
              new Promise<Segment[]>((r) => setTimeout(() => r([]), 4000)),
            ]).catch(() => [])
          : Promise.resolve([]);
      engine.setTime(cfg.time);
      engine.paused = false;
      engine.riderS = resume?.snapshot.st.s ?? opts?.at ?? 0;
      engine.setCameraMode('cinematic');
      const halfWidth = route.category === 'city' ? 4.2 : route.category === 'flat' ? 3.2 : 3.1;
      await engine.loadWorld(route, { kit: cfg.kit, accent: cfg.accent, bike: cfg.bike }, setProgress, halfWidth);
      const best = cfg.ghost ? await bestRideFor(route.id, route.leadIn > 0) : null;
      const history = await listRides();
      const segmentBests: Record<string, number> = {};
      for (const r of history) {
        if (r.routeId !== route.id) continue;
        for (const e of r.segments ?? []) segmentBests[e.id] = Math.min(segmentBests[e.id] ?? Infinity, e.time);
      }
      const segments = [...findSegments(route), ...(await stravaSegs)].sort((a, b) => a.start - b.start);
      const stravaOnly = segments.filter((g) => g.strava);
      const pacerSeg =
        (cfg.stravaKom || cfg.stravaPr) && stravaOnly.length
          ? (stravaOnly.find((g) => g.strava!.id === cfg.stravaPacerSegment) ?? stravaOnly.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a)))
          : null;
      prefetchAbort.current?.abort();
      prefetchAbort.current = new AbortController();
      const p0 = route;
      void prefetchRoute(p0, { sources: sourcesFor(p0.lon[0], p0.lat[0]), signal: prefetchAbort.current.signal, concurrency: 4 }).catch(() => undefined);
      const session = new RideSession(
        {
          route,
          workout: req.workout,
          settings: {
            ftp: cfg.ftp, weight: cfg.weight, bikeWeight: cfg.bikeWeight, difficulty: cfg.difficulty,
            drivetrain: cfg.drivetrain, customDrivetrain: cfg.customDrivetrain,
          },
          ghost: best?.ride ?? null,
          erg: cfg.erg,
          holdWatts: req.workout ? null : req.holdWatts,
          gears: cfg.gears,
          segments,
          segmentBests,
          bots: cfg.bots,
          pacers: pacerSeg ? { segmentId: pacerSeg.id, kom: cfg.stravaKom, pr: cfg.stravaPr } : undefined,
        },
        hub,
      );
      // user pacers first, then the segment ghosts with their own name tags
      engine.setBots(
        session.state.bots.map((b) => b.wkg),
        session.state.bots.map((b) => b.label),
      );
      if (resume) session.resume(resume.snapshot);
      else if (opts?.at) session.jump(opts.at);
      (window as unknown as { __session: RideSession }).__session = session;
      let pedal = 0;
      let envT = 0;
      let env: ReturnType<typeof engine.environment> = { forest: 0, urban: 0, sea: 0, biome: 'alpine' };
      session.onEvent((e) => {
        if (e === 'summit') audio.summit();
        else if (e === 'segment-start') audio.segmentStart();
        else if (e === 'segment-pr') audio.segmentEnd(true);
        else if (e === 'segment-end') audio.segmentEnd(false);
        else if (e === 'lap' || e === 'ramp-done') audio.segmentEnd(true);
      });
      engine.setOnFrame((dt) => {
        if (session.state.status === 'ready') {
          pedal = (hub.metrics.power ?? 0) > 40 ? pedal + dt : 0;
          if (pedal > 1.2) {
            session.begin();
            if (engine.rig.mode === 'cinematic') engine.setCameraMode('chase');
          }
        }
        session.tick(dt);
        const st = session.state;
        engine.riderS = st.s;
        engine.riderDir = st.dir;
        engine.riderSpeed = st.speed;
        engine.riderCadence = st.status === 'riding' ? st.cadence : 0;
        engine.riderEffort = st.power3s / cfg.ftp;
        engine.ghostS = st.ghostS;
        engine.ghostDir = st.ghostDir;
        engine.bots = st.bots;
        envT += dt;
        if (envT > 1) {
          envT = 0;
          env = engine.environment();
        }
        audio.update(dt, {
          speed: st.status === 'riding' ? st.speed : 0,
          power: st.power,
          cadence: st.cadence,
          grade: st.grade,
          altitude: st.ele,
          forest: env.forest,
          urban: env.urban,
          sea: env.sea,
          biome: env.biome,
          descending: st.grade < -2,
        });
      });
      if (opts?.go) {
        session.begin();
        engine.setCameraMode(opts.cam ?? 'chase');
      }
      const leadIn = route.leadIn > 0;
      setRide({
        session,
        hairpins: findHairpins(route),
        ghostLabel: best?.summary.summitTime ? `best ${fmtTime(best.summary.summitTime)}` : null,
        unfinished: () => ({
          req, leadIn, snapshot: session.snapshot(), record: session.record(), summitTime: session.summitTime, savedAt: Date.now(),
        }),
      });
      setScreen('ride');
      (window as unknown as { __ready: boolean }).__ready = true;
    } catch (e) {
      console.error(e);
      engine.unloadWorld();
      engine.paused = true;
      setError(`Could not load ${req.route.name}: ${(e as Error).message}`);
      setScreen('home');
    }
  };

  const end = async () => {
    if (!ride || !engine) return;
    const rec = ride.session.finish();
    engine.setOnFrame(undefined);
    setSummary(await storeRide(rec, ride.session.summitTime));
    prefetchAbort.current?.abort();
    audio.update(0.1, { speed: 0, power: 0, cadence: 0, grade: 0, altitude: 0, forest: 0, urban: 0, sea: 0, biome: 'alpine', descending: false });
    engine.unloadWorld();
    engine.paused = true;
    setRide(null);
    setScreen('summary');
  };

  const routeDataFor = async (routeId: string): Promise<RouteData | null> => {
    const custom = (await listCustomRoutes()).find((r) => r.id === routeId);
    if (custom) return custom;
    try {
      const res = await fetch(`/routes/${routeId}.json`);
      if (res.ok && res.headers.get('content-type')?.includes('json')) return { ...(await res.json()), source: 'brouter' };
    } catch {
      /* unknown route */
    }
    return null;
  };

  const openRide = async (id: string) => {
    const record = await getRide(id);
    if (!record) return;
    const mine = (await listRides()).find((r) => r.id === id);
    const others = (await listRides()).filter((r) => r.routeId === record.routeId && r.id !== id && r.summitTime !== null && !!r.leadIn === !!mine?.leadIn);
    const prevBest = others.length ? Math.min(...others.map((r) => r.summitTime!)) : null;
    setSummary({ record, stats: rideStats(record.samples, record.ftp), summitTime: mine?.summitTime ?? null, previousBest: prevBest });
    setScreen('detail');
  };

  // ?ride=<preset>&sim=1&workout=<id>&at=<m>&cam=<mode>&time=<id>&leadin=1 — direct start for testing
  useEffect(() => {
    if (!engine) return;
    const q = new URLSearchParams(location.search);
    const id = q.get('ride');
    if (!id) return;
    if (q.get('sim')) {
      hub.setSimulator(true);
      hub.simulator.setEffort(Number(q.get('watts') ?? 230));
      if (q.get('rpm')) hub.simulator.setCadence?.(Number(q.get('rpm')));
    }
    if (q.get('time')) settingsRef.current = { ...settingsRef.current, time: q.get('time')! };
    if (q.get('bots')) settingsRef.current = { ...settingsRef.current, bots: q.get('bots')!.split(',').map(Number) };
    void (async () => {
      const data = (await (await fetch(`/routes/${id}.json`)).json()) as RouteData;
      const workout = LIBRARY.find((w) => w.id === q.get('workout')) ?? null;
      await start(
        { route: { ...data, source: 'brouter' }, workout, holdWatts: q.get('hold') ? Number(q.get('hold')) : null },
        { at: Number(q.get('at') ?? 0), cam: (q.get('cam') as CameraMode) ?? 'chase', go: q.get('go') !== '0', leadIn: q.get('leadin') === '1' },
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  const unfinishedCard = unfinished && (
    <div className="unfinished" role="region" aria-label="Unfinished ride">
      <div>
        <b>Your last ride didn't finish</b>
        <span>
          {unfinished.record.name}, {fmtTime(unfinished.snapshot.st.elapsed)}, {(unfinished.snapshot.st.distance / 1000).toFixed(1)} km
          and {Math.round(unfinished.snapshot.st.gain)} m up. Stopped at {stoppedAt(unfinished.savedAt)}.
        </span>
      </div>
      <button className="btn" onClick={() => void start(unfinished.req, { leadIn: unfinished.leadIn, resume: unfinished })}>
        Carry on
      </button>
      <button
        className="btn ghost"
        onClick={async () => {
          lastStart.current = unfinished.req;
          setSummary(await storeRide(unfinished.record, unfinished.summitTime));
          setScreen('summary');
        }}
      >
        Save ride
      </button>
      <button
        className="btn ghost"
        onClick={() => {
          if (!confirm('Throw this ride away? It will not be saved.')) return;
          void clearUnfinished();
          setUnfinished(null);
        }}
      >
        Discard
      </button>
    </div>
  );

  return (
    <div className={`app screen-${screen}`}>
      <canvas ref={canvasRef} className="scene" />
      {screen === 'home' && (
        <>
          <Home
            settings={settings}
            onSettings={updateSettings}
            onStart={(r) => void start(r)}
            tab={homeTab}
            onTab={setHomeTab}
            onOpenRide={(id) => void openRide(id)}
            notice={unfinishedCard}
          />
          {error && (
            <div className="toast error" role="alert" onClick={() => setError(null)}>
              {error}
            </div>
          )}
          {!error && notice && (
            <div className="toast" role="status" onClick={() => setNotice(null)}>
              {notice}
            </div>
          )}
        </>
      )}
      {screen === 'loading' && <Loading name={loadInfo.name} profile={loadInfo.profile} progress={progress} />}
      {screen === 'ride' && ride && engine && (
        <Hud
          session={ride.session}
          engine={engine}
          audio={audio}
          settings={settings}
          hairpins={ride.hairpins}
          ghostLabel={ride.ghostLabel}
          onEnd={() => void end()}
        />
      )}
      {screen === 'summary' && summary && (
        <Summary
          data={summary}
          backLabel="Back to climbs"
          weight={settings.weight}
          onApplyFtp={(ftp) => updateSettings({ ...settingsRef.current, ftp })}
          onBack={() => setScreen('home')}
          onAgain={() => lastStart.current && void start(lastStart.current)}
        />
      )}
      {screen === 'detail' && summary && (
        <Summary
          data={summary}
          backLabel="Back to history"
          onBack={() => {
            setHomeTab('history');
            setScreen('home');
          }}
          onAgain={async () => {
            const route = await routeDataFor(summary.record.routeId);
            if (route) void start({ route, workout: null, holdWatts: null });
          }}
          onDelete={async () => {
            await deleteRide(summary.record.id);
            setHomeTab('history');
            setScreen('home');
          }}
        />
      )}
    </div>
  );
}
