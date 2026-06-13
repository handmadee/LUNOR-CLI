---
name: backend-auth
description: Design, review, or refactor backend authentication and authorization systems, including sessions, JWTs, OAuth, RBAC, ABAC, API keys, and permission checks.
---

# Backend Auth

## Instructions

1. Separate authentication, authorization, and account lifecycle decisions.
2. Keep token parsing and permission checks near trust boundaries.
3. Prefer explicit permission checks over role-name shortcuts.
4. Treat session secrets, refresh tokens, and API keys as non-loggable.
5. Test login, logout, refresh, expired token, revoked token, and privilege escalation attempts.

## Review Checklist

- Auth middleware cannot be bypassed by alternate routes.
- Permission checks are resource-scoped.
- Token/session invalidation is documented.
- Sensitive auth failures return stable, non-enumerating errors.
