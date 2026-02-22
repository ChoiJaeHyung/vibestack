import type { TechHint } from "@/lib/llm/types";

const ANALYSIS_JSON_SCHEMA = `{
  "technologies": [
    {
      "name": "string (display name of the technology, e.g. 'Next.js', 'Tailwind CSS')",
      "category": "framework | language | database | auth | deploy | styling | testing | build_tool | library | other",
      "version": "string or null (detected version number, e.g. '15.0.0')",
      "confidence": "number between 0 and 1 (how confident you are about this detection)",
      "description": "string (1-2 sentence description of how this technology is used in the project)",
      "importance": "core | supporting | dev_dependency",
      "relationships": {
        "depends_on": ["string array of technology names this depends on"],
        "used_with": ["string array of technology names commonly used together"]
      }
    }
  ],
  "architecture_summary": "string (2-4 sentence summary of the project's overall architecture and tech choices)"
}`;

export function buildAnalysisPrompt(
  files: Array<{ name: string; content: string; type: string }>,
  hints: TechHint[],
): string {
  const fileListSection = files
    .map((f) => {
      const truncatedContent =
        f.content.length > 8000
          ? f.content.slice(0, 8000) + "\n... [truncated]"
          : f.content;
      return `### File: ${f.name} (type: ${f.type})\n\`\`\`\n${truncatedContent}\n\`\`\``;
    })
    .join("\n\n");

  const hintsSection =
    hints.length > 0
      ? hints
          .map(
            (h) =>
              `- ${h.name}${h.version ? ` v${h.version}` : ""} (source: ${h.source}, confidence: ${h.confidence})`,
          )
          .join("\n")
      : "No hints detected.";

  return `You are a senior software engineer analyzing a project's technology stack.

Your task is to examine the project files below and produce a comprehensive technology stack analysis.

## Pre-detected Technology Hints

The following technologies were already detected from file parsing:
${hintsSection}

Use these hints as a starting point but verify them against the actual file contents. You may add technologies not listed in the hints, and you may adjust confidence scores if the file contents suggest otherwise.

## Project Files

${fileListSection}

## Instructions

1. Identify ALL technologies, frameworks, libraries, languages, and tools used in this project.
2. For each technology, determine:
   - Its correct display name
   - Its category (framework, language, database, auth, deploy, styling, testing, build_tool, library, other)
   - Its version if detectable from the files
   - Your confidence level (0.0 to 1.0) in this detection
   - A brief description of how it's used in this project
   - Its importance level: "core" (essential to the project), "supporting" (enhances the project), or "dev_dependency" (only used in development)
   - Its relationships to other detected technologies
3. Write a concise architecture summary.

## Important Rules

- Only include technologies you can actually verify from the provided files.
- Do not hallucinate technologies that are not evidenced in the files.
- Confidence should reflect how sure you are: 1.0 = absolutely certain, 0.5 = moderate evidence, below 0.3 = weak signal.
- For the architecture summary, focus on the high-level structure and key architectural decisions.
- Return ONLY valid JSON matching the schema below. No markdown, no explanation, no code fences.

## Output JSON Schema

${ANALYSIS_JSON_SCHEMA}`;
}

export function buildDigestAnalysisPrompt(
  digestMarkdown: string,
  hints: TechHint[],
): string {
  const hintsSection =
    hints.length > 0
      ? hints
          .map(
            (h) =>
              `- ${h.name}${h.version ? ` v${h.version}` : ""} (source: ${h.source}, confidence: ${h.confidence})`,
          )
          .join("\n")
      : "No hints detected.";

  return `You are a senior software engineer analyzing a project's technology stack.

Your task is to examine the structured project digest below and produce a comprehensive technology stack analysis.

## Pre-detected Technology Hints

The following technologies were already detected from file parsing:
${hintsSection}

Use these hints as a starting point but verify them against the digest data. You may add technologies not listed in the hints, and you may adjust confidence scores if the digest suggests otherwise.

## Project Digest

The following is a pre-processed digest of the project. It includes dependencies (with versions), file tree, import graph, routes, configuration, and detected architecture patterns.

${digestMarkdown}

## Instructions

1. Identify ALL technologies, frameworks, libraries, languages, and tools used in this project.
2. For each technology, determine:
   - Its correct display name
   - Its category (framework, language, database, auth, deploy, styling, testing, build_tool, library, other)
   - Its version if detectable from the digest
   - Your confidence level (0.0 to 1.0) in this detection
   - A brief description of how it's used in this project
   - Its importance level: "core" (essential to the project), "supporting" (enhances the project), or "dev_dependency" (only used in development)
   - Its relationships to other detected technologies
3. Write a concise architecture summary.

## Important Rules

- The digest already contains structured data (dependencies, routes, patterns). Use this data directly rather than guessing.
- For dependencies with explicit versions, use confidence 1.0.
- For patterns detected from code analysis (listed in the Patterns section), use confidence 0.8 or higher.
- Do not hallucinate technologies that are not evidenced in the digest.
- For the architecture summary, focus on the high-level structure and key architectural decisions.
- Return ONLY valid JSON matching the schema below. No markdown, no explanation, no code fences.

## Output JSON Schema

${ANALYSIS_JSON_SCHEMA}`;
}
