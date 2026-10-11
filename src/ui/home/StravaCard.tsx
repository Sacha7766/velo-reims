import { useEffect, useState } from 'react';
import { getStravaStatus, saveStravaConfig, stravaConnectUrl, type StravaStatus } from '../../sim/stravaApi.ts';

export function StravaCard() {
  const [status, setStatus] = useState<StravaStatus | null | undefined>(undefined);
  const [clientId, setClientId] = useState('');
  const [secret, setSecret] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getStravaStatus(true).then((s) => {
      setStatus(s);
      if (s?.clientId) setClientId(s.clientId);
    });
  }, []);

  const save = async () => {
    setBusy(true);
    const err = await saveStravaConfig(clientId.trim(), secret.trim());
    setMsg(err ?? 'Saved. Now connect your Strava account.');
    if (!err) {
      setSecret('');
      setStatus(await getStravaStatus(true));
    }
    setBusy(false);
  };

  return (
    <section className="strava-card">
      <h2>Strava</h2>
      <p className="muted small">
        Race the KOM and your PR on preset routes, with segment data from Strava. Uses your own API application, stored only on this computer.
      </p>
      {status === null ? (
        <p className="muted small">Needs the local server (npm start). Not available here.</p>
      ) : (
        <>
          <ol className="muted small strava-steps">
            <li>
              Create an API application at{' '}
              <a href="https://www.strava.com/settings/api" target="_blank" rel="noreferrer">
                strava.com/settings/api
              </a>{' '}
              with Authorization Callback Domain <b>localhost</b>.
            </li>
            <li>Paste its Client ID and Client Secret below and save.</li>
            <li>Connect and approve access.</li>
          </ol>
          <div className="fields strava-fields">
            <label className="text-field">
              <span>Client ID</span>
              <input value={clientId} inputMode="numeric" autoComplete="off" onChange={(e) => setClientId(e.target.value)} />
            </label>
            <label className="text-field">
              <span>Client Secret</span>
              <input
                type="password"
                value={secret}
                autoComplete="off"
                placeholder={status?.configured ? 'saved, leave empty to keep' : ''}
                onChange={(e) => setSecret(e.target.value)}
              />
            </label>
          </div>
          <div className="row">
            <button className="btn ghost small" disabled={busy || !clientId.trim() || (!secret.trim() && !status?.configured)} onClick={() => void save()}>
              Save
            </button>
            {status?.configured && (
              <a className="btn small" href={stravaConnectUrl()}>
                {status.connected ? 'Reconnect' : 'Connect to Strava'}
              </a>
            )}
          </div>
          <p className="muted small" role="status">
            {msg ?? (status?.connected ? `Connected${status.athlete ? ` as ${status.athlete}` : ''}.` : status?.configured ? 'Not connected yet.' : 'Not set up.')}
          </p>
        </>
      )}
    </section>
  );
}
