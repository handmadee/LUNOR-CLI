---
name: security-appsec
description: Review application security for auth, authorization, secrets, input validation, dependency trust, logging, and data boundary risks.
---

# Security AppSec

## Instructions

1. Identify trust boundaries before reviewing code.
2. Check authn/authz separately.
3. Validate inputs at all external boundaries.
4. Treat secrets and customer data as non-loggable.
5. Prefer allowlists and explicit permissions over broad execution.
