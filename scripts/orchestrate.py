#!/usr/bin/env python3
"""Run one sprint with Kiro custom agents (headless mode, one git worktree per task).

Per task: `kiro-cli chat --no-interactive --agent <agent> ...` inside its own worktree/branch.
Stages run in order; tasks inside a stage run in parallel. After each stage, task branches are merged
into the integration branch `sprint/<N>`. A human reviews that branch and merges it to main.

Usage:
  python scripts/orchestrate.py --sprint 0 --dry-run
  python scripts/orchestrate.py --sprint 1 [--workers 3] [--stage 1] [--resume] [--restart]
Requires: git, kiro-cli, and KIRO_API_KEY in the environment (headless mode needs an API key;
see https://kiro.dev/docs/cli/headless/). Agents are the ones in .kiro/agents/.
"""
import argparse, json, os, shutil, subprocess, sys, pathlib, threading
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = pathlib.Path(__file__).resolve().parents[1]
BACKLOG = ROOT / "tasks" / "backlog.json"
STAGES = [
    ["planner"],
    ["backend", "frontend", "devops", "compliance-payroll"],
    ["qa", "performance"],
    ["security-reviewer"],
]
# Deny rules in each agent's permissions always win over --trust-all-tools (verify once; see README).
KIRO_FLAGS = ["--no-interactive", "--trust-all-tools"]
EXIT_AGENT_NOT_FOUND = 4
GIT_LOCK = threading.Lock()  # git worktree add is not safe to run concurrently
WORKTREES = ROOT.parent / f"{ROOT.name}-worktrees"

def sh(cmd, cwd=ROOT, check=True):
    r = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)
    if check and r.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd)}\n{r.stdout}\n{r.stderr}")
    return r

def branch_exists(name):
    return sh(["git", "rev-parse", "--verify", "--quiet", f"refs/heads/{name}"], check=False).returncode == 0

def already_merged(task_id, n):
    b = f"agent/{task_id}"
    return branch_exists(b) and sh(["git", "merge-base", "--is-ancestor", b, f"sprint/{n}"], check=False).returncode == 0

def prompt_for(t, sprint):
    return (
        f"Task {t['id']}: {t['task']}\n"
        f"Sprint {t['sprint']} goal: {sprint['goal']}\n"
        f"Sprint exit criteria: {sprint['exit_criteria']}\n"
        f"Human gate on this task: {t['human_gate']}\n\n"
        "Follow .kiro/steering/hrms-rules.md. Work only inside this directory and only in the paths your "
        "permissions allow. Commit your work with the task ID in the message. If you are blocked by missing "
        f"information or an unfinished earlier task, do not guess: write docs/notes/{t['id']}.md explaining "
        "the blocker, then stop."
    )

def run_task(t, sprint, n, dry):
    branch = f"agent/{t['id']}"
    wt = WORKTREES / t["id"]
    if dry:
        print(f"[dry-run] {t['id']:7} {t['agent']:18} {t['task']}")
        return t["id"], branch, True, "dry-run"
    with GIT_LOCK:
        if wt.exists():  # leftover from a failed earlier attempt: start the task fresh
            sh(["git", "worktree", "remove", "--force", str(wt)], check=False)
            sh(["git", "worktree", "prune"], check=False)
        sh(["git", "worktree", "add", "-B", branch, str(wt), f"sprint/{n}"])
    r = sh(["kiro-cli", "chat", "--agent", t["agent"], *KIRO_FLAGS, prompt_for(t, sprint)], cwd=wt, check=False)
    sh(["git", "add", "-A"], cwd=wt)
    sh(["git", "commit", "-m", f"{t['id']}: {t['task']}", "--allow-empty"], cwd=wt, check=False)
    note = (r.stdout or r.stderr or "")[-500:]
    if r.returncode == EXIT_AGENT_NOT_FOUND:
        note = f"agent '{t['agent']}' not found (run `kiro-cli agent list`)"
    return t["id"], branch, r.returncode == 0, note

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sprint", type=int, required=True)
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--stage", type=int, help="run only this stage index (0-3)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--resume", action="store_true", help="continue an existing sprint/<N> branch, skipping merged tasks")
    ap.add_argument("--restart", action="store_true", help="discard an existing sprint/<N> branch and start over")
    a = ap.parse_args()

    if not a.dry_run:
        if not shutil.which("kiro-cli"):
            sys.exit("kiro-cli not found on PATH")
        if not os.environ.get("KIRO_API_KEY"):
            sys.exit("KIRO_API_KEY is not set (required for headless mode)")

    data = json.loads(BACKLOG.read_text())
    sprint = data["sprints"][str(a.sprint)]
    tasks = [t for t in data["tasks"] if t["sprint"] == a.sprint]
    human = [t for t in tasks if t["agent"] == "You"]
    print(f"Sprint {a.sprint}: {sprint['goal']}\n")

    if not a.dry_run:
        if sh(["git", "status", "--porcelain"]).stdout.strip():
            sys.exit("Working tree not clean. Commit or stash first.")
        sb = f"sprint/{a.sprint}"
        if branch_exists(sb) and not a.restart:
            if a.stage is None and not a.resume:
                sys.exit(f"{sb} already exists. Use --resume to continue it, or --restart to discard it.")
            sh(["git", "checkout", sb])
        else:
            sh(["git", "checkout", "-B", sb, "main"])

    failed = []
    for i, agents in enumerate(STAGES):
        if a.stage is not None and i != a.stage:
            continue
        batch = [t for t in tasks if t["agent"] in agents and t["status"] == "todo"
                 and (a.dry_run or not already_merged(t["id"], a.sprint))]
        if not batch:
            continue
        print(f"--- Stage {i}: {', '.join(agents)} ({len(batch)} tasks)")
        done = []
        with ThreadPoolExecutor(max_workers=a.workers) as ex:
            futs = [ex.submit(run_task, t, sprint, a.sprint, a.dry_run) for t in batch]
            for f in as_completed(futs):
                tid, branch, ok, tail = f.result()
                print(f"  {'OK  ' if ok else 'FAIL'} {tid}")
                (done if ok else failed).append((tid, branch, tail))
        if not a.dry_run:
            for tid, branch, _ in done:
                m = sh(["git", "merge", "--no-ff", "-m", f"merge {tid}", branch], check=False)
                if m.returncode != 0:
                    sh(["git", "merge", "--abort"], check=False)
                    failed.append((tid, branch, "merge conflict - resolve manually"))
                    print(f"  CONFLICT {tid} (skipped)")
        if failed:
            print("Stopping before the next stage because of failures:")
            for tid, _, tail in failed:
                print(f"  {tid}: {tail.strip()[:200]}")
            sys.exit(1)

    print("\nHuman checklist for this sprint:")
    for t in human:
        print(f"  [ ] {t['id']} {t['task']}")
    for t in tasks:
        if t["agent"] != "You" and t["human_gate"] not in ("-", ""):
            print(f"  [ ] {t['human_gate']}: {t['id']} {t['task']}")
    print(f"\nNext: python scripts/sprint_git.py finish {a.sprint}   (cleans worktrees, pushes, opens the PR)")

if __name__ == "__main__":
    main()
