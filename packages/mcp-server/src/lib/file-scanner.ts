import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { glob } from "glob";
import type { ProjectFile } from "../types.js";

const MAX_FILE_SIZE = 50 * 1024; // 50KB
const MAX_SOURCE_FILES = 50; // 소스 코드 파일 최대 수
const README_MAX_LINES = 50;

// Source code extensions that only need import/export headers (not full content)
const SOURCE_CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".rs",
  ".go",
]);

// ─── Root-level config/dependency files (exact match) ───────────────

const DEPENDENCY_FILES = [
  "package.json",
  "requirements.txt",
  "Pipfile",
  "pyproject.toml",
  "build.gradle",
  "build.gradle.kts",
  "pom.xml",
  "Cargo.toml",
  "go.mod",
  "Gemfile",
  "composer.json",
];

const AI_PROJECT_FILES = [
  "CLAUDE.md",
  ".cursorrules",
  ".windsurfrules",
  "CONVENTIONS.md",
];

const CONFIG_FILES = [
  "tsconfig.json",
  "next.config.js",
  "next.config.ts",
  "next.config.mjs",
  "vite.config.ts",
  "nuxt.config.ts",
  "angular.json",
  "docker-compose.yml",
  "docker-compose.yaml",
  "Dockerfile",
  ".env.example",
  "vercel.json",
  "netlify.toml",
];

const ROOT_FILES = [
  ...DEPENDENCY_FILES,
  ...AI_PROJECT_FILES,
  ...CONFIG_FILES,
  "README.md",
];

// ─── Source code glob patterns ──────────────────────────────────────

const SOURCE_PATTERNS = [
  "app/**/*.{ts,tsx}",
  "src/**/*.{ts,tsx,js,jsx}",
  "pages/**/*.{ts,tsx,js,jsx}",
  "components/**/*.{ts,tsx,js,jsx}",
  "lib/**/*.{ts,tsx,js,jsx}",
  "server/**/*.{ts,tsx,js,jsx}",
  "api/**/*.{ts,tsx,js,jsx}",
  "routes/**/*.{ts,tsx,js,jsx}",
  "middleware.{ts,js}",
  // Python
  "**/*.py",
  // Rust
  "src/**/*.rs",
  // Go
  "**/*.go",
];

// ─── Ignore patterns ────────────────────────────────────────────────

const IGNORE_PATTERNS = [
  "node_modules/**",
  ".next/**",
  "dist/**",
  "build/**",
  ".git/**",
  "coverage/**",
  "*.test.*",
  "*.spec.*",
  "__tests__/**",
  "**/*.d.ts",
  "packages/mcp-server/dist/**",
];

