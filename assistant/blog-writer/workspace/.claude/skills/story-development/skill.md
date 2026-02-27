# Story Development Skill

## What This Skill Does

Plans the narrative arc, voice, and structure for a blog post. Transforms raw ideas and research into a story blueprint the writer follows.

Reads `idea.md` and `research.md` from the post directory. Writes `outline.md`.

This skill does NOT write prose. It designs how the story will be told — the voice, the structure, the hook, the section-by-section plan.

## Where to Save

Follow the workspace structure in `CLAUDE.md`. Save to the post directory:

- `blog/[post-slug]/outline.md` — Story plan with voice, structure, and narrative arc

The post-slug will be provided by the orchestrator.

---

## The Core Rule: Every Post Is a Story

This is the foundational principle. Everything else in this skill serves it.

A blog post is not an essay. Not a report. Not a textbook chapter. It's a story with a beginning that hooks, a middle that builds tension, and an end that pays off.

The reader must always want to know what happens next. If at any point they don't, the writing has failed.

Facts, data, and technical details are _ingredients_ of the story — never the skeleton. The skeleton is always narrative. A 3,000-word post about Kubernetes migration is not a document about Kubernetes. It's the story of a team that tried, failed, learned, and shipped. Kubernetes is the setting.

Write something someone would actually read on a Sunday morning with coffee. Not something they'd skim because their manager shared it.

---

## Voice Modes

Pick ONE voice based on topic and angle from `idea.md`. Each is a storytelling voice — a way of carrying the reader through the narrative.

### The Practitioner

**Models:** Julia Evans, Swyx, Charity Majors
**Tells the story of building.** "I tried this, it broke, here's what I learned."

- **Narrative structure:** Journey. The reader follows your path — the confusion at the start, the wrong turns, the moment it clicked.
- **Sentence patterns:** Direct, informal, present-tense for action ("So I run the migration script. Nothing happens for 30 seconds. Then every metric turns red."). Past tense for reflection.
- **What makes it engaging:** Vulnerability. You admit what you didn't know. The reader thinks "that's exactly what happened to me."
- **What kills the energy:** Going tutorial-mode. The moment you switch from "here's what happened" to "here's how to do it," you lose the story.

### The Essayist

**Models:** Paul Graham, Ben Thompson, Byrne Hobart
**Tells the story of an idea.** Starts with a non-obvious observation, builds the argument step by step until the conclusion feels inevitable.

- **Narrative structure:** Revelation or Escalation. Each paragraph adds a new piece. The reader can't skip ahead because each piece depends on the last.
- **Sentence patterns:** Longer sentences that build, punctuated by short declarations. "And so the obvious conclusion — the one everyone in the industry has been avoiding — is that..."
- **What makes it engaging:** The feeling of thinking alongside someone smarter than you. Each paragraph makes you go "huh, I hadn't thought of that."
- **What kills the energy:** Stating the obvious. If the reader already knows your point before you make it, you're lecturing, not revealing.

### The Storyteller

**Models:** Lenny Rachitsky, narrative journalism, Bloomberg features
**Tells someone's story.** Opens with a scene, a person, a moment. Data lives inside the narrative, not beside it.

- **Narrative structure:** Scene-driven. Open in the middle of the action. Zoom out to explain why it matters. Zoom back in for the resolution.
- **Sentence patterns:** Concrete sensory detail. "The Grafana dashboard turned red at 11:47 PM" not "they experienced an outage." Dialogue where possible.
- **What makes it engaging:** You're reading about a _person_, not an abstraction. The reader cares what happens next because they care about the character.
- **What kills the energy:** Breaking the scene to explain context. Weave context into the action — don't pause the story to give a background lecture.

### The Analyst

**Models:** Benedict Evans, Matt Levine, Stratechery
**Tells the story of a pattern.** "Here's what the data says, here's what everyone thinks it means, here's what it actually means."

- **Narrative structure:** Mystery or Revelation. Present the evidence, let it accumulate, then deliver the interpretation that reframes everything.
- **Sentence patterns:** Declarative, confident. Data first, opinion second. "Revenue grew 40% year-over-year. The obvious read is that AI demand is insatiable. The less obvious read — and the correct one — is that..."
- **What makes it engaging:** The reader feels like they're getting insider analysis. The "actually" moment — where conventional wisdom gets punctured.
- **What kills the energy:** Being balanced to the point of saying nothing. Take a position. "Both sides have merits" is not analysis.

---

## Story Structures

These are narrative shapes the post can take. Pick the one that fits the material — don't force a structure onto a story that wants a different shape.

### The Mystery

Open with an unanswered question. Every section is a clue. The answer comes in the final third.

