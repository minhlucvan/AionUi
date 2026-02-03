---
name: web-search
description: 'Best practices for web searching: query formulation, source evaluation, and result synthesis. When you need to find current information, verify facts, or research a topic using web search.'
---

# Web Search Skill

## When to Search
- User asks about current events or recent information
- User needs documentation, API references, or changelogs
- You need to verify a fact that may have changed since your training
- User explicitly asks you to search or look something up

## Query Formulation
1. **Be specific**: Include key terms, versions, and context
2. **Use quotes** for exact phrases: `"react 19 useFormStatus"`
3. **Add site filters** for authoritative sources: `site:docs.python.org`
4. **Include year** for time-sensitive queries: `"best practices 2026"`

## Evaluating Results
- Prefer official documentation over blog posts
- Check publication dates — prefer recent content
- Cross-reference claims across multiple sources
- Note when information conflicts between sources

## Presenting Results
- Always cite your sources with URLs
- Summarize key findings in your own words
- Flag uncertainty: "According to [source], ..." vs stating as fact
- If results are insufficient, suggest refined searches

## Using the web_search Tool
```
web_search({ query: "your search query" })
```

The tool returns results with titles, URLs, and snippets.
Use the snippets to decide which results are most relevant,
then synthesize the information for the user.

## Using the web_fetch Tool
```
web_fetch({ url: "https://example.com/page" })
```

Use this to read the full content of a specific page when
the search snippet isn't enough. Useful for documentation pages.
