import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { parseJson, splitList, withIdempotencyKey } from '../../shared/helpers';

const show = { resource: ['email'], operation: ['send'] };
// A transactional email brings its own sender, subject and content.
const hideForTransactional = { bodyType: ['transactional'] };

export const emailSendDescription: INodeProperties[] = [
	{
		displayName: 'From',
		name: 'from',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Acme <hello@acme.com>',
		description: 'A sender on one of your verified domains',
		displayOptions: { show, hide: hideForTransactional },
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. ada@example.com, grace@example.com',
		description: 'One or more recipient addresses, separated by commas',
		displayOptions: { show },
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show, hide: hideForTransactional },
	},
	{
		displayName: 'Body Type',
		name: 'bodyType',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'HTML', value: 'html' },
			{ name: 'HTML and Text', value: 'both' },
			{
				name: 'Template (Deprecated)',
				value: 'template',
				description: 'Deprecated, use Transactional Email instead',
			},
			{ name: 'Text', value: 'text' },
			{
				name: 'Transactional Email',
				value: 'transactional',
				description: 'Send a saved transactional email: its sender, subject and template are used',
			},
		],
		default: 'html',
		description:
			'Transactional Email is recommended: it sends a saved transactional email. Or write the body here. Sending a published template directly is deprecated.',
		displayOptions: { show },
	},
	{
		displayName: 'HTML',
		name: 'html',
		type: 'string',
		typeOptions: { rows: 6 },
		required: true,
		default: '',
		displayOptions: { show: { ...show, bodyType: ['html', 'both'] } },
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		displayOptions: { show: { ...show, bodyType: ['text', 'both'] } },
	},
	{
		displayName: 'Transactional Email',
		name: 'transactionalId',
		type: 'resourceLocator',
		required: true,
		default: { mode: 'list', value: '' },
		description:
			'The saved transactional email to send. Its sender, subject, reply-to and tracking come from it, so they cannot be set here.',
		displayOptions: { show: { ...show, bodyType: ['transactional'] } },
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
	{
		displayName: 'Variables',
		name: 'transactionalVariables',
		type: 'json',
		default: '{}',
		placeholder: 'e.g. {"CODE": "123456"}',
		description:
			'Values for the variables of the transactional email, as a JSON object of variable name to value, for example {"CODE": "123456"}. Get on the Transactional Email resource lists the variable names.',
		displayOptions: { show: { ...show, bodyType: ['transactional'] } },
	},
	{
		displayName: 'Template',
		name: 'templateId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. welcome-email',
		description: 'The ID or alias of a published template. Deprecated: use Transactional Email.',
		displayOptions: { show: { ...show, bodyType: ['template'] } },
	},
	{
		displayName: 'Template Variables',
		name: 'templateVariables',
		type: 'json',
		default: '{}',
		description: 'Values for the template placeholders, as a JSON object. Deprecated: use Transactional Email.',
		displayOptions: { show: { ...show, bodyType: ['template'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show },
		options: [
			{
				displayName: 'Attachments',
				name: 'attachments',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				placeholder: 'Add Attachment',
				options: [
					{
						name: 'attachment',
						displayName: 'Attachment',
						values: [
							{
						displayName: 'Content ID',
						name: 'contentId',
						type: 'string',
						default: '',
						description: 'Set it to reference the file inline from the HTML as cid:&lt;ID&gt;',
							},
							{
						displayName: 'Content Type',
						name: 'contentType',
						type: 'string',
						default: '',
						description: 'MIME type, detected from the file when left empty',
							},
							{
						displayName: 'File Name',
						name: 'filename',
						type: 'string',
						default: '',
						description: 'The name the recipient sees. Defaults to the binary file name.',
							},
							{
						displayName: 'Input Binary Field',
						name: 'binaryProperty',
						type: 'string',
						default: 'data',
						description: 'The name of the binary field on the input item that holds the file',
							},
							{
						displayName: 'Source',
						name: 'source',
						type: 'options',
						options: [
									{
										name: 'Binary Data',
										value: 'binary',
									},
									{
										name: 'URL',
										value: 'url',
									},
								],
						default: 'binary',
							},
							{
						displayName: 'URL',
						name: 'url',
						type: 'string',
						default: '',
						description: 'A public URL send.io fetches the file from',
							},
					],
					},
				],
			},
			{
				displayName: 'Bcc',
				name: 'bcc',
				type: 'string',
				default: '',
				description: 'Blind copy recipients, separated by commas',
			},
			{
				displayName: 'Cc',
				name: 'cc',
				type: 'string',
				default: '',
				description: 'Copy recipients, separated by commas',
			},
			{
				displayName: 'Headers',
				name: 'headers',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				placeholder: 'Add Header',
				description: 'Custom email headers. From, To, Subject and the content headers are reserved.',
				options: [
					{
						name: 'header',
						displayName: 'Header',
						values: [
							{ displayName: 'Name', name: 'name', type: 'string', default: '' },
							{ displayName: 'Value', name: 'value', type: 'string', default: '' },
						],
					},
				],
			},
			{
				displayName: 'Idempotency Key',
				name: 'idempotencyKey',
				type: 'string',
				default: '',
				description:
					'Up to 256 characters. The same key within 24 hours returns the first email instead of sending again.',
			},
			{
				displayName: 'Reply To',
				name: 'replyTo',
				type: 'string',
				default: '',
				description: 'Reply-to addresses, separated by commas',
				displayOptions: { hide: { '/bodyType': ['transactional'] } },
			},
			{
				displayName: 'Scheduled At',
				name: 'scheduledAt',
				type: 'dateTime',
				default: '',
				description: 'Send later, up to 30 days ahead',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				placeholder: 'Add Tag',
				description: 'Name and value pairs: letters, numbers, underscores and dashes only',
				options: [
					{
						name: 'tag',
						displayName: 'Tag',
						values: [
							{ displayName: 'Name', name: 'name', type: 'string', default: '' },
							{ displayName: 'Value', name: 'value', type: 'string', default: '' },
						],
					},
				],
			},
			{
				displayName: 'Topic ID',
				name: 'topicId',
				type: 'string',
				default: '',
				description: 'Subscription topic the email belongs to, so opted-out contacts are skipped',
			},
		],
	},
];

// Builds the POST /emails body from the parameters above.
export async function buildEmailBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const bodyType = this.getNodeParameter('bodyType') as string;
	const body: IDataObject = { to: splitList(this.getNodeParameter('to')) };
	if (bodyType === 'transactional') {
		// With a transactional_id the API refuses from, subject, html, text,
		// reply_to, template and template_engine (422), so none is sent.
		const id = String(
			this.getNodeParameter('transactionalId', '', { extractValue: true }) ?? '',
		).trim();
		if (!id) throw new NodeOperationError(this.getNode(), 'Choose a transactional email to send');
		const variables = this.getNodeParameter('transactionalVariables', '{}');
		body.transactional_id = id;
		body.variables = parseJson.call(this, variables, 'Variables');
		if (Array.isArray(body.variables)) {
			throw new NodeOperationError(this.getNode(), 'Variables must be a JSON object, not an array');
		}
	} else {
		body.from = this.getNodeParameter('from') as string;
		body.subject = this.getNodeParameter('subject') as string;
		if (bodyType === 'template') {
			body.template = {
				id: this.getNodeParameter('templateId') as string,
				variables: parseJson.call(
					this,
					this.getNodeParameter('templateVariables', '{}'),
					'Template Variables',
				),
			};
		} else {
			if (bodyType !== 'text') body.html = this.getNodeParameter('html') as string;
			if (bodyType !== 'html') body.text = this.getNodeParameter('text') as string;
		}
	}

	const extra = this.getNodeParameter('additionalFields', {}) as IDataObject;
	if (extra.cc) body.cc = splitList(extra.cc);
	if (extra.bcc) body.bcc = splitList(extra.bcc);
	if (extra.replyTo && bodyType !== 'transactional') body.reply_to = splitList(extra.replyTo);
	if (extra.scheduledAt) body.scheduled_at = extra.scheduledAt;
	if (extra.topicId) body.topic_id = extra.topicId;

	const tags = ((extra.tags as IDataObject)?.tag ?? []) as IDataObject[];
	if (tags.length) body.tags = tags.map((t) => ({ name: t.name, value: t.value }));

	const headers = ((extra.headers as IDataObject)?.header ?? []) as IDataObject[];
	if (headers.length) {
		body.headers = Object.fromEntries(headers.map((h) => [String(h.name), String(h.value)]));
	}

	const attachments = ((extra.attachments as IDataObject)?.attachment ?? []) as IDataObject[];
	if (attachments.length) {
		body.attachments = await Promise.all(
			attachments.map(async (a) => {
				const att: IDataObject = {};
				if (a.source === 'url') {
					if (!a.url || !a.filename) {
						throw new NodeOperationError(
							this.getNode(),
							'A URL attachment needs both the URL and a file name',
						);
					}
					att.path = a.url;
					att.filename = a.filename;
				} else {
					const property = String(a.binaryProperty || 'data');
					const meta = this.helpers.assertBinaryData(property);
					const buffer = await this.helpers.getBinaryDataBuffer(property);
					att.content = buffer.toString('base64');
					att.filename = a.filename || meta.fileName || property;
					if (!a.contentType && meta.mimeType) att.content_type = meta.mimeType;
				}
				if (a.contentType) att.content_type = a.contentType;
				if (a.contentId) att.content_id = a.contentId;
				return att;
			}),
		);
	}

	requestOptions.body = body;
	return withIdempotencyKey(requestOptions, extra.idempotencyKey);
}
