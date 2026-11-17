# Changelog

## 0.2.1 (18 Nov 2026)

- send.io Trigger: the node asks for one credential at a time. Managed by n8n uses the send.io API key, Existing Webhook uses only the signing secret. This meets n8n's rule for verified nodes that a node uses a single credential.

## 0.2.0 (18 Nov 2026)

- New Transactional Email resource with Get and Get Many (filters: search, template).
- Email, Send: new Body Type "Transactional Email". Pick a saved transactional email from a searchable list (or by ID) and pass its variables as JSON; its sender, subject, reply-to and tracking come from it, so From, Subject, Reply To and the body fields are hidden and not sent.
- Email, Send: sending a published template directly is deprecated by the send.io API. The option stays for existing workflows and is now labelled "Template (Deprecated)".
- Email, Get Many: new filter Transactional Email ID.
- User-Agent now reports the package version (`sendio-n8n/0.2.0`).

## 0.1.1

- Same node code as 0.1.0, published from GitHub Actions with npm provenance (what n8n verification requires); repository URL normalized.

## 0.1.0

- First release: send.io node (Email, Domain, Template, Contact, Event resources) and send.io Trigger node.
