import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { parseJson, splitList, withIdempotencyKey } from '../../shared/helpers';

const show = { resource: ['email'], operation: ['send'] };

export const emailSendDescription: INodeProperties[] = [
	{
		displayName: 'From',
		name: 'from',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Acme <hello@acme.com>',
		description: 'A sender on one of your verified domains',
		displayOptions: { show },
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
		displayOptions: { show },
	},
	{
		displayName: 'Body Type',
		name: 'bodyType',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'HTML', value: 'html' },
			{ name: 'HTML and Text', value: 'both' },
			{ name: 'Template', value: 'template' },
			{ name: 'Text', value: 'text' },
		],
		default: 'html',
		description: 'Write the body here or render a published send.io template',
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
		displayName: 'Template',
		name: 'templateId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. welcome-email',
		description: 'The ID or alias of a published template',
		displayOptions: { show: { ...show, bodyType: ['template'] } },
	},
	{
		displayName: 'Template Variables',
		name: 'templateVariables',
		type: 'json',
		default: '{}',
		description: 'Values for the template placeholders, as a JSON object',
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
	const body: IDataObject = {
		from: this.getNodeParameter('from') as string,
		to: splitList(this.getNodeParameter('to')),
		subject: this.getNodeParameter('subject') as string,
	};
	const bodyType = this.getNodeParameter('bodyType') as string;
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

	const extra = this.getNodeParameter('additionalFields', {}) as IDataObject;
	if (extra.cc) body.cc = splitList(extra.cc);
	if (extra.bcc) body.bcc = splitList(extra.bcc);
	if (extra.replyTo) body.reply_to = splitList(extra.replyTo);
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
