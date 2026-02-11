#!/usr/bin/env node
/**
 * Excalidraw Diagram Pattern Search
 * Uses BM25 algorithm for intelligent pattern matching
 *
 * Usage: node search.js <query> [domain] [--json]
 * Domains: pattern, component, color, spacing, rule
 */

const fs = require('fs');
const path = require('path');

// ============ CSV PARSER ============

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function loadCSV(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] || '']));
  });
}

// ============ BM25 IMPLEMENTATION ============

class BM25 {
  constructor(k1 = 1.5, b = 0.75) {
    this.k1 = k1;
    this.b = b;
    this.corpus = [];
    this.docLengths = [];
    this.avgdl = 0;
    this.idf = {};
    this.docFreqs = {};
    this.N = 0;
  }

  tokenize(text) {
    return String(text)
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);
  }

  fit(documents) {
    this.corpus = documents.map((doc) => this.tokenize(doc));
    this.N = this.corpus.length;
    if (this.N === 0) return;

    this.docLengths = this.corpus.map((doc) => doc.length);
    this.avgdl = this.docLengths.reduce((a, b) => a + b, 0) / this.N;

    for (const doc of this.corpus) {
      const seen = new Set();
      for (const word of doc) {
        if (!seen.has(word)) {
          this.docFreqs[word] = (this.docFreqs[word] || 0) + 1;
          seen.add(word);
        }
      }
    }

    for (const [word, freq] of Object.entries(this.docFreqs)) {
      this.idf[word] = Math.log((this.N - freq + 0.5) / (freq + 0.5) + 1);
    }
  }

  score(query) {
    const queryTokens = this.tokenize(query);
    const scores = [];

    for (let idx = 0; idx < this.corpus.length; idx++) {
      let score = 0;
      const doc = this.corpus[idx];
      const docLen = this.docLengths[idx];
      const termFreqs = {};
      for (const word of doc) {
        termFreqs[word] = (termFreqs[word] || 0) + 1;
      }

      for (const token of queryTokens) {
        if (this.idf[token] !== undefined) {
          const tf = termFreqs[token] || 0;
          const idfVal = this.idf[token];
          const numerator = tf * (this.k1 + 1);
          const denominator =
            tf + this.k1 * (1 - this.b + (this.b * docLen) / this.avgdl);
          score += idfVal * (numerator / denominator);
        }
      }

      scores.push([idx, score]);
    }

    return scores.sort((a, b) => b[1] - a[1]);
  }
}

// ============ CONFIGURATION ============

const DATA_DIR = path.join(__dirname, '..', 'data');

const CSV_CONFIG = {
  pattern: {
    file: 'patterns.csv',
    search_cols: ['name', 'description', 'use_case', 'prompt_keywords'],
    output_cols: ['name', 'type', 'description', 'layout_pattern', 'spacing'],
  },
  component: {
    file: 'components.csv',
    search_cols: ['name', 'type', 'use_case', 'semantic_meaning'],
    output_cols: [
      'name',
      'type',
      'color_palette',
      'width',
      'height',
      'semantic_meaning',
    ],
  },
  color: {
    file: 'colors.csv',
    search_cols: ['name', 'semantic_meaning', 'use_for'],
    output_cols: [
      'palette',
      'name',
      'bg_color',
      'stroke_color',
      'semantic_meaning',
    ],
  },
  spacing: {
    file: 'spacing.csv',
    search_cols: ['context', 'reason', 'example_use'],
    output_cols: ['context', 'recommended_px', 'reason', 'example_use'],
  },
  rule: {
    file: 'best-practices.csv',
    search_cols: ['category', 'rule', 'reason'],
    output_cols: ['rule', 'reason', 'good_example', 'priority'],
  },
};

// ============ SEARCH FUNCTIONS ============

function searchDomain(query, domain, maxResults = 3) {
  const config = CSV_CONFIG[domain];
  if (!config) {
    throw new Error(
      `Unknown domain: ${domain}. Valid domains: ${Object.keys(CSV_CONFIG).join(', ')}`
    );
  }

  const csvPath = path.join(DATA_DIR, config.file);
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const data = loadCSV(csvPath);
  if (data.length === 0) return [];

  const documents = data.map((row) =>
    config.search_cols.map((col) => String(row[col] || '')).join(' ')
  );

  const bm25 = new BM25();
  bm25.fit(documents);
  const ranked = bm25.score(query);

  const results = [];
  for (const [idx, score] of ranked.slice(0, maxResults)) {
    if (score > 0) {
      const result = {};
      for (const col of config.output_cols) {
        result[col] = data[idx][col] || '';
      }
      result._score = Math.round(score * 100) / 100;
      results.push(result);
    }
  }

  return results;
}

function autoDetectDomain(query) {
  const qLower = query.toLowerCase();

  if (
    [
      'pattern',
      'diagram',
      'architecture',
      'flowchart',
      'sequence',
      '3-tier',
      'microservice',
      'client-server',
    ].some((kw) => qLower.includes(kw))
  ) {
    return 'pattern';
  }
  if (
    [
      'component',
      'service',
      'database',
      'cache',
      'queue',
      'api',
      'server',
      'app',
    ].some((kw) => qLower.includes(kw))
  ) {
    return 'component';
  }
  if (
    ['color', 'palette', 'semantic', 'blue', 'green', 'red'].some((kw) =>
      qLower.includes(kw)
    )
  ) {
    return 'color';
  }
  if (
    ['spacing', 'gap', 'distance', 'layout', 'grid', 'px', 'pixel'].some(
      (kw) => qLower.includes(kw)
    )
  ) {
    return 'spacing';
  }
  if (
    ['rule', 'practice', 'guideline', 'best', 'should', 'avoid'].some((kw) =>
      qLower.includes(kw)
    )
  ) {
    return 'rule';
  }

  return 'pattern';
}

function formatOutput(results, query, domain, outputFormat) {
  if (outputFormat === 'json') {
    return JSON.stringify({ query, domain, results }, null, 2);
  }

  const output = [];
  output.push(`Top ${results.length} results for '${query}' in domain '${domain}':\n`);

  results.forEach((result, i) => {
    const score = result._score || 0;
    const row = { ...result };
    delete row._score;
    output.push(`${i + 1}. [Score: ${score}]`);
    for (const [key, value] of Object.entries(row)) {
      output.push(`   ${key}: ${value}`);
    }
    output.push('');
  });

  if (results.length === 0) {
    output.push('No results found. Try a different query or domain.');
  }

  return output.join('\n');
}

// ============ MAIN ============

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: search.js <query> [domain] [--json]');
    console.log(`Available domains: ${Object.keys(CSV_CONFIG).join(', ')}`);
    console.log('Domain auto-detection available if not specified');
    process.exit(1);
  }

  const query = args[0];
  let domain = null;
  let outputFormat = 'text';

  for (const arg of args.slice(1)) {
    if (arg === '--json') {
      outputFormat = 'json';
    } else if (CSV_CONFIG[arg]) {
      domain = arg;
    }
  }

  if (domain === null) {
    domain = autoDetectDomain(query);
  }

  try {
    const results = searchDomain(query, domain);
    console.log(formatOutput(results, query, domain, outputFormat));
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}

main();
