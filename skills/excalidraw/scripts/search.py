#!/usr/bin/env python3
"""
Excalidraw Diagram Pattern Search
Uses BM25 algorithm for intelligent pattern matching
"""
import sys
import csv
import json
from pathlib import Path

try:
    from rank_bm25 import BM25Okapi
except ImportError:
    print("ERROR: rank_bm25 not installed. Run: pip install rank-bm25", file=sys.stderr)
    sys.exit(1)

CSV_CONFIG = {
    "pattern": {
        "file": "patterns.csv",
        "search_cols": ["name", "description", "use_case", "prompt_keywords"],
        "output_cols": ["name", "type", "description", "layout_pattern", "spacing"]
    },
    "component": {
        "file": "components.csv",
        "search_cols": ["name", "type", "use_case", "semantic_meaning"],
        "output_cols": ["name", "type", "color_palette", "width", "height", "semantic_meaning"]
    },
    "color": {
        "file": "colors.csv",
        "search_cols": ["name", "semantic_meaning", "use_for"],
        "output_cols": ["palette", "name", "bg_color", "stroke_color", "semantic_meaning"]
    },
    "spacing": {
        "file": "spacing.csv",
        "search_cols": ["context", "reason", "example_use"],
        "output_cols": ["context", "recommended_px", "reason", "example_use"]
    },
    "rule": {
        "file": "best-practices.csv",
        "search_cols": ["category", "rule", "reason"],
        "output_cols": ["rule", "reason", "good_example", "priority"]
    }
}

def search_domain(query, domain, max_results=3):
    """Search CSV data using BM25"""
    config = CSV_CONFIG.get(domain)
    if not config:
        raise ValueError(f"Unknown domain: {domain}. Valid domains: {list(CSV_CONFIG.keys())}")

    csv_path = Path(__file__).parent.parent / "data" / config["file"]

    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    with open(csv_path, encoding='utf-8') as f:
        reader = list(csv.DictReader(f))

    if not reader:
        return []

    # Build search corpus
    corpus = []
    for row in reader:
        text = " ".join(str(row.get(col, "")) for col in config["search_cols"])
        corpus.append(text.lower().split())

    # BM25 search
    bm25 = BM25Okapi(corpus)
    scores = bm25.get_scores(query.lower().split())
    top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:max_results]

    # Format results
    results = []
    for idx in top_indices:
        if scores[idx] > 0:  # Only include results with non-zero score
            result = {col: reader[idx].get(col, "") for col in config["output_cols"]}
            result["_score"] = round(scores[idx], 2)
            results.append(result)

    return results

def auto_detect_domain(query):
    """Auto-detect best domain from query"""
    q_lower = query.lower()

    # Pattern keywords
    if any(kw in q_lower for kw in ["pattern", "diagram", "architecture", "flowchart", "sequence", "3-tier", "microservice", "client-server"]):
        return "pattern"

    # Component keywords
    elif any(kw in q_lower for kw in ["component", "service", "database", "cache", "queue", "api", "server", "app"]):
        return "component"

    # Color keywords
    elif any(kw in q_lower for kw in ["color", "palette", "semantic", "blue", "green", "red"]):
        return "color"

    # Spacing keywords
    elif any(kw in q_lower for kw in ["spacing", "gap", "distance", "layout", "grid", "px", "pixel"]):
        return "spacing"

    # Rule keywords
    elif any(kw in q_lower for kw in ["rule", "practice", "guideline", "best", "should", "avoid"]):
        return "rule"

    # Default to pattern
    return "pattern"

def format_output(results, query, domain, output_format="text"):
    """Format search results for display"""
    if output_format == "json":
        return json.dumps({
            "query": query,
            "domain": domain,
            "results": results
        }, indent=2)

    # Text format
    output = []
    output.append(f"Top {len(results)} results for '{query}' in domain '{domain}':\n")

    for i, result in enumerate(results, 1):
        score = result.pop("_score", 0)
        output.append(f"{i}. [Score: {score}]")
        for key, value in result.items():
            output.append(f"   {key}: {value}")
        output.append("")

    if not results:
        output.append("No results found. Try a different query or domain.")

    return "\n".join(output)

def main():
    if len(sys.argv) < 2:
        print("Usage: search.py <query> [domain] [--json]")
        print(f"Available domains: {', '.join(CSV_CONFIG.keys())}")
        print("Domain auto-detection available if not specified")
        sys.exit(1)

    query = sys.argv[1]
    domain = None
    output_format = "text"

    # Parse arguments
    for arg in sys.argv[2:]:
        if arg == "--json":
            output_format = "json"
        elif arg in CSV_CONFIG:
            domain = arg

    # Auto-detect domain if not specified
    if domain is None:
        domain = auto_detect_domain(query)

    try:
        results = search_domain(query, domain)
        print(format_output(results, query, domain, output_format))
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
