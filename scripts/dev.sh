#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}==============================${NC}"
echo -e "${CYAN}  VibeUniv Dev Server${NC}"
echo -e "${CYAN}==============================${NC}"
echo ""

# .env.local 확인
if [ ! -f .env.local ]; then
  echo -e "${RED}[ERROR] .env.local 파일이 없습니다.${NC}"
  echo "  cp .env.example .env.local 로 생성 후 값을 채워주세요."
  exit 1
fi

# 필수 환경변수 확인
missing=()
while IFS= read -r line; do
  key="${line%%=*}"
  [ -z "$key" ] && continue
  val=$(grep "^${key}=" .env.local 2>/dev/null | cut -d'=' -f2-)
  if [ -z "$val" ]; then
    missing+=("$key")
  fi
done <<'VARS'
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ENCRYPTION_KEY=
VARS

if [ ${#missing[@]} -gt 0 ]; then
  echo -e "${YELLOW}[WARN] 다음 환경변수가 비어있습니다:${NC}"
  for v in "${missing[@]}"; do
    echo "  - $v"
  done
  echo ""
fi

# node_modules 확인
if [ ! -d node_modules ]; then
  echo -e "${YELLOW}[SETUP] node_modules 없음 — npm install 실행${NC}"
  npm install
  echo ""
fi

# MCP 서버 빌드 확인
if [ ! -d packages/mcp-server/dist ]; then
  echo -e "${YELLOW}[SETUP] MCP 서버 빌드 없음 — 빌드 실행${NC}"
  (cd packages/mcp-server && npm install && npm run build)
  echo ""
fi

echo -e "${GREEN}[START] http://localhost:3000${NC}"
echo ""

npm run dev
