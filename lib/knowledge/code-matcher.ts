/**
 * Code Matcher — matches KB concept code_signatures against project source files.
 *
 * Pure logic module: no DB, no crypto, no side effects.
 * Caller is responsible for decrypting file contents before passing them in.
 *
 * 3-Phase matching for performance:
 *   Phase 1: file_markers — path-only (no content read needed)
 *   Phase 2: config_markers — config files only (few files)
 *   Phase 3: import_markers + syntax_markers — source files (selective)
 */

import type { CodeSignature } from "./types";

// ── Input / Output Types ─────────────────────────────────────────────

export interface MatchableFile {
  file_path: string;
  file_type: string;        // "source_code" | "dependency" | "build_config" | ...
  content?: string | null;  // decrypted plain text (null = path-only matching)
}

export interface ConceptMatchInput {
  technology_name: string;
  concept_key: string;
  code_signature: CodeSignature;
}

export interface ConceptMatchResult {
  technology_name: string;
  concept_key: string;
  match_score: number;       // 0.0 ~ 1.0
  matched_files: string[];   // file paths that matched (max 10)
  marker_summary: { import: number; syntax: number; file: number; config: number };
}

// ── Config File Detection ────────────────────────────────────────────

const CONFIG_FILE_NAMES = [
  "package.json", "next.config.", "tsconfig", "tailwind.config.",
  ".eslintrc", "vite.config.", "webpack.config.", ".babelrc",
  "postcss.config.", "jest.config.", "turbo.json",
];

function isConfigFile(filePath: string): boolean {
  const name = filePath.split("/").pop()?.toLowerCase() ?? "";
  return CONFIG_FILE_NAMES.some(p => name.startsWith(p) || name.includes(p));
}

// ── Lightweight Glob Matching ────────────────────────────────────────
// Handles the specific patterns used in code_signatures without external deps.

function matchFileGlob(filePath: string, glob: string): boolean {
  const p = filePath.replace(/\\/g, "/");

  // **/dir/** → contains /dir/
  if (glob.startsWith("**/") && glob.endsWith("/**")) {
    const segment = glob.slice(3, -3);
    return p.includes(`/${segment}/`);
  }

  // **/*.ext or **/dir/file.ext
  if (glob.startsWith("**/")) {
    const rest = glob.slice(3);
    if (!rest.includes("*")) {
      // **/hooks/** already handled; **/file.ext → endsWith
      return p.endsWith(`/${rest}`) || p === rest;
    }
    // **/app/**/page.tsx → check fixed segments exist in path
    const fixed = rest.split("*").filter(Boolean).map(s => s.replace(/^\/|\/$/g, ""));
    return fixed.every(seg => p.includes(seg));
  }

  // .env* or tailwind.config.* → prefix match on file name
  if (glob.includes("*")) {
    const prefix = glob.split("*")[0];
    const fileName = p.split("/").pop() ?? "";
    return fileName.startsWith(prefix);
  }

  // Exact: middleware.ts
  return p.endsWith(`/${glob}`) || p === glob;
}

// ── Main Matching Function ───────────────────────────────────────────

const SCORE_THRESHOLD = 0.1;
const MAX_MATCHED_FILES = 10;

export function matchConceptsToFiles(
  files: MatchableFile[],
  concepts: ConceptMatchInput[],
): ConceptMatchResult[] {
  if (files.length === 0 || concepts.length === 0) return [];

  // Pre-compute normalized paths
  const filePaths = files.map(f => f.file_path.replace(/\\/g, "/"));

  // Separate files by role (computed once, shared across all concepts)
  const configWithContent: Array<{ path: string; content: string }> = [];
  const sourceWithContent: Array<{ path: string; content: string }> = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (!f.content) continue;
    const path = filePaths[i];

    if (isConfigFile(path)) {
      configWithContent.push({ path, content: f.content });
    }
    if (f.file_type === "source_code") {
      sourceWithContent.push({ path, content: f.content });
    }
  }

  const results: ConceptMatchResult[] = [];

  for (const concept of concepts) {
    const sig = concept.code_signature;
    const matchedFilesSet = new Set<string>();
    const summary = { import: 0, syntax: 0, file: 0, config: 0 };
    let activeCategories = 0;
    let scoreSum = 0;

    // ── Phase 1: file_markers (path-only) ──────────────────────────
    if (sig.file_markers.length > 0) {
      activeCategories++;
      let hits = 0;
      for (const marker of sig.file_markers) {
        for (const fp of filePaths) {
          if (matchFileGlob(fp, marker)) {
            hits++;
            matchedFilesSet.add(fp);
            break; // one match per marker is sufficient
          }
        }
      }
      summary.file = hits;
      scoreSum += hits / sig.file_markers.length;
    }

    // ── Phase 2: config_markers (config files only) ────────────────
    if (sig.config_markers.length > 0) {
      activeCategories++;
      let hits = 0;
      for (const marker of sig.config_markers) {
        // Format: "next.config.* > images" or "tailwind.config.*"
        const separatorIdx = marker.indexOf(" > ");
        const filePattern = separatorIdx >= 0 ? marker.slice(0, separatorIdx) : marker;
        const contentKey = separatorIdx >= 0 ? marker.slice(separatorIdx + 3) : null;

        for (const cf of configWithContent) {
          const cfName = cf.path.split("/").pop() ?? "";
          const patternMatch = filePattern.includes("*")
            ? cfName.startsWith(filePattern.split("*")[0])
            : cfName === filePattern;

          if (patternMatch) {
            if (!contentKey || cf.content.includes(contentKey)) {
              hits++;
              matchedFilesSet.add(cf.path);
              break;
            }
          }
        }
      }
      summary.config = hits;
      scoreSum += hits / sig.config_markers.length;
    }

    // ── Phase 3: import_markers + syntax_markers (source content) ──
    if (sig.import_markers.length > 0) {
      activeCategories++;
      let hits = 0;
      for (const marker of sig.import_markers) {
        for (const sf of sourceWithContent) {
          if (sf.content.includes(marker)) {
            hits++;
            matchedFilesSet.add(sf.path);
            break;
          }
        }
      }
      summary.import = hits;
      scoreSum += hits / sig.import_markers.length;
    }

    if (sig.syntax_markers.length > 0) {
      activeCategories++;
      let hits = 0;
      for (const marker of sig.syntax_markers) {
        for (const sf of sourceWithContent) {
          if (sf.content.includes(marker)) {
            hits++;
            matchedFilesSet.add(sf.path);
            break;
          }
        }
      }
      summary.syntax = hits;
      scoreSum += hits / sig.syntax_markers.length;
    }

    if (activeCategories === 0) continue;

    const finalScore = scoreSum / activeCategories;
    if (finalScore < SCORE_THRESHOLD) continue;

    results.push({
      technology_name: concept.technology_name,
      concept_key: concept.concept_key,
      match_score: Math.round(finalScore * 1000) / 1000,
      matched_files: [...matchedFilesSet].slice(0, MAX_MATCHED_FILES),
      marker_summary: summary,
    });
  }

  return results;
}
