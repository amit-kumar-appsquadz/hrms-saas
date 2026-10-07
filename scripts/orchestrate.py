#!/usr/bin/env python3
"""Run one sprint with multiple Claude Code subagents.

Per task: a git worktree + branch, one headless `claude -p` run that delegates to the task's subagent.
Stages run in order; tasks inside a stage run in parallel. After each stage the task branches are
merged into an integration branch `sprint/<N>`. A human reviews and merges that branch to main.

Usage:
  python scripts/orchestrate.py --sprint 1 --dry-run
  python scripts/orchestrate.py --sprint 1 [--workers 3] [--stage 1]
Requires: git, claude (Claude Code CLI). Check flags with `claude --help` if your version differs.
"""
import argparse, json, subprocess, sys, pathlib
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = pathlib.Path(__file__).resolve().parents[1]
BACKLOG = ROOT / "tasks" / "backlog.json"
STAGES = [
    ["planner"],
    ["backend", "frontend", "devops", "compliance-payroll"],
    ["qa", "performance"],
    ["security-reviewer"],
]
CLAUDE_FLAGS = ["--permission-mode", "acceptEdits"]  # deny rules in .claude/settings.json still apply

def sh(cmd, cwd=ROOT, check=True):
    r = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)
    if check and r.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd)}\n{r.stdout}\n{r.stderr}")
    return r

def prompt_for(t, sprint):
    return (
        f"Use the {t['agent']} subagent to complete this task.\n\n"
        f"Task {t['id']}: {t['task']}\n"
        f"Sprint {t['sprint']} goal: {sprint['goal']}\n"
        f"Sprint exit criteria: {sprint['exit_criteria']}\n"
        f"Human gate on this task: {t['human_gate']}\n\n"
        "Read CLAUDE.md first and follow it. Work only in this directory. "
        f"Commit your work with the task ID ({t['id']}) in the message. "
        "If the task is blocked by missing information or a missing earlier task, "
        f"do not guess: write docs/notes/{t['id']}.md explaining the blocker and stop."
    )

def run_task(t, sprint, n, dry):
    branch = f"agent/{t['id']}"
    wt = ROOT.parent / "worktrees" / t["id"]
    if dry:
        print(f"[dry-run] {t['id']:7} {t['agent']:18} {t['task']}")
        return t["id"], branch, True, "dry-run"
    sh(["git", "worktree", "add", "-B", branch, str(wt), f"sprint/{n}"])
    r = sh(["claude", "-p", prompt_for(t, sprint), *CLAUDE_FLAGS], cwd=wt, check=False)
    sh(["git", "add", "-A"], cwd=wt)
    sh(["git", "commit", "-m", f"{t['id']}: {t['task']}", "--allow-empty"], cwd=wt, check=False)
    return t["id"], branch, r.returncode == 0, (r.stdout or r.stderr)[-500:]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sprint", type=int, required=True)
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--stage", type=int, help="run only this stage index (0-3)")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    data = json.loads(BACKLOG.read_text())
    sprint = data["sprints"][str(a.sprint)]
    tasks = [t for t in data["tasks"] if t["sprint"] == a.sprint]
    human = [t for t in tasks if t["agent"] == "You"]
    print(f"Sprint {a.sprint}: {sprint['goal']}\n")

    if not a.dry_run:
        sh(["git", "checkout", "-B", f"sprint/{a.sprint}", "main"])

    failed = []
    for i, agents in enumerate(STAGES):
        if a.stage is not None and i != a.stage:
            continue
        batch = [t for t in tasks if t["agent"] in agents and t["status"] == "todo"]
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
    print(f"\nNext: review branch sprint/{a.sprint} and open a PR to main.")

if __name__ == "__main__":
    main()
