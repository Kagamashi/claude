# Azure AI Foundry & Azure OpenAI

Two related but distinct services that are often used together.

## Files in This Directory

| File | Contents |
|------|----------|
| [azure-openai.md](azure-openai.md) | Azure OpenAI Service: deployments, API, models, auth |
| [foundry.md](foundry.md) | Azure AI Foundry: hub/project structure, model catalog, inference |

---

## How They Relate

```
┌─────────────────────────────────────────────────────────────┐
│                    Azure AI Foundry                         │
│                                                             │
│  Hub (shared infra)                                         │
│  └── Project (workspace)                                    │
│       ├── Connections ──────────────────────┐              │
│       ├── Deployments (OpenAI models)        │              │
│       └── Deployments (OSS models)           │              │
└──────────────────────────────────────────────│──────────────┘
                                               │ connects to
                                               ▼
                              ┌──────────────────────────────┐
                              │   Azure OpenAI Service       │
                              │   {name}.openai.azure.com    │
                              │                              │
                              │   Deployment: gpt-4o-prod    │
                              │   Deployment: embeddings-v3  │
                              └──────────────────────────────┘
```

**Azure OpenAI** is the raw infrastructure — a managed endpoint for OpenAI models with deployments, quotas, and scaling.

**Azure AI Foundry** is the platform layer on top — it adds project management, model catalog (1800+ models including non-OpenAI), evaluations, prompt flow, and a unified inference API. OpenAI model deployments in Foundry are backed by Azure OpenAI under the hood.

---

## When to Use What

| Scenario | Use |
|----------|-----|
| Just calling GPT-4o from your app | Azure OpenAI directly |
| Need other models (Llama, Mistral, Phi) | Azure AI Foundry |
| Building/evaluating AI pipelines | Azure AI Foundry |
| Need unified endpoint across model families | Azure AI Foundry |
| PTU reservations and quota management | Azure OpenAI |
| Team collaboration, experiments, tracing | Azure AI Foundry |

You can use Azure OpenAI standalone without Foundry. Foundry always has an Azure OpenAI resource behind it for OpenAI models.

---

## Quick Auth Reference

| Service | API Key Header | Entra Scope |
|---------|---------------|-------------|
| Azure OpenAI | `api-key: {key}` | `https://cognitiveservices.azure.com/.default` |
| Azure AI Foundry | `api-key: {key}` | `https://ml.azure.com/.default` |
