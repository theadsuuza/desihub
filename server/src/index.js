import express from 'express';
import { api } from './api.js';
import { hook } from './hook.js';

const app = express();
const PORT = Number(process.env.PORT) || 8000;

app.disable('x-powered-by');

// JSON body parsing only for the management API — the webhook receiver
// needs the untouched raw body, which it parses itself.
app.use('/api', express.json({ limit: '2mb' }), api);
app.use('/hook', hook);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[desihub] Webhook Kitchen API listening on http://0.0.0.0:${PORT}`);
});
