import { useEffect, useState } from 'react';
import { formatBytes, methodClass, prettyBody, statusClass } from '../format.js';

const TABS = ['Body', 'Headers', 'Query', 'Forward'];

export default function RequestDetail({ detail, endpoint, onDelete, onReplay }) {
  const [tab, setTab] = useState('Body');
  const [targetUrl, setTargetUrl] = useState('');
  const [replaying, setReplaying] = useState(false);
  const [replayResult, setReplayResult] = useState(null);

  useEffect(() => {
    setReplayResult(null);
    setTargetUrl(endpoint?.forward_url || '');
  }, [detail?.id, endpoint?.forward_url]);

  if (!detail) {
    return (
      <div className="detail detail--empty">
        <div className="detail__placeholder">Select a request to inspect it.</div>
      </div>
    );
  }

  const headers = detail.headers || {};
  const headerEntries = Object.entries(headers);

  async function runReplay() {
    setReplaying(true);
    setReplayResult(null);
    try {
      const res = await onReplay(detail.id, targetUrl || undefined);
      setReplayResult({ ok: true, ...res });
    } catch (err) {
      setReplayResult({ ok: false, error: err.message });
    } finally {
      setReplaying(false);
    }
  }

  return (
    <div className="detail">
      <div className="detail__head">
        <div>
          <div className="detail__title">
            <span className={methodClass(detail.method)}>{detail.method}</span>
            <span className="detail__path">{detail.path}</span>
          </div>
          <div className="detail__sub">
            #{detail.id} · {formatBytes(detail.size)} · {new Date(detail.received_at).toLocaleString()}
            {detail.kind === 'replay' && ' · replayed'}
          </div>
        </div>
        <button
          className="btn btn--danger-ghost btn--sm"
          onClick={() => onDelete(detail.id)}
        >
          Delete
        </button>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? 'is-active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
            {t === 'Headers' && <span className="pill pill--sm">{headerEntries.length}</span>}
          </button>
        ))}
      </div>

      <div className="detail__body">
        {tab === 'Body' && (
          <pre className="code">{prettyBody(detail.body, detail.content_type) || '(empty body)'}</pre>
        )}

        {tab === 'Headers' && (
          <table className="kv">
            <tbody>
              {headerEntries.map(([k, v]) => (
                <tr key={k}>
                  <td className="kv__key">{k}</td>
                  <td className="kv__val">{Array.isArray(v) ? v.join(', ') : String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'Query' && (
          <pre className="code">{detail.query ? detail.query : '(no query string)'}</pre>
        )}

        {tab === 'Forward' && (
          <div className="forward-panel">
            <label className="panel__label">Replay this request to</label>
            <div className="copy-row">
              <input
                placeholder="https://target.example.com/hook"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
              />
              <button className="btn btn--primary" onClick={runReplay} disabled={replaying}>
                {replaying ? 'Sending…' : 'Replay'}
              </button>
            </div>

            {replayResult && replayResult.ok && (
              <div className="result">
                <div className="result__line">
                  Sent to <code>{replayResult.target}</code> —{' '}
                  <span className={statusClass(replayResult.result.status)}>
                    {replayResult.result.status ?? 'no response'}
                  </span>{' '}
                  in {replayResult.result.durationMs}ms
                </div>
                {replayResult.result.error && (
                  <div className="result__error">{replayResult.result.error}</div>
                )}
                {replayResult.result.responseBody && (
                  <pre className="code">{replayResult.result.responseBody}</pre>
                )}
              </div>
            )}
            {replayResult && !replayResult.ok && (
              <div className="banner banner--error">{replayResult.error}</div>
            )}

            {detail.forward_url && (
              <div className="forward-log">
                <div className="panel__label">Last automatic forward</div>
                <div className="result__line">
                  <code>{detail.forward_url}</code> —{' '}
                  <span className={statusClass(detail.forward_status)}>
                    {detail.forward_status ?? 'failed'}
                  </span>
                  {detail.forward_duration_ms != null && ` in ${detail.forward_duration_ms}ms`}
                </div>
                {detail.forward_error && <div className="result__error">{detail.forward_error}</div>}
                {detail.forward_response && <pre className="code">{detail.forward_response}</pre>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
