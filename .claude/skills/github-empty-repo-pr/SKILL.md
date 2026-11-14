---
name: github-empty-repo-pr
description: Push work and open a GitHub pull request from a cloud session, including the case where the repository was empty (no main branch, so the feature branch is the only and default branch) and the case where the push fails with 403. Use when Artit says "push", "create a pull request", "fix github", or a push/PR attempt fails.
---

# Push and pull request (including empty repos)

## Push

`git push -u origin <session-branch>`; retry network failures up to 4 times (2s, 4s, 8s, 16s).

**403 "Claude doesn't have GitHub access"**: nothing to fix in the repo. Tell Artit in one line which step failed, and that the fix is to reconnect GitHub at https://claude.ai/connect-github and, if needed, install the Claude GitHub App on the repository from that page. Commits stay safe locally. When Artit says it's fixed, just retry the push (it worked on the first retry last time) and confirm with `git fetch` + `git log -1 origin/<branch>`.

## Pull request

1. Check the remote: `git ls-remote --heads origin`. Look for a PR template (`.github/pull_request_template.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `PULL_REQUEST_TEMPLATE.md`, `docs/PULL_REQUEST_TEMPLATE.md`) and mirror its headings if one exists.
2. **Only the feature branch exists** (repo was empty): run
   ```bash
   CLAUDE_TRAILER="Co-Authored-By: … 
   Claude-Session: …" .claude/skills/github-empty-repo-pr/scripts/make_base_and_pr_ready.sh <feature-branch> main "# <repo> …"
   ```
   It creates a README-only root commit with git plumbing, pushes it as `main`, and merges `main` into the feature branch (`--allow-unrelated-histories`, adds only the README) so GitHub accepts the PR. Without that merge GitHub refuses a PR between unrelated histories.
3. Load `mcp__github__create_pull_request` with ToolSearch and open `<feature> → main`. Body: Summary (links to artifacts), how it is built, what's new, docs, a "Repo note" when you created `main`, a test plan with checkboxes, and the attribution footer from the session reminder.
4. Tell Artit the default branch on GitHub is still the feature branch; they can switch it to `main` under Settings → Branches.
5. Offer to watch the PR (`subscribe_pr_activity`).

## Never

- Never `rm -rf` with a relative glob after `cd` (the safety check blocks it and it can wipe the repo). Use git plumbing or `git worktree remove`.
- Never leave a stray worktree or scratch folder inside the repo; the stop hook flags untracked files. Put scratch work in the session scratchpad.
- Never force-push someone else's branch; never push to a branch other than the session branch except the new base the user's PR request requires.
- No model names in commits, PR titles or bodies.
