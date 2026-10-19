import type { INodeProperties } from 'n8n-workflow';

import { listFields, rootData, route } from '../../shared/helpers';

const resource = ['domain'];

export const domainDescription: INodeProperties[] = [
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
				action: 'Create a domain',
				description: 'Add a sending domain and get the DNS records to publish',
				routing: route({ method: 'POST', url: '/domains' }),
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a domain',
				routing: route({ method: 'DELETE', url: '=/domains/{{$parameter.domainId}}' }),
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a domain',
				description: 'Get a domain with its DNS records and verification status',
				routing: route({ method: 'GET', url: '=/domains/{{$parameter.domainId}}' }),
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many domains',
				routing: route({ method: 'GET', url: '/domains' }, { postReceive: [rootData] }),
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a domain',
				description: 'Change tracking or TLS settings of a domain',
				routing: route({ method: 'PATCH', url: '=/domains/{{$parameter.domainId}}' }),
			},
			{
				name: 'Verify',
				value: 'verify',
				action: 'Verify a domain',
				description: 'Ask send.io to check the DNS records now',
				routing: route({ method: 'POST', url: '=/domains/{{$parameter.domainId}}/verify' }),
			},
		],
		default: 'create',
	},
	{
		displayName: 'Domain Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. mail.acme.com',
		displayOptions: { show: { resource, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource, operation: ['create'] } },
		options: [
			{
				displayName: 'Custom Return Path',
				name: 'customReturnPath',
				type: 'string',
				default: '',
				description: 'Subdomain for the return path, for example send',
				routing: { send: { type: 'body', property: 'custom_return_path' } },
			},
			{
				displayName: 'Region',
				name: 'region',
				type: 'options',
				options: [
					{ name: 'ap-northeast-1', value: 'ap-northeast-1' },
					{ name: 'eu-west-1', value: 'eu-west-1' },
					{ name: 'sa-east-1', value: 'sa-east-1' },
					{ name: 'us-east-1', value: 'us-east-1' },
				],
				default: 'us-east-1',
				routing: { send: { type: 'body', property: 'region' } },
			},
		],
	},
	{
		displayName: 'Domain ID',
		name: 'domainId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource, operation: ['get', 'update', 'verify', 'delete'] } },
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource, operation: ['update'] } },
		options: [
			{
				displayName: 'Click Tracking',
				name: 'clickTracking',
				type: 'boolean',
				default: false,
				description: 'Whether links in emails from this domain are tracked',
				routing: { send: { type: 'body', property: 'click_tracking' } },
			},
			{
				displayName: 'Open Tracking',
				name: 'openTracking',
				type: 'boolean',
				default: false,
				description: 'Whether opens of emails from this domain are tracked',
				routing: { send: { type: 'body', property: 'open_tracking' } },
			},
			{
				displayName: 'TLS',
				name: 'tls',
				type: 'options',
				options: [
					{ name: 'Enforced', value: 'enforced' },
					{ name: 'Opportunistic', value: 'opportunistic' },
				],
				default: 'opportunistic',
				routing: { send: { type: 'body', property: 'tls' } },
			},
			{
				displayName: 'Tracking Subdomain',
				name: 'trackingSubdomain',
				type: 'string',
				default: '',
				description: 'Subdomain used for tracking links',
				routing: { send: { type: 'body', property: 'tracking_subdomain' } },
			},
		],
	},
	...listFields({ resource, operation: ['getAll'] }, 'after'),
];
