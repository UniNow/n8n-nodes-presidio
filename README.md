# Presidio Node for n8n

This custom n8n node integrates Microsoft Presidio for PII (Personally Identifiable Information) detection and anonymization.

## Features

The Presidio node provides three operations:

1. **Analyze** - Detect PII entities in text
2. **Anonymize** - Anonymize text using previously detected entities
3. **Analyze and Anonymize** - Detect and anonymize in one operation (recommended)

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Node

```bash
npm run build
```

### 3. Start Presidio Services

You need to have Presidio Analyzer and Anonymizer services running. The easiest way is using Docker:

```bash
# Start Presidio Analyzer
docker run -d -p 5002:5002 --name presidio-analyzer mcr.microsoft.com/presidio-analyzer

# Start Presidio Anonymizer  
docker run -d -p 5001:5001 --name presidio-anonymizer mcr.microsoft.com/presidio-anonymizer
```

Verify the services are running:
```bash
curl http://localhost:5002/health
curl http://localhost:5001/health
```

### 4. Start n8n Development Server

```bash
npm run dev
```

This will start n8n with your custom Presidio node loaded. Access n8n at `http://localhost:5678`

## Configuration

### Setting up Credentials

1. In n8n, go to **Credentials** > **New Credential**
2. Search for "Presidio API"
3. Configure the endpoints:
   - **Analyzer Endpoint**: `http://localhost:5002` (or your Presidio Analyzer URL)
   - **Anonymizer Endpoint**: `http://localhost:5001` (or your Presidio Anonymizer URL)
4. Save the credentials

## Usage Examples

### Example 1: Analyze and Anonymize (Simple)

1. Add a **Manual Trigger** node
2. Add the **Presidio** node
3. Select operation: **Analyze and Anonymize**
4. Set the text parameter:
   ```
   Hi Joe, how are you doing? Is +1-2345 6789 still your number? And you live in 6th Ave?
   ```
5. Select your Presidio credentials
6. Execute the workflow

Expected output:
```json
{
  "analyzerResults": [
    {
      "entity_type": "PERSON",
      "start": 3,
      "end": 7,
      "score": 0.85
    },
    {
      "entity_type": "PHONE_NUMBER",
      "start": 32,
      "end": 45,
      "score": 0.75
    },
    {
      "entity_type": "LOCATION",
      "start": 70,
      "end": 78,
      "score": 0.85
    }
  ],
  "anonymizedText": {
    "text": "Hi <PERSON>, how are you doing? Is <PHONE_NUMBER> still your number? And you live in <LOCATION>?",
    "items": [...]
  }
}
```

### Example 2: Analyze Only

Use this when you want to inspect what PII entities are detected before anonymizing:

1. Set operation to **Analyze**
2. Optionally specify which entity types to detect (e.g., `PERSON,EMAIL_ADDRESS,PHONE_NUMBER`)
3. Set a score threshold (e.g., 0.7) to filter low-confidence detections
4. Execute to see the detected entities

### Example 3: Two-Step Process (Analyze then Anonymize)

This gives you more control to filter or modify the analyzer results before anonymization:

1. First node: **Presidio** with **Analyze** operation
2. (Optional) Process/filter the results using a **Code** node
3. Second node: **Presidio** with **Anonymize** operation
   - Set text to the original text
   - Set analyzer results to: `{{ $json.analyzerResults }}`

## Advanced Configuration

### Custom Anonymization

You can specify custom anonymization strategies using the **Anonymizers** field:

```json
{
  "PERSON": {
    "type": "replace",
    "new_value": "[REDACTED NAME]"
  },
  "PHONE_NUMBER": {
    "type": "mask",
    "masking_char": "*",
    "chars_to_mask": 12,
    "from_end": false
  }
}
```

### Filtering Entities

In the **Analyze** operation, you can limit detection to specific entity types:

- Set **Entities** to: `PERSON,EMAIL_ADDRESS,PHONE_NUMBER,LOCATION`

### Score Threshold

Set a minimum confidence score (0-1) for entity detection to reduce false positives:

- Set **Score Threshold** to: `0.7`

## Comparison with HTTP Request Workflow

The attached workflow `Anonymize Text.json` used HTTP Request nodes to call Presidio APIs directly. The custom Presidio node provides several advantages:

### Benefits:
- ✅ **Cleaner workflow** - One node instead of two HTTP Request nodes
- ✅ **Better UX** - Proper field labels, descriptions, and validation
- ✅ **Type safety** - Proper handling of JSON parameters
- ✅ **Reusability** - Centralized credential management
- ✅ **Error handling** - Better error messages and handling
- ✅ **Tool integration** - Can be used as an AI tool with `usableAsTool: true`

### HTTP Request Workflow Issues:
- ❌ Manual JSON construction in body parameters
- ❌ No validation of entity types or score thresholds  
- ❌ Endpoint URLs hardcoded in each node
- ❌ Complex expression syntax for passing data between nodes
- ❌ No built-in documentation

## Development

### Running Lint

```bash
npm run lint
```

### Auto-fix Lint Issues

```bash
npm run lint:fix
```

### Building for Production

```bash
npm run build
```

## Troubleshooting

### "Cannot connect to Presidio" errors

- Verify Presidio services are running: `docker ps`
- Check health endpoints: `curl http://localhost:5002/health`
- Ensure correct ports in credentials (5002 for analyzer, 5001 for anonymizer)

### "n8n exited with code 1" during dev

This can happen on first run while dependencies are being installed. Common solutions:
- Wait a few minutes for dependency installation
- Check that package.json has valid values (name, author, etc.)
- Try running `npm run build` before `npm run dev`
- Clear npm cache: `npm cache clean --force`

### Node doesn't appear in n8n

- Verify the build was successful: `npm run build`
- Check that the node is registered in package.json under `n8n.nodes`
- Restart the n8n dev server

## License

MIT

## Resources

- [Presidio Documentation](https://microsoft.github.io/presidio/)
- [n8n Custom Node Development](https://docs.n8n.io/integrations/creating-nodes/)
- [n8n Community Nodes](https://www.npmjs.com/search?q=keywords:n8n-community-node-package)
