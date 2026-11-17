import { createHmac, timingSafeEqual } from 'node:crypto';

import type {
	ICredentialTestFunctions,
	ICredentialsDecrypted,
	IDataObject,
	IHookFunctions,
	INodeCredentialTestResult,
	IHttpRequestMethods,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { USER_AGENT, WEBHOOK_EVENTS } from '../SendIo/shared/constants';

const TOLERANCE_SECONDS = 5 * 60;

async function sendIoRequest(
	this: IHookFunctions,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
) {
	const credentials = await this.getCredentials('sendIoApi');
	const base = String(credentials.baseUrl).replace(/\/$/, '');
	return (await this.helpers.httpRequestWithAuthentication.call(this, 'sendIoApi', {
		method,
		url: `${base}${path}`,
		body,
		json: true,
		headers: { 'User-Agent': USER_AGENT },
	})) as IDataObject;
}

// Svix style verification: HMAC SHA-256 over "id.timestamp.body" with the
// base64 decoded secret (after the whsec_ prefix). The header may carry
// several space separated "v1,<signature>" values during a secret rotation.
export function verifySignature(
	secret: string,
	id: string,
	timestamp: string,
	signatureHeader: string,
	body: Buffer,
	now = Math.floor(Date.now() / 1000),
): boolean {
	const ts = Number(timestamp);
	if (!id || !Number.isFinite(ts) || Math.abs(now - ts) > TOLERANCE_SECONDS) return false;
	const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
	const expected = createHmac('sha256', key)
		.update(`${id}.${timestamp}.`)
		.update(body)
		.digest();
	return signatureHeader.split(' ').some((part) => {
		const [version, value] = part.split(',');
		if (version !== 'v1' || !value) return false;
		const given = Buffer.from(value, 'base64');
		return given.length === expected.length && timingSafeEqual(given, expected);
	});
}

export class SendIoTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'send.io Trigger',
		name: 'sendIoTrigger',
		icon: { light: 'file:../../icons/sendio.svg', dark: 'file:../../icons/sendio.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when send.io reports an email, contact or domain event',
		defaults: {
			name: 'send.io Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			// One credential at a time: the API key registers the webhook in
			// Managed by n8n mode, the signing secret verifies an existing one.
			{ name: 'sendIoApi', required: true, displayOptions: { show: { source: ['managed'] } } },
			{
				name: 'sendIoWebhookSecretApi',
				required: true,
				testedBy: 'sendIoWebhookSecretTest',
				displayOptions: { show: { source: ['existing'] } },
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Webhook Source',
				name: 'source',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Existing Webhook',
						value: 'existing',
						description:
							'Point a webhook you created in send.io at this URL and verify it with its signing secret',
					},
					{
						name: 'Managed by N8n',
						value: 'managed',
						description:
							'Create the send.io webhook when the workflow is activated and delete it when it is deactivated',
					},
				],
				default: 'managed',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				options: WEBHOOK_EVENTS,
				default: ['email.delivered'],
				description: 'The events the webhook subscribes to',
				displayOptions: { show: { source: ['managed'] } },
			},
		],
	};

	methods = {
		credentialTest: {
			// A signing secret cannot be checked against the API, so the test
			// validates its shape: whsec_ plus base64 of a 32 byte key.
			async sendIoWebhookSecretTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const secret = String(credential.data?.secret ?? '');
				const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
				if (!secret.startsWith('whsec_') || key.length < 16) {
					return {
						status: 'Error',
						message: 'Expected a send.io signing secret starting with whsec_',
					};
				}
				return { status: 'OK', message: 'The secret has the expected shape' };
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				if (this.getNodeParameter('source') === 'existing') return true;
				const data = this.getWorkflowStaticData('node');
				if (!data.webhookId) return false;
				try {
					await sendIoRequest.call(this, 'GET', `/webhooks/${data.webhookId}`);
					return true;
				} catch (error) {
					if ((error as { httpCode?: string }).httpCode === '404') {
						delete data.webhookId;
						delete data.signingSecret;
						return false;
					}
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}
			},
			async create(this: IHookFunctions): Promise<boolean> {
				if (this.getNodeParameter('source') === 'existing') return true;
				const endpoint = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string[];
				if (!events.length) {
					throw new NodeOperationError(this.getNode(), 'Choose at least one event');
				}
				const webhook = await sendIoRequest.call(this, 'POST', '/webhooks', { endpoint, events });
				const data = this.getWorkflowStaticData('node');
				data.webhookId = webhook.id;
				data.signingSecret = webhook.signing_secret;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				if (this.getNodeParameter('source') === 'existing') return true;
				const data = this.getWorkflowStaticData('node');
				if (data.webhookId) {
					try {
						await sendIoRequest.call(this, 'DELETE', `/webhooks/${data.webhookId}`);
					} catch (error) {
						if ((error as { httpCode?: string }).httpCode !== '404') {
							throw new NodeApiError(this.getNode(), error as JsonObject);
						}
					}
				}
				delete data.webhookId;
				delete data.signingSecret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const res = this.getResponseObject();
		const headers = this.getHeaderData();

		let secret: string;
		if (this.getNodeParameter('source') === 'existing') {
			secret = String((await this.getCredentials('sendIoWebhookSecretApi')).secret);
		} else {
			secret = String(this.getWorkflowStaticData('node').signingSecret ?? '');
		}
		if (!secret) {
			res.status(500).send('The webhook has no signing secret; deactivate and activate the workflow');
			return { noWebhookResponse: true };
		}

		const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
		const body = rawBody ?? Buffer.from(JSON.stringify(this.getBodyData()));
		const ok = verifySignature(
			secret,
			String(headers['svix-id'] ?? ''),
			String(headers['svix-timestamp'] ?? ''),
			String(headers['svix-signature'] ?? ''),
			body,
		);
		if (!ok) {
			res.status(401).send('Invalid webhook signature');
			return { noWebhookResponse: true };
		}

		return {
			workflowData: [this.helpers.returnJsonArray(this.getBodyData())],
		};
	}
}
