import type { INodeProperties } from 'n8n-workflow';

import { jsonOrEmpty, listFields, rootData, route } from '../../shared/helpers';

const resource = ['template'];

const templateFields = (prefix: string): INodeProperties[] => [
	{
		displayName: 'Alias',
		name: 'alias',
		type: 'string',
		default: '',
		description: 'A short name that can be used instead of the ID when sending',
		routing: { send: { type: 'body', property: 'alias' } },
	},
	{
		displayName: 'From',
		name: 'from',
		type: 'string',
		default: '',
		description: 'Default sender, required before the template can be published',
		routing: { send: { type: 'body', property: 'from' } },
	},
	{
		displayName: 'Preview Text',
		name: 'previewText',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'preview_text' } },
	},
	{
		displayName: 'Reply To',
		name: 'replyTo',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'reply_to' } },
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		description: 'Default subject, required before the template can be published',
		routing: { send: { type: 'body', property: 'subject' } },
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		description: 'Plain text version of the template',
		routing: { send: { type: 'body', property: 'text' } },
	},
	{
		displayName: 'Variables',
		name: 'variables',
		type: 'json',
		default: '[]',
		description:
			'JSON array of variable definitions, each with key, type (string, number, boolean, object or array) and an optional fallback_value',
		routing: {
			send: { type: 'body', property: 'variables', value: jsonOrEmpty(`$parameter.${prefix}.variables`) },
		},
	},
];

const templateUpdateBase: INodeProperties[] = [
	{
		displayName: 'HTML',
		name: 'html',
		type: 'string',
		typeOptions: { rows: 6 },
		default: '',
		routing: { send: { type: 'body', property: 'html' } },
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'name' } },
	},
	...templateFields('updateFields'),
];
const templateUpdateOptions = templateUpdateBase.sort((a, b) =>
	a.displayName.localeCompare(b.displayName),
);

export const templateDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a template',
				description: 'Create a template as a draft',
				routing: route({ method: 'POST', url: '/templates' }),
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a template',
				routing: route({ method: 'DELETE', url: '=/templates/{{$parameter.templateId}}' }),
			},
			{
				name: 'Duplicate',
				value: 'duplicate',
				action: 'Duplicate a template',
				description: 'Copy a template into a new draft',
				routing: route({ method: 'POST', url: '=/templates/{{$parameter.templateId}}/duplicate' }),
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a template',
				routing: route({ method: 'GET', url: '=/templates/{{$parameter.templateId}}' }),
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many templates',
				routing: route({ method: 'GET', url: '/templates' }, { postReceive: [rootData] }),
			},
			{
				name: 'Publish',
				value: 'publish',
				action: 'Publish a template',
				description: 'Publish the draft so emails can use it',
				routing: route({ method: 'POST', url: '=/templates/{{$parameter.templateId}}/publish' }),
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a template',
				description: 'Change the draft of a template',
				routing: route({ method: 'PATCH', url: '=/templates/{{$parameter.templateId}}' }),
			},
		],
		default: 'create',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'HTML',
		name: 'html',
		type: 'string',
		typeOptions: { rows: 6 },
		required: true,
		default: '',
		description: 'The HTML body, with {{variable}} placeholders',
		displayOptions: { show: { resource, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'html' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource, operation: ['create'] } },
		options: templateFields('additionalFields'),
	},
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID or alias of the template',
		displayOptions: {
			show: { resource, operation: ['get', 'update', 'delete', 'publish', 'duplicate'] },
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource, operation: ['update'] } },
		options: templateUpdateOptions,
	},
	...listFields({ resource, operation: ['getAll'] }, 'after'),
];
