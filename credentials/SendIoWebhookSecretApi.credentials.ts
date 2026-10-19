import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

// The signing secret of a send.io webhook (the whsec_ value shown once when the
// webhook is created). The send.io Trigger node uses it to verify deliveries
// of a webhook that was created outside n8n.
export class SendIoWebhookSecretApi implements ICredentialType {
	name = 'sendIoWebhookSecretApi';

	displayName = 'send.io Webhook Signing Secret API';

	icon: Icon = { light: 'file:../icons/sendio.svg', dark: 'file:../icons/sendio.dark.svg' };

	documentationUrl =
		'https://github.com/sendio/n8n-nodes-sendio?tab=readme-ov-file#trigger-setup';

	properties: INodeProperties[] = [
		{
			displayName: 'Signing Secret',
			name: 'secret',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'The whsec_ value of the webhook, from the send.io dashboard or the create response',
		},
	];
}
