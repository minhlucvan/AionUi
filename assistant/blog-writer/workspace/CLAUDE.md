# Blog Writer Workspace

This workspace powers a four-agent pipeline that transforms a blog idea into a complete, illustrated article.

## Pipeline

```
User Idea → Strategist → Researcher → Writer → Illustrator → Published Article
```

| Agent | Role | Produces |
|-------|------|----------|
| **Content Strategist** | Defines audience, angle, SEO, tone | Strategy brief + structured outline |
| **Domain Researcher** | Gathers evidence and examples | Research brief with facts, quotes, case studies |
| **Content Writer** | Writes the article | Complete Markdown article with illustration markers |
| **Illustrative Generator** | Adds visuals | Final article with diagrams, charts, image prompts |

## Workspace Structure

```
workspace/
├── CLAUDE.md                          # This file
├── .swarm/
│   └── feed.jsonl                     # Inter-agent communication feed
├── .claude/
│   ├── config.json                    # Workspace metadata
│   ├── commands/
│   │   ├── write.md                   # Start full pipeline from an idea
│   │   ├── research.md                # Research-only mode
│   │   ├── outline.md                 # Strategy + outline only
│   │   └── status.md                  # Check pipeline progress
│   └── skills/
│       └── blog-writer/
│           ├── SKILL.md               # Core writing methodology
│           └── references/
│               ├── seo.md             # SEO best practices
│               ├── tone-styles.md     # Writing tone references
│               └── formats.md         # Blog format templates
└── output/                            # Final articles land here
    ├── [slug].md                      # Article in Markdown
    └── [slug]-meta.json               # SEO metadata
```

## How It Works

1. User provides a blog idea (topic, angle, or rough brief)
2. **Content Strategist** analyzes the idea and produces:
   - Target audience definition
   - Unique content angle
   - SEO keyword strategy
   - Tone and voice guidelines
   - Detailed article outline
   - Research directive
3. **Domain Researcher** receives the directive and gathers:
   - Statistics and data points with sources
   - Expert quotes and attributable insights
   - Case studies and real-world examples
   - Counter-arguments for balanced coverage
   - Competitive analysis of existing articles
4. **Content Writer** synthesizes strategy + research into:
   - Complete Markdown article
   - SEO metadata (title, slug, excerpt, keywords)
   - Illustration placement markers
5. **Illustrative Generator** enhances the article with:
   - Mermaid diagrams for processes and architectures
   - ASCII art for developer-focused content
   - SVG illustrations for inline visuals
   - Image generation prompts for hero/social images
   - Saves final output to `workspace/output/`

## Output Format

Articles are saved to `workspace/output/` as:
- `[slug].md` — Complete Markdown article with embedded illustrations
- `[slug]-meta.json` — Structured metadata for publishing

## Revision Cycle

After the first pipeline pass (4 turns), the Strategist reviews the final article. If revisions are needed, the pipeline cycles again with targeted feedback. Maximum 12 turns (3 full cycles).

## Commands

| Command | Purpose |
|---------|---------|
| `/blog-writer:write` | Start the full pipeline from a blog idea |
| `/blog-writer:research` | Research a topic without writing |
| `/blog-writer:outline` | Generate strategy and outline only |
| `/blog-writer:status` | Check current pipeline progress |
