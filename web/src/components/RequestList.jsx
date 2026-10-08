import { formatBytes, methodClass, statusClass, timeAgo } from '../format.js';

export default function RequestList({ requests, selectedRequestId, onSelect }) {
  return (
    <div className="request-list">
      <div className="request-list__head">
        <span>Requests</span>
        <span className="pill">{requests.length}</span>
      </div>
      <div className="request-list__scroll">
        {requests.length === 0 && (
          <div className="request-list__empty">Waiting for the first request…</div>
        )}
        {requests.map((r) => (
          <button
            key={r.id}
            className={`request-item ${r.id === selectedRequestId ? 'is-active' : ''}`}
            onClick={() => onSelect(r.id)}
          >
            <div className="request-item__top">
              <span className={methodClass(r.method)}>{r.method}</span>
              {r.kind === 'replay' && <span className="tag">replay</span>}
              {r.forward_status != null && (
                <span className={statusClass(r.forward_status)}>→ {r.forward_status}</span>
              )}
              {r.forward_error && <span className="status status--err">→ failed</span>}
            </div>
            <div className="request-item__path">{r.path}</div>
            <div className="request-item__meta">
              <span>{timeAgo(r.received_at)}</span>
              <span>{formatBytes(r.size)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
