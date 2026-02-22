import { parsePackageJson, parseTsConfig } from "@/lib/analysis/file-parser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectDigest {
  projectName: string;
  generatedAt: string;

  dependencies: {
    name: string;
    version: string;
    isDev: boolean;
    source: string;
  }[];

  fileTree: string[];

  imports: {
    file: string;
    frameworks: string[];
    libraries: string[];
    internal: string[];
  }[];

  routes: {
    path: string;
    type: "page" | "api" | "layout" | "middleware";
    methods?: string[];
  }[];

  config: {
    typescript?: { strict?: boolean; target?: string; jsx?: string };
    framework?: { name: string; version?: string };
    deploy?: string[];
    styling?: string[];
  };

  aiRules?: string;
  patterns: string[];
}

interface ImportResult {
  frameworks: string[];
  libraries: string[];
  internal: string[];
}

interface ProjectFileInput {
  file_name: string;
  file_path: string | null;
  file_type: string;
  raw_content: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FRAMEWORK_PACKAGES = new Set([
  "react",
  "react-dom",
  "next",
  "vue",
  "nuxt",
  "svelte",
  "@sveltejs/kit",
  "angular",
  "@angular/core",
  "solid-js",
  "remix",
  "@remix-run/react",
  "astro",
  "express",
  "fastify",
  "hono",
  "koa",
  "nest",
  "@nestjs/core",
  "django",
  "flask",
  "fastapi",
]);

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

const AI_CONFIG_FILES = new Set([
  "CLAUDE.md",
  ".cursorrules",
  ".windsurfrules",
  "CONVENTIONS.md",
  ".codex",
  ".gemini",
]);

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function generateDigest(
  projectName: string,
  files: ProjectFileInput[],
): ProjectDigest {
  const dependencies: ProjectDigest["dependencies"] = [];
  const config: ProjectDigest["config"] = {};
  let aiRules: string | undefined;

  // Build file tree from all file paths
  const fileTree = buildFileTree(files);

  // ------ Process special files ------
  for (const file of files) {
    if (!file.raw_content) continue;

    const baseName = file.file_name.split("/").pop() ?? file.file_name;

    // package.json — dependencies & framework detection
    if (baseName === "package.json" && file.file_type === "dependency") {
      const result = parsePackageJson(file.raw_content);

      for (const dep of result.dependencies) {
        dependencies.push({
          name: dep.name,
          version: dep.version,
          isDev: dep.isDev,
          source: "package.json",
        });
      }

      // Detect framework from dependencies
      const frameworkDep = result.dependencies.find(
        (d) =>
          d.name === "next" ||
          d.name === "nuxt" ||
          d.name === "@sveltejs/kit" ||
          d.name === "@remix-run/react" ||
          d.name === "astro",
      );
      if (frameworkDep) {
        config.framework = {
          name: mapPackageToFrameworkName(frameworkDep.name),
          version: frameworkDep.version.replace(/^[\^~>=<]+/, ""),
        };
      }

      // Detect styling
      const stylingLibs = result.dependencies
        .filter((d) => isStylingPackage(d.name))
        .map((d) => mapStylingName(d.name));
      if (stylingLibs.length > 0) {
        config.styling = stylingLibs;
      }

      // Detect deploy hints from scripts/dependencies
      const deployHints = detectDeployFromPackage(result.dependencies, result.scripts);
      if (deployHints.length > 0) {
        config.deploy = deployHints;
      }
    }

    // requirements.txt — Python dependencies
    if (baseName === "requirements.txt" && file.file_type === "dependency") {
      for (const line of file.raw_content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-")) continue;

        const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*(?:[=<>!~]+\s*(.+))?$/);
        if (match) {
          dependencies.push({
            name: match[1],
            version: match[2]?.trim() ?? "*",
            isDev: false,
            source: "requirements.txt",
          });
        }
      }
    }

    // tsconfig.json — TypeScript config
    if (baseName === "tsconfig.json" && file.file_type === "build_config") {
      const tsResult = parseTsConfig(file.raw_content);
      config.typescript = {
        strict: tsResult.strict,
        target: tsResult.compilerTarget,
        jsx: tsResult.jsx,
      };
    }

    // Next.js config — framework version hint
    if (baseName.startsWith("next.config") && file.file_type === "build_config") {
      if (!config.framework) {
        config.framework = { name: "Next.js" };
      }
    }

    // Deploy config files
    if (baseName === "vercel.json") {
      config.deploy = dedupe([...(config.deploy ?? []), "vercel"]);
    }
    if (baseName === "netlify.toml") {
      config.deploy = dedupe([...(config.deploy ?? []), "netlify"]);
    }
    if (baseName === "Dockerfile" || baseName === "docker-compose.yml" || baseName === "docker-compose.yaml") {
      config.deploy = dedupe([...(config.deploy ?? []), "docker"]);
    }

    // AI rules / config
    if (AI_CONFIG_FILES.has(baseName)) {
      // Take the first 500 chars to keep digest compact
      aiRules = file.raw_content.slice(0, 500);
      if (file.raw_content.length > 500) {
        aiRules += "\n...(truncated)";
      }
    }
  }

