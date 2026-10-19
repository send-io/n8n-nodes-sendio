import type { INodeProperties } from 'n8n-workflow';

import { jsonOrEmpty, route } from '../../shared/helpers';

const resource = ['event'];

export const eventDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Send',
				value: 'send',
				action: 'Send a custom event',
				description: 'Record a custom event for a contact, for automations to react to',
				routing: route({ method: 'POST', url: '/events/send' }),
			},
		],
		default: 'send',
	},
	{
		displayName: 'Event Name',
		name: 'event',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. order.paid',
		description:
			'Letters, digits, dot, colon, dash and underscore. A new name is defined on first use.',
		displayOptions: { show: { resource, operation: ['send'] } },
		routing: { send: { type: 'body', property: 'event' } },
	},
	{
		displayName: 'Identify Contact By',
		name: 'identifyBy',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Contact ID', value: 'contactId' },
			{ name: 'Email', value: 'email' },
		],
		default: 'email',
		displayOptions: { show: { resource, operation: ['send'] } },
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'name@email.com',
		description: 'The contact the event belongs to. A contact is created for an unknown address.',
		displayOptions: { show: { resource, operation: ['send'], identifyBy: ['email'] } },
		routing: { send: { type: 'body', property: 'email' } },
	},
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource, operation: ['send'], identifyBy: ['contactId'] } },
		routing: { send: { type: 'body', property: 'contact_id' } },
	},
	{
		displayName: 'Payload',
		name: 'payload',
		type: 'json',
		default: '{}',
		description: 'Event properties as a JSON object, available to automations',
		displayOptions: { show: { resource, operation: ['send'] } },
		routing: { send: { type: 'body', property: 'payload', value: jsonOrEmpty('$parameter.payload') } },
	},
	{
		displayName: 'Event ID',
		name: 'eventId',
		type: 'string',
		default: '',
		description: 'Your own ID for this occurrence, up to 200 characters, to avoid duplicates on retries',
		displayOptions: { show: { resource, operation: ['send'] } },
		routing: { send: { type: 'body', property: 'id' } },
	},
];
