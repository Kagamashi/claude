# Azure API Management (APIM)

APIM is a fully managed **gateway** that sits in front of your backend services. It handles auth, rate limiting, transformation, monitoring, and routing — so your backends don't have to.

## Files in This Directory

| File | Contents |
|------|----------|
| [entra-mcp-auth.md](entra-mcp-auth.md) | Full Entra auth flow for MCP servers through APIM |
| [policies.md](policies.md) | Policy syntax, common patterns, examples |

---

## Architecture

```
API Consumer (Claude Code / app / user)
        │
        │  HTTPS request
        ▼
┌─────────────────────────────┐
│     APIM Gateway            │  ← applies policies (auth, rate limit, transform)
│  {name}.azure-api.net       │
└─────────────────────────────┘
        │
        │  forwarded request (possibly modified)
        ▼
Backend Service (your MCP server, REST API, etc.)
```

APIM can front **multiple backends** with different APIs, all under one gateway URL.

---

## Key Components

### API
A collection of operations (HTTP endpoints) grouped together. Each API maps to one backend service.

```
API: "MCP Weather Server"
  GET  /mcp/weather/current
  GET  /mcp/weather/forecast
  POST /mcp/tools/call
```

### Operation
A single HTTP endpoint within an API. Policies can be applied at operation level, API level, or globally.

### Policy
XML rules applied to requests/responses. This is where auth, transformation, and logic live.

**Policy pipeline** — 4 stages per request:
```
Inbound  → [validate token] → [check rate limit] → [modify headers]
Backend  → [retry logic] → [circuit breaker]
Outbound → [transform response] → [inject headers]
On-error → [format error response]
```

### Product
A bundle of APIs with access rules (rate limits, quotas). Consumers subscribe to Products, not APIs directly.

### Subscription
A subscription key (`Ocp-Apim-Subscription-Key`) granted when a consumer subscribes to a Product. Can be required or optional depending on your setup.

### Named Values
Key-value store inside APIM for secrets and config — referenced in policies as `{{my-secret}}`. Supports Azure Key Vault integration.

### Backend
The actual upstream service APIM forwards requests to. Can be a URL, a Logic App, a Function App, etc.

---

## URLs

| URL | Purpose |
|-----|---------|
| `https://{name}.azure-api.net` | Gateway — where API consumers send requests |
| `https://{name}.azure-api.net/{api-path}` | Specific API on the gateway |
| `https://{name}.developer.azure-api.net` | Developer portal — docs, API explorer |
| `https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ApiManagement/service/{name}` | ARM management endpoint |

---

## How Requests Flow

1. Consumer sends `GET https://{apim}.azure-api.net/weather/current` with auth headers
2. APIM matches the path to an API + operation
3. **Inbound policies** run: validate auth, check limits, modify headers
4. APIM forwards request to the backend URL
5. Backend responds
6. **Outbound policies** run: transform response, inject headers
7. APIM returns response to consumer

If any inbound policy fails (e.g. invalid token) → APIM returns an error immediately, backend is never hit.

---

## Pricing / Tiers (summary)

| Tier | Use case |
|------|----------|
| Developer | Non-production, no SLA |
| Basic | Small workloads |
| Standard | Production |
| Premium | Multi-region, VNet, high scale |
| Consumption | Serverless, pay-per-call |
