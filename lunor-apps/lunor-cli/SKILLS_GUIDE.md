# LUNOR CLI — Skills & Plugin Guide

> Hướng dẫn đầy đủ quản lý skills và plugins cho AI coding assistants

---

## 📦 Available Skill Sources

| Key | Name | Type | Stars | Description |
|-----|------|------|-------|-------------|
| `engineering` | LUNOR Engineering | local | — | Professional engineering toolkit, agents & workflows |
| `ui-ux` | LUNOR UX/UI PROMAX | github | — | 50+ UI/UX design styles & patterns |
| `vercel-skills` | Vercel Agent Skills | github | — | Official Vercel agent skills for Claude Code |
| `claudekit-skills` | ClaudeKit Skills | github | 1.8k ⭐ | 40+ skills: AI/ML, Web Dev, DevOps, Debugging |
| `composio-skills` | Composio Awesome Claude Skills | github | 42.6k ⭐ | 30+ curated skills + 78 SaaS automation integrations |
| `antigravity-skills` | Antigravity Awesome Skills | github | 23.1k ⭐ | 1,239+ universal agentic skills for all AI assistants (v7.4.1) |

---

## 🚀 Quick Start

### 1. Install Engineering Skills (Local)

```bash
lunor skills init engineering
# → Prompts: chọn IDE type (claude / cursor / antigravity / ...)
# → Copies .claude/, .agent/, CLAUDE.md, GEMINI.md to project
```

### 2. Install UI/UX Skills

```bash
lunor skills init ui-ux
# → Prompts: chọn AI assistant type
# → Copies design styles, templates to project

# Or specify directly:
lunor skills init ui-ux --ai claude
lunor skills init ui-ux --ai cursor
lunor skills init ui-ux --ai all       # Install for all AI assistants
```

### 3. Install Vercel Agent Skills

```bash
lunor skills init vercel-skills
# → Clones vercel-labs/agent-skills from GitHub
# → Prompts: chọn IDE type
```

### 4. Install ClaudeKit Skills (Plugin Marketplace)

```bash
# Phương án A: Qua plugin marketplace
lunor plugin marketplace add mrgoonie/claudekit-skills
lunor plugin install ai-ml-tools@claudekit-skills
lunor plugin install web-dev-tools@claudekit-skills --ide cursor

# Phương án B: Qua skills init
lunor skills init claudekit-skills
# → Prompts: chọn toàn bộ hoặc1 specific category
```

### 5. Install Composio Awesome Claude Skills

```bash
lunor skills init composio-skills
# → Clones ComposioHQ/awesome-claude-skills từ GitHub (42.6k ⭐)
# → Prompts: chọn IDE type
# → Có: document-processing, dev tools, business automation, v.v.

# Hoặc thêm vào marketplace
lunor plugin marketplace add ComposioHQ/awesome-claude-skills
```

### 6. Install Antigravity Awesome Skills ⭐ Recommended cho Antigravity users

```bash
# Cách 1: Qua LUNOR CLI (clone + copy vào project)
lunor skills init antigravity-skills
# → Clones sickn33/antigravity-awesome-skills từ GitHub (23.1k ⭐)
# → Prompts: chọn IDE type
# → Copy skills/ vào .agent/skills/ hoặc .gemini/antigravity/skills/

# Cách 2: Quick install trực tiếp bằng npx (global, official tool)
npx antigravity-awesome-skills
# → Install vào ~/.gemini/antigravity/skills (Antigravity global)

# Cách 2b: Install cho IDE cụ thể
npx antigravity-awesome-skills --antigravity   # → ~/.gemini/antigravity/skills
npx antigravity-awesome-skills --claude        # → .claude/skills
npx antigravity-awesome-skills --cursor        # → .cursor/skills
npx antigravity-awesome-skills --gemini        # → .gemini/skills
npx antigravity-awesome-skills --codex         # → .codex/skills
npx antigravity-awesome-skills --kiro          # → ~/.kiro/skills
npx antigravity-awesome-skills --path .agent/skills  # custom path

# Verify đã install
test -d ~/.gemini/antigravity/skills && echo "Skills installed!"

# Cách 3: Thêm vào marketplace
lunor plugin marketplace add sickn33/antigravity-awesome-skills
```

**Sau khi cài, dùng luôn:**
```
"Use @brainstorming to plan a SaaS MVP."
"Run @security-auditor on this API endpoint."
"Use @test-driven-development for this feature."
```

**Popular Starter Bundles:**
- Web Dev → `Web Wizard`
- Security → `Security Engineer`
- General → `Essentials`

---

## 🤖 Supported AI Assistants (16 total)

