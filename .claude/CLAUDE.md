# LUNOR KIT — Claude Configuration

## Skills

The following skills are available in `.claude/skills/`. Claude automatically discovers and uses them:

### `/browse` — QA Testing & Dogfooding
Headless Chromium browser for UI testing, screenshots, form automation, and accessibility checks.
- Skill: `.claude/skills/browse/`
- Usage: `$B goto <url>`, `$B snapshot -i`, `$B screenshot /tmp/out.png`

### `/ship` — Ship Workflow
End-to-end feature shipping checklist: tests, review, merge, and deployment.
- Skill: `.claude/skills/ship/`

### `/review` — PR Review
Code review with Greptile triage and structured checklist.
- Skill: `.claude/skills/review/`

### `/plan-ceo-review` — CEO Plan Review
Business and product-level plan review from a CEO perspective.
- Skill: `.claude/skills/plan-ceo-review/`

### `/plan-eng-review` — Engineering Plan Review
Technical plan review focusing on architecture, system design, and engineering quality.
- Skill: `.claude/skills/plan-eng-review/`

### `/retro` — Retrospective
Sprint/milestone retrospective workflow.
- Skill: `.claude/skills/retro/`

---

## How to use skills

Reference a skill with the slash command (e.g. `/ship`) or describe your intent and Claude will activate the appropriate skill automatically.

The `browse` binary path:
```bash
B=~/.claude/skills/gstack/browse/dist/browse
# or (local copy):
B="$(pwd)/.claude/skills/browse/dist/browse"
```

## Agent skills (for Antigravity / other AI agents)

Additional project-specific skills live in `.agent/skills/`:
- `design-ux-specialist` — UI/UX design with Antigravity Design System
- `engine-architect` — Backend architecture patterns (NestJS, SOLID)
- `orchestrator-manager` — Multi-agent orchestration
- `product-brainstormer` — Product brainstorming and ideation
- `qa-security-auditor` — QA and security audit workflows
- `senior-coder` — Senior-level coding standards

Workflows are in `.agent/workflows/`.
