import { useState } from 'react';

export default function NewEndpointDialog({ onCancel, onCreate }) {
  const [name, setName] = useState('');
  const [forwardUrl, setForwardUrl] = useState('');
  const [forwardEnabled, setForwardEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onCreate({ name, forwardUrl, forwardEnabled });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>New endpoint</h2>
        <p className="hint">Each endpoint gets its own URL that captures everything sent to it.</p>

        <label className="field">
          <span>Name</span>
          <input
            autoFocus
            placeholder="e.g. Stripe payments"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Forward URL (optional)</span>
          <input
            placeholder="https://your-app.example.com/webhooks/receive"
            value={forwardUrl}
            onChange={(e) => setForwardUrl(e.target.value)}
          />
        </label>

        <label className="field field--inline">
          <input
            type="checkbox"
            checked={forwardEnabled}
            onChange={(e) => setForwardEnabled(e.target.checked)}
          />
          <span>Forward incoming requests automatically</span>
        </label>

        {error && <div className="banner banner--error">{error}</div>}

        <div className="modal__actions">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy || !name.trim()}>
            {busy ? 'Creating…' : 'Create endpoint'}
          </button>
        </div>
      </form>
    </div>
  );
}
