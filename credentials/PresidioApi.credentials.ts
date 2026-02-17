import type {
	ICredentialType,
	INodeProperties,
	Icon,
	ICredentialTestRequest,
} from 'n8n-workflow';

export class PresidioApi implements ICredentialType {
	name = 'presidioApi';

	displayName = 'Presidio API';

	icon: Icon = 'file:../nodes/Presidio/presidio.svg';

	documentationUrl = 'https://microsoft.github.io/presidio/';

	properties: INodeProperties[] = [
		{
			displayName: 'Analyzer Endpoint',
			name: 'analyzerEndpoint',
			type: 'string',
			default: 'http://presidio-analyzer',
			placeholder: 'http://localhost:5002',
			description: 'The base URL for the Presidio Analyzer service',
			required: true,
		},
		{
			displayName: 'Anonymizer Endpoint',
			name: 'anonymizerEndpoint',
			type: 'string',
			default: 'http://presidio-anonymizer',
			placeholder: 'http://localhost:5001',
			description: 'The base URL for the Presidio Anonymizer service',
			required: true,
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.analyzerEndpoint}}',
			url: '/health',
			method: 'GET',
		},
	};
}
