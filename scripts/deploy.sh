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
echo -e "${CYAN}  VibeUniv Deploy${NC}"
echo -e "${CYAN}==============================${NC}"
echo ""

# 현재 브랜치
BRANCH=$(git branch --show-current)
echo -e "브랜치: ${GREEN}${BRANCH}${NC}"

# main 직접 배포 방지
if [ "$BRANCH" = "main" ]; then
  echo -e "${RED}[ERROR] main 브랜치에서 직접 배포할 수 없습니다.${NC}"
  echo "  기능 브랜치에서 작업 후 PR을 통해 merge하세요."
  exit 1
fi

# 변경사항 확인
if [ -z "$(git status --porcelain)" ]; then
  echo -e "${YELLOW}[INFO] 커밋할 변경사항이 없습니다.${NC}"
  echo ""

  # push 안 된 커밋 확인
  UNPUSHED=$(git log origin/"$BRANCH"..HEAD --oneline 2>/dev/null || echo "")
  if [ -z "$UNPUSHED" ]; then
    echo -e "${YELLOW}[INFO] push할 커밋도 없습니다. 이미 최신 상태입니다.${NC}"
    exit 0
  fi
else
  echo ""
  echo -e "${CYAN}[CHANGES] 변경된 파일:${NC}"
  git status --short
  echo ""

  # 빌드 검증
  echo -e "${CYAN}[BUILD] 빌드 검증 중...${NC}"
  if ! npm run build > /dev/null 2>&1; then
    echo -e "${RED}[ERROR] 빌드 실패. 에러를 수정하세요.${NC}"
    npm run build 2>&1 | tail -20
    exit 1
  fi
  echo -e "${GREEN}[BUILD] 빌드 성공${NC}"
  echo ""

  # 린트 검사
  echo -e "${CYAN}[LINT] 린트 검사 중...${NC}"
  if ! npm run lint > /dev/null 2>&1; then
    echo -e "${YELLOW}[WARN] 린트 경고가 있습니다.${NC}"
  else
    echo -e "${GREEN}[LINT] 통과${NC}"
  fi
  echo ""

  # 커밋 메시지 입력
  echo -e "${CYAN}[COMMIT] 커밋 메시지를 입력하세요:${NC}"
  read -r COMMIT_MSG

  if [ -z "$COMMIT_MSG" ]; then
    echo -e "${RED}[ERROR] 커밋 메시지가 비어있습니다.${NC}"
    exit 1
  fi

  # 스테이징 + 커밋
  git add -A
  git commit -m "$COMMIT_MSG"
  echo -e "${GREEN}[COMMIT] 커밋 완료${NC}"
  echo ""
fi

# Push
echo -e "${CYAN}[PUSH] origin/${BRANCH} 에 push 중...${NC}"
git push -u origin "$BRANCH"
echo -e "${GREEN}[PUSH] 완료${NC}"
echo ""

# PR 존재 여부 확인
EXISTING_PR=$(gh pr list --head "$BRANCH" --json number,url --jq '.[0].url' 2>/dev/null || echo "")

if [ -n "$EXISTING_PR" ]; then
  echo -e "${GREEN}[PR] 기존 PR에 반영됨: ${EXISTING_PR}${NC}"
  PR_URL="$EXISTING_PR"
else
  echo -e "${CYAN}[PR] PR을 생성합니다.${NC}"
  echo -e "PR 제목을 입력하세요:"
  read -r PR_TITLE

  if [ -z "$PR_TITLE" ]; then
    PR_TITLE="$COMMIT_MSG"
  fi

  # 커밋 목록으로 본문 자동 생성
  COMMITS=$(git log origin/main..HEAD --oneline)
  PR_URL=$(gh pr create --base main --title "$PR_TITLE" --body "$(cat <<EOF
## Summary
$(echo "$COMMITS" | sed 's/^/- /')

## Test plan
- [ ] \`npm run build\` 성공 확인
- [ ] 주요 기능 정상 동작 확인
EOF
)")
  echo -e "${GREEN}[PR] 생성 완료: ${PR_URL}${NC}"
fi

echo ""

# Merge 여부 확인
echo -e "${YELLOW}PR을 main에 merge 하시겠습니까? (y/N)${NC}"
read -r MERGE_CONFIRM

if [[ "$MERGE_CONFIRM" =~ ^[yY]$ ]]; then
  PR_NUMBER=$(echo "$PR_URL" | grep -o '[0-9]*$')
  gh pr merge "$PR_NUMBER" --merge
  echo -e "${GREEN}[MERGE] main에 merge 완료${NC}"
  echo ""

  # Vercel 배포
  echo -e "${CYAN}[DEPLOY] Vercel 프로덕션 배포 중...${NC}"
  git checkout main
  git pull origin main
  npx vercel --prod
  echo ""
  echo -e "${GREEN}[DEPLOY] 배포 완료! https://vibeuniv.com${NC}"

  # 원래 브랜치로 복귀
  git checkout "$BRANCH" 2>/dev/null || true
else
  echo -e "${YELLOW}[SKIP] merge를 건너뛰었습니다. 나중에 수동으로 진행하세요.${NC}"
fi

echo ""
echo -e "${GREEN}==============================${NC}"
echo -e "${GREEN}  완료${NC}"
echo -e "${GREEN}==============================${NC}"
