Research mode — investigate a topic thoroughly without writing the full article.

Delegate only the first two pipeline phases using subagents:

1. **Strategy subagent** — Read `.claude/skills/content-strategy/skill.md`, delegate to analyze the topic, identify angles, define audience
2. **Research subagent** — Read `.claude/skills/domain-research/skill.md`, delegate with strategy output to gather comprehensive research: facts, statistics, expert quotes, case studies, competitive landscape

Output a structured research brief that can be used later for article writing.

Topic to research: $ARGUMENTS
