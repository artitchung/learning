#!/usr/bin/env bash
# Prepare a pull request when the repository has no base branch (it was empty, so the feature branch is the
# only branch and GitHub made it the default).
# usage: make_base_and_pr_ready.sh <feature-branch> [base=main] ["README first line"]
# 1. builds a README-only root commit with git plumbing (no working-tree files touched, no rm),
# 2. pushes it as <base>,
# 3. merges <base> into the feature branch with --allow-unrelated-histories (adds only README.md) and pushes,
# so GitHub accepts a PR <feature> -> <base>. Then create the PR with the GitHub MCP tool.
set -euo pipefail
feat=${1:?feature branch}; base=${2:-main}; line=${3:-"# $(basename "$(git rev-parse --show-toplevel)")"}
trailer=${CLAUDE_TRAILER:-}
if git ls-remote --exit-code --heads origin "$base" >/dev/null 2>&1; then echo "origin/$base already exists; nothing to create"; exit 0; fi
blob=$(printf '%s\n' "$line" | git hash-object -w --stdin)
tree=$(printf '100644 blob %s\tREADME.md\n' "$blob" | git mktree)
commit=$(printf 'Initial commit\n%s' "${trailer:+
$trailer
}" | git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit-tree "$tree")
git push origin "$commit:refs/heads/$base"
git fetch -q origin "$base"
git checkout -q "$feat"
git -c user.name="Claude" -c user.email="noreply@anthropic.com" merge -q --allow-unrelated-histories "origin/$base" -m "$(printf 'Merge %s into %s\n%s' "$base" "$feat" "${trailer:+
$trailer
}")"
git push origin "$feat"
echo "ready: open a PR $feat -> $base"
