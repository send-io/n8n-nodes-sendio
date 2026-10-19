import type {
	IDataObject,
	IDisplayOptions,
	IExecuteSingleFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
	PostReceiveAction,
	PreSendAction,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { USER_AGENT } from './constants';

export const splitList = (value: unknown): string[] =>
	String(value ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);

// JSON parameters arrive as a string when typed in the editor and as an
// object when mapped from an expression. Both are accepted.
export function parseJson(this: IExecuteSingleFunctions, value: unknown, label: string): IDataObject {
	if (value === undefined || value === null || value === '') return {};
	if (typeof value === 'object') return value as IDataObject;
	try {
		return JSON.parse(String(value)) as IDataObject;
	} catch {
		throw new NodeOperationError(this.getNode(), `${label} is not valid JSON`);
	}
}

export const jsonOrEmpty = (expr: string) =>
	`={{ typeof ${expr} === 'string' ? (${expr} ? JSON.parse(${expr}) : undefined) : ${expr} }}`;

// Fetches the created object after a POST that answers only {id}, so the
// node output carries the full record (the send and reschedule answers).
export const fetchAfter = (path: string) =>
	async function (
		this: IExecuteSingleFunctions,
		_items: INodeExecutionData[],
		response: IN8nHttpFullResponse,
	): Promise<INodeExecutionData[]> {
		const id = (response.body as IDataObject).id as string;
		const credentials = await this.getCredentials('sendIoApi');
		const base = String(credentials.baseUrl).replace(/\/$/, '');
		const record = (await this.helpers.httpRequestWithAuthentication.call(this, 'sendIoApi', {
			method: 'GET',
			url: `${base}${path}/${id}`,
			json: true,
			headers: { 'User-Agent': USER_AGENT },
		})) as IDataObject;
		return [{ json: record }];
	};

// Requests run with ignoreHttpStatusErrors, so every operation passes its
// response through here first and send.io's own message becomes the error
// n8n shows, instead of the generic text for the status code.
export async function raiseApiError(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (response.statusCode < 400) return items;
	const body = (typeof response.body === 'object' && response.body ? response.body : {}) as IDataObject;
	throw new NodeApiError(this.getNode(), body as JsonObject, {
		message: String(body.message ?? `send.io answered ${response.statusCode}`),
		description: body.name ? `send.io error code: ${body.name}` : undefined,
		httpCode: String(response.statusCode),
	});
}

export const rootData: PostReceiveAction = {
	type: 'rootProperty',
	properties: { property: 'data' },
};

// Routing for one operation: the request plus the error check in front of
// any other post-receive step.
export const route = (
	request: { method: IHttpRequestMethods; url: string },
	extra: { preSend?: PreSendAction[]; postReceive?: PostReceiveAction[] } = {},
) => ({
	request,
	...(extra.preSend ? { send: { preSend: extra.preSend } } : {}),
	output: { postReceive: [raiseApiError, ...(extra.postReceive ?? [])] },
});

// Return All and Limit for the two list styles the API uses: the email list
// pages with cursor and next_cursor, every other list with after=<last id>.
export function listFields(
	show: IDisplayOptions['show'],
	style: 'cursor' | 'after',
): INodeProperties[] {
	const pagination =
		style === 'cursor'
			? {
					// The email list can answer has_more without a next_cursor; stop then.
					continue: '={{ $response.body.has_more && !!$response.body.next_cursor }}',
					request: { qs: { cursor: '={{ $response.body.next_cursor }}' } },
				}
			: {
					continue: '={{ $response.body.has_more }}',
					request: {
						qs: {
							after: '={{ $response.body.data[$response.body.data.length - 1].id }}',
						},
					},
				};
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			displayOptions: { show },
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			routing: {
				send: { paginate: '={{ $value }}', type: 'query', property: 'limit', value: '100' },
				operations: { pagination: { type: 'generic', properties: pagination } },
			},
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			displayOptions: { show: { ...show, returnAll: [false] } },
			typeOptions: { minValue: 1, maxValue: 100 },
			default: 50,
			description: 'Max number of results to return',
			routing: {
				send: { type: 'query', property: 'limit' },
				output: { maxResults: '={{ $value }}' },
			},
		},
	];
}

export const withIdempotencyKey = (
	requestOptions: IHttpRequestOptions,
	key: unknown,
): IHttpRequestOptions => {
	if (key) requestOptions.headers = { ...requestOptions.headers, 'Idempotency-Key': String(key) };
	return requestOptions;
};