The reader stays because they need to know. Works for: unexpected findings, debugging stories, "why does X happen" posts. The question must be genuinely interesting — not rhetorical, not obvious.

### The Journey

"Here's where we started. Here's what happened. Here's where we ended up."

The reader walks the path with you. Chronological but not exhaustive — skip the boring parts, slow down at the turning points. Works for: migration stories, "how we built X," lessons-learned posts.

### The Revelation

Everyone believes X. Show why X seems right — steelman it. Then reveal Y, the thing they didn't see.

The rest of the post is the new world after Y. The reader's mental model shifts. Works for: contrarian takes, "the real problem with X," misconception posts. The reveal must be earned — if you don't make X seem plausible first, the reveal has no power.

### The Escalation

Each section raises the stakes. First data point is interesting. Second is surprising. Third is undeniable. Conclusion becomes inevitable.

Works for: trend analysis, "the state of X," posts building a case. Order matters enormously — lead with the weakest evidence, close with the strongest. If you reverse this, the post deflates.

### The Before/After

Paint the painful "before" in vivid detail. Walk through the change. Show the "after" with hard numbers.

The contrast IS the story. Works for: case studies, tool comparisons, process improvements. The "before" must feel real — specific pain, specific frustration, specific waste. Generic "before" = generic story.

---

## Hooks — The First 3 Sentences

The opening is everything. If the reader isn't hooked in 3 sentences, they're gone. Every other paragraph can be rewritten later. The hook has one job: get them to read paragraph two.

### Hook Formulas

**Drop into a scene:** Start in the middle of the action. No preamble.

> "It was 11 PM on a Tuesday and the Grafana dashboard had turned entirely red."

**The number that shouldn't exist:** A statistic so striking it demands explanation.

> "73% of Kubernetes clusters in production have at least one critical misconfiguration."

**The provocative claim:** Say something bold enough that the reader has to see if you can back it up.

> "Microservices are a solved problem. The unsolved problem is the org dysfunction that made you think you needed them."

**The failure:** Open with what went wrong. Humans are wired for it.

> "We spent six months building a custom ML pipeline. Then we replaced it with 40 lines of SQL."

**The question that nags:** Not rhetorical. A question the reader genuinely doesn't know the answer to.

> "Why do teams that adopt every best practice still ship slowly?"

**The contrast:** Two things that shouldn't coexist. The gap creates the story.

> "Company A deploys 200 times a day with 12 engineers. Company B deploys once a month with 200."

### Never Open With

- A definition ("X is a technology that...")
- A panoramic statement ("In today's rapidly evolving...")
- A meta-reference to the article ("In this post, we'll explore...")
- A rhetorical question with an obvious answer ("Want to ship faster?")
- Throat-clearing — the first 2-3 warmup sentences before the real opening. Cut them. Start where it gets interesting.

---

## Structure & Strategy

### Format Selection

Read `idea.md` for signals — topic complexity, audience, angle. Pick the format from `.claude/skills/content-writing/references/formats.md` that best fits the material. Don't force a format; let the content choose.

### The Angle

The angle is the story's thesis. It must be clear by the end of the first paragraph. "AI in healthcare" is a topic. "Why radiologists should stop fearing AI and start fearing their EMR vendor" is an angle. Every post needs an angle — without one, you're writing a Wikipedia article.

### Section Count

4-7 sections for standard posts. 6-8 for deep dives. More than 8 means the post is unfocused — split it or find a sharper angle.

### Audience

"Developers" is not an audience. "Senior backend engineers evaluating event-driven architecture" is an audience. The more specific, the sharper the writing. Read `idea.md` for audience signals.

### SEO

Primary keyword in title, first paragraph, one H2, and meta description. Secondary keywords distributed naturally. That's it. Don't write for search engines. Write a good story that happens to be findable. See `.claude/skills/content-writing/references/seo.md` for details.

---

## Output Format

Write `outline.md` with this structure:

```markdown
## Story Plan for: [Title]

### Voice Mode

[Chosen voice — Practitioner/Essayist/Storyteller/Analyst + why]

### Story Structure

[Chosen structure — Mystery/Journey/Revelation/Escalation/Before-After + why]

### The Hook

[The opening 2-3 sentences, fully written. This is the most important part.]

### Narrative Arc

[Section-by-section plan. For each section:]

- Section title
- What this section does in the story (not just "covers topic X")
- Key evidence/quotes from research.md to weave in
- How it pulls the reader to the next section

### Angle

[The thesis in one sentence]

### Audience

[Specific audience definition]

### SEO

- Primary keyword: [...]
- Target format: [from formats.md]
- Target word count: [range]
```
