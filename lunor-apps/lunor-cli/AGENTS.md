# AGENTS.md

## Project Overview

LUNOR-CLI is a TypeScript ESM CLI for model/provider switching, AI assistant skill installation, rule sync, and canonical agent skill kit generation.

The canonical agent skill source is `.agents/skills`. Assistant-specific folders such as `.claude`, `.cursor`, `.kiro`, `.agent`, `.codex`, and `.opencode` are generated targets or legacy compatibility folders.

## Commands

- Install dependencies: `npm install`
- Typecheck: `npm run typecheck`
- Test: `npm test -- --run`
- Build: `npm run build`
- Run locally: `npm run dev -- <command>`

## Skill Naming Rules

- Use lower-kebab-case folder names.
- Use meaningful domain names: `payment-extension`, not `pay-ext`; `intellectual-property`, not `ip`.
- Put vertical compositions in `.agents/skills/project-kits`.
- Put reusable domains in `.agents/skills/domains`.
- Put product/integration surfaces in `.agents/skills/extensions`.
- Put model/runtime adapters in `.agents/skills/providers`.
- Put repeatable operating procedures in `.agents/skills/workflows`.

## Security Rules

- Treat third-party skills/plugins as untrusted until audited.
- Do not add hard-coded secrets, API keys, tokens, or private URLs.
- Do not add shell/network/browser/MCP permissions to a skill without setting `trust.reviewRequired=true`.
- Generated target files should include a source notice and should be regenerated from `.agents/skills`, not edited as source of truth.

## Testing Instructions

- Add or update focused tests for changed code.
- Run `npm run typecheck` after import or API changes.
- Run `npm test -- --run` before considering CLI behavior safe.
- If a command writes target files, verify it only writes through an explicit command path.
