# HRMS multi-agent kit

Agents do the building; you approve at gates. Uses Claude Code subagents (`.claude/agents/*.md`).

## One-time setup
1. `git init` a new repo, copy this kit in, commit to `main`.
2. Install Claude Code and sign in (`claude`). Run `claude agents` to confirm the 8 subagents load.
3. Review `.claude/settings.json` (deny rules for terraform apply, force-push, .env reads) and `CLAUDE.md`.

## Run a sprint
    python scripts/orchestrate.py --sprint 0 --dry-run    # preview
    python scripts/orchestrate.py --sprint 0              # run
Stages: planner -> backend/frontend/devops/compliance -> qa/performance -> security-reviewer.
Branches `agent/<task-id>` merge into `sprint/<N>`; you review that branch and open a PR to `main`.
Tasks owned by "You" are printed as a checklist (AWS accounts, DLT registration, expert engagement...).

## Notes
- Mark tasks done by editing `status` in `tasks/backlog.json` ("todo" -> "done"); the orchestrator skips done tasks.
- Start with Sprint 0 and read every output before Sprint 1; adjust agent prompts as you learn.
- Agents never `terraform apply`; payroll output always needs expert verification.
- Verify CLI flags with `claude --help` for your installed version.
