# APIM Policies

Policies are XML snippets applied to requests at different stages. They're the core of APIM's power.

---

## Policy Structure

```xml
<policies>
  <inbound>
    <!-- Runs on incoming request, before backend -->
    <base />   <!-- inherits parent scope policies -->
  </inbound>

  <backend>
    <!-- Controls how request is forwarded to backend -->
    <base />
  </backend>

  <outbound>
    <!-- Runs on response, before returning to client -->
    <base />
  </outbound>

  <on-error>
    <!-- Runs if any policy throws an exception -->
    <base />
  </on-error>
</policies>
```

Policy scopes (most to least specific — lower scope inherits `<base />` from higher):
```
Global → Product → API → Operation
```

---

## Common Policies

### Authentication

**Validate JWT (Entra / OAuth 2.0)**
```xml
<validate-jwt header-name="Authorization"
  failed-validation-httpcode="401"
  failed-validation-error-message="Unauthorized">
  <openid-config url="https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration" />
  <audiences><audience>api://{app-id}</audience></audiences>
  <issuers>
    <issuer>https://sts.windows.net/{tenant}/</issuer>
    <issuer>https://login.microsoftonline.com/{tenant}/v2.0</issuer>
  </issuers>
</validate-jwt>
```

**Require subscription key**
```xml
<!-- Already enforced by product subscription, but explicit: -->
<check-header name="Ocp-Apim-Subscription-Key" failed-check-httpcode="401"
  failed-check-error-message="Missing subscription key" ignore-case="true">
</check-header>
```

### Rate Limiting

**Rate limit by subscription**
```xml
<rate-limit calls="100" renewal-period="60" />
```

**Rate limit by IP**
```xml
<rate-limit-by-key calls="50" renewal-period="60"
  counter-key="@(context.Request.IpAddress)" />
```

**Quota (total calls over a period)**
```xml
<quota calls="10000" bandwidth="40000" renewal-period="3600" />
```

### Headers

**Set header**
```xml
<set-header name="X-Custom-Header" exists-action="override">
  <value>my-value</value>
</set-header>
```

**Remove header**
```xml
<set-header name="X-Internal-Secret" exists-action="delete" />
```

**Read a JWT claim and pass as header**
```xml
<set-header name="X-User-Oid" exists-action="override">
  <value>@(context.Request.Headers.GetValueOrDefault("Authorization","")
    .Split(' ').Last().AsJwt()?.Claims["oid"].FirstOrDefault() ?? "")</value>
</set-header>
```

### URL Rewriting

**Rewrite backend URL**
```xml
<!-- Incoming: /api/v1/users  →  Backend: /internal/users -->
<rewrite-uri template="/internal/users" copy-unmatched-params="true" />
```

**Set backend service dynamically**
```xml
<set-backend-service base-url="https://my-backend.azurewebsites.net" />
```

### CORS

```xml
<cors allow-credentials="true">
  <allowed-origins>
    <origin>https://my-app.com</origin>
    <origin>http://localhost:3000</origin>
  </allowed-origins>
  <allowed-methods preflight-result-max-age="300">
    <method>GET</method>
    <method>POST</method>
    <method>PUT</method>
    <method>DELETE</method>
    <method>OPTIONS</method>
  </allowed-methods>
  <allowed-headers>
    <header>Authorization</header>
    <header>Content-Type</header>
    <header>Ocp-Apim-Subscription-Key</header>
  </allowed-headers>
</cors>
```

### Caching

**Cache response**
```xml
<cache-lookup vary-by-developer="false" vary-by-developer-groups="false" />
<!-- in outbound: -->
<cache-store duration="600" />  <!-- cache for 10 minutes -->
```

### Response Transformation

**Return mock response (bypass backend)**
```xml
<return-response>
  <set-status code="200" reason="OK" />
  <set-header name="Content-Type" exists-action="override">
    <value>application/json</value>
  </set-header>
  <set-body>{"status": "ok"}</set-body>
</return-response>
```

**Modify JSON response body**
```xml
<find-and-replace from="internal-hostname.local" to="api.public.com" />
```

### IP Filtering

```xml
<ip-filter action="allow">
  <address>203.0.113.0</address>
  <address-range from="10.0.0.0" to="10.0.0.255" />
</ip-filter>
```

---

## Policy Expressions

Policies support C# expressions in `@(...)`:

```xml
<!-- Current timestamp -->
<value>@(DateTime.UtcNow.ToString("o"))</value>

<!-- JWT claim extraction -->
<value>@(context.Request.Headers["Authorization"].First()
  .Split(' ')[1].AsJwt()?.Claims["email"].FirstOrDefault())</value>

<!-- Conditional logic -->
<value>@(context.Request.Headers.ContainsKey("X-Debug") ? "debug" : "prod")</value>

<!-- Named value reference -->
<value>{{my-named-value}}</value>
```

### Useful `context` Properties

| Property | Value |
|----------|-------|
| `context.Request.IpAddress` | Client IP |
| `context.Request.Headers["name"]` | Request header |
| `context.Request.OriginalUrl.Path` | Request path |
| `context.Subscription.Name` | Subscription name |
| `context.User.Id` | Authenticated user ID |
| `context.Response.StatusCode` | Response status (outbound) |

---

## Named Values

Store secrets/config in APIM and reference in policies:

```xml
<set-header name="X-Api-Key" exists-action="override">
  <value>{{backend-api-key}}</value>  <!-- references Named Value -->
</set-header>
```

Named values can be:
- Plain text
- Secret (masked)
- Key Vault reference (auto-rotated from Azure Key Vault)

---

## Debugging Tips

- **APIM Trace**: Enable tracing on a request to see which policies ran and their results
- **Test console**: Azure Portal → API → Operation → Test tab — shows full policy trace
- **`return-response`**: Temporarily return early to debug what values are available
- Policy validation errors appear at save time in the portal — fix before deploying
