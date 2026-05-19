---
tracker:
  kind: file
  board_root: ./kanban
  active_states: [Todo, Explore, Plan, "In Progress", Review, QA, Learn]
  terminal_states: [Done, Cancelled, Blocked, Archive]
  archive_state: Archive
  archive_after_days: 0
  state_descriptions:
    Todo: "Triage; route to Explore"
    Explore: "Brief from code + tests"
    Plan: "Lock the implementation plan"
    "In Progress": "TDD loop, draft PR"
    Review: "Read diff, fix CRITICAL/HIGH/MEDIUM"
    QA: "Run npm test / typecheck / lint / build"
    Learn: "Distill learnings, update docs"
    Done: "As-Is -> To-Be report"

polling:
  interval_ms: 15000

wiki:
  sweep_every_n: 0
  root: ./docs

workspace:
  root: ~/symphony_workspaces/crittermoor

hooks:
  after_create: |
    set -uo pipefail
    HOST_REPO="${SYMPHONY_WORKFLOW_DIR:?SYMPHONY_WORKFLOW_DIR not set}"
    TICKET_ID="$(basename "$PWD")"
    if [ -d "$HOST_REPO/.git" ]; then
      BASE_BRANCH="$(git -C "$HOST_REPO" rev-parse --abbrev-ref HEAD 2>/dev/null || echo dev)"
      git -C "$HOST_REPO" worktree add -B "symphony/${TICKET_ID}" "$PWD" "$BASE_BRANCH" 2>/dev/null \
        || git -C "$HOST_REPO" worktree add "$PWD" "symphony/${TICKET_ID}" 2>/dev/null \
        || true
    fi
    [ -e "$HOST_REPO/kanban" ] && [ ! -e "$PWD/kanban" ] && ln -s "$HOST_REPO/kanban" "$PWD/kanban" || true
    for d in docs/symphony-prompts skills .claude; do
      if [ -e "$HOST_REPO/$d" ] && [ ! -e "$PWD/$d" ]; then
        mkdir -p "$(dirname "$PWD/$d")"
        ln -s "$HOST_REPO/$d" "$PWD/$d" || true
      fi
    done
    if [ -d "$HOST_REPO/node_modules" ] && [ ! -e "$PWD/node_modules" ]; then
      ln -s "$HOST_REPO/node_modules" "$PWD/node_modules" || true
    fi
  before_run: |
    set -uo pipefail
    git fetch origin --quiet 2>/dev/null || true
  after_run: |
    set -uo pipefail
    git add -A -- . ':(exclude)kanban' ':(exclude).symphony' ':(exclude)node_modules' 2>/dev/null || true
    if git diff --cached --quiet 2>/dev/null; then
      echo "run finished at $(date) (no changes)"
      exit 0
    fi
    STAGED_FILES="$(git diff --cached --name-only 2>/dev/null || true)"
    PROD_CHANGED=0
    TESTS_CHANGED=0
    NL=$(printf '\nx'); NL=${NL%x}
    OLDIFS="$IFS"
    IFS="$NL"
    for f in $STAGED_FILES; do
      [ -n "$f" ] || continue
      case "$f" in
        tests/*|*.test.ts|*.test.tsx) TESTS_CHANGED=1 ;;
      esac
      case "$f" in
        tests/*|docs/*|kanban/*|.symphony/*|*.md|LICENSE|LICENSE.*|NOTICE|CHANGELOG*|README*|AGENTS.md|GEMINI.md) : ;;
        *) PROD_CHANGED=1 ;;
      esac
    done
    IFS="$OLDIFS"
    PREFIX=""
    [ "$PROD_CHANGED" = 1 ] && [ "$TESTS_CHANGED" = 0 ] && PREFIX="${PREFIX}[no-test]"
    MSG="$(sed -n '1{s/^[[:space:]]*//;s/[[:space:]]*$//;p;q;}' .symphony/commit-message.txt 2>/dev/null || true)"
    [ -n "$MSG" ] || MSG="turn $(date -u +%FT%TZ)"
    case "$MSG" in wip:*) COMMIT_MSG="$MSG" ;; *) COMMIT_MSG="wip: $MSG" ;; esac
    [ -n "$PREFIX" ] && COMMIT_MSG="$PREFIX $COMMIT_MSG"
    LAST="$(git log -1 --format=%s 2>/dev/null || echo "")"
    if [ "${LAST#wip:}" != "$LAST" ] || [ "${LAST#\[no-test\]*wip:}" != "$LAST" ]; then
      git -c user.email=symphony@local -c user.name=symphony commit --amend -m "$COMMIT_MSG" >/dev/null 2>&1 || true
    else
      git -c user.email=symphony@local -c user.name=symphony commit -m "$COMMIT_MSG" >/dev/null 2>&1 || true
    fi
    echo "run finished at $(date)"
  before_remove: |
    set -uo pipefail
    HOST_REPO="${SYMPHONY_WORKFLOW_DIR:?}"
    git -C "$HOST_REPO" worktree remove --force "$PWD" 2>/dev/null || true

