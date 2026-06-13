---
name: smart-contract-security
description: Perform defensive smart contract security review for invariants, access control, arithmetic, upgradeability, oracle use, token flows, and test coverage.
---

# Smart Contract Security

## Boundaries

This skill is defensive. Do not provide exploit deployment, theft, evasion, or unauthorized interaction guidance.

## Instructions

1. Identify trust assumptions, privileged roles, state-changing entry points, and asset flows.
2. Check invariants before line-level findings.
3. Review access control, reentrancy, arithmetic, upgradeability, oracle assumptions, and pause/recovery paths.
4. Recommend property tests, fuzz targets, and invariant tests.
5. Report risks with impact, likelihood, evidence, and mitigation.
