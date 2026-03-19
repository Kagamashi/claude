# Entra Authentication for MCP Servers via APIM

This page explains the complete flow: how a client (Claude Code / MCP client) authenticates through APIM to reach an MCP server, using Microsoft Entra ID (formerly Azure AD).

---

## The Full Picture

```
┌─────────────────┐     1. Get token      ┌───────────────────┐
│  MCP Client     │ ─────────────────────▶ │  Entra ID         │
│  (Claude Code)  │ ◀─────────────────────  │  login.microsoft  │
└─────────────────┘     access_token       └───────────────────┘
        │
        │  2. Call APIM with Bearer token
        ▼
┌─────────────────────────────┐
│  APIM Gateway               │  3. validate-jwt policy
│  {name}.azure-api.net       │     checks token signature,
└─────────────────────────────┘     audience, issuer, expiry
        │
        │  4. Forward request (token valid)
        ▼
┌─────────────────┐
│  MCP Server     │
│  (backend)      │
└─────────────────┘
```

---

## Step 1 — What Is Entra ID?

Entra ID is Microsoft's identity platform. It issues **access tokens** that prove who you are and what you're allowed to do.

Two main flows:
- **Client Credentials** — machine-to-machine, no user. A service authenticates as itself.
- **Authorization Code** — user-interactive. A user logs in and consents.

For MCP servers accessed by Claude Code (no human in the loop) → use **Client Credentials**.

---

## Step 2 — What Is a Bearer Token?

