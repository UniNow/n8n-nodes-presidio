import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ICredentialDataDecryptedObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class Presidio implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Presidio',
		name: 'presidio',
		icon: 'file:presidio.svg',
		group: ['transform'],
		version: 1,
		description: 'Anonymize and analyze text using Microsoft Presidio',
		defaults: {
			name: 'Presidio',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'presidioApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Analyze',
						value: 'analyze',
						description: 'Analyze text to detect PII entities',
						action: 'Analyze text for PII',
					},
					{
						name: 'Anonymize',
						value: 'anonymize',
						description: 'Anonymize PII in text',
						action: 'Anonymize text',
					},
					{
						name: 'Analyze and Anonymize',
						value: 'analyzeAndAnonymize',
						description: 'Analyze and then anonymize text in one operation',
						action: 'Analyze and anonymize text',
					},
				],
				default: 'analyzeAndAnonymize',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				placeholder: 'Enter text to analyze/anonymize',
				description: 'The text to process',
				required: true,
				displayOptions: {
					show: {
						operation: ['analyze', 'anonymize', 'analyzeAndAnonymize'],
					},
				},
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: 'en',
				placeholder: 'en',
				description: 'Language code for text analysis (e.g., en, es, de)',
				displayOptions: {
					show: {
						operation: ['analyze', 'anonymize', 'analyzeAndAnonymize'],
					},
				},
			},
			{
				displayName: 'Analyzer Results',
				name: 'analyzerResults',
				type: 'json',
				default: '',
				placeholder: '[{"start": 0, "end": 5, "score": 0.85, "entity_type": "PERSON"}]',
				description: 'Analyzer results from a previous analyze operation (JSON array)',
				required: true,
				displayOptions: {
					show: {
						operation: ['anonymize'],
					},
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['analyze'],
					},
				},
				options: [
					{
						displayName: 'Entities',
						name: 'entities',
						type: 'string',
						default: '',
						placeholder: 'PERSON,EMAIL_ADDRESS,PHONE_NUMBER',
						description: 'Comma-separated list of entity types to detect. Leave empty for all entities.',
					},
					{
						displayName: 'Score Threshold',
						name: 'scoreThreshold',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 1,
							numberPrecision: 2,
						},
						default: 0,
						description: 'Minimum confidence score (0-1) for detected entities',
					},
				],
			},
			{
				displayName: 'Anonymization Fields',
				name: 'anonymizationFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['anonymize', 'analyzeAndAnonymize'],
					},
				},
				options: [
					{
						displayName: 'Anonymizers',
						name: 'anonymizers',
						type: 'json',
						default: '{}',
						placeholder: '{"PERSON": {"type": "replace", "new_value": "<PERSON>"}}',
						description: 'Custom anonymization configuration per entity type (JSON object)',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = (await this.getCredentials('presidioApi')) as ICredentialDataDecryptedObject;

		const analyzerEndpoint = credentials.analyzerEndpoint as string;
		const anonymizerEndpoint = credentials.anonymizerEndpoint as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const text = this.getNodeParameter('text', i) as string;
				const language = this.getNodeParameter('language', i) as string;

				let responseData: IDataObject = {};

				if (operation === 'analyze') {
					// Analyze operation
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {
						text,
						language,
					};

					if (additionalFields.entities) {
						const entitiesStr = additionalFields.entities as string;
						body.entities = entitiesStr.split(',').map((e) => e.trim());
					}

					if (additionalFields.scoreThreshold !== undefined) {
						body.score_threshold = additionalFields.scoreThreshold;
					}

					const options: IHttpRequestOptions = {
						method: 'POST' as IHttpRequestMethods,
						body,
						url: `${analyzerEndpoint}/analyze`,
						json: true,
					};

					responseData = await this.helpers.httpRequest(options);

				} else if (operation === 'anonymize') {
					// Anonymize operation
					const analyzerResults = this.getNodeParameter('analyzerResults', i) as string;
					const anonymizationFields = this.getNodeParameter('anonymizationFields', i) as IDataObject;

					const body: IDataObject = {
						text,
						language,
						analyzer_results: typeof analyzerResults === 'string' ? JSON.parse(analyzerResults) : analyzerResults,
					};

					if (anonymizationFields.anonymizers) {
						const anonymizersStr = anonymizationFields.anonymizers as string;
						body.anonymizers = typeof anonymizersStr === 'string' ? JSON.parse(anonymizersStr) : anonymizersStr;
					}

					const options: IHttpRequestOptions = {
						method: 'POST' as IHttpRequestMethods,
						body,
						url: `${anonymizerEndpoint}/anonymize`,
						json: true,
					};

					responseData = await this.helpers.httpRequest(options);

				} else if (operation === 'analyzeAndAnonymize') {
					// Analyze and Anonymize operation
					const anonymizationFields = this.getNodeParameter('anonymizationFields', i) as IDataObject;

					// First, analyze the text
					const analyzeBody: IDataObject = {
						text,
						language,
					};

					const analyzeOptions: IHttpRequestOptions = {
						method: 'POST' as IHttpRequestMethods,
						body: analyzeBody,
						url: `${analyzerEndpoint}/analyze`,
						json: true,
					};

					const analyzerResults = await this.helpers.httpRequest(analyzeOptions);

					// Then, anonymize using the results
					const anonymizeBody: IDataObject = {
						text,
						language,
						analyzer_results: analyzerResults,
					};

					if (anonymizationFields.anonymizers) {
						const anonymizersStr = anonymizationFields.anonymizers as string;
						anonymizeBody.anonymizers = typeof anonymizersStr === 'string' ? JSON.parse(anonymizersStr) : anonymizersStr;
					}

					const anonymizeOptions: IHttpRequestOptions = {
						method: 'POST' as IHttpRequestMethods,
						body: anonymizeBody,
						url: `${anonymizerEndpoint}/anonymize`,
						json: true,
					};

					const anonymizeResult = await this.helpers.httpRequest(anonymizeOptions);

					// Return both results
					responseData = {
						analyzerResults,
						anonymizedText: anonymizeResult,
					};
				}

				returnData.push({
					json: responseData,
					pairedItem: { item: i },
				});

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error, {
					itemIndex: i,
				});
			}
		}

		return [returnData];
	}
}
