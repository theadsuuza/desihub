import { Router } from 'express';
import express from 'express';
import { db } from './db.js';
import { deliver } from './forwarder.js';

export const hook = Router();

// Capture the raw body for every webhook so nothing is lost or re-encoded.
const rawBody = express.raw({ type: () => true, limit: '10mb' });

const insertRequest = db.prepare(`
  INSERT INTO requests
    (endpoint_id, kind, method, path, query, headers, body, content_type, size, received_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const updateForward = db.prepare(`
  UPDATE requests
     SET forward_url = ?, forward_status = ?, forward_duration_ms = ?,
         forward_error = ?, forward_response = ?
   WHERE id = ?
`);

hook.all('/:slug', rawBody, (req, res) => {
  const endpoint = db.prepare('SELECT * FROM endpoints WHERE slug = ?').get(req.params.slug);
  if (!endpoint) {
    return res.status(404).json({ error: 'Unknown webhook endpoint' });
  }

  let bodyBuffer;
  if (Buffer.isBuffer(req.body)) {
    bodyBuffer = req.body;
  } else if (req.body && Object.keys(req.body).length > 0) {
    bodyBuffer = Buffer.from(JSON.stringify(req.body));
  } else {
    bodyBuffer = Buffer.alloc(0);
  }

  const [path, query = ''] = req.originalUrl.split('?');
  const info = insertRequest.run(
    endpoint.id,
    'incoming',
    req.method,
    path,
    query,
    JSON.stringify(req.headers),
    bodyBuffer.toString('utf8'),
    req.headers['content-type'] || null,
    bodyBuffer.length,
    new Date().toISOString(),
  );

  const requestId = info.lastInsertRowid;
  res.status(202).json({ ok: true, id: requestId, endpoint: endpoint.name });

  if (endpoint.forward_enabled && endpoint.forward_url) {
    deliver(endpoint.forward_url, req.method, req.headers, bodyBuffer)
      .then((result) => {
        updateForward.run(
          endpoint.forward_url,
          result.status,
          result.durationMs,
          result.error,
          result.responseBody,
          requestId,
        );
      })
      .catch((err) => {
        updateForward.run(endpoint.forward_url, null, null, String(err), null, requestId);
      });
  }
});
