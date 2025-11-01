#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log() { echo -e "${GREEN}[*]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[x]${NC} $1"; }

cd /workspaces/libxml2-wasm 2>/dev/null || cd /workspace 2>/dev/null || true

# Emscripten env
if [ -f /emsdk/emsdk_env.sh ]; then
  . /emsdk/emsdk_env.sh >/dev/null 2>&1
fi

log "Checking tools..."
for tool in node npm git emcc; do
  command -v "$tool" >/dev/null || { err "$tool missing"; exit 1; }
done

log "Configuring git..."
git config --global --add safe.directory "$(pwd)"
git config --global core.autocrlf false
git config --global core.eol lf

# Fix any CRLF files that were checked out on Windows
log "Normalizing line endings..."
if git status --porcelain | grep -q '^'; then
  warn "Workspace has uncommitted changes, skipping line ending normalization"
else
  git rm -rf --cached . >/dev/null 2>&1 || true
  git reset --hard HEAD >/dev/null 2>&1 || true
  log "Line endings normalized to LF"
fi

log "Updating submodules..."
git submodule update --init --recursive || warn "Submodule update failed"

log "Installing dependencies..."
if [ -f package.json ]; then
  npm ci --no-fund --no-audit || npm install --no-fund --no-audit
else
  warn "No package.json found"
fi

log "Creating build directories..."
mkdir -p out lib

log "Resetting ccache..."
ccache -z >/dev/null 2>&1 || true
ccache -s >/dev/null 2>&1 || true

log "Testing Emscripten..."
echo 'int main(){}' > /tmp/t.c
if emcc /tmp/t.c -o /tmp/t.js >/dev/null 2>&1; then
  log "Emscripten working"
else
  warn "Emscripten test failed"
fi
rm -f /tmp/t.*

echo -e "\n${GREEN}✓ DevContainer ready for libxml2-wasm${NC}"
