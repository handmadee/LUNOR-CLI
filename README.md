# LUNOR KIT

> Workspace — AI Agent Toolchain & Automation Suite

---

## Architecture

```
LUNOR KIT/
├── claude-ecosystem/        ← Mọi thứ phục vụ Claude Code
│   ├── claudekit-cli/         CLI bootstrap cho Claude projects
│   └── claudekit-engineering/ Boilerplate template cho AI agent projects
│
├── agentic-frameworks/      ← AI Agent orchestration & skills
│   ├── codex-kit/             Harness + 23 Codex skills + harmet chain
│   └── ui-ux-pro-max-skill/   UI/UX design skill plugin
│
├── lunor-apps/              ← Sản phẩm LUNOR (standalone apps)
│   └── lunor-cli/             TUI CLI để switch AI models
│
├── archive/                 ← Lưu trữ (không active)
│   └── tool-teams/            MS Teams auto-attendance tool
│
├── .agent/                  Workspace-level agent roles (6 roles)
├── .claude/                 Workspace-level Claude skills
└── .serena/                 Serena AI config
```

---

## Zones

### 🟢 `claude-ecosystem/` — Claude Code
Các tool và boilerplate xây dựng riêng cho hệ sinh thái **Claude Code**.

| Project | Package | Description |
|---------|---------|-------------|
| `claudekit-cli` | `claudekit-cli@3.5.2` | CLI tạo & update ClaudeKit projects |
| `claudekit-engineering` | `claudekit-engineer@1.18.0` | Boilerplate dự án với AI agents |

### 🔵 `agentic-frameworks/` — AI Agents
Framework orchestration cho **Codex / multi-agent** workflows.

| Project | Description |
|---------|-------------|
| `codex-kit` | Harness-style skill kit: 23 skills + harmet 7-stage chain |
| `ui-ux-pro-max-skill` | Standalone UI/UX design skill |

### 🟣 `lunor-apps/` — LUNOR Products
Sản phẩm standalone của LUNOR, có thể ship độc lập.

| Project | Description |
|---------|-------------|
| `lunor-cli` | Professional TUI CLI để switch AI models |

---

## Quick Start

```bash
# Claude ecosystem
cd claude-ecosystem/claudekit-cli && bun install && bun run dev

# Agentic framework
cd agentic-frameworks/codex-kit && bash scripts/install.sh

# LUNOR app
cd lunor-apps/lunor-cli && npm install && npm run dev
```

---

## Conventions
- **Naming:** kebab-case tất cả directories
- **Secrets:** Không commit `.env` — dùng `.env.example`
- **Skills:** Project-specific → `.agents/skills/` | Workspace-level → `.agent/skills/`
- **Claude Code tools** → `claude-ecosystem/` | **Agent frameworks** → `agentic-frameworks/`
# LUNOR-CLI
# LUNOR-CLI
