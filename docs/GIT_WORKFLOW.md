# Git workflow: start to end

Verified locally with a fake agent CLI (sprint start -> run -> failure -> resume -> finish -> merge -> done).
Steps marked **(GitHub, untested)** use `gh`/GitHub settings I could not run; check them once.

## Branch model
| Branch | Who writes | Lifetime |
|---|---|---|
| `main` | only merged PRs (and the `done` bookkeeping commit) | forever; protected |
| `sprint/<N>` | orchestrator merges task branches into it | one sprint |
| `agent/<TASK-ID>` | one agent, in its own worktree `../<repo>-worktrees/<TASK-ID>` | one task |
| `hotfix/<name>` | you (or an agent you direct) | short |

Tags: `sprint-<N>` after each sprint, `phase-<N>` at phase exits, `v0.x.0` for releases to real customers.

---
## PART 1. One-time setup

1. **Create the repo and first commit**
       mkdir hrms-platform && cd hrms-platform
       unzip ../hrms-kiro-kit.zip -d . && mv hrms-kiro-kit/* hrms-kiro-kit/.[!.]* . && rmdir hrms-kiro-kit
       git init -b main
       git config user.name "Your Name" && git config user.email "you@example.com"
       git add -A && git commit -m "chore: initial agent kit"
2. **Edit `.github/CODEOWNERS`**: replace `@your-github-username`. Commit.
3. **Create the GitHub repo (private) and push** *(GitHub, untested)*
       gh auth login
       gh repo create hrms-platform --private --source=. --remote=origin --push
4. **Repo settings** *(GitHub, untested)*: Settings > General > Pull Requests: allow **merge commits** (keeps per-task history; do not squash), enable "Automatically delete head branches".
5. **Protect `main`** *(GitHub, untested)*: Settings > Branches (or `gh api`). Require a pull request; block force-pushes and deletions. As a solo owner, set required approvals to 0 and do not enforce on admins, otherwise you cannot merge your own PR. Review is *your* discipline using the PR checklist.
6. **Secrets safety**: `.gitignore` already blocks `.env`, `*.pem`, state files. Turn on GitHub secret scanning/push protection if your plan offers it; otherwise add gitleaks to CI in Sprint 1.
7. **Sanity check**: `python scripts/sprint_git.py status` shows only `main`.

---
## PART 2. The sprint loop (repeat for sprints 0-16)

Replace `N` with the sprint number. Run from the repo root.

| # | Step | Command | Who |
|---|---|---|---|
| 1 | Sync and verify clean `main` | `python scripts/sprint_git.py start N` | you |
| 2 | Preview tasks | `python scripts/orchestrate.py --sprint N --dry-run` | you |
| 3 | Run the sprint (creates `sprint/N`, one worktree+branch per task, merges per stage) | `python scripts/orchestrate.py --sprint N` | agents |
| 4 | If a stage failed: read the error, fix the cause (prompt, permissions, blocker note in `docs/notes/`), then continue. Merged tasks are skipped. | `python scripts/orchestrate.py --sprint N --resume` | you + agents |
| 5 | Inspect what the agents did | `git log --first-parent --oneline main..sprint/N` and `git diff main...sprint/N --stat` | you |
| 6 | Review gated work. Diff one task: `git diff main...agent/<ID>` (before step 7) or `git show <merge-sha>`. Read `docs/reviews/*` verdicts; expert checks `needs-expert` items. Run the tests locally. | review | you (+ expert) |
| 7 | Clean worktrees, delete merged task branches, push `sprint/N`, open PR *(push/PR: GitHub, untested)* | `python scripts/sprint_git.py finish N` | you |
| 8 | If you want changes: ask an agent to fix on `sprint/N` (re-run a task with `--resume` after resetting it) or commit a fix yourself on `sprint/N`; push. | | you |
| 9 | Merge the PR with **"Create a merge commit"** | GitHub UI / `gh pr merge --merge` | you |
| 10 | Close the sprint: mark agent tasks `done`, tag `sprint-N`, delete the sprint branch | `python scripts/sprint_git.py done N` | you |
| 11 | Do your own tasks (owner "You"), set them `done` in `tasks/backlog.json`, commit on a small branch + PR | | you |

### Rules the tooling enforces
- `orchestrate.py` refuses a dirty tree, and refuses to overwrite an existing `sprint/N` (use `--resume`, or `--restart` to discard).
- A failed task leaves its worktree for debugging; the next `--resume` rebuilds it fresh.
- Agents cannot push, force-push, apply Terraform, or call the AWS CLI (permission deny rules).

### Commit conventions
- Agents: `S1-04: tenant resolution middleware` (task ID first).
- You: `fix:`, `chore:`, `docs:` prefixes. Never commit directly to `main` except the automated `chore: mark sprint N agent tasks done`.

---
## PART 3. Project-level milestones

| When | Git action |
|---|---|
| Sprint 1 (CI task) | Add required status check `ci` to the `main` protection rule *(GitHub, untested)* |
| End of Sprint 6 | `git tag -a phase-1 -m "Phase 1 complete"` and push tags |
| Sprint 8 | First staging deploy: pipeline deploys from `main` |
| Sprint 10 | Tag `v0.1.0` = first pilot release. Production deploys from tags only, with a manual approval environment *(GitHub, untested)* |
| Phase 3 exit | `phase-3` tag after expert verification |
| After a bad merge | On a branch: `git revert -m 1 <merge-sha>`, open PR. Never rewrite `main`. |
| Urgent production bug | `git checkout -b hotfix/<name> <latest-tag>`; fix; PR to `main`; tag `v0.x.y` |

---
## PART 4. Troubleshooting
| Symptom | Fix |
|---|---|
| `Working tree not clean` | `git status`; commit or stash |
| `sprint/N already exists` | `--resume` to continue, `--restart` to discard |
| Merge conflict between task branches | Script aborts that merge and stops. Resolve on `sprint/N` manually (`git merge agent/<ID>`), commit, then `--resume` |
| Leftover worktrees | `python scripts/sprint_git.py finish N` or `git worktree prune` |
| Task branch not merged warning at `finish` | Branch kept on purpose: inspect with `git log main..agent/<ID>` |
| Wrong agent output merged to `sprint/N` before PR | `git revert -m 1 <merge-sha>` on `sprint/N`, then re-run that task |
