interface PackageDependency {
  name: string;
  version: string;
  isDev: boolean;
}

interface PackageJsonResult {
  name?: string;
  version?: string;
  dependencies: PackageDependency[];
  scripts: Record<string, string>;
  engines?: Record<string, string>;
}

export function parsePackageJson(content: string): PackageJsonResult {
  try {
    const pkg = JSON.parse(content) as Record<string, unknown>;

    const dependencies: PackageDependency[] = [];

    const deps = pkg.dependencies as Record<string, string> | undefined;
    if (deps && typeof deps === "object") {
      for (const [name, version] of Object.entries(deps)) {
        dependencies.push({ name, version, isDev: false });
      }
    }

    const devDeps = pkg.devDependencies as Record<string, string> | undefined;
    if (devDeps && typeof devDeps === "object") {
      for (const [name, version] of Object.entries(devDeps)) {
        dependencies.push({ name, version, isDev: true });
      }
    }

    return {
      name: typeof pkg.name === "string" ? pkg.name : undefined,
      version: typeof pkg.version === "string" ? pkg.version : undefined,
      dependencies,
      scripts: (typeof pkg.scripts === "object" && pkg.scripts !== null
        ? pkg.scripts
        : {}) as Record<string, string>,
      engines: (typeof pkg.engines === "object" && pkg.engines !== null
        ? pkg.engines
        : undefined) as Record<string, string> | undefined,
    };
  } catch {
    return { dependencies: [], scripts: {} };
  }
}

interface PipPackage {
  name: string;
  version?: string;
}

export function parseRequirementsTxt(content: string): PipPackage[] {
  const packages: PipPackage[] = [];

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#") || line.startsWith("-")) {
      continue;
    }

    const eqMatch = line.match(/^([a-zA-Z0-9_-]+)\s*[=<>!~]+\s*(.+)$/);
    if (eqMatch) {
      packages.push({ name: eqMatch[1], version: eqMatch[2].trim() });
    } else {
      const nameOnly = line.match(/^([a-zA-Z0-9_-]+)/);
      if (nameOnly) {
        packages.push({ name: nameOnly[1] });
      }
    }
  }

  return packages;
}

interface TsConfigResult {
  compilerTarget?: string;
  module?: string;
  strict?: boolean;
  jsx?: string;
  paths?: Record<string, string[]>;
}

export function parseTsConfig(content: string): TsConfigResult {
  try {
    const config = JSON.parse(content) as Record<string, unknown>;
    const compilerOptions = config.compilerOptions as Record<string, unknown> | undefined;

    if (!compilerOptions) {
      return {};
    }

    return {
      compilerTarget: typeof compilerOptions.target === "string" ? compilerOptions.target : undefined,
      module: typeof compilerOptions.module === "string" ? compilerOptions.module : undefined,
      strict: typeof compilerOptions.strict === "boolean" ? compilerOptions.strict : undefined,
      jsx: typeof compilerOptions.jsx === "string" ? compilerOptions.jsx : undefined,
      paths: (typeof compilerOptions.paths === "object" && compilerOptions.paths !== null
        ? compilerOptions.paths
        : undefined) as Record<string, string[]> | undefined,
    };
  } catch {
    return {};
  }
}

type FileType = "dependency" | "ai_config" | "build_config" | "source_code" | "other";

const DEPENDENCY_FILES = new Set([
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
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
]);

const AI_CONFIG_FILES = new Set([
  "CLAUDE.md",
  ".cursorrules",
  ".windsurfrules",
  "CONVENTIONS.md",
  ".codex",
  ".gemini",
]);

const BUILD_CONFIG_FILES = new Set([
  "tsconfig.json",
  "next.config.js",
  "next.config.ts",
  "next.config.mjs",
  "vite.config.ts",
  "vite.config.js",
  "nuxt.config.ts",
  "angular.json",
  "docker-compose.yml",
  "docker-compose.yaml",
  "Dockerfile",
  ".env.example",
  "vercel.json",
  "netlify.toml",
  "webpack.config.js",
  "rollup.config.js",
  "esbuild.config.js",
]);

export function detectFileType(fileName: string): FileType {
  const baseName = fileName.split("/").pop() || fileName;

  if (DEPENDENCY_FILES.has(baseName)) return "dependency";
  if (AI_CONFIG_FILES.has(baseName)) return "ai_config";
  if (BUILD_CONFIG_FILES.has(baseName)) return "build_config";

  const ext = baseName.split(".").pop()?.toLowerCase();
  const sourceExtensions = new Set([
    "ts", "tsx", "js", "jsx", "py", "rs", "go", "java", "kt", "rb", "php",
    "vue", "svelte", "astro",
  ]);

  if (ext && sourceExtensions.has(ext)) return "source_code";

  return "other";
}

export interface TechHint {
  name: string;
  category: string;
  version?: string;
  confidence: number;
  detectedFrom: string;
}

interface ProjectFileInput {
  file_name: string;
  raw_content: string | null;
  file_type: string;
}

