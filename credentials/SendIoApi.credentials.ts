import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

import { DEFAULT_BASE_URL, USER_AGENT } from '../nodes/SendIo/shared/constants';

export class SendIoApi implements ICredentialType {
	name = 'sendIoApi';

	displayName = 'send.io API';

	icon: Icon = { light: 'file:../icons/sendio.svg', dark: 'file:../icons/sendio.dark.svg' };

	documentationUrl = 'https://github.com/send-io/n8n-nodes-sendio?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'A team API key from the send.io dashboard (Developers, API keys)',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			required: true,
			default: DEFAULT_BASE_URL,
			description: 'Leave the default unless you were given another API host',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
				'User-Agent': USER_AGENT,
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api-keys',
			method: 'GET',
		},
	};
}
