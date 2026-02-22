# @vibestack/mcp-server

VibeStack MCP Server - Sync your vibe-coded projects for tech stack analysis and learning.

## What is VibeStack?

VibeStack helps vibe coders understand and learn the tech stacks of projects they've built with AI coding tools. Connect your coding environment to VibeStack and get personalized learning paths based on your actual projects.

## Installation

### Using npx (Recommended)

```bash
npx @vibestack/mcp-server
```

### Global Install

```bash
npm install -g @vibestack/mcp-server
vibestack-mcp
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VIBESTACK_API_KEY` | Yes | - | Your VibeStack API key. Get it at [vibestack.io/settings/api](https://vibestack.io/settings/api) |
| `VIBESTACK_API_URL` | No | `https://vibestack.io/api/v1` | API base URL (for self-hosted instances) |

### Claude Code

Add to your Claude Code MCP settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "vibestack": {
      "command": "npx",
      "args": ["-y", "@vibestack/mcp-server"],
      "env": {
        "VIBESTACK_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Cursor

Add to your Cursor MCP settings (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "vibestack": {
      "command": "npx",
      "args": ["-y", "@vibestack/mcp-server"],
      "env": {
        "VIBESTACK_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Windsurf

Add to your Windsurf MCP settings (`~/.windsurf/mcp.json`):

```json
{
  "mcpServers": {
    "vibestack": {
      "command": "npx",
      "args": ["-y", "@vibestack/mcp-server"],
      "env": {
        "VIBESTACK_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Cline (VS Code)

Add to Cline MCP settings:

```json
{
  "mcpServers": {
    "vibestack": {
      "command": "npx",
      "args": ["-y", "@vibestack/mcp-server"],
      "env": {
        "VIBESTACK_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Available Tools

### vibestack_sync_project

Sync your current project's tech stack files to VibeStack.

```
Input:
  - project_name (optional): Name for the project
  - description (optional): Short project description
```

### vibestack_upload_files

Upload specific files for detailed analysis.

```
Input:
  - project_id: Your VibeStack project ID
  - file_paths: Array of file paths to upload
```

### vibestack_analyze

Trigger AI analysis of your project's tech stack.

```
Input:
  - project_id: Your VibeStack project ID
```

### vibestack_get_learning

Get personalized learning recommendations based on detected tech stack.

```
Input:
  - project_id: Your VibeStack project ID
```

### vibestack_log_session

Log a coding session summary for progress tracking.

```
Input:
  - project_id: Your VibeStack project ID
  - summary: Summary of the coding session
  - files_changed (optional): List of changed files
```

### vibestack_ask_tutor

Ask the AI tutor questions about your project's tech stack.

```
Input:
  - project_id: Your VibeStack project ID
  - question: Your question about the tech stack
```

## Usage Example

1. **Sync your project:** Ask your AI assistant to "sync this project to VibeStack"
2. **Analyze the stack:** "Analyze this project's tech stack on VibeStack"
3. **Get learning path:** "What should I learn about this project's tech stack?"
4. **Ask questions:** "Ask VibeStack tutor: How does Next.js App Router work?"

## Development

```bash
# Install dependencies
npm install

# Run in development mode
VIBESTACK_API_KEY=your-key npm run dev

# Build
npm run build

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

## Auto-detected Files

The file scanner automatically detects:

- **Dependencies:** package.json, requirements.txt, Cargo.toml, go.mod, etc.
- **AI Project Files:** CLAUDE.md, .cursorrules, .windsurfrules, etc.
- **Config:** tsconfig.json, next.config.*, vite.config.*, Dockerfile, etc.
- **Documentation:** README.md (first 50 lines)

## License

MIT
