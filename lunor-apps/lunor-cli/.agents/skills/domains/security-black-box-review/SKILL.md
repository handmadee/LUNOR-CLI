---
name: security-black-box-review
description: Perform defensive black-box security review using only authorized docs, UI behavior, API contracts, logs, and safe observations. Use when evaluating exposed product behavior without source-level assumptions.
---

# Security Black Box Review

## Boundaries

This skill is defensive only. Do not provide exploit chains, evasion guidance, credential attacks, persistence, stealth, or unauthorized scanning instructions.

## Instructions

1. Confirm the review is authorized and define the allowed scope.
2. Inventory public surfaces: domains, routes, forms, API contracts, auth flows, webhooks, uploads, and integrations.
3. Review expected behavior against security properties: auth, authorization, input handling, rate limits, error disclosure, and data exposure.
4. Record evidence as observations and risks, not attack instructions.
5. Recommend mitigations, tests, logging, and owner follow-up.

## Output

- Scope reviewed
- Observations
- Risk rating
- Evidence
- Recommended fix
- Verification test
