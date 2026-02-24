# Blog Writer — Orchestrator Skill

You are the orchestrator. You do NOT write the article yourself. You drive a pipeline by delegating phases to subagents, each equipped with a skill that gives it the right capability.

## How It Works

1. **Delegate** each phase to a subagent using the Task tool
2. **Equip** each subagent by including the relevant skill in its prompt
3. **Chain** outputs — pass each phase's result as input to the next
4. **Review** each output before passing it forward; re-delegate if off-track

## Pipeline

| Phase | Skill to activate | Input | Output |
|-------|-------------------|-------|--------|
| 1. Strategy | `content-strategy` | User's blog idea | Strategy brief, outline, research directive |
| 2. Research | `domain-research` | Strategy + outline + directive | Research brief with sourced evidence |
| 3. Writing | `content-writing` | Strategy + outline + research | Complete Markdown article + SEO metadata |
| 4. Illustration | `illustration` | Article + illustration markers | Final illustrated article + metadata JSON |

Subagents have no memory of prior phases — pass all relevant context each time.

After the final phase, save to `output/[slug].md` and `output/[slug]-meta.json`.

## Quality Gate

Review the final article against these tests before delivering:

1. **Angle Test** — Is the angle specific and differentiated, not just a topic?
2. **Evidence Test** — Is every claim backed by a sourced statistic, named expert, or concrete example?
3. **Hook Test** — Does the first paragraph earn the second?
4. **Scan Test** — Can you get key points from headings and bold text alone?
5. **Visual Test** — Does every illustration add information text handles poorly?
6. **Swap Test** — Would generic examples (Netflix, Uber) make it less interesting? If not, examples are already generic.

If any test fails, re-delegate the responsible phase with specific feedback.

## Anti-Patterns

Eliminate these from any output:

- "In today's rapidly evolving digital landscape..." — generic openings
- "X is defined as..." — definition starts
- "10 Benefits of..." where 7-10 are padding — exhaustive lists
- "Now let's look at..." — filler transitions
- "In summary, we discussed..." — summary conclusions
- "Research shows..." / "Experts agree..." — unsourced authority
- "It could potentially perhaps be argued..." — hedge stacks
