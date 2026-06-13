# LUNOR KIT CLI

LUNOR KIT command center for AI model management and skill orchestration.

## Features

✨ **Beautiful TUI Dashboard** - Interactive terminal UI with real-time status  
🔐 **Secure Key Management** - AES-256 encrypted key storage  
🎯 **Smart Presets** - Pre-configured model combinations  
📊 **Usage Analytics** - Track your model usage over time  
🔍 **Fuzzy Search** - Quick model lookup  
⚙️ **Configuration Management** - YAML-based config with backup/restore  
🐚 **Shell Integration** - Seamless zsh integration  

## Installation

### Quick Install

```bash
cd /Users/admin/LUNOR-CLI
npm install
npm run build
npm link
```

### Manual Install

```bash
npm run build
cp dist/index.js ~/.local/bin/lunor
chmod +x ~/.local/bin/lunor
```

### Setup Shell Integration

```bash
lunor init zsh >> ~/.zshrc
source ~/.zshrc
```

### Add API Key

```bash
lunor keys add
```

## Usage

### Basic Commands

```bash
lunor list                    # List all models
lunor list GPT                # List GPT models only
lunor search codex            # Search for models

lunor use coding              # Switch to coding preset
lunor set gpt-5.2             # Set single model for all slots

lunor show                    # Show current config
lunor status                  # Interactive dashboard
```

### Codex Kit

```bash
lunor codex info              # Show Codex Kit path and stats
lunor codex list              # List all Codex Kit skills
lunor codex run plan          # Print a skill's SKILL.md content
lunor codex harmet            # Show the 7-stage harmet chain
lunor codex install           # Install skills into .agents/skills/
```

### Preset Management

```bash
lunor presets list            # List all presets
lunor presets search claude   # Search presets
```

### Key Management

```bash
lunor keys add                # Add API key
lunor keys list               # List keys
lunor keys test               # Test key
lunor keys remove             # Remove key
```

### Analytics

```bash
lunor stats summary           # Usage summary
lunor stats history           # Usage history
lunor stats export            # Export data
```

### Configuration

```bash
lunor config get              # Show all config
lunor config get logLevel     # Get specific value
lunor config set logLevel debug
lunor config backup           # Backup config
lunor config restore          # Restore config
```

### Utilities

```bash
lunor doctor                  # Health check
lunor completion zsh > ~/.zsh/completions/_lunor
lunor off                     # Disable Lunor
```

## Presets

| Preset | Description | Use Case |
|--------|-------------|----------|
| `coding` | Claude + Codex Max | General coding (default) |
| `coding-claude` | Full Claude stack | Claude-focused dev |
| `coding-codex` | Full GPT Codex | GPT-focused dev |
| `gpt` | GPT models | GPT tasks |
| `claude` | Claude models | Claude tasks |
| `gemini` | Gemini models | Gemini tasks |
| `fast` | Fast models | Quick responses |
| `deepseek` | DeepSeek models | DeepSeek tasks |
| `qwen` | Qwen models | Qwen tasks |
| `vision` | Vision models | Multimodal tasks |

## Configuration

Primary config file: `~/.config/lunor/config.json`

Legacy config-loader file: `~/.config/lunor/config.yml`

```json
{
  "version": "1.0.0",
  "entries": {
    "claude.apiKey": {
      "value": "[encrypted]",
      "encrypted": true,
      "updatedAt": "2026-05-11T00:00:00.000Z"
    }
  }
}
```

## Directory Structure

```
~/.config/lunor/
├── config.json             # Secure provider/config repository
├── config.yml              # Legacy CLI config-loader compatibility
├── keys/
│   └── lunor.key          # Encrypted API key
├── state/
│   └── current.env        # Current active state
├── logs/
│   └── lunor.log          # Application logs
└── analytics.db           # Usage analytics
```

## Development

```bash
npm run dev                 # Run in dev mode
npm run build               # Build TypeScript
npm run test                # Run tests
npm run lint                # Lint code
npm run typecheck           # Type check
```

## Architecture

```
src/
├── core/                   # Core business logic
│   ├── model-registry.ts
│   ├── preset-manager.ts
│   ├── state-manager.ts
│   └── config-loader.ts
├── services/               # External services
│   ├── key-service.ts
│   ├── analytics-service.ts
│   └── search-service.ts
├── commands/               # CLI commands
├── ui/                     # TUI components
├── utils/                  # Utilities
└── types/                  # TypeScript types
```

## License

MIT
