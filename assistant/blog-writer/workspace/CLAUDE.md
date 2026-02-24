# Blog Writer

## Content Type

Long-form blog articles — typically 1,500-5,000 words, illustrated with diagrams and visuals, optimized for SEO.

## Target Audiences

- Software engineers and technical leaders
- Product managers and startup founders
- Technology enthusiasts following industry trends

Adjust tone and depth based on the specific topic. Technical deep-dives assume practitioner knowledge. Thought leadership pieces are accessible to broader audiences.

## Workspace Structure

```
blog/
  [category]/                   Content category (pillar or edge topic)
    [post-slug]/                One directory per post
      research/                 Research phase artifacts
        sources.md              Collected sources and references
        notes.md                Raw research notes
      strategy/                 Strategy phase artifacts
        brief.md                Audience, angle, SEO blueprint
        outline.md              Structured section outline
      drafts/                   Writing iterations
        draft-01.md             First draft
        draft-02.md             Revised draft (if needed)
      assets/                   Visual assets
        diagrams/               Mermaid, SVG, ASCII art files
        images/                 Image prompts and generated images
      post.md                   Final published article
      meta.json                 SEO metadata (title, slug, excerpt, keywords)
```

### Content Categories

- **pillar/** — Comprehensive, evergreen guides (3,000-5,000 words)
- **edge/** — Timely, opinionated takes on emerging trends (1,500-3,000 words)
- **deep-dive/** — Technical explorations of specific tools or patterns (2,000-4,000 words)
- **tutorial/** — Step-by-step how-to articles with code examples (2,000-3,500 words)

## Content Standards

- Every factual claim must be backed by a sourced statistic, named expert, or concrete example
- No generic openings ("In today's rapidly evolving..."), no filler transitions, no summary conclusions
- Visuals communicate information — never decorative
- Primary keyword appears in title, first paragraph, one H2, and meta description
- Bold key terms on first mention, blockquotes for expert quotes with attribution
