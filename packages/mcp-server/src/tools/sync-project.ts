import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { scanProjectFiles } from "../lib/file-scanner.js";
import { VibeStackClient } from "../lib/api-client.js";

export const syncProjectSchema = {
  project_name: z.string().optional().describe("Name for the project (defaults to directory name)"),
  description: z.string().optional().describe("Short description of the project"),
};

export function registerSyncProject(server: McpServer, client: VibeStackClient): void {
  server.tool(
    "vibestack_sync_project",
    "Sync current project's tech stack information to VibeStack platform for analysis and learning",
    syncProjectSchema,
    { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    async ({ project_name, description }) => {
      try {
        const cwd = process.cwd();
        const defaultName = cwd.split("/").pop() || "unnamed-project";

        console.error(`[vibestack] Scanning project files in ${cwd}...`);
        const files = await scanProjectFiles(cwd);

        if (files.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No tech stack files detected in the current directory. Make sure you're in a project root directory.",
              },
            ],
            isError: true,
          };
        }

        console.error(`[vibestack] Creating/updating project...`);
        const project = await client.createProject({
          name: project_name || defaultName,
          description,
        });

        console.error(`[vibestack] Uploading ${files.length} files...`);
        await client.uploadFiles(project.id, files);

        const fileList = files.map((f) => `  - ${f.relativePath} (${f.size} bytes)`).join("\n");

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `✅ 프로젝트 "${project.name}" 동기화 완료!`,
                `Project ID: ${project.id}`,
                "",
                `${files.length}개 파일 감지:`,
                fileList,
                "",
                "─".repeat(50),
                "",
                "📚 **교육적 분석 요청**",
                "",
                "더 좋은 학습 커리큘럼을 생성하기 위해 이 프로젝트의 교육적 분석을 수행해 주세요.",
                "프로젝트의 주요 파일들을 읽고, 아래 JSON 형식으로 분석 결과를 생성한 후",
                "`vibeuniv_submit_analysis` 도구로 전송해 주세요.",
                "",
                "### 분석 항목",
                "",
                "```json",
                "{",
                '  "project_overview": {',
                '    "one_liner": "이 앱이 무엇을 하는지 한 문장 요약",',
                '    "app_type": "saas | ecommerce | social | blog | dashboard | game | tool | portfolio | api_service | other",',
                '    "target_users": "이 앱의 주요 사용자",',
                '    "core_features": ["핵심 기능 3-5개"],',
                '    "tech_stack_metaphors": [{"tech_name": "기술명", "metaphor": "일상 비유"}]',
                "  },",
                '  "user_flows": [{',
                '    "name": "플로우 이름 (예: 로그인)",',
                '    "trigger": "사용자 액션",',
                '    "steps": [{"description": "단계 설명", "file": "파일 경로", "line_range": "시작-끝", "concepts": ["관련 개념"]}],',
                '    "difficulty": "beginner | intermediate | advanced"',
                "  }],",
                '  "file_analysis": [{',
                '    "path": "파일 경로",',
                '    "role": "이 파일의 역할 한 문장",',
                '    "complexity": "1-5 (숫자)",',
                '    "difficulty": "beginner | intermediate | advanced",',
                '    "key_concepts": ["핵심 개념"],',
                '    "prerequisites": ["선행 지식"],',
                '    "gotchas": ["초보자가 놓치기 쉬운 점"],',
                '    "teaching_notes": "이 파일을 어떻게 가르칠지",',
                '    "connections": {"imports_from": ["의존 파일"], "imported_by": ["사용하는 파일"], "data_flow": "데이터 흐름"}',
                "  }],",
                '  "architecture": {',
                '    "layers": [{"name": "레이어명", "description": "설명", "files": ["파일"], "patterns": ["패턴"]}],',
                '    "design_patterns": [{"name": "패턴명", "where_used": ["파일:라인"], "why_used": "이유", "teaching_level": "beginner | intermediate | advanced"}],',
                '    "data_flow_summary": "전체 데이터 흐름 요약 (마크다운)"',
                "  },",
                '  "code_quality": {',
                '    "good_practices": [{"description": "잘한 점", "files": ["파일"], "concept": "교육 포인트"}],',
                '    "improvement_areas": [{"description": "개선점", "severity": "info | warning | important", "files": ["파일"], "teaching_opportunity": "교육 기회"}],',
                '    "security_notes": [{"observation": "보안 관찰", "files": ["파일"], "teaching_concept": "교육 포인트"}]',
                "  },",
                '  "learning_priorities": {',
                '    "beginner": {"start_with": ["먼저 볼 것"], "focus_on": ["집중할 것"], "skip_for_now": ["나중에 볼 것"]},',
                '    "intermediate": {"start_with": [], "focus_on": [], "deep_dive": ["깊이 파볼 것"]},',
                '    "advanced": {"start_with": [], "focus_on": [], "challenge_topics": ["심화 주제"]}',
                "  },",
                '  "repeated_patterns": [{',
                '    "name": "패턴명",',
                '    "description": "설명",',
                '    "occurrences": [{"file": "파일", "line_range": "범위"}],',
                '    "teaching_value": "왜 가르쳐야 하는지"',
                "  }]",
                "}",
                "```",
                "",
                "### 분석 가이드",
                "",
                "1. 프로젝트의 주요 소스 파일들을 읽어주세요",
                "2. 위 JSON 스키마에 맞게 분석 결과를 생성해 주세요",
                "3. `vibeuniv_submit_analysis` 도구를 호출하여 결과를 전송해 주세요",
                `4. 전송 시 project_id는 "${project.id}"를 사용해 주세요`,
                "",
                "분석이 완료되면 `vibestack_analyze`로 기술 스택 분석을 진행할 수 있습니다.",
              ].join("\n"),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Failed to sync project: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