  // ------ Extract imports from source files ------
  const sourceFiles = files.filter(
    (f) => f.file_type === "source_code" && f.raw_content,
  );

  const allImports: ProjectDigest["imports"] = [];
  for (const file of sourceFiles) {
    const filePath = file.file_path ?? file.file_name;
    const result = extractImportsFromSource(file.raw_content!);

    if (
      result.frameworks.length > 0 ||
      result.libraries.length > 0 ||
      result.internal.length > 0
    ) {
      allImports.push({
        file: filePath,
        frameworks: result.frameworks,
        libraries: result.libraries,
        internal: result.internal,
      });
    }
  }

  // ------ Detect routes from file paths ------
  const filePaths = files
    .map((f) => f.file_path ?? f.file_name)
    .filter((p): p is string => p !== null);

  const routes = detectRoutesFromPaths(filePaths, files);

  // ------ Detect architecture patterns ------
  const patterns = detectArchPatterns(files, allImports);

  return {
    projectName,
    generatedAt: new Date().toISOString(),
    dependencies,
    fileTree,
    imports: allImports,
    routes,
    config,
    aiRules,
    patterns,
  };
}

// ---------------------------------------------------------------------------
// extractImportsFromSource
// ---------------------------------------------------------------------------

export function extractImportsFromSource(content: string): ImportResult {
  const frameworks = new Set<string>();
  const libraries = new Set<string>();
  const internal = new Set<string>();

  // Match ES module imports:
  //   import X from "Y"
  //   import { X } from "Y"
  //   import "Y"
  //   import type { X } from "Y"
  const esImportRegex = /import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;

  // Match require():
  //   require("Y")
  //   require('Y')
  const requireRegex = /require\s*\(\s*["']([^"']+)["']\s*\)/g;

  const allModules = new Set<string>();

  let match: RegExpExecArray | null;

  match = esImportRegex.exec(content);
  while (match !== null) {
    allModules.add(match[1]);
    match = esImportRegex.exec(content);
  }

  match = requireRegex.exec(content);
  while (match !== null) {
    allModules.add(match[1]);
    match = requireRegex.exec(content);
  }

  for (const mod of allModules) {
    if (isInternalImport(mod)) {
      internal.add(mod);
    } else {
      const packageName = extractPackageName(mod);
      if (FRAMEWORK_PACKAGES.has(packageName)) {
        frameworks.add(packageName);
      } else {
        libraries.add(packageName);
      }
    }
  }

  return {
    frameworks: Array.from(frameworks).sort(),
    libraries: Array.from(libraries).sort(),
    internal: Array.from(internal).sort(),
  };
}

// ---------------------------------------------------------------------------
// detectRoutesFromPaths
// ---------------------------------------------------------------------------

export function detectRoutesFromPaths(
  filePaths: string[],
  files: ProjectFileInput[],
): ProjectDigest["routes"] {
  const routes: ProjectDigest["routes"] = [];

  // Build a map for quick content lookup
  const contentMap = new Map<string, string>();
  for (const f of files) {
    const key = f.file_path ?? f.file_name;
    if (f.raw_content) {
      contentMap.set(key, f.raw_content);
    }
  }

  for (const filePath of filePaths) {
    const normalized = normalizePath(filePath);

    // Root middleware
    if (normalized === "middleware.ts" || normalized === "middleware.js") {
      routes.push({ path: "/", type: "middleware" });
      continue;
    }

    // Only process files within app/ directory
    if (!normalized.startsWith("app/")) continue;

    const baseName = normalized.split("/").pop() ?? "";

    // page.tsx / page.jsx / page.ts / page.js
    if (/^page\.(tsx?|jsx?)$/.test(baseName)) {
      const routePath = filePathToRoute(normalized);
      routes.push({ path: routePath, type: "page" });
      continue;
    }

    // route.tsx / route.ts / route.js
    if (/^route\.(tsx?|jsx?|js)$/.test(baseName)) {
      const routePath = filePathToRoute(normalized);
      const methods = detectHttpMethods(contentMap.get(filePath));
      routes.push({
        path: routePath,
        type: "api",
        ...(methods.length > 0 ? { methods } : {}),
      });
      continue;
    }

    // layout.tsx / layout.ts / layout.jsx / layout.js
    if (/^layout\.(tsx?|jsx?)$/.test(baseName)) {
      const routePath = filePathToRoute(normalized);
      routes.push({ path: routePath, type: "layout" });
      continue;
    }
  }

  // Sort routes: middleware first, then layouts, then pages, then API
  const typeOrder: Record<string, number> = {
    middleware: 0,
    layout: 1,
    page: 2,
    api: 3,
  };
  routes.sort((a, b) => {
    const orderDiff = (typeOrder[a.type] ?? 4) - (typeOrder[b.type] ?? 4);
    if (orderDiff !== 0) return orderDiff;
    return a.path.localeCompare(b.path);
  });

  return routes;
}

