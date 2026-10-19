import type { INodeProperties } from 'n8n-workflow';

import { jsonOrEmpty, listFields, rootData, route } from '../../shared/helpers';

const resource = ['contact'];

const contactFields = (prefix: string): INodeProperties[] => [
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'first_name' } },
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'last_name' } },
	},
	{
		displayName: 'Properties',
		name: 'properties',
		type: 'json',
		default: '{}',
		description: 'Custom property values as a JSON object. Unknown properties are created.',
		routing: {
			send: { type: 'body', property: 'properties', value: jsonOrEmpty(`$parameter.${prefix}.properties`) },
			request: { body: { create_missing_properties: true } },
		},
	},
	{
		displayName: 'Unsubscribed',
		name: 'unsubscribed',
		type: 'boolean',
		default: false,
		description: 'Whether the contact is opted out of marketing email',
		routing: { send: { type: 'body', property: 'unsubscribed' } },
	},
];

export const contactDescription: INodeProperties[] = [
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
				action: 'Create a contact',
				routing: route({ method: 'POST', url: '/contacts' }),
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a contact',
				routing: route({ method: 'DELETE', url: '=/contacts/{{$parameter.contactId}}' }),
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a contact',
				description: 'Get a contact by ID or email address',
				routing: route({ method: 'GET', url: '=/contacts/{{$parameter.contactId}}' }),
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many contacts',
				routing: route({ method: 'GET', url: '/contacts' }, { postReceive: [rootData] }),
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a contact',
				description: 'Change the name, subscription status or properties. The email cannot change.',
				routing: route({ method: 'PATCH', url: '=/contacts/{{$parameter.contactId}}' }),
			},
		],
		default: 'create',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. ada@example.com',
		displayOptions: { show: { resource, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'email' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource, operation: ['create'] } },
		options: contactFields('additionalFields'),
	},
	{
		displayName: 'Contact',
		name: 'contactId',
		type: 'string',
		required: true,
		default: '',
		description: 'The contact ID or email address',
		displayOptions: { show: { resource, operation: ['get', 'update', 'delete'] } },
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource, operation: ['update'] } },
		options: contactFields('updateFields'),
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
				description: 'Match on email or name',
				routing: { send: { type: 'query', property: 'search' } },
			},
			{
				displayName: 'Segment ID',
				name: 'segmentId',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'segment_id' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Subscribed', value: 'subscribed' },
					{ name: 'Unsubscribed', value: 'unsubscribed' },
				],
				default: 'subscribed',
				routing: { send: { type: 'query', property: 'status' } },
			},
		],
	},
];
