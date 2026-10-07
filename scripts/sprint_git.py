#!/usr/bin/env python3
"""Git helper for the sprint loop.

  start  N   sync main, check clean tree          (before orchestrate.py)
  finish N   remove task worktrees, delete merged agent/* branches, push sprint/N, open PR (if gh exists)
  done   N   after the PR is merged: mark the sprint's agent tasks done, tag sprint-N, delete sprint branch
  status     show branches and worktrees
"""
import argparse, json, pathlib, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
BACKLOG = ROOT / "tasks" / "backlog.json"
WORKTREES = ROOT.parent / f"{ROOT.name}-worktrees"

def git(*args, check=True):
    r = subprocess.run(["git", *args], cwd=ROOT, text=True, capture_output=True)
    if check and r.returncode != 0:
        sys.exit(f"git {' '.join(args)} failed:\n{r.stdout}{r.stderr}")
    return r

def has_remote():
    return bool(git("remote", check=False).stdout.strip())

def tasks_of(n):
    return [t for t in json.loads(BACKLOG.read_text())["tasks"] if t["sprint"] == n]

def cmd_start(n):
    if git("status", "--porcelain").stdout.strip():
        sys.exit("Working tree not clean.")
    git("checkout", "main")
    if has_remote():
        git("pull", "--ff-only", "origin", "main")
    print(f"main is clean and current. Next: python scripts/orchestrate.py --sprint {n}")

def cmd_finish(n):
    sb = f"sprint/{n}"
    if git("rev-parse", "--verify", "--quiet", sb, check=False).returncode != 0:
        sys.exit(f"{sb} does not exist")
    git("checkout", sb)
    unmerged = []
    for t in tasks_of(n):
        b, wt = f"agent/{t['id']}", WORKTREES / t["id"]
        if wt.exists():
            git("worktree", "remove", "--force", str(wt), check=False)
        if git("rev-parse", "--verify", "--quiet", b, check=False).returncode == 0:
            if git("merge-base", "--is-ancestor", b, sb, check=False).returncode == 0:
                git("branch", "-D", b)
            else:
                unmerged.append(b)
    git("worktree", "prune")
    if unmerged:
        print("WARNING: not merged into the sprint branch (kept for inspection):", ", ".join(unmerged))
    gates = [f"- [ ] {t['human_gate']}: {t['id']} {t['task']}" for t in tasks_of(n)
             if t["agent"] != "You" and t["human_gate"] not in ("-", "")]
    human = [f"- [ ] {t['id']} {t['task']} (you)" for t in tasks_of(n) if t["agent"] == "You"]
    body = f"Sprint {n} integration branch.\n\n## Review checklist\n" + "\n".join(gates + human) + "\n"
    if not has_remote():
        print("No remote configured; skipping push/PR. Review locally:")
    else:
        git("push", "-u", "origin", sb)
        if shutil.which("gh"):
            r = subprocess.run(["gh", "pr", "create", "--base", "main", "--head", sb,
                                "--title", f"Sprint {n}", "--body", body], cwd=ROOT, text=True)
            if r.returncode != 0:
                print("gh pr create failed; open the PR manually.")
        else:
            print("gh not installed; open the PR in the GitHub UI. Checklist:\n" + body)
    print(f"\nReview commands:\n  git log --first-parent --oneline main..{sb}\n  git diff main...{sb} --stat")

def cmd_done(n):
    sb = f"sprint/{n}"
    git("checkout", "main")
    if has_remote():
        git("pull", "--ff-only", "origin", "main")
    if git("merge-base", "--is-ancestor", sb, "main", check=False).returncode != 0:
        sys.exit(f"{sb} is not merged into main yet. Merge the PR first.")
    data = json.loads(BACKLOG.read_text())
    for t in data["tasks"]:
        if t["sprint"] == n and t["agent"] != "You":
            t["status"] = "done"
    BACKLOG.write_text(json.dumps(data, indent=2) + "\n")
    git("add", "tasks/backlog.json")
    git("commit", "-m", f"chore: mark sprint {n} agent tasks done")
    git("tag", "-a", f"sprint-{n}", "-m", f"Sprint {n} complete")
    git("branch", "-d", sb, check=False)
    if has_remote():
        git("push", "origin", "main", f"sprint-{n}")
        git("push", "origin", "--delete", sb, check=False)
    print(f"Sprint {n} closed: tasks marked done, tag sprint-{n} created.")
    print("Tasks owned by You stay 'todo' until you edit them in tasks/backlog.json.")

def cmd_status():
    print(git("branch", "-vv").stdout)
    print(git("worktree", "list").stdout)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["start", "finish", "done", "status"])
    ap.add_argument("sprint", type=int, nargs="?")
    a = ap.parse_args()
    if a.cmd != "status" and a.sprint is None:
        sys.exit("sprint number required")
    {"start": lambda: cmd_start(a.sprint), "finish": lambda: cmd_finish(a.sprint),
     "done": lambda: cmd_done(a.sprint), "status": cmd_status}[a.cmd]()