// ---------------------------------------------------------------------------
// detectArchPatterns
// ---------------------------------------------------------------------------

export function detectArchPatterns(
  files: ProjectFileInput[],
  imports: ProjectDigest["imports"],
): string[] {
  const patterns = new Set<string>();

  // Helpers: quick lookups
  const filePathSet = new Set(
    files.map((f) => normalizePath(f.file_path ?? f.file_name)),
  );
  const allContent = files
    .filter((f) => f.raw_content && f.file_type === "source_code")
    .map((f) => ({ path: normalizePath(f.file_path ?? f.file_name), content: f.raw_content! }));

  const dependencyNames = new Set<string>();
  for (const f of files) {
    if (f.file_name.endsWith("package.json") && f.file_type === "dependency" && f.raw_content) {
      const result = parsePackageJson(f.raw_content);
      for (const dep of result.dependencies) {
        dependencyNames.add(dep.name);
      }
    }
  }

  // Flatten all imported frameworks & libraries
  const allFrameworks = new Set<string>();
  const allLibraries = new Set<string>();
  for (const imp of imports) {
    for (const fw of imp.frameworks) allFrameworks.add(fw);
    for (const lib of imp.libraries) allLibraries.add(lib);
  }

  // ------ Framework patterns ------
  if (hasAnyFile(filePathSet, "app/layout.tsx", "app/layout.ts", "app/layout.jsx", "app/layout.js")) {
    patterns.add("next-app-router");
  }
  if (dependencyNames.has("next") && !patterns.has("next-app-router")) {
    // Might be Pages Router
    if (hasAnyFile(filePathSet, "pages/_app.tsx", "pages/_app.js")) {
      patterns.add("next-pages-router");
    }
  }

  // ------ Component patterns ------
  const hasUseClient = allContent.some((f) =>
    f.content.includes('"use client"') || f.content.includes("'use client'"),
  );
  if (hasUseClient) {
    patterns.add("use-client");
  }

  const hasServerComponents = allContent.some(
    (f) =>
      f.path.startsWith("app/") &&
      /\.(tsx|jsx)$/.test(f.path) &&
      !f.content.includes('"use client"') &&
      !f.content.includes("'use client'"),
  );
  if (hasServerComponents) {
    patterns.add("server-components");
  }

  // ------ Server Actions ------
  const hasServerActions = allContent.some(
    (f) =>
      f.content.includes('"use server"') || f.content.includes("'use server'"),
  );
  if (hasServerActions) {
    patterns.add("server-actions");
  }

  // ------ Auth ------
  if (
    dependencyNames.has("@supabase/supabase-js") ||
    dependencyNames.has("@supabase/ssr") ||
    dependencyNames.has("@supabase/auth-helpers-nextjs")
  ) {
    patterns.add("supabase-auth");
  }
  if (dependencyNames.has("next-auth") || dependencyNames.has("@auth/core")) {
    patterns.add("next-auth");
  }
  if (dependencyNames.has("@clerk/nextjs") || dependencyNames.has("@clerk/clerk-react")) {
    patterns.add("clerk-auth");
  }

  // ------ Payments ------
  if (dependencyNames.has("stripe") || dependencyNames.has("@stripe/stripe-js")) {
    patterns.add("stripe-integration");
  }

  // ------ LLM / AI ------
  const llmPackages = [
    "@anthropic-ai/sdk",
    "openai",
    "@google/generative-ai",
    "groq-sdk",
    "@mistralai/mistralai",
    "ai",
    "@ai-sdk/core",
  ];
  const detectedLlmPackages = llmPackages.filter((p) => dependencyNames.has(p));
  if (detectedLlmPackages.length > 1) {
    patterns.add("multi-llm");
  } else if (detectedLlmPackages.length === 1) {
    patterns.add("llm-integration");
  }

  // BYOK encryption pattern
  const hasEncryption = allContent.some(
    (f) =>
      f.content.includes("aes-256-gcm") ||
      f.content.includes("AES-GCM") ||
      f.content.includes("createCipheriv"),
  );
  if (hasEncryption && detectedLlmPackages.length > 0) {
    patterns.add("byok-encryption");
  }

  // ------ API patterns ------
  const hasApiKeyAuth = allContent.some(
    (f) =>
      (f.path.includes("middleware") || f.path.includes("api/")) &&
      (f.content.includes("x-api-key") ||
        f.content.includes("X-API-Key") ||
        f.content.includes("authorization") ||
        f.content.includes("Authorization")),
  );
  if (hasApiKeyAuth) {
    patterns.add("api-key-auth");
  }

  const hasMiddlewareAuth = allContent.some(
    (f) =>
      f.path === "middleware.ts" ||
      f.path === "middleware.js" ||
      f.path.includes("server/middleware/"),
  );
  if (hasMiddlewareAuth) {
    patterns.add("middleware-auth");
  }

  // ------ MCP ------
  if (dependencyNames.has("@modelcontextprotocol/sdk")) {
    patterns.add("mcp-server");
  }

  // ------ Styling ------
  if (dependencyNames.has("tailwindcss") || dependencyNames.has("@tailwindcss/postcss")) {
    patterns.add("tailwind-css");
  }

  const hasDarkMode = allContent.some(
    (f) =>
      f.content.includes("dark:") ||
      f.content.includes("darkMode") ||
      f.content.includes("dark-mode") ||
      f.content.includes('class="dark"'),
  );
  if (hasDarkMode) {
    patterns.add("dark-mode");
  }

  const hasResponsive = allContent.some(
    (f) =>
      f.content.includes("sm:") ||
      f.content.includes("md:") ||
      f.content.includes("lg:") ||
      f.content.includes("@media"),
  );
  if (hasResponsive) {
    patterns.add("responsive-design");
  }

  // ------ Database ------
  if (dependencyNames.has("@supabase/supabase-js")) {
    patterns.add("supabase-db");
  }
  if (dependencyNames.has("prisma") || dependencyNames.has("@prisma/client")) {
    patterns.add("prisma-orm");
  }
  if (dependencyNames.has("drizzle-orm")) {
    patterns.add("drizzle-orm");
  }

  // ------ Testing ------
  if (dependencyNames.has("vitest")) {
    patterns.add("vitest-testing");
  }
  if (dependencyNames.has("jest")) {
    patterns.add("jest-testing");
  }
  if (dependencyNames.has("playwright") || dependencyNames.has("@playwright/test")) {
    patterns.add("playwright-e2e");
  }

  // ------ Monorepo ------
  const hasWorkspaces = files.some((f) => {
    if (f.file_name.endsWith("package.json") && f.raw_content) {
      try {
        const pkg = JSON.parse(f.raw_content) as Record<string, unknown>;
        return Array.isArray(pkg.workspaces);
      } catch {
        return false;
      }
    }
    return false;
  });
  if (hasWorkspaces) {
    patterns.add("monorepo");
  }

  return Array.from(patterns).sort();
}

