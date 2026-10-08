import { timeAgo } from '../format.js';

export default function Sidebar({
  endpoints,
  stats,
  selectedId,
  isOpen,
  onSelect,
  onNew,
  onClose,
}) {
  return (
    <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
      <div className="sidebar__top">
        <div className="brand">
          <span className="brand__mark">🪝</span>
          <div>
            <div className="brand__name">DesiHub</div>
            <div className="brand__sub">Webhook Kitchen</div>
          </div>
        </div>
        <button className="sidebar__close" aria-label="Close menu" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="stats">
        <Stat label="Endpoints" value={stats.endpoints} />
        <Stat label="Requests" value={stats.requests} />
        <Stat label="Forwarded" value={stats.forwarded} />
      </div>

      <div className="sidebar__head">
        <span>Endpoints</span>
        <button className="btn btn--ghost btn--sm" onClick={onNew}>
          + New
        </button>
      </div>

      <nav className="endpoint-list">
        {endpoints.length === 0 && <div className="endpoint-list__empty">Nothing here yet</div>}
        {endpoints.map((ep) => (
          <button
            key={ep.id}
            className={`endpoint-item ${ep.id === selectedId ? 'is-active' : ''}`}
            onClick={() => onSelect(ep.id)}
          >
            <div className="endpoint-item__row">
              <span className="endpoint-item__name">{ep.name}</span>
              <span className="pill">{ep.request_count}</span>
            </div>
            <div className="endpoint-item__meta">
              <code>/{ep.slug}</code>
              <span>{ep.last_request_at ? timeAgo(ep.last_request_at) : 'no traffic'}</span>
            </div>
          </button>
        ))}
      </nav>
    </aside>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="stat__value">{value}</div>
      <div className="stat__label">{label}</div>
    </div>
  );
}
