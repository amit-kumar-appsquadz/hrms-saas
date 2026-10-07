# HRMS multi-agent kit for Kiro

Kiro custom agents (`.kiro/agents/`) do the building; you approve at gates.

## Contents
- `.kiro/steering/hrms-rules.md` - project rules every agent follows (tenancy, latency, security, repo layout).
- `.kiro/agents/*.json` + `prompts/*.md` - planner, backend, frontend, qa, security-reviewer, performance, devops, compliance-payroll, plus an optional `orchestrator`.
- `tasks/backlog.json` - 99 tasks over sprints 0-16 (from the planning workbook).
- `scripts/orchestrate.py` - runs a sprint headlessly, one git worktree per task.

## One-time setup
1. New git repo; copy this kit in; commit to `main`.
2. Install Kiro CLI; create an API key for headless mode (Pro/Pro+/Pro Max/Power plans) and `export KIRO_API_KEY=...`.
3. `kiro-cli agent list` should show the 9 agents. Validate each: `kiro-cli agent validate --path .kiro/agents/backend.json`.
4. **Test the guardrails once** (deny rules must beat --trust-all-tools):
   `kiro-cli chat --no-interactive --agent backend --trust-all-tools "Run: terraform apply"` - it must be refused.
   Also try asking an agent to read `.env` and to write outside its allowed paths.

## Run a sprint (recommended: script mode)
Full git steps, start to end: **docs/GIT_WORKFLOW.md**.
    python scripts/sprint_git.py start 0
    python scripts/orchestrate.py --sprint 0 --dry-run
    python scripts/orchestrate.py --sprint 0          # --resume / --restart if needed
    python scripts/sprint_git.py finish 0             # then merge the PR
    python scripts/sprint_git.py done 0
Stages: planner -> backend/frontend/devops/compliance -> qa/performance -> security-reviewer.
Branches `agent/<task-id>` merge into `sprint/<N>`; you review that branch and merge to `main`.
Tasks owned by "You" print as a checklist. Mark finished tasks `"status": "done"` in `tasks/backlog.json`.

## Alternative: in-Kiro orchestrator
    kiro-cli chat --agent orchestrator
    > run sprint 1
Kiro plans the task graph and delegates to sub-agents, with a review loop on the security verdict.
Caveat: all sub-agents share one working tree (no worktree isolation), so parallel writers can collide,
and delegation to custom agents has had bug reports (kirodotdev/Kiro#11333). Use it for small sprints or exploration.

## Notes
- Hooks do not trigger inside sub-agents, so protections are `permissions.rules` in each agent config.
- Agents never apply Terraform or call the AWS CLI; payroll output always needs expert verification.
- To pin a model per agent, add a `"model"` field (list IDs with `/model` in a chat session).
- Runs consume your Kiro plan's credits; start with Sprint 0 and read every output before Sprint 1.
