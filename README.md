# AI Agent, Skills & MCP Backup Archive

Generated: 2026-09-27
Target User: DANIEL
System: Windows (Antigravity / Gemini CLI / Cline / AgentsRoom)

---

## Overview

This archive is a complete, self-contained backup of your entire AI engineering environment, including all custom agents, prompt architectures, skill libraries, MCP (Model Context Protocol) configurations, tool schemas, automation plugins, and project agent workflows.

---

## Directory Structure & Component Inventory

### `01_Agents_and_Prompts/`
Contains all agent personas, system rules, and team orchestration frameworks:
- **`team_prompts/`**: The 7 core agents of the Multi-Agent Organization Doctrine:
  - `00_fable_advisor.md`: Supreme Strategic Advisor & commitment boundary gatekeeper.
  - `01_architect_orchestrator.md`: System topology, intake, contract design, and dispatching.
  - `02_context_scout.md`: Read-only codebase exploration and triage.
  - `03_spec_contract_engineer.md`: 6-Part Spec contracts.
  - `04_web_developer.md`: Full-stack UI & API developer.
  - `05_cyber_pentest_agent.md`: Penetration tester & security hardening.
  - `06_independent_verifier.md`: Test execution, terminal evidence, QA.
  - `README.md`: Organizational doctrine overview.
- **`global_rules/`**: Global rules (`AGENTS.md`) enforced across projects.
- **`top_level_instructions/`**: Root `AGENTS.md` and `GEMINI.md` system guidelines.
- **`cline_rules/`**: Rules from `.cline/rules/` (`browser-testing.md`).
- **`ctf_tracker_agentsroom/`**: Agent configurations, memory templates (`obsidian-vault-agents.md`, `obsidian-agent-template-library.md`), cached prompts, and agent run histories from AgentsRoom.

### `02_MCP_Configurations_and_Tools/`
All Model Context Protocol servers, client configurations, tool schemas, and runtime bridges:
- **`antigravity_mcp_config.json`**: Global MCP configuration for Antigravity/Gemini (Brave/Chrome DevTools, Cloud Run, Filesystem, NotebookLM).
- **`cline_mcp_settings.json`**: Global MCP settings for Cline (Sequential Thinking, Playwright, Fetch, SQLite, Postgres, Brave Search, DevTools, Filesystem).
- **`ctf_tracker_mcp.json` & `ctf_tracker_agents_mcp_config.json`**: Workspace-level MCP configs for AgentsRoom MCP, Test Runner, and QA Tester.
- **`antigravity_mcp_tool_schemas/`**: Full JSON schemas and instructions for lazy-loaded tools (`chrome-devtools`, `cloudrun`, `filesystem`, `notebooklm`).
- **`scripts_and_bridges/`**: Runtime launcher scripts and proxy bridges (`brave-devtools-bridge.js`, `Start-Brave-Debug.bat`, `Start-Brave-Debug.ps1`, etc.).

### `03_Skills/`
Comprehensive repository of 170+ unique skills across all environments:
- **`antigravity_config_skills/`**: Active custom skills in `~/.gemini/config/skills/` (TDD, cybersecurity CTF suites, a11y, Apple design, vercel patterns, artifacts builder, etc.).
- **`gemini_root_skills/`**: Skills located in `~/.gemini/skills/`.
- **`antigravity_app_skills/`**: Skills located in `~/.gemini/antigravity/skills/`.
- **`antigravity_builtin_skills/`**: Builtin capabilities (`agy-customizations`, `antigravity_guide`, `generative_ui`, `migrate-workflows`, `permissioned-github`).
- **`cline_skills/`**: Full skill suite from `~/.cline/skills/` (including `VibeSec-Skill`, `writing-skills`, `web-design-engineer`, `web-video-presentation`, etc.).

### `04_Plugins/`
Complete installed plugins:
- `android-cli-plugin`
- `chrome-devtools-plugin`
- `composio-library` (800+ integrations)
- `data-agent-kit-plugin` (BigQuery, Bigtable, Airflow, Composer, dbt, Dataform)
- `firebase` (Auth, App Hosting, Firestore, Rules, Data Connect)
- `flutter` (Dart tests, layouts, state, http, ffigen)
- `google-antigravity-sdk` (Multi-agent orchestration SDK)
- `modern-web-guidance-plugin`
- `science` (AlphaFold, NCBI, ChEMBL, PubMed, ClinicalTrials, PDB, etc.)

### `05_Settings_and_Manifests/`
- `gemini_config.json`: Plugin enablements and settings.
- `gemini_settings.json`: Antigravity environment settings.
- `trustedFolders.json`: Workspace trust registry.

---

## How to Restore

You can restore these configurations on any Windows machine using the included automated script:

```powershell
powershell -ExecutionPolicy Bypass -File .\RESTORE.ps1
```

Or copy the folders manually to:
- Antigravity / Gemini: `C:\Users\<YOUR_USERNAME>\.gemini\`
- Cline: `C:\Users\<YOUR_USERNAME>\.cline\`