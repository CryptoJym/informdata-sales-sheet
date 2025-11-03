# InformData Webhook Replay Demo

This lightweight CLI replays recorded InformData webhook payloads (newline-delimited JSON) against any HTTP endpoint. Use it to validate state machines locally, reproduce customer escalations, or load-test the multi-order orchestrator.

## Quick start

```bash
pnpm install
pnpm ts-node src/replay.ts --input samples/criminal.ndjson --target http://localhost:8787/informdata-hook
```

Flags:

| Flag | Required | Description |
|------|----------|-------------|
| `--input` | ✅ | Path to an NDJSON file containing one webhook payload per line. |
| `--target` | ✅ | HTTP URL to receive the replayed events. |
| `--delay` | ❌ | Minimum delay (ms) between events. Default: `250`. |
| `--once`  | ❌ | If set, replay the file a single time (default loops twice to surface idempotency issues). |

## Input format

Each line must be a complete JSON payload exactly as InformData delivered it. The provided `samples/criminal.ndjson` file includes a condensed order journey:

1. `ORDER_STATUS_CHANGE` (pending → in progress)
2. `NEED_INFO`
3. `ORDER_STATUS_CHANGE` (in progress → complete/record)
4. `CALL_LOG_ADDED`

## Safety tips

- Point the CLI at your sandbox ingestion service, never production.
- The replay honours the order of events in the file. Sort by the `receivedAt` timestamp inside your archive before exporting to NDJSON.
- The tool logs HTTP status codes and timing to stdout; redirect to a file if you need a full audit trail.

Feel free to duplicate the project per customer or extend it with additional scripting (e.g., random jitter, Graphite metrics).
