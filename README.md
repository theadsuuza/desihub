# DesiHub · Webhook Kitchen 🪝

A tiny self-hosted tool to **receive, inspect, replay and forward webhooks** — think
"webhook.site, but yours". Create an endpoint, point any service at its URL, and every
request that lands is captured with its full headers, body and query string.

## Features

- **Capture everything** — method, path, query string, headers, raw body and byte size.
- **Live inbox** — the request list refreshes automatically as traffic arrives.
- **Inspect** — pretty-printed JSON bodies, a full header table and the raw query string.
- **Replay** — re-send any captured request to the same or a different URL.
- **Forward** — optionally relay every incoming webhook to a target URL and record the
  downstream status, latency and response body.
- **Zero external services** — SQLite for storage, no account, no cloud.

## Stack

| Layer    | Tech                                   |
| -------- | -------------------------------------- |
| Frontend | React + Vite (dev server on port 3000) |
| Backend  | Node.js + Express                      |
| Storage  | SQLite (better-sqlite3)                |

The Vite dev server proxies `/api` and `/hook` to the API, so everything is served from a
single origin on port 3000.

### Local development without Docker

```bash
# API
cd server && npm install && npm run dev        # http://localhost:8000

# Web (in another shell)
cd web && npm install && npm run dev           # http://localhost:3000
```

The web dev server proxies to `http://localhost:8000` by default; override with
`VITE_API_PROXY_TARGET`.

## API

| Method | Path                          | Purpose                                   |
| ------ | ----------------------------- | ----------------------------------------- |
| GET    | `/api/stats`                  | Counts for endpoints / requests / forwards |
| GET    | `/api/endpoints`              | List endpoints                            |
| POST   | `/api/endpoints`              | Create an endpoint                        |
| PATCH  | `/api/endpoints/:id`          | Rename / configure forwarding             |
| DELETE | `/api/endpoints/:id`          | Delete an endpoint and its requests       |
| GET    | `/api/endpoints/:id/requests` | List captured requests                    |
| GET    | `/api/requests/:id`           | Full request detail                       |
| DELETE | `/api/requests/:id`           | Delete one request                        |
| POST   | `/api/requests/:id/replay`    | Replay a request (`{ targetUrl }`)        |
| ANY    | `/hook/:slug`                 | Webhook receiver                          |

## Send a test webhook

```bash
curl -X POST http://localhost:3000/hook/<slug> \
  -H 'Content-Type: application/json' \
  -d '{"event":"hello","ok":true}'
```

## License

MIT
