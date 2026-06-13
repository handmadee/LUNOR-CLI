---
name: payment-extension
description: Design, implement, or review payment extensions, checkout integrations, webhook handling, idempotency, and payment-provider adapter boundaries.
---

# Payment Extension

## Instructions

Use this skill for payment-specific extension work.

1. Treat provider APIs as adapters, not business logic.
2. Require idempotency for checkout creation, payment confirmation, refunds, and webhook processing.
3. Verify webhook signatures before parsing trusted business events.
4. Store only non-sensitive payment references.
5. Model failure states explicitly: pending, authorized, captured, failed, refunded, disputed.

## Review Checklist

- Webhook signature verification is mandatory.
- Retry behavior is idempotent.
- Provider-specific code is isolated behind an adapter.
- No card data or secrets are logged.
- Tests cover duplicate webhook delivery and failed provider calls.
