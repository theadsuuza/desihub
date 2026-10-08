import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from './db.js';
import { deliver } from './forwarder.js';

export const api = Router();

function newSlug() {
  return crypto.randomBytes(4).toString('hex');
}

function shapeEndpoint(row) {
  if (!row) return row;
  return { ...row, forward_enabled: !!row.forward_enabled };
}

function normalizeUrl(value) {
  if (value === undefined) return undefined;
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const url = new URL(raw); // throws on invalid input
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('URL must start with http:// or https://');
  }
  return url.toString();
}

function parseEndpointId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

api.get('/stats', (_req, res) => {
  const endpoints = db.prepare('SELECT COUNT(*) AS c FROM endpoints').get().c;
  const requests = db.prepare('SELECT COUNT(*) AS c FROM requests').get().c;
  const forwarded = db
    .prepare("SELECT COUNT(*) AS c FROM requests WHERE kind = 'incoming' AND forward_status IS NOT NULL")
    .get().c;
  res.json({ endpoints, requests, forwarded });
});

api.get('/endpoints', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT e.*,
        (SELECT COUNT(*) FROM requests r WHERE r.endpoint_id = e.id) AS request_count,
        (SELECT MAX(received_at) FROM requests r WHERE r.endpoint_id = e.id) AS last_request_at
      FROM endpoints e
      ORDER BY e.created_at DESC
    `)
    .all();
  res.json(rows.map(shapeEndpoint));
});

api.post('/endpoints', (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  if (!name) return res.status(400).json({ error: 'A name is required' });

  let forwardUrl;
  try {
    forwardUrl = normalizeUrl(req.body?.forwardUrl) ?? null;
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  let slug = newSlug();
  while (db.prepare('SELECT 1 FROM endpoints WHERE slug = ?').get(slug)) slug = newSlug();

  const info = db
    .prepare('INSERT INTO endpoints (slug, name, forward_url, forward_enabled, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(slug, name, forwardUrl, req.body?.forwardEnabled ? 1 : 0, new Date().toISOString());

  const row = db.prepare('SELECT * FROM endpoints WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(shapeEndpoint(row));
});

api.get('/endpoints/:id', (req, res) => {
  const id = parseEndpointId(req.params.id);
  const row = id ? db.prepare('SELECT * FROM endpoints WHERE id = ?').get(id) : null;
  if (!row) return res.status(404).json({ error: 'Endpoint not found' });
  res.json(shapeEndpoint(row));
});

api.patch('/endpoints/:id', (req, res) => {
  const id = parseEndpointId(req.params.id);
  const row = id ? db.prepare('SELECT * FROM endpoints WHERE id = ?').get(id) : null;
  if (!row) return res.status(404).json({ error: 'Endpoint not found' });

  const updates = [];
  const values = [];

  if (req.body?.name !== undefined) {
    const name = String(req.body.name).trim();
    if (!name) return res.status(400).json({ error: 'A name is required' });
    updates.push('name = ?');
    values.push(name);
  }

  if (req.body?.forwardUrl !== undefined) {
    let forwardUrl;
    try {
      forwardUrl = normalizeUrl(req.body.forwardUrl);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    updates.push('forward_url = ?');
    values.push(forwardUrl);
  }

  if (req.body?.forwardEnabled !== undefined) {
    updates.push('forward_enabled = ?');
    values.push(req.body.forwardEnabled ? 1 : 0);
  }

  if (updates.length) {
    values.push(id);
    db.prepare(`UPDATE endpoints SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  res.json(shapeEndpoint(db.prepare('SELECT * FROM endpoints WHERE id = ?').get(id)));
});

api.delete('/endpoints/:id', (req, res) => {
  const id = parseEndpointId(req.params.id);
  const info = id ? db.prepare('DELETE FROM endpoints WHERE id = ?').run(id) : { changes: 0 };
  if (!info.changes) return res.status(404).json({ error: 'Endpoint not found' });
  res.status(204).end();
});

api.get('/endpoints/:id/requests', (req, res) => {
  const id = parseEndpointId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid endpoint id' });
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const rows = db
    .prepare(`
      SELECT id, endpoint_id, kind, method, path, query, content_type, size,
             received_at, replayed_from, forward_status, forward_error
      FROM requests
      WHERE endpoint_id = ?
      ORDER BY id DESC
      LIMIT ?
    `)
    .all(id, limit);
  res.json(rows);
});

api.get('/requests/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = Number.isInteger(id) ? db.prepare('SELECT * FROM requests WHERE id = ?').get(id) : null;
  if (!row) return res.status(404).json({ error: 'Request not found' });
  let headers = {};
  try {
    headers = JSON.parse(row.headers || '{}');
  } catch {
    headers = {};
  }
  res.json({ ...row, headers });
});

api.delete('/requests/:id', (req, res) => {
  const id = Number(req.params.id);
  const info = Number.isInteger(id) ? db.prepare('DELETE FROM requests WHERE id = ?').run(id) : { changes: 0 };
  if (!info.changes) return res.status(404).json({ error: 'Request not found' });
  res.status(204).end();
});

api.post('/requests/:id/replay', async (req, res) => {
  const id = Number(req.params.id);
  const source = Number.isInteger(id) ? db.prepare('SELECT * FROM requests WHERE id = ?').get(id) : null;
  if (!source) return res.status(404).json({ error: 'Request not found' });

  const endpoint = db.prepare('SELECT * FROM endpoints WHERE id = ?').get(source.endpoint_id);

  let target;
  try {
    target = normalizeUrl(req.body?.targetUrl) || endpoint?.forward_url || null;
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  if (!target) {
    return res.status(400).json({ error: 'No target URL — provide one or set a forward URL on the endpoint.' });
  }

  const headers = JSON.parse(source.headers || '{}');
  const body = source.body ? Buffer.from(source.body, 'utf8') : undefined;
  const result = await deliver(target, source.method, headers, body);

  const info = db
    .prepare(`
      INSERT INTO requests
        (endpoint_id, kind, method, path, query, headers, body, content_type, size,
         received_at, replayed_from, forward_url, forward_status, forward_duration_ms,
         forward_error, forward_response)
      VALUES (?, 'replay', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      source.endpoint_id,
      source.method,
      source.path,
      source.query,
      source.headers,
      source.body,
      source.content_type,
      source.size,
      new Date().toISOString(),
      source.id,
      target,
      result.status,
      result.durationMs,
      result.error,
      result.responseBody,
    );

  res.json({ ok: true, requestId: info.lastInsertRowid, target, result });
});