export function extractTechHints(files: ProjectFileInput[]): TechHint[] {
  const hints: TechHint[] = [];

  for (const file of files) {
    if (!file.raw_content) continue;

    if (file.file_name === "package.json" && file.file_type === "dependency") {
      const result = parsePackageJson(file.raw_content);

      for (const dep of result.dependencies) {
        const hint = mapNpmPackageToHint(dep.name, dep.version, dep.isDev);
        if (hint) {
          hints.push({ ...hint, detectedFrom: "package.json" });
        }
      }
    }

    if (file.file_name === "requirements.txt") {
      const packages = parseRequirementsTxt(file.raw_content);
      hints.push({
        name: "Python",
        category: "language",
        confidence: 0.95,
        detectedFrom: "requirements.txt",
      });
      for (const pkg of packages) {
        const hint = mapPipPackageToHint(pkg.name, pkg.version);
        if (hint) {
          hints.push({ ...hint, detectedFrom: "requirements.txt" });
        }
      }
    }

    if (file.file_name === "tsconfig.json") {
      hints.push({
        name: "TypeScript",
        category: "language",
        confidence: 0.99,
        detectedFrom: "tsconfig.json",
      });
    }

    if (file.file_name.startsWith("next.config")) {
      hints.push({
        name: "Next.js",
        category: "framework",
        confidence: 0.99,
        detectedFrom: file.file_name,
      });
    }

    if (file.file_name.startsWith("vite.config")) {
      hints.push({
        name: "Vite",
        category: "build_tool",
        confidence: 0.99,
        detectedFrom: file.file_name,
      });
    }

    if (file.file_name === "Dockerfile" || file.file_name === "docker-compose.yml") {
      hints.push({
        name: "Docker",
        category: "deploy",
        confidence: 0.95,
        detectedFrom: file.file_name,
      });
    }

    if (file.file_name === "vercel.json") {
      hints.push({
        name: "Vercel",
        category: "deploy",
        confidence: 0.95,
        detectedFrom: "vercel.json",
      });
    }

    if (file.file_name === "Cargo.toml") {
      hints.push({
        name: "Rust",
        category: "language",
        confidence: 0.99,
        detectedFrom: "Cargo.toml",
      });
    }

    if (file.file_name === "go.mod") {
      hints.push({
        name: "Go",
        category: "language",
        confidence: 0.99,
        detectedFrom: "go.mod",
      });
    }
  }

  return deduplicateHints(hints);
}

function mapNpmPackageToHint(
  name: string,
  version: string,
  isDev: boolean,
): Omit<TechHint, "detectedFrom"> | null {
  const cleanVersion = version.replace(/^[\^~>=<]+/, "");

  const frameworkMap: Record<string, { category: string; displayName?: string }> = {
    next: { category: "framework", displayName: "Next.js" },
    react: { category: "framework", displayName: "React" },
    "react-dom": { category: "framework", displayName: "React DOM" },
    vue: { category: "framework", displayName: "Vue.js" },
    nuxt: { category: "framework", displayName: "Nuxt.js" },
    svelte: { category: "framework", displayName: "Svelte" },
    angular: { category: "framework", displayName: "Angular" },
    express: { category: "framework", displayName: "Express.js" },
    fastify: { category: "framework", displayName: "Fastify" },
    tailwindcss: { category: "styling", displayName: "Tailwind CSS" },
    "@supabase/supabase-js": { category: "database", displayName: "Supabase" },
    prisma: { category: "database", displayName: "Prisma" },
    "@prisma/client": { category: "database", displayName: "Prisma" },
    drizzle: { category: "database", displayName: "Drizzle ORM" },
    mongoose: { category: "database", displayName: "MongoDB (Mongoose)" },
    stripe: { category: "library", displayName: "Stripe" },
    typescript: { category: "language", displayName: "TypeScript" },
    jest: { category: "testing", displayName: "Jest" },
    vitest: { category: "testing", displayName: "Vitest" },
    playwright: { category: "testing", displayName: "Playwright" },
    cypress: { category: "testing", displayName: "Cypress" },
    webpack: { category: "build_tool", displayName: "Webpack" },
    vite: { category: "build_tool", displayName: "Vite" },
    esbuild: { category: "build_tool", displayName: "esbuild" },
    eslint: { category: "build_tool", displayName: "ESLint" },
    prettier: { category: "build_tool", displayName: "Prettier" },
  };

  const mapping = frameworkMap[name];
  if (!mapping) return null;

  return {
    name: mapping.displayName || name,
    category: mapping.category,
    version: cleanVersion || undefined,
    confidence: isDev ? 0.8 : 0.9,
  };
}

function mapPipPackageToHint(
  name: string,
  version?: string,
): Omit<TechHint, "detectedFrom"> | null {
  const lowerName = name.toLowerCase();

  const pipMap: Record<string, { category: string; displayName: string }> = {
    django: { category: "framework", displayName: "Django" },
    flask: { category: "framework", displayName: "Flask" },
    fastapi: { category: "framework", displayName: "FastAPI" },
    sqlalchemy: { category: "database", displayName: "SQLAlchemy" },
    pytest: { category: "testing", displayName: "pytest" },
    numpy: { category: "library", displayName: "NumPy" },
    pandas: { category: "library", displayName: "Pandas" },
    tensorflow: { category: "library", displayName: "TensorFlow" },
    torch: { category: "library", displayName: "PyTorch" },
  };

  const mapping = pipMap[lowerName];
  if (!mapping) return null;

  return {
    name: mapping.displayName,
    category: mapping.category,
    version,
    confidence: 0.9,
  };
}

function deduplicateHints(hints: TechHint[]): TechHint[] {
  const seen = new Map<string, TechHint>();

  for (const hint of hints) {
    const key = hint.name.toLowerCase();
    const existing = seen.get(key);

    if (!existing || hint.confidence > existing.confidence) {
      seen.set(key, hint);
    }
  }

  return Array.from(seen.values());
}
