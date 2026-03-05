# @vibeuniv/mcp-server

VibeUniv MCP Server — Sync your vibe-coded projects for tech stack analysis and personalized learning.

## What is VibeUniv?

VibeUniv helps vibe coders understand and learn the tech stacks of projects they've built with AI coding tools. Connect your coding environment to VibeUniv and get personalized learning paths based on your actual projects.

- **Website:** [vibeuniv.com](https://vibeuniv.com)
- **API Key:** [vibeuniv.com/settings/api](https://vibeuniv.com/settings/api)

## Quick Start

### 1. Get your API key

Sign up at [vibeuniv.com](https://vibeuniv.com) and generate an API key at **Settings > API Keys**.

### 2. Add to your AI tool

Choose your tool below and add the configuration.

### 3. Restart your AI tool

Fully restart (not just reload) your AI tool after adding the config.

### 4. Start using

Say to your AI: **"vibeuniv에 이 프로젝트를 연동해줘"** or **"Sync this project to VibeUniv"**

## Configuration

### Claude Code

Add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "vibeuniv": {
      "command": "npx",
      "args": ["-y", "@vibeuniv/mcp-server@latest"],
      "env": {
        "VIBEUNIV_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "vibeuniv": {
      "command": "npx",
      "args": ["-y", "@vibeuniv/mcp-server@latest"],
      "env": {
        "VIBEUNIV_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "vibeuniv": {
      "command": "npx",
      "args": ["-y", "@vibeuniv/mcp-server@latest"],
      "env": {
        "VIBEUNIV_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Cline (VS Code)

Open **Cline > MCP Servers > Edit Config** and add:

```json
{
  "mcpServers": {
    "vibeuniv": {
      "command": "npx",
      "args": ["-y", "@vibeuniv/mcp-server@latest"],
      "env": {
        "VIBEUNIV_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Kimi Code CLI

Add to `~/.kimi/mcp.json`:

```json
{
  "mcpServers": {
    "vibeuniv": {
      "command": "npx",
      "args": ["-y", "@vibeuniv/mcp-server@latest"],
      "env": {
        "VIBEUNIV_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Gemini CLI

Add to `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "vibeuniv": {
      "command": "npx",
      "args": ["-y", "@vibeuniv/mcp-server@latest"],
      "env": {
        "VIBEUNIV_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### OpenAI Codex

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.vibeuniv]
command = "npx"
args = ["-y", "@vibeuniv/mcp-server@latest"]

[mcp_servers.vibeuniv.env]
VIBEUNIV_API_KEY = "your-api-key-here"
```

### Fallback: Global Install

If `npx` doesn't work (corporate firewalls, etc.):

```bash
npm install -g @vibeuniv/mcp-server
```

Then replace `"command": "npx", "args": ["-y", "@vibeuniv/mcp-server@latest"]` with `"command": "vibeuniv-mcp"`.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VIBEUNIV_API_KEY` | Yes | — | Your VibeUniv API key |
| `VIBEUNIV_API_URL` | No | `https://vibeuniv.com/api/v1` | API base URL |

> Backward compatibility: `VIBESTACK_API_KEY` and `VIBESTACK_API_URL` still work.

## Available Tools (13)

### Project Setup

| Tool | Description |
|------|-------------|
| `vibeuniv_sync_project` | Sync current project to VibeUniv (auto-detect files) |
| `vibeuniv_upload_files` | Upload specific files for analysis |

### Tech Stack Analysis

| Tool | Description |
|------|-------------|
| `vibeuniv_analyze` | Trigger tech stack analysis (returns instructions for local AI) |
| `vibeuniv_submit_tech_stacks` | Submit locally-analyzed tech stack results |
| `vibeuniv_submit_analysis` | Submit educational analysis of the project |

### Learning Curriculum

| Tool | Description |
|------|-------------|
| `vibeuniv_generate_curriculum` | Generate curriculum structure (Pass 1 — structure only) |
| `vibeuniv_generate_module_content` | Generate module content (Pass 2 — per-module sections) |
| `vibeuniv_create_curriculum` | Create a draft curriculum on the server |
| `vibeuniv_submit_module` | Submit a single module (auto-activates on last module) |
| `vibeuniv_submit_curriculum` | Submit complete curriculum at once (legacy) |
| `vibeuniv_get_learning` | Get existing learning path for a project |

### AI Tutor & Sessions

| Tool | Description |
|------|-------------|
| `vibeuniv_ask_tutor` | Ask the AI tutor about your project's tech stack |
| `vibeuniv_log_session` | Log a coding session summary |

## How It Works

```
User: "커리큘럼 생성해줘"
         ↓
AI → vibeuniv_generate_curriculum    → curriculum structure (~2KB)
AI → vibeuniv_create_curriculum      → draft learning path
AI → vibeuniv_generate_module_content × N → section instructions per module
AI → vibeuniv_submit_module × N      → submit each module (~5KB each)
         ↓
Curriculum auto-activates → Learn at vibeuniv.com
```

All heavy lifting (content generation) happens locally in your AI tool. The server stores results only — zero server-side LLM cost.

## Auto-detected Files

The file scanner automatically detects:

- **Dependencies:** package.json, requirements.txt, Cargo.toml, go.mod, etc.
- **AI Project Files:** CLAUDE.md, .cursorrules, .windsurfrules, etc.
- **Config:** tsconfig.json, next.config.*, vite.config.*, Dockerfile, etc.
- **Documentation:** README.md (first 50 lines)

## FAQ

### Does updating the package reset my API key?

**No.** Your API key is stored in your tool's config file (e.g., `~/.claude.json`), not in the npm package. Using `npx @vibeuniv/mcp-server@latest` always runs the latest version without touching your config.

### Do I need to update manually?

If you use `npx -y @vibeuniv/mcp-server@latest`, updates are **automatic**. If you used `npm install -g`, run the install command again to update.

## Development

```bash
npm install
npm run build
VIBEUNIV_API_KEY=your-key npm run dev
```

## License

MIT