// ---------------------------------------------------------------------------
// digestToMarkdown
// ---------------------------------------------------------------------------

export function digestToMarkdown(digest: ProjectDigest): string {
  const lines: string[] = [];

  lines.push(`# Project Digest: ${digest.projectName}`);
  lines.push(`Generated: ${digest.generatedAt}`);
  lines.push("");

  // ------ Dependencies ------
  const prodDeps = digest.dependencies.filter((d) => !d.isDev);
  const devDeps = digest.dependencies.filter((d) => d.isDev);

  if (prodDeps.length > 0 || devDeps.length > 0) {
    lines.push("## Dependencies");
    lines.push("");

    if (prodDeps.length > 0) {
      lines.push("### Production");
      for (const dep of prodDeps) {
        lines.push(`- ${dep.name}@${dep.version}`);
      }
      lines.push("");
    }

    if (devDeps.length > 0) {
      lines.push("### Dev");
      for (const dep of devDeps) {
        lines.push(`- ${dep.name}@${dep.version}`);
      }
      lines.push("");
    }
  }

  // ------ File Tree ------
  if (digest.fileTree.length > 0) {
    lines.push("## File Tree");
    lines.push("");
    lines.push("```");
    for (const entry of digest.fileTree) {
      lines.push(entry);
    }
    lines.push("```");
    lines.push("");
  }

  // ------ Import Graph (top libraries by file count) ------
  if (digest.imports.length > 0) {
    lines.push("## Import Graph");
    lines.push("");

    // Count how many files import each library/framework
    const libCount = new Map<string, number>();
    for (const imp of digest.imports) {
      for (const fw of imp.frameworks) {
        libCount.set(fw, (libCount.get(fw) ?? 0) + 1);
      }
      for (const lib of imp.libraries) {
        libCount.set(lib, (libCount.get(lib) ?? 0) + 1);
      }
    }

    const sorted = Array.from(libCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    for (const [lib, count] of sorted) {
      lines.push(`- ${lib} (${count} file${count > 1 ? "s" : ""})`);
    }
    lines.push("");
  }

  // ------ Routes ------
  if (digest.routes.length > 0) {
    lines.push("## Routes");
    lines.push("");

    const routesByType = groupBy(digest.routes, (r) => r.type);

    for (const routeType of ["middleware", "layout", "page", "api"] as const) {
      const group = routesByType.get(routeType);
      if (!group || group.length === 0) continue;

      lines.push(`### ${capitalize(routeType)}s`);
      for (const route of group) {
        if (route.methods && route.methods.length > 0) {
          lines.push(`- ${route.path} [${route.methods.join(", ")}]`);
        } else {
          lines.push(`- ${route.path}`);
        }
      }
      lines.push("");
    }
  }

  // ------ Config ------
  const hasConfig =
    digest.config.typescript ||
    digest.config.framework ||
    digest.config.deploy ||
    digest.config.styling;

  if (hasConfig) {
    lines.push("## Config");
    lines.push("");

    if (digest.config.framework) {
      const fw = digest.config.framework;
      lines.push(`- Framework: ${fw.name}${fw.version ? ` v${fw.version}` : ""}`);
    }
    if (digest.config.typescript) {
      const ts = digest.config.typescript;
      const parts: string[] = [];
      if (ts.strict !== undefined) parts.push(`strict=${String(ts.strict)}`);
      if (ts.target) parts.push(`target=${ts.target}`);
      if (ts.jsx) parts.push(`jsx=${ts.jsx}`);
      if (parts.length > 0) {
        lines.push(`- TypeScript: ${parts.join(", ")}`);
      }
    }
    if (digest.config.styling && digest.config.styling.length > 0) {
      lines.push(`- Styling: ${digest.config.styling.join(", ")}`);
    }
    if (digest.config.deploy && digest.config.deploy.length > 0) {
      lines.push(`- Deploy: ${digest.config.deploy.join(", ")}`);
    }
    lines.push("");
  }

  // ------ Patterns ------
  if (digest.patterns.length > 0) {
    lines.push("## Patterns");
    lines.push("");
    for (const pattern of digest.patterns) {
      lines.push(`- ${pattern}`);
    }
    lines.push("");
  }

  // ------ AI Rules ------
  if (digest.aiRules) {
    lines.push("## AI Rules (excerpt)");
    lines.push("");
    lines.push(digest.aiRules);
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildFileTree(files: ProjectFileInput[]): string[] {
  const paths = files
    .map((f) => f.file_path ?? f.file_name)
    .filter((p): p is string => p !== null)
    .sort();

  // Group by top-level directory for compact output
  const tree: string[] = [];
  const dirFiles = new Map<string, string[]>();

  for (const filePath of paths) {
    const parts = filePath.split("/");
    if (parts.length === 1) {
      // Root-level file
      const rootFiles = dirFiles.get("") ?? [];
      rootFiles.push(filePath);
      dirFiles.set("", rootFiles);
    } else {
      const dir = parts.slice(0, -1).join("/");
      const fileName = parts[parts.length - 1];
      const existing = dirFiles.get(dir) ?? [];
      existing.push(fileName);
      dirFiles.set(dir, existing);
    }
  }

  // Root files first
  const rootFiles = dirFiles.get("");
  if (rootFiles) {
    for (const f of rootFiles) {
      tree.push(f);
    }
    dirFiles.delete("");
  }

  // Then directories sorted
  const sortedDirs = Array.from(dirFiles.keys()).sort();
  for (const dir of sortedDirs) {
    const dirFileNames = dirFiles.get(dir)!;
    tree.push(`${dir}/`);
    for (const f of dirFileNames) {
      tree.push(`  ${f}`);
    }
  }

  return tree;
}

function normalizePath(filePath: string): string {
  // Strip leading ./ or /
  return filePath.replace(/^\.?\//, "");
}

function isInternalImport(mod: string): boolean {
  return (
    mod.startsWith("./") ||
    mod.startsWith("../") ||
    mod.startsWith("@/") ||
    mod.startsWith("~/")
  );
}

function extractPackageName(mod: string): string {
  // Scoped packages: @scope/name/... -> @scope/name
  if (mod.startsWith("@")) {
    const parts = mod.split("/");
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return mod;
  }
  // Regular packages: name/sub/path -> name
  return mod.split("/")[0];
}

function filePathToRoute(filePath: string): string {
  // Remove "app/" prefix
  let route = filePath.replace(/^app\//, "");

  // Remove the file name (page.tsx, route.ts, layout.tsx, etc.)
  route = route.replace(/\/(page|route|layout)\.(tsx?|jsx?)$/, "");

  // Remove route groups: (auth), (dashboard) etc.
  route = route.replace(/\([^)]+\)\/?/g, "");

  // Clean up double slashes
  route = route.replace(/\/+/g, "/");

  // Ensure leading slash
  if (!route.startsWith("/")) {
    route = "/" + route;
  }

  // Remove trailing slash (except for root)
  if (route.length > 1 && route.endsWith("/")) {
    route = route.slice(0, -1);
  }

  return route;
}

function detectHttpMethods(content: string | undefined): string[] {
  if (!content) return [];

  const methods: string[] = [];
  for (const method of HTTP_METHODS) {
    // Match: export async function GET, export function POST, export const GET
    const pattern = new RegExp(
      `export\\s+(?:async\\s+)?(?:function|const)\\s+${method}\\b`,
    );
    if (pattern.test(content)) {
      methods.push(method);
    }
  }
  return methods;
}

function mapPackageToFrameworkName(packageName: string): string {
  const mapping: Record<string, string> = {
    next: "Next.js",
    nuxt: "Nuxt.js",
    "@sveltejs/kit": "SvelteKit",
    "@remix-run/react": "Remix",
    astro: "Astro",
  };
  return mapping[packageName] ?? packageName;
}

function isStylingPackage(name: string): boolean {
  const stylingPackages = new Set([
    "tailwindcss",
    "@tailwindcss/postcss",
    "styled-components",
    "@emotion/react",
    "@emotion/styled",
    "sass",
    "less",
    "@chakra-ui/react",
    "@mui/material",
    "@mantine/core",
    "radix-ui",
    "@radix-ui/react-icons",
    "shadcn-ui",
  ]);
  return stylingPackages.has(name) || name.startsWith("@radix-ui/");
}

function mapStylingName(packageName: string): string {
  const mapping: Record<string, string> = {
    tailwindcss: "Tailwind CSS",
    "@tailwindcss/postcss": "Tailwind CSS",
    "styled-components": "Styled Components",
    "@emotion/react": "Emotion",
    "@emotion/styled": "Emotion",
    sass: "Sass",
    less: "Less",
    "@chakra-ui/react": "Chakra UI",
    "@mui/material": "Material UI",
    "@mantine/core": "Mantine",
  };
  if (packageName.startsWith("@radix-ui/")) return "Radix UI";
  return mapping[packageName] ?? packageName;
}

function detectDeployFromPackage(
  dependencies: { name: string; version: string; isDev: boolean }[],
  scripts: Record<string, string>,
): string[] {
  const hints: string[] = [];
  const depNames = new Set(dependencies.map((d) => d.name));

  if (depNames.has("vercel") || depNames.has("@vercel/node")) {
    hints.push("vercel");
  }

  const scriptValues = Object.values(scripts).join(" ");
  if (scriptValues.includes("vercel")) {
    hints.push("vercel");
  }
  if (scriptValues.includes("netlify")) {
    hints.push("netlify");
  }
  if (scriptValues.includes("docker")) {
    hints.push("docker");
  }

  return dedupe(hints);
}

function hasAnyFile(fileSet: Set<string>, ...paths: string[]): boolean {
  return paths.some((p) => fileSet.has(p));
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const existing = map.get(key) ?? [];
    existing.push(item);
    map.set(key, existing);
  }
  return map;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
