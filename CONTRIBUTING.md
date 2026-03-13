# Contributing to wolfir

Thank you for your interest in wolfir — we welcome contributions from the community.

## Getting Started

1. **Fork** the repository and clone your fork.
2. Follow the setup instructions in [README.md](README.md) or use the [Docker setup](#docker-setup) below.
3. Create a feature branch: `git checkout -b feat/your-feature-name`
4. Make your changes, add tests where possible.
5. Submit a pull request against `main`.

## Good First Issues

Look for issues labeled `good first issue` on GitHub. Great starting points:

- **Add a new demo scenario** — create a scenario in `backend/utils/mock_data.py` and `frontend/src/data/quickDemoResult.ts`
- **Improve compliance mapping** — add controls to `frontend/src/components/Analysis/ComplianceMapping.tsx`
- **Expand MITRE ATLAS coverage** — add technique detection in `backend/services/ai_pipeline_monitor.py`
- **Add a new MCP tool** — register a new `@mcp_server.tool` function in `backend/mcp_server.py`
- **Improve the Attack Path legend** — extend `AttackPathDiagram.tsx`
- **Write backend tests** — add test cases to `backend/tests/`

## Project Structure

```
wolfir/
├── backend/                  # FastAPI backend
│   ├── agents/               # Nova model agents (temporal, risk scorer, remediation, etc.)
│   ├── api/                  # REST API routes
│   ├── mcp_servers/          # MCP server implementations (CloudTrail, IAM, etc.)
│   ├── services/             # Business logic (AI pipeline monitor, incident memory, etc.)
│   ├── utils/                # Config, logger, mock data, prompts
│   └── tests/                # pytest test suite
├── frontend/                 # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/       # UI components (Dashboard, Analysis, Landing, etc.)
│   │   ├── data/             # Demo scenarios, blog content, static data
│   │   ├── services/         # API client
│   │   └── utils/            # Formatting, PDF generation
├── docs/                     # Setup guides, architecture docs
├── playbooks/                # Incident response playbooks (OWASP, NIST)
├── terraform/                # Optional infrastructure as code
└── docker-compose.yml        # Zero-friction local setup
```

## Docker Setup

```bash
docker compose up
# Frontend: http://localhost:5173
# Backend:  http://localhost:8000
```

See [docker-compose.yml](docker-compose.yml) for configuration. Set your AWS credentials as environment variables before running.

## Code Standards

- **Python:** Follow PEP 8. Use type hints. Keep functions under 60 lines where possible.
- **TypeScript:** No `@ts-ignore`. Avoid `any` where a proper type exists.
- **No credentials in code.** Never commit `.env` files. Use `.env.example` as a template.
- **Tests:** Add pytest tests for new backend endpoints. Frontend: verify demo mode works without backend.

## Architecture Guidelines

- **New Nova model usage:** Add a comment explaining why this model was chosen over alternatives.
- **New MCP tools:** Register in both `mcp_server.py` (`@mcp_server.tool`) and `strands_orchestrator.py` (`@tool`) so both the MCP SSE interface and the Strands agent can use them.
- **Demo fallbacks:** Any new feature should have a client-side demo fallback in `quickDemoResult.ts` or component-level mock data.

## Pull Request Checklist

- [ ] Code runs without errors (`tsc --noEmit` passes, `pytest` passes)
- [ ] Demo mode works without backend running
- [ ] No `console.log` / `print()` debug statements in production paths
- [ ] `.env.example` updated if new env vars added
- [ ] README updated if architecture changed

## Questions?

Open an issue or start a Discussion on GitHub. For security issues, see [SECURITY.md](SECURITY.md) (create one before public launch).
