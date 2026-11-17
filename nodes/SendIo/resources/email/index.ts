import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { fetchAfter, listFields, rootData, route, withIdempotencyKey } from '../../shared/helpers';
import { buildEmailBody, emailSendDescription } from './send';

const resource = ['email'];

async function buildBatchBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const raw = this.getNodeParameter('emails');
	const emails = (typeof raw === 'string' ? JSON.parse(raw) : raw) as unknown;
	if (!Array.isArray(emails) || emails.length === 0 || emails.length > 100) {
		throw new NodeOperationError(this.getNode(), 'Emails must be a JSON array of 1 to 100 emails');
	}
	requestOptions.body = emails;
	return withIdempotencyKey(requestOptions, this.getNodeParameter('idempotencyKey', ''));
}

async function buildRescheduleBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	requestOptions.body = { scheduled_at: this.getNodeParameter('scheduledAt') } as IDataObject;
	return requestOptions;
}

export const emailDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				action: 'Cancel a scheduled email',
				description: 'Cancel an email that has not been sent yet',
				routing: route({ method: 'POST', url: '=/emails/{{$parameter.emailId}}/cancel' }),
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an email',
				description: 'Get an email with its latest delivery event',
				routing: route({ method: 'GET', url: '=/emails/{{$parameter.emailId}}' }),
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many emails',
				description: 'List sent emails, newest first',
				routing: route({ method: 'GET', url: '/emails' }, { postReceive: [rootData] }),
			},
			{
				name: 'Send',
				value: 'send',
				action: 'Send an email',
				description: 'Send a transactional email',
				routing: route(
					{ method: 'POST', url: '/emails' },
					{ preSend: [buildEmailBody], postReceive: [fetchAfter('/emails')] },
				),
			},
			{
				name: 'Send Batch',
				value: 'sendBatch',
				action: 'Send a batch of emails',
				description: 'Send up to 100 emails in one request',
				routing: route({ method: 'POST', url: '/emails/batch' }, { preSend: [buildBatchBody] }),
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Reschedule an email',
				description: 'Change the send time of a scheduled email',
				routing: route(
					{ method: 'PATCH', url: '=/emails/{{$parameter.emailId}}' },
					{ preSend: [buildRescheduleBody], postReceive: [fetchAfter('/emails')] },
				),
			},
		],
		default: 'send',
	},
	...emailSendDescription,
	{
		displayName: 'Emails',
		name: 'emails',
		type: 'json',
		required: true,
		default: '[]',
		description:
			'A JSON array of email objects with the same fields as Send (from, to, subject, html or text, or transactional_id with variables, cc, bcc, reply_to, tags, headers, scheduled_at). Attachments are not allowed in a batch.',
		displayOptions: { show: { resource, operation: ['sendBatch'] } },
	},
	{
		displayName: 'Idempotency Key',
		name: 'idempotencyKey',
		type: 'string',
		default: '',
		description:
			'Up to 256 characters. The same key within 24 hours returns the first batch instead of sending again.',
		displayOptions: { show: { resource, operation: ['sendBatch'] } },
	},
	{
		displayName: 'Email ID',
		name: 'emailId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource, operation: ['get', 'update', 'cancel'] } },
	},
	{
		displayName: 'Scheduled At',
		name: 'scheduledAt',
		type: 'dateTime',
		required: true,
		default: '',
		description: 'The new send time, up to 30 days ahead',
		displayOptions: { show: { resource, operation: ['update'] } },
	},
	...listFields({ resource, operation: ['getAll'] }, 'cursor'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource, operation: ['getAll'] } },
		options: [
			{
				displayName: 'Batch ID',
				name: 'batchId',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'batch_id' } },
			},
			{
				displayName: 'Created After',
				name: 'createdAfter',
				type: 'dateTime',
				default: '',
				routing: { send: { type: 'query', property: 'created_after' } },
			},
			{
				displayName: 'Created Before',
				name: 'createdBefore',
				type: 'dateTime',
				default: '',
				routing: { send: { type: 'query', property: 'created_before' } },
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'from' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				description: 'The last event, for example delivered or bounced',
				routing: { send: { type: 'query', property: 'status' } },
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'subject' } },
			},
			{
				displayName: 'Template ID',
				name: 'templateId',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'template_id' } },
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'to' } },
			},
			{
				displayName: 'Transactional Email ID',
				name: 'transactionalId',
				type: 'string',
				default: '',
				placeholder: 'e.g. tx_2hX9Yq1bVv0kq3W4m8sZJt1aB7c',
				description: 'Only emails sent from this transactional email',
				routing: { send: { type: 'query', property: 'transactional_id' } },
			},
		],
	},
];
