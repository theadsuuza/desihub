const base = '/api';

async function request(path, options) {
  const res = await fetch(base + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  stats: () => request('/stats'),
  listEndpoints: () => request('/endpoints'),
  createEndpoint: (payload) => request('/endpoints', { method: 'POST', body: JSON.stringify(payload) }),
  updateEndpoint: (id, payload) =>
    request(`/endpoints/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteEndpoint: (id) => request(`/endpoints/${id}`, { method: 'DELETE' }),
  listRequests: (id, limit = 100) => request(`/endpoints/${id}/requests?limit=${limit}`),
  getRequest: (id) => request(`/requests/${id}`),
  deleteRequest: (id) => request(`/requests/${id}`, { method: 'DELETE' }),
  replay: (id, targetUrl) =>
    request(`/requests/${id}/replay`, { method: 'POST', body: JSON.stringify({ targetUrl }) }),
};