A **Bearer token** is an access token sent in the HTTP `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

"Bearer" means: *whoever bears this token is granted access* — no additional proof needed. That's why HTTPS is essential.

### JWT Format

The token itself is a **JWT** (JSON Web Token) — three base64url-encoded parts separated by dots:

```
eyJhbG...    ←  Header  (algorithm, key ID)
.
eyJpc3M...   ←  Payload (claims: who, what, when, for what)
.
SflKxw...    ←  Signature (cryptographic proof it's genuine)
```

**Key claims in the payload:**

| Claim | Name | Example |
|-------|------|---------|
| `iss` | Issuer | `https://sts.windows.net/{tenant-id}/` |
| `aud` | Audience | `api://mcp-server-app-id` — **must match your app** |
| `sub` | Subject | the identity (user or service principal ID) |
| `oid` | Object ID | unique ID in Entra |
| `exp` | Expiry | Unix timestamp — token invalid after this |
| `iat` | Issued at | when the token was issued |
| `roles` | App roles | `["MCP.Read", "MCP.Write"]` |
| `scp` | Scopes | `"MCP.Access"` (delegated, for user flows) |
| `appid` | App ID | client app that requested the token |

APIM's `validate-jwt` policy checks `iss`, `aud`, `exp`, and the cryptographic signature.

Decode any JWT at https://jwt.ms (safe, decode happens in-browser).

---

## Step 3 — Entra App Registration Setup

You need **two** app registrations in Entra:

### A) The MCP Server App (the resource)
Represents the backend being protected.

1. Azure Portal → Entra ID → App registrations → New registration
   - Name: `mcp-server` (or similar)
2. **Expose an API**:
   - Application ID URI: `api://{app-id}` (auto-generated, keep it)
   - Add a scope: `MCP.Access` (or whatever you want to call it)
3. **App roles** (optional, for role-based access):
   - Add roles: e.g. `MCP.Read`, `MCP.Write`
   - Assignment: `Application` (for service clients)

Key values to note:
- **Application (client) ID** — this becomes the `audience` in your tokens
- **Tenant ID** — your directory, used in all Entra URLs

### B) The MCP Client App (the caller)
Represents Claude Code or whatever is calling APIM.

1. New app registration: `mcp-client`
2. **Certificates & secrets** → New client secret (save it, shown once)
3. **API permissions** → Add permission → My APIs → `mcp-server` → select `MCP.Access` → Grant admin consent

Key values:
- **Client ID** of the client app
- **Client Secret**

---

## Step 4 — Getting a Token (Client Credentials)

The client requests a token from Entra:

### Request
```
POST https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id={mcp-client-app-id}
&client_secret={client-secret}
&scope=api://{mcp-server-app-id}/.default
```

### Response
```json
{
  "token_type": "Bearer",
  "expires_in": 3599,
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

The `scope` uses `/.default` — this requests all the permissions the client has been granted.

### In Code (Python)
```python
import requests

token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
response = requests.post(token_url, data={
    "grant_type": "client_credentials",
    "client_id": client_id,
    "client_secret": client_secret,
    "scope": f"api://{server_app_id}/.default",
})
access_token = response.json()["access_token"]
```

### With Azure SDK (Managed Identity — no secret needed)
```python
from azure.identity import DefaultAzureCredential, ManagedIdentityCredential

# On Azure (VM, Container App, etc.) — no secrets required
credential = ManagedIdentityCredential()
token = credential.get_token(f"api://{server_app_id}/.default")
access_token = token.token
```

---

## Step 5 — Calling APIM

```
GET https://{apim-name}.azure-api.net/mcp/tools
Authorization: Bearer eyJhbGciOiJSUzI1NiI...
Content-Type: application/json
```

Optional (if APIM product requires it):
```
Ocp-Apim-Subscription-Key: {subscription-key}
```

---

## Step 6 — APIM Policy: validate-jwt

This policy goes in the `<inbound>` section of your API or operation in APIM.

```xml
<policies>
  <inbound>
    <base />

    <!-- Validate the Entra Bearer token -->
    <validate-jwt
      header-name="Authorization"
      failed-validation-httpcode="401"
      failed-validation-error-message="Unauthorized. Valid Bearer token required."
      require-expiration-time="true"
      require-signed-tokens="true">

      <!-- APIM fetches public keys from here to verify token signature -->
      <openid-config url="https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid-configuration" />

      <!-- Token's 'aud' claim must match one of these -->
      <audiences>
        <audience>api://{mcp-server-app-id}</audience>
      </audiences>

      <!-- Token's 'iss' claim must match one of these -->
      <issuers>
        <issuer>https://sts.windows.net/{tenant-id}/</issuer>
        <issuer>https://login.microsoftonline.com/{tenant-id}/v2.0</issuer>
      </issuers>

      <!-- Optional: require specific roles in token -->
      <required-claims>
        <claim name="roles" match="any">
          <value>MCP.Read</value>
          <value>MCP.Write</value>
        </claim>
      </required-claims>

    </validate-jwt>

  </inbound>
  <backend>
    <base />
  </backend>
  <outbound>
    <base />
  </outbound>
  <on-error>
    <base />
  </on-error>
</policies>
```

### How validate-jwt Works

1. Extracts the JWT from the `Authorization: Bearer ...` header
2. Fetches the JWKS (public keys) from the OpenID config URL
3. Verifies the token **signature** using those public keys
4. Checks `exp` — rejects expired tokens
5. Checks `aud` — rejects tokens not meant for your app
6. Checks `iss` — rejects tokens from unexpected issuers
7. Checks required claims (roles, etc.) if configured
8. If all pass: request continues to backend
9. If any fail: returns 401 immediately

The OpenID config URL exposes:
```
https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid-configuration
```
Which points to the JWKS endpoint:
```
https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys
```
APIM caches these keys and refreshes them automatically.

---

## MCP-Specific Considerations

### SSE Transport
MCP over SSE uses long-lived HTTP connections. APIM supports SSE but check your tier — Consumption tier has request duration limits.

Add this to the `<backend>` section if using SSE:
```xml
<backend>
  <base />
  <!-- Increase timeout for long-lived SSE connections -->
  <forward-request timeout="300" />
</backend>
```

### CORS (if MCP client runs in browser)
```xml
<inbound>
  <cors allow-credentials="true">
    <allowed-origins>
      <origin>https://your-app.com</origin>
    </allowed-origins>
    <allowed-methods>
      <method>GET</method>
      <method>POST</method>
    </allowed-methods>
    <allowed-headers>
      <header>Authorization</header>
      <header>Content-Type</header>
    </allowed-headers>
  </cors>
  <validate-jwt ...>
    ...
  </validate-jwt>
</inbound>
```

### Pass claims to backend
```xml
<!-- After validate-jwt, inject claims as headers for the backend -->
<set-header name="X-User-Id" exists-action="override">
  <value>@(context.Request.Headers["Authorization"].First().Split(' ')[1]
    .AsJwt()?.Claims["oid"].FirstOrDefault())</value>
</set-header>
```

---

## Complete URL Reference

| URL | Used for |
|-----|---------|
| `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token` | Get access token |
| `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize` | Auth code flow (user login) |
| `https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration` | OpenID metadata (APIM uses this) |
| `https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys` | Public keys for JWT verification |
| `https://{apim}.azure-api.net/{api-path}` | Your API via APIM gateway |

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` | Token missing, expired, or wrong audience | Check token has correct `aud` claim — must match `api://{server-app-id}` |
| `401 IDX10214: Audience validation failed` | `aud` in token doesn't match APIM policy | Ensure `<audience>` in policy exactly matches what Entra issues |
| `401 Issuer validation failed` | Wrong tenant or v1 vs v2 issuer | Add both `sts.windows.net` and `login.microsoftonline.com` issuers to policy |
| `403 Forbidden` | Token valid but missing required role | Check app role assignments and admin consent |
| Token has `scp` not `roles` | Using delegated permission instead of app permission | Use app role (not scope) for client credentials flow |
