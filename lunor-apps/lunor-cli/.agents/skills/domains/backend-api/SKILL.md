---
name: backend-api
description: Design, review, and refactor production backend APIs. Use when working on routing, controllers, service boundaries, validation, errors, pagination, auth integration, or API contracts.
---

# Backend API

## Instructions

Use this skill to keep backend API work modular, testable, and production-ready.

1. Identify the public contract first: route, method, request shape, response shape, errors, and auth requirements.
2. Keep transport concerns separate from domain logic. Controllers parse and return; services decide.
3. Validate input at the boundary and return stable error codes/messages.
4. Prefer typed interfaces over ad hoc objects.
5. Add tests for success, validation failure, auth failure, and persistence failure paths.

## Review Checklist

- Routes are named consistently and versioning strategy is clear.
- Validation is close to ingress.
- Secrets and provider credentials are never logged.
- Data access does not leak into CLI/UI handlers.
- Error handling is explicit and observable.
