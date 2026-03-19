# Azure OpenAI Service

Microsoft-hosted OpenAI models inside your Azure subscription. Same models as openai.com, but with Azure's security, compliance, VNet support, and billing.

---

## Key Difference from openai.com

| | openai.com | Azure OpenAI |
|--|-----------|--------------|
| Auth | OpenAI API key | Azure API key or Entra ID |
| Data residency | OpenAI's infra | Your Azure region |
| Compliance | OpenAI's | Azure (ISO, SOC2, HIPAA, etc.) |
| API | `/v1/chat/completions` | `/openai/deployments/{name}/chat/completions` |
| Model access | By model name | By **deployment name** (you choose) |
| Rate limits | OpenAI quotas | Azure quotas (TPM per region/model) |

---

## Resource Structure

```
Azure Subscription
└── Resource Group
    └── Azure OpenAI Resource  (Microsoft.CognitiveServices/accounts, kind=OpenAI)
        ├── Endpoint: https://{resource-name}.openai.azure.com/
        ├── Keys: key1, key2
        └── Deployments
            ├── "gpt-4o-prod"       → model: gpt-4o (2024-11-20)
            ├── "gpt-4o-mini"       → model: gpt-4o-mini
            └── "embeddings"        → model: text-embedding-3-large
```

A **deployment** is your named instance of a model. You call the deployment name in API requests, not the model name. This lets you swap models without changing your app code.

---

## Deployment Types

| Type | Billing | Capacity | Best for |
|------|---------|----------|----------|
| **Standard** | Per token | Shared, best-effort | Dev, variable load |
| **Global Standard** | Per token | Shared across Azure regions | Higher throughput needs |
| **PTU** (Provisioned) | Hourly flat rate | Reserved, predictable | Prod, latency-sensitive |
| **Global PTU** | Hourly flat rate | Reserved, globally routed | High-scale prod |

**PTU** = Provisioned Throughput Units. You reserve a block of compute capacity. Consistent low latency, no queuing. Higher cost but predictable.

---

## Available Models (as of 2026)

| Family | Models | Use for |
|--------|--------|---------|
| GPT-4o | gpt-4o, gpt-4o-mini | Chat, reasoning, general purpose |
| o-series | o1, o3, o3-mini | Complex reasoning, math, code |
| GPT-4 | gpt-4, gpt-4-turbo | Legacy, being replaced by 4o |
| Embeddings | text-embedding-3-large, text-embedding-3-small, text-embedding-ada-002 | Vector search, semantic similarity |
| Image | dall-e-3 | Image generation |
| Audio | whisper, tts | Speech-to-text, text-to-speech |

Model availability varies by region. Check: https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models

---

## API Calls

### Base URL
```
https://{resource-name}.openai.azure.com/openai/deployments/{deployment-name}/{endpoint}?api-version={version}
```

Current stable API version: `2024-10-21`
Latest preview: `2025-01-01-preview`

### Chat Completions
```
POST https://{name}.openai.azure.com/openai/deployments/{deployment}/chat/completions?api-version=2024-10-21
api-key: {your-key}
Content-Type: application/json

{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Explain JWT tokens"}
  ],
  "temperature": 0.7,
  "max_tokens": 800
}
```

### Embeddings
```
POST https://{name}.openai.azure.com/openai/deployments/{deployment}/embeddings?api-version=2024-10-21
api-key: {your-key}
Content-Type: application/json

{
  "input": "Text to embed"
}
```

### List Deployments
```
GET https://{name}.openai.azure.com/openai/deployments?api-version=2024-10-21
api-key: {your-key}
```

---

## Authentication

### Option 1: API Key
```python
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint="https://{name}.openai.azure.com/",
    api_key="{your-key}",
    api_version="2024-10-21",
)
```

### Option 2: Entra ID (recommended for production)
No secrets in code — uses managed identity or service principal.

```python
from openai import AzureOpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider

token_provider = get_bearer_token_provider(
    DefaultAzureCredential(),
    "https://cognitiveservices.azure.com/.default"  # Entra scope for Azure OpenAI
)

client = AzureOpenAI(
    azure_endpoint="https://{name}.openai.azure.com/",
    azure_ad_token_provider=token_provider,
    api_version="2024-10-21",
)
```

`DefaultAzureCredential` tries in order: environment vars → managed identity → Azure CLI → etc. In production (container/VM), it uses managed identity automatically.

**Required RBAC role** for Entra auth: `Cognitive Services OpenAI User` (or `Contributor`) on the Azure OpenAI resource.

---

## Using with APIM

When Azure OpenAI is behind APIM (see [apim/entra-mcp-auth.md](../apim/entra-mcp-auth.md)):

```
Client → APIM Gateway → Azure OpenAI
```

APIM rewrites the URL and adds auth to the backend:
```xml
<inbound>
  <!-- Validate caller's Entra token -->
  <validate-jwt header-name="Authorization" ... />

  <!-- Remove caller's token, add APIM's own key to backend -->
  <set-backend-service base-url="https://{name}.openai.azure.com/" />
  <set-header name="api-key" exists-action="override">
    <value>{{azure-openai-key}}</value>  <!-- Named Value in APIM -->
  </set-header>
  <set-header name="Authorization" exists-action="delete" />
</inbound>
```

Benefits: centralized auth, rate limiting, monitoring, URL abstraction.

---

## Important Limits

- **TPM** (Tokens Per Minute) — quota per deployment, adjustable via Azure portal
- **RPM** (Requests Per Minute) — derived from TPM
- Quotas are per region and per model family
- PTU bypasses TPM quotas — you get consistent throughput based on your PTU allocation
- Context window varies per model: 4k → 128k tokens depending on version
