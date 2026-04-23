# Security Policy

## Reporting a vulnerability

Email **security@maestring.com**. Include reproduction steps, affected
endpoints/components, and impact. PGP welcome (key on request).

We acknowledge within **2 business days** and target remediation within:

| Severity | Target |
|---|---|
| Critical (RCE, auth bypass, data exfiltration) | 7 days |
| High (privilege escalation, PII leak) | 14 days |
| Medium | 30 days |
| Low / informational | 90 days |

Please do not:
- Access or modify data that isn't yours — use a test account you own
- Run automated scanners or load tests against production without coordination
- Publicly disclose before we've had a chance to remediate

See also: [public/.well-known/security.txt](public/.well-known/security.txt),
[docs/security/incident-response.md](docs/security/incident-response.md).
