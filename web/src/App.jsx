import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import Sidebar from './components/Sidebar.jsx';
import EndpointView from './components/EndpointView.jsx';
import NewEndpointDialog from './components/NewEndpointDialog.jsx';

const POLL_MS = 2500;

export default function App() {
  const [endpoints, setEndpoints] = useState([]);
  const [stats, setStats] = useState({ endpoints: 0, requests: 0, forwarded: 0 });
  const [selectedId, setSelectedId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const selected = useMemo(
    () => endpoints.find((e) => e.id === selectedId) || null,
    [endpoints, selectedId],
  );

  const refreshEndpoints = useCallback(async () => {
    try {
      const [list, st] = await Promise.all([api.listEndpoints(), api.stats()]);
      setEndpoints(list);
      setStats(st);
      setSelectedId((prev) => (list.some((e) => e.id === prev) ? prev : list[0]?.id ?? null));
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    refreshEndpoints();
    const timer = setInterval(refreshEndpoints, POLL_MS);
    return () => clearInterval(timer);
  }, [refreshEndpoints]);

  const loadRequests = useCallback(async (endpointId) => {
    if (!endpointId) {
      setRequests([]);
      return;
    }
    try {
      setRequests(await api.listRequests(endpointId));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadRequests(selectedId);
    if (!selectedId) return undefined;
    const timer = setInterval(() => loadRequests(selectedId), POLL_MS);
    return () => clearInterval(timer);
  }, [selectedId, loadRequests]);

  // Keep a request selected, and drop the selection when its endpoint changes.
  useEffect(() => {
    setSelectedRequestId((prev) => {
      if (prev && requests.some((r) => r.id === prev)) return prev;
      return requests[0]?.id ?? null;
    });
  }, [requests]);

  useEffect(() => {
    if (!selectedRequestId) {
      setDetail(null);
      return undefined;
    }
    let alive = true;
    const load = () =>
      api
        .getRequest(selectedRequestId)
        .then((d) => alive && setDetail(d))
        .catch(() => {});
    load();
    const timer = setInterval(load, POLL_MS + 500);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [selectedRequestId]);

  async function handleCreate(payload) {
    const created = await api.createEndpoint(payload);
    setShowNew(false);
    await refreshEndpoints();
    setSelectedId(created.id);
  }

  async function handleUpdate(id, payload) {
    await api.updateEndpoint(id, payload);
    await refreshEndpoints();
  }

  async function handleDeleteEndpoint(id) {
    await api.deleteEndpoint(id);
    setSelectedId(null);
    setSelectedRequestId(null);
    await refreshEndpoints();
  }

  async function handleDeleteRequest(id) {
    await api.deleteRequest(id);
    await loadRequests(selectedId);
  }

  async function handleReplay(id, targetUrl) {
    return api.replay(id, targetUrl);
  }

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="topbar__menu"
          aria-label="Open endpoints menu"
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>
        <span className="topbar__title">{selected ? selected.name : 'Webhook Kitchen'}</span>
      </header>

      {sidebarOpen && <div className="scrim" onClick={() => setSidebarOpen(false)} />}

      <Sidebar
        endpoints={endpoints}
        stats={stats}
        selectedId={selectedId}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelect={(id) => {
          setSelectedId(id);
          setSelectedRequestId(null);
          setSidebarOpen(false);
        }}
        onNew={() => {
          setShowNew(true);
          setSidebarOpen(false);
        }}
      />

      <main className="main">
        {error && (
          <div className="banner banner--error">
            {error}
            <button className="link" onClick={() => setError(null)}>
              dismiss
            </button>
          </div>
        )}

        {selected ? (
          <EndpointView
            endpoint={selected}
            requests={requests}
            selectedRequestId={selectedRequestId}
            detail={detail}
            onSelectRequest={setSelectedRequestId}
            onDeleteRequest={handleDeleteRequest}
            onReplay={handleReplay}
            onUpdate={handleUpdate}
            onDelete={handleDeleteEndpoint}
          />
        ) : (
          <EmptyState onNew={() => setShowNew(true)} />
        )}
      </main>

      {showNew && <NewEndpointDialog onCancel={() => setShowNew(false)} onCreate={handleCreate} />}
    </div>
  );
}

function EmptyState({ onNew }) {
  return (
    <div className="empty">
      <div className="empty__art">🪝</div>
      <h2>No endpoints yet</h2>
      <p>
        Create a webhook endpoint, point any service at its URL, and watch the requests land here in
        real time. Inspect, replay, or forward them on.
      </p>
      <button className="btn btn--primary" onClick={onNew}>
        Create your first endpoint
      </button>
    </div>
  );
}