| Flag | AI Assistant | Folders |
|------|-------------|---------|
| `--ai claude` | Claude Code | `.claude/` |
| `--ai cursor` | Cursor | `.cursor/` + `.shared/` |
| `--ai windsurf` | Windsurf | `.windsurf/` + `.shared/` |
| `--ai antigravity` | Antigravity | `.agent/` + `.shared/` |
| `--ai copilot` | GitHub Copilot | `.github/` + `.shared/` |
| `--ai kiro` | Kiro | `.kiro/` + `.shared/` |
| `--ai codex` | Codex CLI | `.codex/` |
| `--ai roocode` | Roo Code | `.roo/` + `.shared/` |
| `--ai qoder` | Qoder | `.qoder/` + `.shared/` |
| `--ai gemini` | Gemini CLI | `.gemini/` + `.shared/` |
| `--ai codebuddy` | CodeBuddy | `.codebuddy/` + `.shared/` |
| `--ai trae` | Trae | `.trae/` + `.shared/` |
| `--ai opencode` | OpenCode | `.opencode/` + `.shared/` |
| `--ai continue` | Continue | `.continue/` + `.shared/` |
| `--ai droid` | Droid (Factory) | `.droid/` + `.shared/` |
| `--ai all` | All assistants | All folders above |

---

## 🛒 Plugin Marketplace Commands

```bash
# Thêm repo vào marketplace
lunor plugin marketplace add mrgoonie/claudekit-skills
lunor plugin marketplace add ComposioHQ/awesome-claude-skills
lunor plugin marketplace add vercel-labs/agent-skills

# Xem danh sách repos đã add
lunor plugin list

# Xem categories của 1 repo
lunor plugin marketplace list

# Install category cụ thể
lunor plugin install ai-ml-tools@claudekit-skills
lunor plugin install ai-ml-tools@claudekit-skills --ide cursor
lunor plugin install ai-ml-tools@claudekit-skills --ide all  # All AI assistants
lunor plugin install ai-ml-tools@claudekit-skills --overwrite  # Force overwrite
```

### ClaudeKit Skills Categories

| Category | Mô tả |
|----------|-------|
| `ai-ml-tools` | Gemini API, context-engineering, Google ADK |
| `web-dev-tools` | React, Next.js, Tailwind, Three.js |
| `devops-tools` | Cloudflare, Docker, GCP, Databases |
| `backend-tools` | Node.js, Python, Go, Authentication |
| `document-processing` | Word, PDF, PowerPoint, Excel |
| `debugging-tools` | Systematic debugging frameworks |
| `problem-solving-tools` | Advanced thinking techniques |
| `platform-tools` | Shopify, Payments, MCP management |
| `meta-tools` | Skill creation, code review |
| `media-tools` | FFmpeg, ImageMagick |
| `research-tools` | Documentation discovery |
| `specialized-tools` | Sequential thinking, Mermaid diagrams |

---

## 📋 Skills Management

```bash
# Xem tất cả sources
lunor skills list

# Init (interactive)
lunor skills init
lunor skills init <source>

# Update từ remote
lunor skills update
lunor skills update <source>

# Remove skill
lunor skills remove <source>

# Refresh (remove + init)
lunor skills refresh <source>

# Browse với SKILL.md preview
lunor skills browse

# Copy skills sang project
lunor skills copy

# Tạo custom skill từ template
lunor skills new
```

---

## 💡 Usage Examples

### Setup project mới với đầy đủ AI support

```bash
cd my-project

# Engineering base
lunor skills init engineering --ide all

# UI/UX cho tất cả AI assistants
lunor skills init ui-ux --ai all

# Thêm AI/ML tools từ marketplace
lunor plugin marketplace add mrgoonie/claudekit-skills
lunor plugin install ai-ml-tools@claudekit-skills --ide all --overwrite
```

### Setup nhanh cho Claude Code

```bash
lunor skills init engineering --ide claude
lunor skills init ui-ux --ai claude
```

### Setup cho Cursor

```bash
lunor skills init engineering --ide cursor
lunor skills init ui-ux --ai cursor
```

---

## 🔗 Repositories

| Repo | Link | Stars |
|------|------|-------|
| LUNOR Engineering | Internal | — |
| LUNOR UX/UI PROMAX | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | — |
| Vercel Agent Skills | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | — |
| ClaudeKit Skills | [mrgoonie/claudekit-skills](https://github.com/mrgoonie/claudekit-skills) | 1.8k ⭐ |
| Composio Awesome Claude Skills | [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) | 42.6k ⭐ |
| Antigravity Awesome Skills | [sickn33/antigravity-awesome-skills](https://github.com/sickn33/antigravity-awesome-skills) | 23.1k ⭐ |

---

## 🛠 Tips

- **Nếu skill đã tồn tại**: Dùng `--yes` hoặc `--overwrite` để force overwrite
- **IDE type**: Dùng `--ide all` để copy cho tất cả IDEs cùng lúc
- **GitHub sources**: Được clone về `~/.config/lunor/skills/` lần đầu, lần sau `update` sẽ `git pull`
- **Plugin manifest**: Lưu tại `~/.config/lunor/plugins/manifest.json`