agent:
  kind: claude
  max_concurrent_agents: 2
  max_turns: 60
  max_total_turns: 120
  max_total_tokens: 100000000
  max_total_tokens_by_state:
    "In Progress": 500000000
    QA: 500000000
  budget_exhausted_state: Blocked
  max_attempts: 3
  max_retries: 3
  auto_triage_actionable_todo: true
  max_retry_backoff_ms: 300000
  max_concurrent_agents_by_state:
    Todo: 2
    Explore: 2
    Plan: 2
    "In Progress": 2
    Review: 1
    QA: 1
    Learn: 1
  auto_commit_on_done: true
  auto_merge_on_done: false
  feature_base_branch: "dev"
  auto_merge_target_branch: ""
  auto_merge_exclude_paths: ["kanban"]

claude:
  command: 'claude -p --output-format stream-json --verbose --permission-mode acceptEdits --add-dir "$SYMPHONY_WORKFLOW_DIR/kanban" --add-dir "$SYMPHONY_WORKFLOW_DIR/docs"'
  resume_across_turns: true
  turn_timeout_ms: 3600000
  read_timeout_ms: 5000
  stall_timeout_ms: 300000

server:
  port: 9988

system:
  keep_awake: true

tui:
  language: en

progress:
  enabled: true
  path: WORKFLOW-PROGRESS.md
  max_transitions: 30

prompts:
  base: ./docs/symphony-prompts/file/base.md
  stages:
    Todo: ./docs/symphony-prompts/file/stages/todo.md
    Explore: ./docs/symphony-prompts/file/stages/explore.md
    Plan: ./docs/symphony-prompts/file/stages/plan.md
    "In Progress": ./docs/symphony-prompts/file/stages/in-progress.md
    Review: ./docs/symphony-prompts/file/stages/review.md
    QA: ./docs/symphony-prompts/file/stages/qa.md
    Learn: ./docs/symphony-prompts/file/stages/learn.md
    Done: ./docs/symphony-prompts/file/stages/done.md

---

# Crittermoor — Symphony Workflow

You are working on ticket {{ issue.identifier }}: {{ issue.title }}.
Current state: {{ issue.state }}.

This is a TypeScript + Vite + PixiJS browser game (a RimWorld-style colony sim with
turn-based critter battles). Stack: TS strict, bitecs (ECS), React + Zustand UI,
IndexedDB saves, vitest + fast-check tests.

Verification commands during QA:

```bash
npm run typecheck   # tsc strict
npm test            # vitest
npm run lint        # ESLint zero-warnings
npm run build       # production bundle when build matters
```

Determinism is sacred: every gameplay roll must route through the seeded Mulberry32 RNG.
Save format is versioned (currently v3). If you change save shape, add a migration in
`src/game/Sim/Saves/migrations.ts` and a fixture round-trip test.

Follow the stage-specific instructions configured under `prompts.stages`.
