import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

import { contactDescription } from './resources/contact';
import { domainDescription } from './resources/domain';
import { emailDescription } from './resources/email';
import { eventDescription } from './resources/event';
import { templateDescription } from './resources/template';
import {
	searchTransactionalEmails,
	transactionalDescription,
} from './resources/transactional';

export class SendIo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'send.io',
		name: 'sendIo',
		icon: { light: 'file:../../icons/sendio.svg', dark: 'file:../../icons/sendio.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send transactional email and manage domains, templates, contacts and events in send.io',
		defaults: {
			name: 'send.io',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'sendIoApi', required: true }],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			ignoreHttpStatusErrors: true,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Contact', value: 'contact' },
					{ name: 'Domain', value: 'domain' },
					{ name: 'Email', value: 'email' },
					{ name: 'Event', value: 'event' },
					{ name: 'Template', value: 'template' },
					{ name: 'Transactional Email', value: 'transactional' },
				],
				default: 'email',
			},
			...emailDescription,
			...domainDescription,
			...templateDescription,
			...transactionalDescription,
			...contactDescription,
			...eventDescription,
		],
	};

	methods = { listSearch: { searchTransactionalEmails } };
}
