import { createServiceClient } from "@/lib/supabase/service";

const MAX_CONTENT_LINES = 200;

interface DigestFile {
  file_path: string;
  raw_content: string;
}

interface DigestTechStack {
  technology_name: string;
  category: string;
  importance: string;
  version: string | null;
  description: string | null;
  confidence_score: number;
}

export interface ProjectDigest {
  fileTree: string;
  dependencies: string;
  techStacks: string;
  criticalFiles: Array<{ path: string; content: string }>;
  raw: string;
}

function buildFileTree(paths: string[]): string {
  const sorted = [...paths].sort();
  const lines: string[] = [];

  for (const p of sorted) {
    const depth = p.split("/").length - 1;
    const indent = "  ".repeat(depth);
    const name = p.split("/").pop() ?? p;
    lines.push(`${indent}${name}`);
  }

  return lines.join("\n");
}

function extractDependencies(files: DigestFile[]): string {
  const pkgFile = files.find(
    (f) =>
      f.file_path === "package.json" ||
      f.file_path?.endsWith("/package.json"),
  );

  if (!pkgFile?.raw_content) return "(no package.json found)";

  try {
    const pkg = JSON.parse(pkgFile.raw_content) as Record<string, unknown>;
    const deps = pkg.dependencies as Record<string, string> | undefined;
    const devDeps = pkg.devDependencies as Record<string, string> | undefined;

    const lines: string[] = [];

    if (deps && Object.keys(deps).length > 0) {
      lines.push("dependencies:");
      for (const [name, version] of Object.entries(deps)) {
        lines.push(`  ${name}: ${version}`);
      }
    }

    if (devDeps && Object.keys(devDeps).length > 0) {
      lines.push("devDependencies:");
      for (const [name, version] of Object.entries(devDeps)) {
        lines.push(`  ${name}: ${version}`);
      }
    }

    return lines.length > 0 ? lines.join("\n") : "(empty dependencies)";
  } catch {
    return "(failed to parse package.json)";
  }
}

function formatTechStacks(stacks: DigestTechStack[]): string {
  return stacks
    .map((t) => {
      const parts = [`- ${t.technology_name} (${t.category}, ${t.importance})`];
      if (t.version) parts.push(`v${t.version}`);
      if (t.description) parts.push(`— ${t.description}`);
      return parts.join(" ");
    })
    .join("\n");
}

function truncateContent(content: string): string {
  const lines = content.split("\n");
  if (lines.length <= MAX_CONTENT_LINES) return content;
  return (
    lines.slice(0, MAX_CONTENT_LINES).join("\n") +
    `\n... [truncated at ${MAX_CONTENT_LINES} lines]`
  );
}

/**
 * Teaching-critical file patterns that should be included with full content
 * in the digest for personalized education.
 */
const CRITICAL_PATH_PATTERNS = [
  /^app\/.*\/page\.tsx?$/,
  /^app\/.*\/layout\.tsx?$/,
  /^app\/api\/.*\.ts$/,
  /^middleware\.ts$/,
  /^middleware\.js$/,
  /^lib\/.*\.ts$/,
  /^server\/.*\.ts$/,
  /^types\/.*\.ts$/,
];

function isCriticalPath(filePath: string): boolean {
  return CRITICAL_PATH_PATTERNS.some((re) => re.test(filePath));
}

/**
 * Build a structured project digest from DB data for use in LLM prompts.
 * Combines file tree, dependencies, tech stack analysis, and critical
 * source file contents into a single string optimized for context injection.
 */
export async function buildProjectDigest(
  projectId: string,
): Promise<ProjectDigest> {
  const supabase = createServiceClient();

  const [filesResult, techResult] = await Promise.all([
    supabase
      .from("project_files")
      .select("file_name, file_path, raw_content")
      .eq("project_id", projectId),
    supabase
      .from("tech_stacks")
      .select(
        "technology_name, category, importance, version, description, confidence_score",
      )
      .eq("project_id", projectId)
      .order("confidence_score", { ascending: false }),
  ]);

  const files: DigestFile[] = (filesResult.data ?? []).map((f) => ({
    file_path: f.file_path ?? f.file_name,
    raw_content: f.raw_content ?? "",
  }));

  const techStacks: DigestTechStack[] = (techResult.data ?? []) as DigestTechStack[];

  // 1. File tree
  const allPaths = files.map((f) => f.file_path);
  const fileTree = buildFileTree(allPaths);

  // 2. Dependencies
  const dependencies = extractDependencies(files);

  // 3. Tech stacks
  const techStacksSection = formatTechStacks(techStacks);

  // 4. Critical file contents (full content, truncated to MAX_CONTENT_LINES)
  const criticalFiles = files
    .filter((f) => isCriticalPath(f.file_path) && f.raw_content.length > 0)
    .map((f) => ({
      path: f.file_path,
      content: truncateContent(f.raw_content),
    }));

  // Assemble raw digest string
  const sections: string[] = [
    "## File Structure\n```\n" + fileTree + "\n```",
    "## Dependencies\n```\n" + dependencies + "\n```",
    "## Tech Stack Analysis\n" + techStacksSection,
  ];

  if (criticalFiles.length > 0) {
    const fileContents = criticalFiles
      .map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
      .join("\n\n");
    sections.push("## Key Source Files\n" + fileContents);
  }

  return {
    fileTree,
    dependencies,
    techStacks: techStacksSection,
    criticalFiles,
    raw: sections.join("\n\n"),
  };
}
