#!/usr/bin/env bash
set -euo pipefail

readonly CONFIG_DIR="${HOME}/.config/lunor"
readonly BIN_DIR="${HOME}/.local/bin"

success() { echo -e "\033[0;32m✓\033[0m $*"; }
warn() { echo -e "\033[0;33m⚠\033[0m $*"; }
info() { echo -e "\033[0;34mℹ\033[0m $*"; }

echo ""
echo "🗑️  Lunor CLI Uninstaller"
echo ""

if command -v lunor &> /dev/null; then
  info "Found lunor at: $(which lunor)"
  
  read -r -p "Uninstall Lunor CLI? [y/N] " response
  if [[ ! "${response}" =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
  fi
  
  if npm unlink -g lunor-cli &> /dev/null; then
    success "npm unlink completed"
  else
    warn "npm unlink failed (maybe not installed via npm link)"
  fi
  
else
  warn "lunor command not found"
fi

if [[ -f "${BIN_DIR}/lunor" ]]; then
  read -r -p "Remove manual binary ${BIN_DIR}/lunor? [y/N] " response
  if [[ "${response}" =~ ^[Yy]$ ]]; then
    rm -f "${BIN_DIR}/lunor"
    success "Removed ${BIN_DIR}/lunor"
  fi
fi

read -r -p "Remove configuration data (~/.config/lunor)? [y/N] " response
if [[ "${response}" =~ ^[Yy]$ ]]; then
  if [[ -d "${CONFIG_DIR}" ]]; then
    rm -rf "${CONFIG_DIR}"
    success "Removed ${CONFIG_DIR}"
  fi
else
  info "Kept configuration data"
fi

if grep -q "Lunor CLI Shell Integration" ~/.zshrc 2>/dev/null; then
  read -r -p "Remove shell integration from ~/.zshrc? [y/N] " response
  if [[ "${response}" =~ ^[Yy]$ ]]; then
    sed -i.bak '/# ---- Lunor CLI Shell Integration ----/,/^}$/d' ~/.zshrc
    success "Removed from ~/.zshrc"
    info "Backup saved as ~/.zshrc.bak"
  fi
fi

echo ""
success "Uninstall complete!"
echo ""