function computeSha256(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

/**
 * Extract lightweight header from source code files.
 * Returns only import/require statements, export statements,
 * and "use client"/"use server" directives.
 * This dramatically reduces upload size (~500 bytes vs ~50KB per file).
 */
export function extractFileHeader(content: string): string {
  const lines = content.split("\n");
  const extracted: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments (but keep them if part of a block we're extracting)
    if (trimmed === "") continue;

    // ─── JS/TS directives ──────────────────────────────────────
    if (trimmed === '"use client";' || trimmed === "'use client';") {
      extracted.push(line);
      continue;
    }
    if (trimmed === '"use server";' || trimmed === "'use server';") {
      extracted.push(line);
      continue;
    }

    // ─── JS/TS import / require ────────────────────────────────
    if (
      trimmed.startsWith("import ") ||
      trimmed.startsWith("import{") ||
      trimmed === "import(" ||
      trimmed.startsWith("require(") ||
      /^(const|let|var)\s+.+=\s*require\(/.test(trimmed)
    ) {
      extracted.push(line);
      continue;
    }

    // ─── JS/TS export ──────────────────────────────────────────
    if (
      trimmed.startsWith("export ") ||
      trimmed.startsWith("export{") ||
      trimmed === "export default" ||
      trimmed.startsWith("export default ")
    ) {
      // For multi-line exports like `export function foo(`, just keep the declaration line
      extracted.push(line);
      continue;
    }

    // ─── Python import ─────────────────────────────────────────
    if (trimmed.startsWith("from ") && trimmed.includes(" import ")) {
      extracted.push(line);
      continue;
    }
    if (trimmed.startsWith("import ") && !trimmed.startsWith("import {")) {
      // Python-style import (already caught by JS import above for JS files,
      // but that's fine — duplicates won't happen since a line matches once)
      extracted.push(line);
      continue;
    }

    // ─── Rust use / pub declarations ───────────────────────────
    if (trimmed.startsWith("use ") || trimmed.startsWith("use::")) {
      extracted.push(line);
      continue;
    }
    if (
      /^pub\s+(fn|struct|enum|mod|type|trait|const|static)\s/.test(trimmed) ||
      /^pub\s*\(\s*(crate|super)\s*\)\s+(fn|struct|enum|mod|type|trait)\s/.test(
        trimmed
      )
    ) {
      extracted.push(line);
      continue;
    }

    // ─── Go package / import ───────────────────────────────────
    if (trimmed.startsWith("package ")) {
      extracted.push(line);
      continue;
    }
  }

  return extracted.join("\n");
}

function isSourceCodeFile(relativePath: string): boolean {
  const lastDot = relativePath.lastIndexOf(".");
  if (lastDot === -1) return false;
  return SOURCE_CODE_EXTENSIONS.has(relativePath.slice(lastDot));
}

async function readFileContent(
  filePath: string,
  fileName: string
): Promise<string> {
  const buffer = await readFile(filePath, "utf-8");

  if (fileName === "README.md") {
    const lines = buffer.split("\n");
    return lines.slice(0, README_MAX_LINES).join("\n");
  }

  if (Buffer.byteLength(buffer, "utf-8") > MAX_FILE_SIZE) {
    return buffer.slice(0, MAX_FILE_SIZE);
  }

  return buffer;
}

async function collectFiles(
  rootDir: string,
  patterns: string[],
  ignore: string[]
): Promise<string[]> {
  const matches = await glob(patterns, {
    cwd: rootDir,
    nodir: true,
    dot: true,
    absolute: false,
    ignore,
  });
  return [...new Set(matches)];
}

export async function scanProjectFiles(
  rootDir: string
): Promise<ProjectFile[]> {
  const foundFiles: ProjectFile[] = [];

  // 1) Collect root-level config/dependency files
  const rootMatches = await collectFiles(rootDir, ROOT_FILES, IGNORE_PATTERNS);
  const configFileSet = new Set(rootMatches);

  // 2) Collect source code files
  const sourceMatches = await collectFiles(
    rootDir,
    SOURCE_PATTERNS,
    IGNORE_PATTERNS
  );

  // Prioritize: shorter paths first (entry points), then alphabetically
  sourceMatches.sort((a, b) => {
    const depthA = a.split("/").length;
    const depthB = b.split("/").length;
    if (depthA !== depthB) return depthA - depthB;
    return a.localeCompare(b);
  });

  // Limit source files to avoid huge uploads
  const limitedSource = sourceMatches.slice(0, MAX_SOURCE_FILES);

  const allPaths = [...new Set([...rootMatches, ...limitedSource])];

  for (const relativePath of allPaths) {
    const absolutePath = join(rootDir, relativePath);

    try {
      const fileStat = await stat(absolutePath);

      if (!fileStat.isFile()) {
        continue;
      }

      let content = await readFileContent(absolutePath, relativePath);

      // For source code files (not config/dependency files), extract only
      // import/export headers to reduce upload size (~500 bytes vs ~50KB)
      const isConfig = configFileSet.has(relativePath);
      if (!isConfig && isSourceCodeFile(relativePath)) {
        content = extractFileHeader(content);
      }

      const sha256 = computeSha256(content);

      foundFiles.push({
        name: relativePath.split("/").pop() || relativePath,
        relativePath,
        size: fileStat.size,
        content,
        sha256,
      });
    } catch {
      console.error(
        `[vibestack] Warning: Could not read file ${relativePath}`
      );
    }
  }

  console.error(
    `[vibestack] Scanned ${foundFiles.length} files (${rootMatches.length} config + ${limitedSource.length} source) in ${rootDir}`
  );
  return foundFiles;
}
