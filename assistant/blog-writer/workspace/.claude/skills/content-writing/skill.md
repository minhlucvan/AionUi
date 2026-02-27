# Content Writing Skill

## What This Skill Does

Writes the actual prose for a blog post — transforming a story outline and research into a complete, publication-ready article.

Reads `outline.md`, `research.md`, and `idea.md` from the post directory. Writes `post.md` with YAML frontmatter.

This skill executes — it does NOT plan. The outline is the blueprint. Research is the evidence. Follow them.

## Where to Save

Follow the workspace structure in `CLAUDE.md`. Save to the post directory:

- `blog/[post-slug]/post.md` — Complete article with frontmatter

The post-slug will be provided by the orchestrator.

---

## Writing Principles

- **Follow the outline exactly.** The story developer chose the voice mode, story structure, and hook for a reason. Don't re-plan. Execute.
- **The outline is the blueprint, research.md is the evidence.** Weave research into the narrative arc defined by the outline. Every claim backed by a specific source from research.md.
- **Use the hook from outline.md as the opening.** It was written deliberately — refine the prose if needed, but don't replace the concept.
- **Place `<!-- ILLUSTRATION: ... -->` markers** at natural visual pause points — after a key concept, between major sections, where a diagram would help the reader understand.

---

## Keeping the Reader — Momentum Rules

### Every paragraph ends with forward pull

The last sentence should make the reader want the next paragraph. Not with cliffhangers — with curiosity, with unresolved tension, with a "but..." A paragraph that fully resolves and goes nowhere is a paragraph where the reader stops.

### Vary the rhythm

Short sentence. Then a longer one that flows and carries the reader forward. Then another short punch. Three sentences of the same length in a row and the reader's brain goes to sleep. This is the number one AI tell — every sentence roughly the same cadence, the same structure, the same length.

### Kill the boring parts

If a section is just "information delivery" with no tension, story, or surprise — rewrite it or cut it. Every section needs a reason to exist beyond "this is a fact the reader should know." If you can't make it interesting, it doesn't belong.

### Show, don't explain

Don't say "this is important because..." — show a scenario where it matters. Don't say "teams struggle with X" — tell the story of a specific team that struggled. Abstractions are forgettable. Specifics stick.

### Transitions are invisible

Never write "Now let's look at..." or "Moving on to..." or "Another important consideration is..." The end of one section should naturally create the question the next section answers. If you need a signpost, the structure is wrong.

### The rule of three

Examples, arguments, items — use three. Two feels thin. Four feels padded. Three has rhythm and completeness. If you have five good examples, pick the three best.

### Tempo changes

Speed through familiar ground — short sentences, less detail, the reader already knows this. Slow down at the crucial insight — longer sentences, specifics, examples, let the reader sit with it. The gear shift is felt. Fast-fast-fast-_slow_ is how you make a point land.

### Punctuation as storytelling

Em dashes create suspense — like this. Colons set up a reveal: the thing you didn't expect. Parentheses add an aside (the kind of thing you'd say quietly to a friend). Short paragraphs after long ones create emphasis.

One sentence alone is a paragraph of power.

---

## Anti-AI Patterns

Patterns that instantly kill the story and make it read like a machine wrote it. Avoid all of these.

- **The lecture tone.** "It is important to understand that..." — you're telling a story, not teaching a class. If it sounds like a textbook, rewrite it.
- **Exhaustive lists.** Listing every benefit, use case, consideration, and edge case. Humans are selective. Pick the 3 best, not the 10 adequate.
- **Symmetric structure.** Every section same length, same format, same number of paragraphs, same pattern. Real stories are lumpy — some moments need more space, some need less.
- **Hedge stacking.** "It could potentially perhaps be argued that..." — commit to what you're saying or don't say it.
- **Empty intensifiers.** "Incredibly powerful," "truly remarkable," "absolutely essential." If the story is good, you don't need adverbs to convince the reader.
- **Throat-clearing.** The first 2-3 sentences of a section that warm up before the actual point. Cut them. Start every section where it gets interesting.
- **The signpost narrator.** "In this article we will explore..." / "As mentioned earlier..." / "In conclusion..." — a good story doesn't announce its own structure.
- **Uniform sentence length.** The single biggest giveaway. Vary relentlessly. Short. Then longer and more flowing. Then short again.
- **The false balance.** "While X has merits, Y also has strengths." Take a side. Stories have a point of view. Acknowledging nuance is good; refusing to commit is cowardice.

---

## Quality Gates

Check all 7 before saving `post.md`. If any fail, rewrite — don't patch.

1. **Hook Test** — Read the first paragraph. Would you keep reading if you found this on Hacker News? If not, rewrite the opening.
2. **Story Test** — Can you describe the post's narrative arc in one sentence? "It's about Kubernetes" is a topic, not a story. "A team thought microservices would save them, but the real problem was elsewhere" is a story.
3. **Boredom Test** — Read any random section from the middle. Is it interesting on its own, or just "information"? If you'd skip it, the reader will too.
4. **Evidence Test** — Every claim has a source, a name, or a specific example. No "studies show," no "experts agree," no unsourced statistics.
5. **Scan Test** — Read only the headings and bold text. Do they alone tell the story? A reader who skims should still get the argument.
6. **Swap Test** — Replace your examples with generic ones (Netflix, Uber, "a large company"). Is it less interesting? Good — your examples are specific. Same quality? Your examples are already generic. Fix them.
7. **Out-Loud Test** — Read 2 random paragraphs aloud. Do they sound like a person talking or a textbook? If textbook, rewrite until they sound human.

---

## Markdown & Frontmatter

### Frontmatter

```yaml
---
title: [Final title]
slug: [url-friendly-slug]
excerpt: [150-character meta description with primary keyword]
keywords: [comma-separated list]
word_count: [approximate]
read_time: [X min]
---
```

### Markdown Conventions

- `#` for article title (H1 — once only)
- `##` for main sections (H2)
- `###` for subsections (H3, use sparingly)
- `**bold**` for key terms on first mention and critical emphasis
- `> blockquote` for expert quotes with attribution
- `- bullet lists` for enumerable items (3+ items)
- `1. numbered lists` for sequential steps only
- `` `code` `` for technical terms, commands, file names
- `<!-- ILLUSTRATION: description -->` for visual placement markers
