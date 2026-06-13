# LUNOR-CLI Architecture

## Current State

LUNOR-CLI is currently a single TypeScript package with:

- CLI entrypoint in `src/index.ts`.
- Commander command groups in `src/commands`.
- Existing skill source management in `src/lib/skills`.
- Plugin marketplace support in `src/lib/plugin`.
- Config, env, UI, rule, key, and analytics services spread across `src/lib`, `src/core`, `src/services`, and `src/utils`.

The first production-grade step is not a full rewrite. The repo now introduces a canonical `.agents` skill tree and a small `src/lib/agent-skills` core that can validate, audit, compose, and render canonical skills while legacy commands keep working.

## Canonical Agent Skill Model

`.agents/skills` is the source of truth. Target assistant folders are generated views.

```text
.agents/
  registry/
  skills/
    project-kits/
    domains/
    extensions/
    providers/
    workflows/
  targets/
  templates/
```

Each skill has:

```text
SKILL.md
manifest.json
README.md
scripts/
resources/
examples/
tests/
```

The manifest defines identity, dependency composition, compatible targets, permissions, and trust posture. Project kits compose domain, extension, provider, and workflow skills.

## Runtime Boundaries

- `SkillLoader` reads `.agents/skills`.
- `SkillValidator` enforces naming, required files, dependency integrity, and target compatibility.
- `SkillComposer` resolves dependency graphs without duplicates.
- `SkillRenderer` writes assistant-specific generated files only when explicitly invoked.
- `SkillAuditor` flags risky permissions, shell scripts, network patterns, and secret-like references.

Future package boundaries:

```text
apps/cli
packages/core
packages/skills
packages/tools
packages/providers
packages/config
packages/logger
packages/shared
```

The current implementation keeps those boundaries represented in code under `src/lib/agent-skills` and placeholder package folders. Moving runtime code into workspaces should happen after this behavior is stable.

## Target Adapter Model

- `claude`: `.claude/skills/<skill>/SKILL.md`
- `cursor`: `.cursor/rules/<skill>.md` plus `.cursor/skills/<skill>/SKILL.md`
- `kiro`: `.kiro/steering/<skill>.md` plus `.kiro/skills/<skill>/SKILL.md`
- `antigravity`: `.agent/skills/<skill>/SKILL.md`
- `codex`: `.codex/skills/<skill>/SKILL.md` and root `AGENTS.md`
- `opencode`: `.opencode/agent/<skill>.md`

Adapters do not own domain logic. They only render canonical skills into the shape expected by each assistant.

## Commands

- `lunor targets list`
- `lunor skills validate`
- `lunor skills audit <skill>`
- `lunor skills compose <skill-or-project-kit>`
- `lunor skills compose <skill-or-project-kit> --target cursor`
- `lunor skills sync --target claude|cursor|kiro|antigravity|codex|opencode|gemini|roocode|continue|all`

Legacy `lunor skills init`, `lunor skills copy`, and installed-source flows remain available.

## Migration Plan

1. Keep legacy CLI behavior stable.
2. Grow canonical `.agents` skills and tests.
3. Move generated target folders behind explicit sync commands.
4. Extract `src/lib/agent-skills` into `packages/skills` once imports and tests are stable.
5. Extract shell/filesystem/network execution into `packages/tools` with permission gates.
6. Move CLI command registration to `apps/cli` after package exports are stable.
