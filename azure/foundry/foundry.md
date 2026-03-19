# Azure AI Foundry

Azure AI Foundry (formerly Azure AI Studio) is Microsoft's platform for building, evaluating, and deploying AI applications. It adds a management and collaboration layer on top of Azure OpenAI and other model providers.

Portal: https://ai.azure.com

---

## Hub / Project Structure

Everything in Foundry is organized in a two-level hierarchy:

```
Azure AI Hub  (shared infrastructure)
├── Compute (GPU clusters, serverless)
├── Storage Account
├── Key Vault
├── Container Registry
├── Managed Identity
├── Network settings (VNet, private endpoints)
├── Connected Resources
│   ├── Azure OpenAI: {name}.openai.azure.com
│   ├── Azure AI Search
│   ├── Azure Blob Storage
│   └── ...
│
└── Project A  (team workspace)
    ├── Inherits Hub connections
    ├── Model Deployments
    ├── Evaluations
    ├── Prompt flows
    ├── Datasets
    └── Tracing / Monitoring

└── Project B
    └── ...
```

**Hub** — created once per org/team. Shared compute, security, and connections. Multiple projects share one Hub.

**Project** — isolated workspace for a use case. Has its own endpoint, deployments, and experiments. Access controlled at project level.

---

## Connections

Connections link a Hub to external Azure resources. Once added at Hub level, all projects inherit them.

| Connection type | What it provides |
|----------------|------------------|
| Azure OpenAI | GPT-4o, embeddings, DALL-E deployments |
| Azure AI Search | Vector search, hybrid retrieval |
| Azure Blob Storage | Datasets, files |
| Azure Content Safety | Content filtering |
| Serverless API | Pay-per-token OSS models (Llama, Mistral, etc.) |
| Custom | Any REST endpoint |

When you deploy an OpenAI model from Foundry's model catalog, it creates a deployment in the **connected Azure OpenAI resource**.

---

## Model Catalog

Foundry's catalog has 1800+ models across three categories:

| Category | Examples | Deployment type |
|----------|----------|-----------------|
| **Azure OpenAI** | GPT-4o, o1, DALL-E 3, Whisper | Azure OpenAI deployment |
| **Open source** (serverless) | Llama 3, Mistral, Phi-4, Cohere | Serverless API (pay-per-token) |
| **Open source** (managed compute) | Any HuggingFace model | Dedicated GPU compute |

Serverless API models (Llama, Mistral, etc.) are hosted by Microsoft — no GPU management. You pay per token. Billed through Azure, not separate accounts.

---

## Inference Endpoint

Each Foundry project gets a project-level inference endpoint:

```
https://{project-name}.{region}.models.ai.azure.com
```

This is a **unified endpoint** — you can call any model deployed in the project through it, using the Azure AI Inference SDK or the OpenAI SDK (for OpenAI-compatible models).

### Azure AI Inference SDK (unified, all models)
```python
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential

client = ChatCompletionsClient(
    endpoint="https://{project}.{region}.models.ai.azure.com",
    credential=AzureKeyCredential("{project-api-key}"),
)

response = client.complete(
    model="gpt-4o",         # deployment name in this project
    messages=[
        SystemMessage("You are a helpful assistant."),
        UserMessage("Explain Azure AI Foundry"),
    ],
)
print(response.choices[0].message.content)
```

### OpenAI SDK (for OpenAI-compatible models only)
```python
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint="https://{project}.{region}.models.ai.azure.com",
    api_key="{project-api-key}",
    api_version="2024-10-21",
)
```

### With Entra ID
```python
from azure.identity import DefaultAzureCredential
from azure.ai.inference import ChatCompletionsClient

client = ChatCompletionsClient(
    endpoint="https://{project}.{region}.models.ai.azure.com",
    credential=DefaultAzureCredential(),
    credential_scopes=["https://ml.azure.com/.default"],
)
```

---

## How Foundry Deployments Connect to Azure OpenAI

When you deploy a GPT-4o model from Foundry's catalog:

```
Foundry Project
    └── Deploy "gpt-4o" from catalog
              │
              │ creates deployment in →
              ▼
    Connected Azure OpenAI Resource
        └── Deployment: "gpt-4o"  (gpt-4o-2024-11-20)
```

The deployment physically lives in Azure OpenAI. Foundry is the management layer.

You can call it via either:
- The Azure OpenAI endpoint directly: `https://{aoai-name}.openai.azure.com/openai/deployments/gpt-4o/...`
- The Foundry project endpoint: `https://{project}.{region}.models.ai.azure.com`

Both reach the same deployment. The Foundry endpoint adds:
- Unified auth (one key/token for all models in the project)
- Tracing and observability
- Model routing (swap model without changing endpoint)

---

## Key Features

### Prompt Flow
Visual or code-based pipeline builder. Chain LLM calls, tools, and data retrieval into a flow. Can be deployed as an endpoint.

```
Input → Retrieve from AI Search → GPT-4o → Post-process → Output
```

### Evaluations
Run a dataset through your prompt/flow and score outputs automatically.
- Built-in metrics: groundedness, coherence, fluency, relevance
- Custom metrics using LLM-as-judge

### Tracing
Every request and response is logged (opt-in). View in Foundry portal — see token usage, latency, inputs, outputs per call. Essential for debugging.

### Fine-tuning
Fine-tune GPT-4o-mini and GPT-4o on your own data directly from Foundry UI. Creates a new Azure OpenAI deployment with your fine-tuned model.

---

## Foundry vs Direct Azure OpenAI — Which Endpoint to Use

```
Need multiple model families  →  Foundry project endpoint
Need only OpenAI models       →  Either (Azure OpenAI is simpler)
Need model portability        →  Foundry (swap models without code changes)
Need evaluations/tracing      →  Foundry
Building RAG pipelines        →  Foundry (AI Search integration built-in)
Scripting/automation          →  Azure OpenAI direct (fewer abstractions)
Behind APIM                   →  Azure OpenAI direct (APIM routes to it)
```

---

## Resource Naming & ARM

| Resource | ARM type |
|----------|----------|
| Azure OpenAI | `Microsoft.CognitiveServices/accounts` (kind: `OpenAI`) |
| AI Foundry Hub | `Microsoft.MachineLearningServices/workspaces` (kind: `Hub`) |
| AI Foundry Project | `Microsoft.MachineLearningServices/workspaces` (kind: `Project`) |

Foundry Hub and Projects are ARM resources — can be created with Bicep/Terraform.
