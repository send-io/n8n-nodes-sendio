import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { USER_AGENT } from '../../shared/constants';
import { listFields, rootData, route } from '../../shared/helpers';

const resource = ['transactional'];

// Puts the id chosen in the picker into the path of Get.
async function setTransactionalUrl(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const id = String(
		this.getNodeParameter('transactionalId', '', { extractValue: true }) ?? '',
	).trim();
	if (!id) throw new NodeOperationError(this.getNode(), 'Choose a transactional email');
	requestOptions.url = `/transactional/${encodeURIComponent(id)}`;
	return requestOptions;
}

// Feeds the Transactional Email picker: GET /transactional with the typed
// search and the last id of the previous page as the paging token.
export async function searchTransactionalEmails(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('sendIoApi');
	const base = String(credentials.baseUrl).replace(/\/$/, '');
	const qs: Record<string, string | number> = { limit: 50 };
	if (filter) qs.search = filter;
	if (paginationToken) qs.after = paginationToken;
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'sendIoApi', {
		method: 'GET',
		url: `${base}/transactional`,
		qs,
		json: true,
		headers: { 'User-Agent': USER_AGENT },
	})) as { data?: Array<{ id: string; name?: string; subject?: string }>; has_more?: boolean };
	const data = response.data ?? [];
	return {
		results: data.map((tx) => ({
			name: tx.name || tx.id,
			value: tx.id,
			description: tx.subject,
		})),
		paginationToken: response.has_more && data.length ? data[data.length - 1].id : undefined,
	};
}

export const transactionalDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a transactional email',
				description: 'Get a transactional email with the variables its sends fill',
				routing: route({ method: 'GET', url: '/transactional' }, { preSend: [setTransactionalUrl] }),
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many transactional emails',
				description: 'List transactional emails, newest first',
				routing: route({ method: 'GET', url: '/transactional' }, { postReceive: [rootData] }),
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Transactional Email',
		name: 'transactionalId',
		type: 'resourceLocator',
		required: true,
		default: { mode: 'list', value: '' },
		description: 'The transactional email to read. The output lists its variables (key, type, fallback value).',
		displayOptions: { show: { resource, operation: ['get'] } },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod: 'searchTransactionalEmails', searchable: true },
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. tx_2hX9Yq1bVv0kq3W4m8sZJt1aB7c',
				validation: [
					{
						type: 'regex',
						properties: { regex: '^tx_[A-Za-z0-9]+$', errorMessage: 'Not a valid transactional email ID' },
					},
				],
			},
		],
	},
	...listFields({ resource, operation: ['getAll'] }, 'after'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource, operation: ['getAll'] } },
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Only transactional emails whose name or subject contains this text',
				routing: { send: { type: 'query', property: 'search' } },
			},
			{
				displayName: 'Template ID',
				name: 'templateId',
				type: 'string',
				default: '',
				description: 'Only transactional emails of this template (ID or alias)',
				routing: { send: { type: 'query', property: 'template_id' } },
			},
		],
	},
];
