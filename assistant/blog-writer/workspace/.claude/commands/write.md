Start the full blog writing pipeline. Take the user's blog idea and delegate it through all four phases using subagents:

1. **Strategy subagent** — Read `.claude/skills/content-strategy/skill.md`, delegate to produce audience, angle, SEO strategy, and detailed outline
2. **Research subagent** — Read `.claude/skills/domain-research/skill.md`, delegate with strategy output to gather facts, statistics, case studies, and expert quotes
3. **Writing subagent** — Read `.claude/skills/content-writing/skill.md`, delegate with strategy + research to write the complete article in Markdown
4. **Illustration subagent** — Read `.claude/skills/illustration/skill.md`, delegate with the article to add diagrams, charts, and visual assets

Save the final output to `output/[slug].md` and `output/[slug]-meta.json`.

User's blog idea: $ARGUMENTS
