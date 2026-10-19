# n8n-nodes-sendio

The official n8n community node for [send.io](https://send.io), Instantly's transactional email API. Two nodes: **send.io** for actions (also usable as an AI agent tool) and **send.io Trigger** for delivery and contact webhooks.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) and install `n8n-nodes-sendio`. On self-hosted n8n: Settings, Community Nodes, Install, package name `n8n-nodes-sendio`.

Requires n8n 1.x or newer with Node.js 20 or newer. Developed and tested against n8n 2.42 on Node 22 and 26.

## Credentials

**send.io API** is used by both nodes.

- API Key: a team API key from the send.io dashboard (Developers, API keys).
- Base URL: leave `https://api.send.io` unless you were given another API host.

Every request carries `Authorization: Bearer <key>` and a `User-Agent: sendio-n8n/<version>` header. The credential test calls `GET /api-keys`.

**send.io Webhook Signing Secret API** is only needed by the trigger when it listens to a webhook you created yourself in send.io (see Trigger setup). It holds the `whsec_` value shown when the webhook is created.

## Operations

| Resource | Operations |
| --- | --- |
| Email | Send, Send Batch, Get, Get Many, Update (reschedule), Cancel |
| Domain | Create, Get, Get Many, Update, Verify, Delete |
| Template | Create, Get, Get Many, Update, Publish, Duplicate, Delete |
| Contact | Create, Get (by id or email), Get Many, Update, Delete |
| Event | Send a custom event |

Send supports HTML, text, both, or a published template with variables; cc, bcc, reply to, custom headers, tags, scheduled sending, a subscription topic, an idempotency key, and attachments from the item's binary data or from a URL. Send Batch takes a JSON array of up to 100 emails. Get Many operations have Return All with automatic paging.

Errors show send.io's own message in n8n, for example `The example.com domain is not verified. Please, add and verify your domain on https://send.io/domains`.

### One example per resource

- Email: `examples/send-email.json` sends one email with a tag and an idempotency key.
- Contact and Event: `examples/contact-and-event.json` creates a contact and records `order.paid` for it.
- Domain: Create with the domain name, then Get to read the DNS records (`records` in the output), publish them, then Verify.
- Template: Create with name and HTML (use `{{name}}` style placeholders and list them under Variables), set From and Subject, Publish, then Send an email with Body Type set to Template.
- Trigger: `examples/delivery-events.json` routes bounces to their own branch.

Import an example through Workflows, Import from File, then pick your send.io API credential on each node.

## Trigger setup

The trigger has two modes.

- **Managed by n8n** (default): pick the events, activate the workflow. The node creates a send.io webhook pointed at the workflow's production URL and stores the webhook id and signing secret with the workflow. Deactivating the workflow deletes the webhook. Your n8n must be reachable from the internet (set `WEBHOOK_URL` when it runs behind a tunnel or proxy).
- **Existing Webhook**: create the webhook in the send.io dashboard, point it at the production webhook URL shown on the node, and store its signing secret in a send.io Webhook Signing Secret credential.

Every delivery is verified: `svix-id`, `svix-timestamp` and `svix-signature` are checked with HMAC SHA-256 over `id.timestamp.body` using the base64 decoded secret, deliveries older or newer than five minutes are refused, and anything that fails answers 401 and never starts the workflow. The output item is the webhook payload: `type`, `created_at` and `data`.

## Usage notes

- Test sends go to the simulator addresses `delivered@send.io`, `bounced@send.io`, `complained@send.io` and `suppressed@send.io`. They never leave the platform. Sending to anyone else needs a verified domain.
- Do not activate a workflow whose trigger listens to `email.delivered` and whose steps send to the same simulator address: every send fires the trigger again.
- Get Many on Email returns everything up to 100 per page; see the first note below about paging.

## API behaviour worth knowing (for the API team)

Observed on 19 Oct 2026 against the development API while testing this node.

1. `GET /emails` answers `has_more: true` with `next_cursor: null` when the page is smaller than the total, so a cursor cannot advance. The node stops paging when no cursor comes back; with `limit=100` a page holds everything for most workspaces. The other lists page correctly with `after=<last id>`.
2. `POST /emails` has no priority field. The OTP priority mentioned in the integration plan is not in the API, so the node has no such option.
3. `PATCH /domains/{id}` answers only `{object, id}`; the new settings need a second `GET`. `capabilities` in that body answers 503 "not configured yet", and `tls: enforced` answers 503 as well.
4. `GET /contacts/{id}` returns custom properties as `{name: {type, value}}` objects, not plain values.
5. `POST /events/send` answers 202 with `{object, event, id}` and creates an unknown contact on the fly.
6. `POST /templates` requires `name` and `html`; `from` and `subject` are only required at publish time, with a clear message.
7. `DELETE /domains/{id}` and `DELETE /events/{id}` need the full UUID; a prefix answers 422 or 404.

## Development

```bash
npm install
npm run lint
npm run build
npm run dev
```

`npm run dev` uses the n8n node CLI: it rebuilds on change and links the node into an n8n instance. The repo's `.env` at the root holds the dev API key for the smoke scripts; inside n8n the key lives only in a credential.

To rehearse a release, `npm pack` and install the tarball into `~/.n8n/nodes` with `npm install --legacy-peer-deps --omit=dev ./n8n-nodes-sendio-<version>.tgz` (without the flag npm also installs the n8n-workflow peer dependency, which fails on a native build), then restart n8n.

## Publishing and the mirror

This GitLab repository is the source of truth. Publishing to npm happens from a public GitHub mirror under the company organisation through `.github/workflows/publish.yml` on a version tag, with npm provenance, as n8n requires for verified community nodes. The mirror, the npm publish, the `@n8n/scan-community-package` check and the submission at creators.n8n.io happen once the GitHub organisation exists.

## Version history

- 0.1.0: first release.
