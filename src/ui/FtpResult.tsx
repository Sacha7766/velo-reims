import { useState } from 'react';

/** Ramp-test outcome for the ride summary: new FTP, change against the old one, one button to adopt it. */
export function FtpResult({ newFtp, oldFtp, weight, onApply }: { newFtp: number; oldFtp: number; weight?: number; onApply: () => void }) {
  const [saved, setSaved] = useState(false);
  const delta = newFtp - oldFtp;
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  return (
    <div className="ftp-result">
      <div className="ftp-main">
        <span className="ftp-label">Estimated FTP</span>
        <span className="ftp-value">
          {newFtp}
          <small> W</small>
        </span>
      </div>
      <div className="ftp-facts">
        <span className={`ftp-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>
          {delta === 0 ? 'Unchanged' : `${sign}${Math.abs(delta)} W`} <span className="muted">from {oldFtp} W</span>
        </span>
        {weight !== undefined && weight > 0 && <span className="muted">{(newFtp / weight).toFixed(2)} W/kg</span>}
      </div>
      <button
        className="btn"
        disabled={saved}
        onClick={() => {
          onApply();
          setSaved(true);
        }}
      >
        {saved ? 'Saved' : `Use ${newFtp} W as my FTP`}
      </button>
    </div>
  );
}
