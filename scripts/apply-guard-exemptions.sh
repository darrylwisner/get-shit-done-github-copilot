#!/usr/bin/env bash
set -euo pipefail

# Config (env overrides supported for workflows)
BASE_BRANCH="${BASE_BRANCH:-main}"
EXEMPTIONS_FILE="${EXEMPTIONS_FILE:-scripts/guard-exemptions.txt}"

if [[ ! -f "$EXEMPTIONS_FILE" ]]; then
  echo "No exemptions file at $EXEMPTIONS_FILE; nothing to apply."
  exit 0
fi

# Ensure we have the base branch locally (needed for cat-file + checkout)
git fetch origin "${BASE_BRANCH}" --prune --no-tags >/dev/null 2>&1 || true

# Read exemptions: ignore blanks/comments; strip inline trailing comments
mapfile -t RAW_LINES < <(grep -vE '^\s*($|#)' "$EXEMPTIONS_FILE" || true)

is_glob_pattern() {
  local pat="$1"
  [[ "$pat" == *"/**"* || "$pat" == *"*"* || "$pat" == *"?"* || "$pat" == *"["*"]"* ]]
}

expand_pattern() {
  local pat="$1"

  # Recursive directory pattern: ".github/workflows/**" => list all tracked files under that directory
  if [[ "$pat" == *"/**"* ]]; then
    local prefix="${pat%%/***}"
    prefix="${prefix%/}"
    git ls-files -- "$prefix" || true
    return 0
  fi

  # Normal glob expansion: only tracked files (deterministic)
  if [[ "$pat" == *"*"* || "$pat" == *"?"* || "$pat" == *"["*"]"* ]]; then
    git ls-files -- "$pat" || true
    return 0
  fi

  # Literal file path
  echo "$pat"
}

applied=false

for raw in "${RAW_LINES[@]}"; do
  pat="$(echo "$raw" | sed 's/#.*//' | xargs)"
  [[ -z "$pat" ]] && continue

  glob_mode=false
  if is_glob_pattern "$pat"; then
    glob_mode=true
  fi

  while IFS= read -r f; do
    [[ -z "$f" ]] && continue

    # If file exists in fork base -> keep fork base version ("ours wins")
    if git cat-file -e "origin/${BASE_BRANCH}:$f" 2>/dev/null; then
      echo "Exempt (base wins): $f"
      git checkout "origin/${BASE_BRANCH}" -- "$f"
      git add "$f" >/dev/null 2>&1 || true
      applied=true
    else
      if [[ "$glob_mode" == "true" ]]; then
        # Lenient deletion applies ONLY to glob/recursive patterns
        echo "Exempt glob (base missing -> remove): $f"
        git rm -f --ignore-unmatch "$f" >/dev/null 2>&1 || true
        rm -f "$f" >/dev/null 2>&1 || true
        git add -A -- "$f" >/dev/null 2>&1 || true
        applied=true
      else
        # Literal missing in base: warn and skip (protect against typos)
        echo "::warning::Exempt literal '$f' not found in origin/${BASE_BRANCH}; skipping (no delete)."
      fi
    fi
  done < <(expand_pattern "$pat")
done

if [[ "$applied" == "true" ]]; then
  echo "Guard exemptions applied."
else
  echo "No exemptions matched any tracked files."
fi