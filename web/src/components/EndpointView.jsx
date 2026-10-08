import { useEffect, useState } from 'react';
import RequestList from './RequestList.jsx';
import RequestDetail from './RequestDetail.jsx';

export default function EndpointView({
  endpoint,
  requests,
  selectedRequestId,
  detail,
  onSelectRequest,
  onDeleteRequest,
  onReplay,
  onUpdate,
  onDelete,
}) {
  const [copied, setCopied] = useState(false);
  const [forwardUrl, setForwardUrl] = useState(endpoint.forward_url || '');
  const [forwardEnabled, setForwardEnabled] = useState(endpoint.forward_enabled);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setForwardUrl(endpoint.forward_url || '');
    setForwardEnabled(endpoint.forward_enabled);
  }, [endpoint.id, endpoint.forward_url, endpoint.forward_enabled]);

  const webhookUrl = `${window.location.origin}/hook/${endpoint.slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function saveForward() {
    setSaving(true);
    try {
      await onUpdate(endpoint.id, { forwardUrl, forwardEnabled });
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setSending(true);
    try {
      await fetch(`/hook/${endpoint.slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test.delivery',
          message: 'Hello from the Webhook Kitchen',
          sentAt: new Date().toISOString(),
        }),
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="endpoint">
      <header className="endpoint__header">
        <div>
          <h1>{endpoint.name}</h1>
          <div className="endpoint__slug">
            <code>/{endpoint.slug}</code>
          </div>
        </div>
        <div className="endpoint__actions">
          <button className="btn" onClick={sendTest} disabled={sending}>
            {sending ? 'Sending…' : 'Send test webhook'}
          </button>
          <button
            className="btn btn--danger-ghost"
            onClick={() => {
              if (confirm(`Delete "${endpoint.name}" and all its requests?`)) onDelete(endpoint.id);
            }}
          >
            Delete
          </button>
        </div>
      </header>

      <section className="panel">
        <label className="panel__label">Webhook URL</label>
        <div className="copy-row">
          <input readOnly value={webhookUrl} onFocus={(e) => e.target.select()} />
          <button className="btn btn--primary" onClick={copy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="hint">
          Send any HTTP request here — every header, body and query string is captured.
        </p>
      </section>

      <section className="panel">
        <label className="panel__label">
          <input
            type="checkbox"
            checked={forwardEnabled}
            onChange={(e) => setForwardEnabled(e.target.checked)}
          />{' '}
          Forward incoming requests to a target URL
        </label>
        <div className="copy-row">
          <input
            placeholder="https://your-app.example.com/webhooks/receive"
            value={forwardUrl}
            onChange={(e) => setForwardUrl(e.target.value)}
          />
          <button className="btn" onClick={saveForward} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </section>

      <div className="split">
        <RequestList
          requests={requests}
          selectedRequestId={selectedRequestId}
          onSelect={onSelectRequest}
        />
        <RequestDetail
          detail={detail}
          endpoint={endpoint}
          onDelete={onDeleteRequest}
          onReplay={onReplay}
        />
      </div>
    </div>
  );
}
