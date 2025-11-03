# InformData Connect API – TypeScript SDK & Webhook Orchestration Guide

This guide explains how to integrate with InformData’s Connect API using the provided TypeScript SDK (v0.9.2 tarball) and how to orchestrate asynchronous workflows that rely on multiple webhook notifications.

## Environments & Authentication

| Environment | Base URL |
|-------------|----------|
| Sandbox     | `https://sandbox.api.sjvassoc.com/clients/` |
| Production  | `https://api.sjvassoc.com/clients/` |

All requests must include a bearer token (`Authorization: Bearer <JWT>`). Tokens are issued per environment. Rate limiting blocks IPs that exceed roughly 5,000 requests per five‑minute window.

## Installing & Configuring the TypeScript SDK

1. Install the SDK tarball locally (replace with the published package name when available):
   ```bash
   npm install ./typescript-sdk-prod-v0.9.2.tar
   ```
2. Create a configuration instance with your token provider and base URL:
   ```ts
   import {
     createConfiguration,
     configureAuthMethods,
     OrdersApi,
     WebhooksApi,
     WebhookEventType,
   } from '@informdata/connect';

   const configuration = createConfiguration({
     baseServer: { url: 'https://sandbox.api.sjvassoc.com/clients', description: 'Sandbox' },
     authMethods: configureAuthMethods({
       'JWT-Authentication': {
         tokenProvider: async () => process.env.INFORMDATA_JWT!,
       },
     }),
   });

   const ordersApi = new OrdersApi(configuration);
   const webhooksApi = new WebhooksApi(configuration);
   ```
3. Wrap SDK calls in a retry helper for transient `5xx` or `429` responses. Respect the published rate limits.

## Placing Orders (Async by Design)

Order POSTs queue work and return immediately with an order identifier. Example payload (see detailed samples under `API Documentation 6/Requests/Requests/*`):

```jsonc
{
  "order": {
    "clientOrderId": "123456789",
    "subject": {
      "firstName": "ROBERT",
      "lastName": "DUMMYDATA",
      "birthdate": "2000-01-01"
    },
    "product": {
      "category": "CRIMINAL",
      "felonyYears": 7,
      "misdemeanorYears": 7,
      "trafficLevel": "NO_TRAFFIC"
    },
    "jurisdiction": {
      "county": "Cobb",
      "state": "GA",
      "country": "United States"
    }
  }
}
```

Persist the returned `order.id`; webhook notifications reference it.

## Webhook Subscription Lifecycle

Create webhook subscriptions with the SDK:

```ts
await webhooksApi.webhooksPost({
  webhookSubscription: {
    postUrl: 'https://webhooks.vuplicity.com/informdata',
    isActive: true,
    events: new Set([
      WebhookEventType.OrderStatusChange,
      WebhookEventType.NeedInfo,
      WebhookEventType.CallLogAdded,
      WebhookEventType.JxRequirementChange,
    ]),
  },
});
```

Supported events:

| Event | Fires when |
|-------|------------|
| `ORDER_STATUS_CHANGE` | Status/substatus changes (e.g., `PENDING/IN_PROGRESS → COMPLETE/RECORD`). |
| `NEED_INFO` | Additional information or documents are required before fulfillment resumes. |
| `CALL_LOG_ADDED` | InformData adds a call log or note to the order. |
| `JX_REQUIREMENT_CHANGE` | Jurisdiction requirements (forms, fees) change for the order. |

Subscriptions are environment-scoped and return a `webhookId` for updates or removal.

## Webhook Payload Shape & Idempotency

Webhook POST bodies mirror `OrdersApi.ordersIdGet` responses. Example (truncated criminal result):

```jsonc
{
  "order": {
    "id": "c0b46a4f-664a-ed11-aa48-a86cee4fab91",
    "status": "COMPLETE",
    "substatus": "RECORD",
    "orderDate": "2022-10-12T15:44:41.187",
    "jurisdiction": { "county": "Cobb", "state": "GA" },
    "activity": [
      { "addedDate": "2022-10-21T16:20:11.377", "note": "Additional Research Required" },
      { "addedDate": "2022-10-20T12:06:08.517", "note": "Assigned to Researcher" }
    ],
    "documents": [
      { "name": "Disposition.pdf", "sequenceNumber": 1 }
    ]
  }
}
```

Best practices:

- Use `order.id` + event type + any `sequenceNumber` as an idempotency key.
- Respond with HTTP 200 as soon as the payload is persisted or queued.
- Protect endpoints with allowlists or shared secrets (InformData does not sign hook deliveries today).

## Ordering & Concurrency Strategy

1. Queue every event in a durable queue (SQS/PubSub/RabbitMQ).
2. Partition workers by `order.id` so events for the same order run sequentially.
3. Sequence by `order.activity[*].addedDate` and `documents[*].sequenceNumber` to replay timelines deterministically.
4. Persist the last known `status/substatus`; reject regressions unless reopening is supported.
5. Treat `NEED_INFO` as blocking—resume automation only after you submit the requested data and receive a new `ORDER_STATUS_CHANGE`.
6. When `CALL_LOG_ADDED` fires, fetch fresh order details to capture referenced attachments or notes.

## Updating Orders & Supporting Actions

- `ordersIdPatch` – update subject data or resolve Need Info.
- `ordersIdDocumentsPost` – upload supporting documentation.
- `ordersIdRecurringDelete` – unenroll monitoring orders (MedEx, Booking, Risk Monitoring).

## Error Handling Cheat Sheet

| Status | Meaning | Action |
|--------|---------|--------|
| 400    | Validation failure. | Correct payload; retry. |
| 401    | Missing/expired JWT. | Refresh token. |
| 403    | Rate limit triggered. | Back off exponentially. |
| 404    | Order/webhook not found. | Confirm environment and ids. |
| 409    | Order locked or queued. | Wait for next webhook, then retry. |
| 5xx    | InformData service fault. | Retry with capped exponential backoff (1s → 2s → 4s, max 5 attempts). |

InformData retries webhook deliveries automatically—do not retry outbound API calls synchronously inside the webhook handler.

## Reference Payloads

- `Requests/Requests/Criminal/Criminal.json`
- `Responses/Responses/Criminal/Criminal Response.json`
- `Responses/Responses/Other/Clearance Check Response.json`
- `Responses/Responses/Verification/*.json`

## Next Enhancements

- Publish JSON schemas to validate webhook payloads.
- Automate npm publishing for the SDK package.
- Request signed webhook support (HMAC) from InformData and verify when available.
