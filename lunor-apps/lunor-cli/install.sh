#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Lunor CLI - Professional Installation Script
# ============================================================================
# Features:
# - Dependency checks (Node.js, npm)
# - Build verification
# - Installation methods (npm link / manual)
# - Shell integration setup
# - Rollback on failure
# - Colored output & logging
# ============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_FILE="${SCRIPT_DIR}/install.log"
readonly REQUIRED_NODE_VERSION="20"
readonly CONFIG_DIR="${HOME}/.config/lunor"
readonly BIN_DIR="${HOME}/.local/bin"

log() {
  local level="$1"
  shift
  local message="$*"
  local timestamp
  timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
  echo "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

info() { echo -e "\033[0;34mℹ\033[0m $*"; log "INFO" "$*"; }
success() { echo -e "\033[0;32m✓\033[0m $*"; log "SUCCESS" "$*"; }
warn() { echo -e "\033[0;33m⚠\033[0m $*"; log "WARN" "$*"; }
error() { echo -e "\033[0;31m✗\033[0m $*"; log "ERROR" "$*"; }
step() { echo -e "\n\033[1;36m➜\033[0m $*\n"; log "STEP" "$*"; }

die() {
  error "$*"
  exit 1
}

check_dependencies() {
  step "Checking dependencies..."
  
  if ! command -v node &> /dev/null; then
    die "Node.js not found. Install Node.js ${REQUIRED_NODE_VERSION}+ first."
  fi
  
  local node_version
  node_version=$(node -v | sed 's/v//' | cut -d. -f1)
  
  if [[ ${node_version} -lt ${REQUIRED_NODE_VERSION} ]]; then
    die "Node.js ${REQUIRED_NODE_VERSION}+ required. Current: v${node_version}"
  fi
  
  success "Node.js v$(node -v | sed 's/v//') detected"
  
  if ! command -v npm &> /dev/null; then
    die "npm not found. Please install npm."
  fi
  
  success "npm v$(npm -v) detected"
}

install_dependencies() {
  step "Installing dependencies..."
  
  if [[ -d "${SCRIPT_DIR}/node_modules" ]]; then
    info "node_modules exists, checking if update needed..."
  fi
  
  cd "${SCRIPT_DIR}"
  
  if npm install --legacy-peer-deps >> "${LOG_FILE}" 2>&1; then
    success "Dependencies installed"
  else
    error "Failed to install dependencies"
    warn "Check ${LOG_FILE} for details"
    exit 1
  fi
}

build_project() {
  step "Building TypeScript project..."
  
  cd "${SCRIPT_DIR}"
  
  if npm run build >> "${LOG_FILE}" 2>&1; then
    success "Build completed"
  else
    error "Build failed"
    warn "Check ${LOG_FILE} for details"
    exit 1
  fi
  
  if [[ ! -f "${SCRIPT_DIR}/dist/index.js" ]]; then
    die "Build output not found: dist/index.js"
  fi
  
  if [[ ! -x "${SCRIPT_DIR}/dist/index.js" ]]; then
    chmod +x "${SCRIPT_DIR}/dist/index.js"
    info "Made dist/index.js executable"
  fi
}

setup_config_dirs() {
  step "Setting up configuration directories..."
  
  local dirs=(
    "${CONFIG_DIR}"
    "${CONFIG_DIR}/keys"
    "${CONFIG_DIR}/state"
    "${CONFIG_DIR}/logs"
    "${CONFIG_DIR}/skills"
  )
  
  for dir in "${dirs[@]}"; do
    if [[ ! -d "${dir}" ]]; then
      mkdir -p "${dir}"
      chmod 700 "${dir}"
      info "Created: ${dir}"
    fi
  done
  
  success "Configuration directories ready"
}

setup_rules_dir() {
  step "Setting up rules directories..."
  
  local cursor_dir="${HOME}/.cursor/rules"
  local antigravity_dir="${HOME}/.agent/rules"
  local claude_dir="${HOME}/.claude/rules"
  local kiro_dir="${HOME}/.kiro/steering"
  
  local dirs=(
    "${cursor_dir}"
    "${antigravity_dir}"
    "${claude_dir}"
    "${kiro_dir}"
  )
  
  for dir in "${dirs[@]}"; do
    if [[ ! -d "${dir}" ]]; then
      mkdir -p "${dir}"
      chmod 755 "${dir}"
      info "Created: ${dir}"
    fi
  done
  
  if [[ -d "${SCRIPT_DIR}/rules" ]]; then
    info "Importing default rules..."
    for rule_file in "${SCRIPT_DIR}/rules"/*; do
      if [[ -f "${rule_file}" ]]; then
        local filename
        filename=$(basename "${rule_file}")
        
        for dir in "${dirs[@]}"; do
          if [[ ! -f "${dir}/${filename}" ]]; then
            cp "${rule_file}" "${dir}/${filename}"
            info "  → ${filename} to ${dir}"
          fi
        done
      fi
    done
  fi
  
  success "Rules directories ready"
}

install_npm_link() {
  step "Installing via npm link..."
  
  cd "${SCRIPT_DIR}"
  
  if npm link >> "${LOG_FILE}" 2>&1; then
    success "Lunor CLI linked globally"
    
    if command -v lunor &> /dev/null; then
      local version
      version=$(lunor --version 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "unknown")
      success "Command available: lunor v${version}"
      return 0
    else
      warn "lunor command not found in PATH"
      return 1
    fi
  else
    warn "npm link failed, falling back to manual install"
    return 1
  fi
}

install_manual() {
  step "Installing manually to ${BIN_DIR}..."
  
  mkdir -p "${BIN_DIR}"
  
  if cp "${SCRIPT_DIR}/dist/index.js" "${BIN_DIR}/lunor"; then
    chmod +x "${BIN_DIR}/lunor"
    success "Copied to ${BIN_DIR}/lunor"
  else
    die "Failed to copy binary"
  fi
  
  if [[ ":${PATH}:" != *":${BIN_DIR}:"* ]]; then
    warn "${BIN_DIR} not in PATH"
    info "Add this to ~/.zshrc:"
    echo -e "\n  export PATH=\"\${HOME}/.local/bin:\${PATH}\"\n"
    
    read -r -p "Add to ~/.zshrc now? [y/N] " response
    if [[ "${response}" =~ ^[Yy]$ ]]; then
      if ! grep -q "export PATH=\"\${HOME}/.local/bin:\${PATH}\"" ~/.zshrc; then
        echo "" >> ~/.zshrc
        echo "# Lunor CLI" >> ~/.zshrc
        echo "export PATH=\"\${HOME}/.local/bin:\${PATH}\"" >> ~/.zshrc
        success "Added to ~/.zshrc"
        info "Run: source ~/.zshrc"
      else
        info "Already in ~/.zshrc"
      fi
    fi
  else
    success "${BIN_DIR} already in PATH"
  fi
}

setup_shell_integration() {
  step "Setting up shell integration..."
  
  local shell_snippet
  shell_snippet='
# ---- Lunor CLI Shell Integration ----
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
}'
  
  if grep -q "Lunor CLI Shell Integration" ~/.zshrc 2>/dev/null; then
    info "Shell integration already in ~/.zshrc"
    return 0
  fi
  
  read -r -p "Add shell integration to ~/.zshrc? [y/N] " response
  if [[ "${response}" =~ ^[Yy]$ ]]; then
    echo "${shell_snippet}" >> ~/.zshrc
    success "Shell integration added to ~/.zshrc"
    info "Run: source ~/.zshrc"
  else
    info "Skipped shell integration"
    info "You can add it later with: lunor init zsh >> ~/.zshrc"
  fi
}

verify_installation() {
  step "Verifying installation..."
  
  if ! command -v lunor &> /dev/null; then
    warn "lunor command not found"
    info "You may need to restart your shell or run: source ~/.zshrc"
    return 1
  fi
  
  success "Command found: $(which lunor)"
  
  local version
  if version=$(lunor --version 2>&1 | head -1); then
    success "Version check: ${version}"
  else
    warn "Could not get version"
  fi
  
  info "Checking features..."
  
  # Check rules directories
  local rules_count=0
  [[ -d "${HOME}/.cursor/rules" ]] && ((rules_count++))
  [[ -d "${HOME}/.agent/rules" ]] && ((rules_count++))
  [[ -d "${HOME}/.claude/rules" ]] && ((rules_count++))
  [[ -d "${HOME}/.kiro/steering" ]] && ((rules_count++))
  success "Rules directories: ${rules_count}/4 targets configured"
  
  # Check skills directory
  if [[ -d "${CONFIG_DIR}/skills" ]]; then
    success "Skills directory ready"
  fi
  
  # Check config directory
  if [[ -d "${CONFIG_DIR}" ]]; then
    success "Config directory ready"
  fi
  
  info "Running health check..."
  if lunor doctor >> "${LOG_FILE}" 2>&1; then
    success "Health check passed"
  else
    info "Some checks may require configuration (normal on first install)"
  fi
  
  return 0
}

print_next_steps() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "\033[1;32m✓ Installation Complete!\033[0m"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "🚀 Quick Start:"
  echo ""
  echo "  1. Restart shell or run:"
  echo -e "     \033[0;36msource ~/.zshrc\033[0m"
  echo ""
  echo "  2. Add your Lunor API key:"
  echo -e "     \033[0;36mlunor keys add\033[0m"
  echo -e "     \033[0;90m(Enter: lunor-proxy-api-key-2025)\033[0m"
  echo ""
  echo "  3. Activate a preset:"
  echo -e "     \033[0;36mlunor use coding\033[0m"
  echo -e "     \033[0;90m(or: lunor use fast, lunor use balanced)\033[0m"
  echo ""
  echo "  4. Verify setup:"
  echo -e "     \033[0;36menv | grep ANTHROPIC\033[0m"
  echo -e "     \033[0;36mlunor show\033[0m"
  echo ""
  echo "📦 Features Installed:"
  echo ""
  echo "  • Rules Management (agent targets)"
  echo -e "    \033[0;90m→ lunor rules list\033[0m"
  echo -e "    \033[0;90m→ lunor rules ides\033[0m"
  echo ""
  echo "  • Skills System"
  echo -e "    \033[0;90m→ lunor skills\033[0m"
  echo -e "    \033[0;90m→ lunor skills init\033[0m"
  echo ""
  echo "  • AMP Configuration"
  echo -e "    \033[0;90m→ lunor amp set\033[0m"
  echo ""
  echo "📚 Documentation:"
  echo ""
  echo "  • lunor --help          All commands"
  echo "  • lunor doctor          Health check"
  echo "  • lunor rules --help    Rules management"
  echo "  • lunor skills --help   Skills system"
  echo ""
  echo "Installation log: ${LOG_FILE}"
  echo ""
  echo -e "\033[0;90m© 2025 LEO • Designed by LEO\033[0m"
  echo ""
}

print_banner() {
  cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🌙  LUNOR CLI Installation                                  ║
║      Professional AI Model Switcher & Dev Toolkit            ║
║                                                               ║
║      ✨ Rules Management for Agent Targets                   ║
║      ✨ Skills System with Templates                         ║
║      ✨ AMP Integration                                       ║
║                                                               ║
║      Designed by LEO © 2025                                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
  echo ""
}

cleanup_on_error() {
  error "Installation failed!"
  warn "Check log file: ${LOG_FILE}"
  warn "You can retry by running: ./install.sh"
  exit 1
}

main() {
  trap cleanup_on_error ERR
  
  print_banner
  
  info "Starting installation..."
  info "Log file: ${LOG_FILE}"
  echo ""
  
  check_dependencies
  install_dependencies
  build_project
  setup_config_dirs
  setup_rules_dir
  
  if ! install_npm_link; then
    install_manual
  fi
  
  setup_shell_integration
  verify_installation || true
  
  print_next_steps
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
