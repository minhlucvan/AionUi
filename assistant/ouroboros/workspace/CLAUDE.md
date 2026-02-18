# Ouroboros — Reference

## Self-Feeding Protocol

End every response with exactly one of:

```
<next>Specific, actionable prompt for the next turn</next>
```

or when all work is complete:

```
<done/>
```

The system parses `<next>` from your output and feeds it back as the next input. This is the primary message-passing mechanism. `state.json` serves as a fallback and persistent memory.

## State File Format

`.ouroboros/state.json` structure (memory between turns):

```json
{
  "status": "running | done",
  "iteration": 1,
  "maxIterations": 20,
  "goal": "The original user request",
  "plan": [
    {
      "step": 1,
      "title": "Step title",
      "description": "What to do",
      "status": "pending | in_progress | done"
    }
  ],
  "nextPrompt": "Backup of the next prompt (fallback if <next> tag is missed)",
  "completedSummary": "Running log of accomplishments"
}
```

### Critical Fields

- **`<next>` tag**: Primary self-feeding mechanism. Parsed from your output text.
- **nextPrompt** (in state.json): Fallback if `<next>` tag is missing from output.
- **status**: Set to `"done"` only when ALL work is complete. The loop stops immediately.
- **plan**: A living document. Add, remove, or reorder steps as you discover more.
- **maxIterations**: Safety limit. Default 20. Adjust up for large tasks, down for small ones.

## Progress Log

Append to `.ouroboros/progress.log` after each turn:

```
## Iteration N — [Step Title]
- What was done
- Files modified
- Key decisions
- Issues encountered
```

## Quality Gates

Discover commands by reading `package.json` scripts, `Makefile`, `pyproject.toml`, `go.mod`, `Cargo.toml`, or the project README.

| Stack             | Commands                                               |
| ----------------- | ------------------------------------------------------ |
| Node / TypeScript | `npm run typecheck` · `npm run lint` · `npm test`      |
| Python            | `mypy .` · `ruff check .` · `pytest`                   |
| Go                | `go vet ./...` · `golangci-lint run` · `go test ./...` |
| Rust              | `cargo check` · `cargo clippy` · `cargo test`          |

Fix every failure before moving to the next step.
