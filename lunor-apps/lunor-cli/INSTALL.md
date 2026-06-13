# 📦 Installation Guide

## Quick Install (Automated)

```bash
./install.sh
```

The script will:
1. ✅ Check Node.js & npm (requires Node 20+)
2. ✅ Install dependencies
3. ✅ Build TypeScript
4. ✅ Setup config directories
5. ✅ Setup agent rule directories
6. ✅ Install globally (`npm link`)
7. ✅ Setup shell integration
8. ✅ Verify installation

## Manual Install

### 1. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 2. Build Project

```bash
npm run build
```

### 3. Link Globally

```bash
npm link
```

### 4. Setup Shell Integration

Add to `~/.zshrc`:

```bash
# Lunor CLI Shell Integration
lunor() {
  # If requesting help, bypass eval/emit and run directly
  for arg in "$@"; do
    if [[ "$arg" == "-h" || "$arg" == "--help" ]]; then
      command lunor "$@"
      return
    fi
  done

  case "$1" in
    use|set|off|reset)
      eval "$(command lunor __emit "$@")"
      ;;
    *)
      command lunor "$@"
      ;;
  esac
}
```

Or use:

```bash
lunor init zsh >> ~/.zshrc
source ~/.zshrc
```

### 5. Setup Config Directories

```bash
mkdir -p ~/.config/lunor/{keys,state,logs}
chmod 700 ~/.config/lunor ~/.config/lunor/keys ~/.config/lunor/state
```

### 6. Optional Agent Rule Directories

```bash
mkdir -p ~/.cursor/rules ~/.agent/rules ~/.claude/rules ~/.kiro/steering
```

## Verify Installation

```bash
lunor --version
lunor doctor
```

## First Steps

```bash
# 1. Add API key
lunor keys add

# 2. Activate preset
lunor use coding

# 3. Check status
lunor status

# 4. List models
lunor list
```

## Full Token Mode

`lunor use <preset>` and `lunor set <model>` export Claude Code token limits at a high ceiling by default:

```bash
export CLAUDE_CODE_MAX_OUTPUT_TOKENS="32000"
export MAX_THINKING_TOKENS="31999"
export CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS="200000"
export MAX_MCP_OUTPUT_TOKENS="200000"
```

This opens the CLI for full-token workflows without adding a Lunor-side cap. Model and provider hard limits still apply, so this is "maximum practical" rather than truly infinite tokens.

## Uninstall

```bash
./uninstall.sh
```

Or manually:

```bash
npm unlink -g lunor-cli
rm -rf ~/.config/lunor
# Remove shell integration from ~/.zshrc
```

## Troubleshooting

### Command not found after install

```bash
# Restart shell
exec zsh

# Or reload config
source ~/.zshrc
```

### npm link fails

Use manual install:

```bash
mkdir -p ~/.local/bin
cp dist/index.js ~/.local/bin/lunor
chmod +x ~/.local/bin/lunor

# Add to PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Permission errors

```bash
# Fix ownership
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) ~/.nvm

# Or use sudo
sudo npm link
```

## System Requirements

- **Node.js**: v20.0.0 or higher
- **npm**: v9.0.0 or higher
- **OS**: macOS, Linux
- **Shell**: zsh (bash compatible)

## Development Setup

```bash
# Install dependencies
npm install

# Run in dev mode
npm run dev

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Type check
npm run typecheck
```

## Scripts Reference

| Script | Description |
|--------|-------------|
| `./install.sh` | Automated installation |
| `./uninstall.sh` | Remove Lunor CLI |
| `npm run dev` | Development mode |
| `npm run build` | Build TypeScript |
| `npm test` | Run tests |
| `npm link` | Install globally |

## Directory Structure

```
~/.config/lunor/
├── config.json         # Secure provider/config repository
├── config.yml          # Legacy CLI config-loader compatibility
├── keys/
│   └── lunor.key      # Encrypted API key
├── state/
│   └── current.env    # Active state
├── logs/
│   └── lunor.log      # Application logs
└── analytics.db       # Usage database
```

## Configuration

Primary config file: `~/.config/lunor/config.json`

Legacy config-loader file: `~/.config/lunor/config.yml`

```yaml
baseUrl: https://proxy.lunor.cloud
keyFile: ~/.config/lunor/keys/lunor.key
stateDir: ~/.config/lunor/state
maxRetries: 3
timeout: 30000
logLevel: info
cacheEnabled: true
cacheTtl: 300
```

Edit with:

```bash
lunor config get
lunor config set logLevel debug
```
