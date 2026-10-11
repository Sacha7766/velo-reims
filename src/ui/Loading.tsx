import type { LoadProgress } from '../engine/Engine.ts';
import { Contours } from './Contours.tsx';
import { useCanvas } from './hooks.ts';
import { drawProfile, type ProfileData } from './profile.ts';

export function Loading({ name, profile, progress }: { name: string; profile: ProfileData | null; progress: LoadProgress | null }) {
  const f = progress?.fraction ?? 0;
  const ref = useCanvas((c) => profile && drawProfile(c, profile, { minSpan: 300, bins: 60 }), [profile]);
  return (
    <div className="loading">
      <Contours />
      <div className="loading-inner">
        <h1 className="l-name">{name}</h1>
        <div className="l-profile" style={{ clipPath: `inset(0 ${100 - f * 100}% 0 0)` }}>
          <canvas ref={ref} />
        </div>
        <div className="l-ghost-profile">
          <canvas ref={useCanvas((c) => profile && drawProfile(c, profile, { minSpan: 300, bins: 60, stroke: 'rgba(238,243,244,0.25)' }), [profile])} />
        </div>
        <p className="l-stage">
          {progress?.stage ?? 'Preparing'} <span className="muted">{progress?.detail ?? ''}</span>
        </p>
      </div>
    </div>
  );
}
