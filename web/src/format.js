export function timeAgo(iso) {
  if (!iso) return '—';
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatBytes(n) {
  if (!n) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function prettyBody(body, contentType) {
  if (!body) return '';
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('json')) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  return body;
}

export function methodClass(method) {
  return `method method--${String(method || 'get').toLowerCase()}`;
}

export function statusClass(status) {
  if (status == null) return 'status status--none';
  if (status >= 200 && status < 300) return 'status status--ok';
  if (status >= 300 && status < 400) return 'status status--warn';
  return 'status status--err';
}
